from model import SpectralAE, SpectralVAE, eval_loss_vae, encode_all, eval_loss_ae

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import TensorDataset, DataLoader
import spectral.io.envi as envi
from pathlib import Path
from tqdm.auto import tqdm
from sklearn.manifold import TSNE


DATA = Path("../data/complex_facility/Images")
MODELS = Path("../models")

HOLDOUT_FRACTION = 0.2
MAX_PIXELS_TRAIN = 50000
MAX_PIXELS_TEST = 10000
MAX_PIXELS_TSNE = 5000

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def load_pixels(hdrs):
    pixels_list = []
    for hdr in tqdm(hdrs, desc="loading"):
        cube = np.asarray(envi.open(hdr).load())
        # the autoencoder operates at pixel level, so every pixel is an independent data point
        pixels_list.append(cube.reshape(-1, cube.shape[-1]))
    pixels = np.concatenate(pixels_list, axis=0).astype(np.float32)  # (N, 128)
    pixels -= pixels.min()
    pixels /= pixels.max()
    print(f"pixel bank: {pixels.shape}")
    return pixels


def load_data(glob="MakoSpectrometer-*.img.hdr"):
    all_hdrs = sorted(DATA.glob(glob))
    print(f"{len(all_hdrs)} views found")

    # split by viewsa
    rng = np.random.default_rng(0)
    hdr_idx = np.arange(len(all_hdrs))
    rng.shuffle(hdr_idx)

    n_test_views = int(len(all_hdrs) * HOLDOUT_FRACTION)
    test_hdrs = [all_hdrs[i] for i in hdr_idx[:n_test_views]]
    train_hdrs = [all_hdrs[i] for i in hdr_idx[n_test_views:]]
    print(f"views: {len(train_hdrs)} train, {len(test_hdrs)} test (holdout)")

    print("Train: ")
    pixels_train_all = load_pixels(train_hdrs)
    print("Test: ")
    pixels_test_all = load_pixels(test_hdrs)

    rng.shuffle(pixels_train_all)
    rng.shuffle(pixels_test_all)

    pixels_train = pixels_train_all[:MAX_PIXELS_TRAIN]
    pixels_test = pixels_test_all[:MAX_PIXELS_TEST]
    print(f"pixels: {len(pixels_train):,} train   {len(pixels_test):,} test")

    train_loader = DataLoader(
        TensorDataset(torch.tensor(pixels_train)),
        batch_size=512,
        shuffle=True,
    )
    train_eval_loader = DataLoader(
        TensorDataset(torch.tensor(pixels_train)),
        batch_size=512,
        shuffle=False,
    )
    test_loader = DataLoader(
        TensorDataset(torch.tensor(pixels_test)),
        batch_size=512,
        shuffle=False,
    )
    return pixels_train, pixels_test, train_loader, train_eval_loader, test_loader


def train_model_ae(model: SpectralAE, train_loader, test_loader, epochs=50):
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    for _ in tqdm(range(epochs), desc="training AE"):
        model.train()
        for (batch,) in train_loader:
            batch = batch.to(DEVICE)
            recon, _ = model(batch)
            loss = F.huber_loss(recon, batch)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
        scheduler.step()

    model.eval()
    train_loss = eval_loss_ae(model, train_loader, device=DEVICE)
    test_loss = eval_loss_ae(model, test_loader, device=DEVICE)
    print(f"AE  | train loss: {train_loss:.6f}   test loss: {test_loss:.6f}")


def train_model_vae(model: SpectralVAE, train_loader, test_loader, epochs=50):
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    for _ in tqdm(range(epochs), desc="training VAE"):
        model.train()
        for (batch,) in train_loader:
            batch = batch.to(DEVICE)
            recon, z, mu, logvar = model(batch)
            loss, _, _ = model.loss(recon, batch, mu, logvar)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
        scheduler.step()

    model.eval()
    train_loss = eval_loss_vae(model, train_loader, device=DEVICE)
    test_loss = eval_loss_vae(model, test_loader, device=DEVICE)
    print(f"VAE | train loss: {train_loss:.6f}   test loss: {test_loss:.6f}")


def fit_tsne(latents):
    rng = np.random.default_rng(0)
    idx = np.arange(len(latents))
    if len(latents) > MAX_PIXELS_TSNE:
        idx = rng.choice(len(latents), MAX_PIXELS_TSNE, replace=False)
    tsne = TSNE(n_components=3, random_state=0, perplexity=30)
    coords = tsne.fit_transform(latents[idx]).astype(np.float32)
    return coords, idx


if __name__ == "__main__":
    print(f"Using device: {DEVICE}")
    MODELS.mkdir(parents=True, exist_ok=True)

    pixels_train, pixels_test, train_loader, train_eval_loader, test_loader = (
        load_data()
    )
    model_ae = SpectralAE(n_bands=128, latent_dim=32).to(DEVICE)
    model_vae = SpectralVAE(n_bands=128, latent_dim=32, beta=0.5).to(DEVICE)

    ae_path = MODELS / "ae.pt"
    if ae_path.exists():
        model_ae.load_state_dict(torch.load(ae_path, map_location=DEVICE))
        model_ae.eval()
    else:
        train_model_ae(model_ae, train_loader, test_loader, epochs=50)
        torch.save(model_ae.state_dict(), ae_path)
        print(f"saved {ae_path}")

    vae_path = MODELS / "vae.pt"
    if vae_path.exists():
        model_vae.load_state_dict(torch.load(vae_path, map_location=DEVICE))
        model_vae.eval()
    else:
        train_model_vae(model_vae, train_loader, test_loader, epochs=50)
        torch.save(model_vae.state_dict(), vae_path)
        print(f"saved {vae_path}")

    models = {"ae": (model_ae, False), "vae": (model_vae, True)}
    splits = {
        "train": (train_eval_loader, pixels_train),
        "test": (test_loader, pixels_test),
    }

    for model_name, (model, is_vae) in models.items():
        for split_name, (loader, pixels) in splits.items():
            latents = encode_all(model, loader, is_vae, device=DEVICE)
            coords, idx = fit_tsne(latents)
            out_path = MODELS / f"tsne_{model_name}_{split_name}.npy"
            np.save(out_path, coords)
            print(f"saved {out_path}  {coords.shape}")

            spectra_path = MODELS / f"spectra_{split_name}.npy"
            if not spectra_path.exists():
                np.save(spectra_path, pixels[idx])
                print(f"saved {spectra_path}  {pixels[idx].shape}")

            with torch.no_grad():
                recon = (
                    model.decode(torch.tensor(latents[idx]).to(DEVICE)).cpu().numpy()
                )
            recon_path = MODELS / f"recon_{model_name}_{split_name}.npy"
            np.save(recon_path, recon)
            print(f"saved {recon_path}  {recon.shape}")
