from model import SpectralAE, SpectralVAE

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import TensorDataset, DataLoader
import spectral.io.envi as envi
from pathlib import Path
from tqdm.notebook import tqdm

DATA = Path("../data/complex_facility/Images")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def load_data(glob="MakoSpectrometer-*.img.hdr"):
    all_hdrs = sorted(DATA.glob(glob))
    print(f"{len(all_hdrs)} views found")

    wavelengths = np.array(envi.open(all_hdrs[0]).bands.centers)
    print(wavelengths.shape)

    pixels_list = []
    for hdr in tqdm(all_hdrs, desc="loading"):
        cube = np.asarray(envi.open(hdr).load())
        # the autoencoder operates at pixel level, so every pixel is an independent data point
        pixels_list.append(cube.reshape(-1, cube.shape[-1]))

    pixels = np.concatenate(pixels_list, axis=0).astype(np.float32)  # (N, 128)
    pixels -= pixels.min()
    pixels /= pixels.max()
    print(f"pixel bank: {pixels.shape}")

    rng = np.random.default_rng(0)
    MAX_PIXELS_TRAIN = 50000

    all_idx = np.arange(len(pixels))
    rng.shuffle(all_idx)

    pixels_train = pixels[all_idx[:MAX_PIXELS_TRAIN]]
    pixels_test = pixels[all_idx[MAX_PIXELS_TRAIN : MAX_PIXELS_TRAIN + 10000]]

    loader = DataLoader(
        TensorDataset(torch.tensor(pixels_train)),
        batch_size=512,
        shuffle=True,
    )
    print(f"train: {len(pixels_train):,}   test: {len(pixels_test):,}")

    return loader


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

    data_loader = load_data()

    model_ae = SpectralAE(n_bands=128, latent_dim=32).to(DEVICE)
    model_vae = SpectralVAE(n_bands=128, latent_dim=32, beta=0.5).to(DEVICE)

    train_model_ae(model=model_ae, data_loader=data_loader, epochs=50)
    train_model_vae(model=model_vae, data_loader=data_loader, epochs=50)
