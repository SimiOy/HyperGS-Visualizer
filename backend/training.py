from model import SpectralAE, SpectralVAE

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import TensorDataset, DataLoader
import spectral.io.envi as envi
from pathlib import Path
from tqdm.notebook import tqdm

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
    test_loader = DataLoader(
        TensorDataset(torch.tensor(pixels_test)),
        batch_size=512,
        shuffle=False,
    )
    return train_loader, test_loader


def train_model_ae(model: SpectralAE, data_loader, epochs=50):
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    losses = []
    model.train()
    for epoch in tqdm(range(epochs), desc="training"):
        ep_loss = 0.0
        for (batch,) in data_loader:
            batch = batch.to(DEVICE)
            recon, _ = model(batch)
            loss = F.huber_loss(recon, batch)

            optimizer.zero_grad()
            loss.backward()

            optimizer.step()
            ep_loss += loss.item()
        losses.append(ep_loss / len(data_loader))
        scheduler.step()

    model.eval()
    print(f"final loss: {losses[-1]:.5f}")


def train_model_vae(model: SpectralVAE, data_loader, epochs=50):
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    losses_total = []
    losses_recon = []
    losses_kl = []
    model.train()
    for epoch in tqdm(range(epochs), desc="training"):
        ep_total, ep_recon, ep_kl = 0.0, 0.0, 0.0
        for (batch,) in data_loader:
            batch = batch.to(DEVICE)
            recon, z, mu, logvar = model(batch)
            loss, recon_l, kl_l = model.loss(recon, batch, mu, logvar)

            optimizer.zero_grad()
            loss.backward()

            optimizer.step()
            ep_total += loss.item()
            ep_recon += recon_l.item()
            ep_kl += kl_l.item()

        n = len(data_loader)
        losses_total.append(ep_total / n)
        losses_recon.append(ep_recon / n)
        losses_kl.append(ep_kl / n)
        scheduler.step()

    model.eval()
    print(f"final loss: {losses_total[-1]:.5f}")


if __name__ == "__main__":
    print(f"Using device: {DEVICE}")
    MODELS.mkdir(parents=True, exist_ok=True)

    train_loader, test_loader = load_data()

    model_ae = SpectralAE(n_bands=128, latent_dim=32).to(DEVICE)
    model_vae = SpectralVAE(n_bands=128, latent_dim=32, beta=0.5).to(DEVICE)

    train_model_ae(model=model_ae, data_loader=data_loader, epochs=50)
    train_model_vae(model=model_vae, data_loader=data_loader, epochs=50)
