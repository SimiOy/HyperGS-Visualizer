import torch
import numpy as np
import torch.nn.functional as F


def eval_loss_ae(model, loader, device):
    total = 0.0
    with torch.no_grad():
        for (batch,) in loader:
            batch = batch.to(device)
            recon, _ = model(batch)
            total += F.huber_loss(recon, batch).item()
    return total / len(loader)


def eval_loss_vae(model, loader, device):
    total = 0.0
    with torch.no_grad():
        for (batch,) in loader:
            batch = batch.to(device)
            recon, z, mu, logvar = model(batch)
            loss, _, _ = model.loss(recon, batch, mu, logvar)
            total += loss.item()
    return total / len(loader)


def encode_all(model, loader, is_vae, device):
    latents = []
    with torch.no_grad():
        for (batch,) in loader:
            batch = batch.to(device)
            if is_vae:
                mu, _ = model.encode(batch)
                z = mu
            else:
                z = model.encode(batch)
            latents.append(z.cpu().numpy())
    return np.concatenate(latents, axis=0)
