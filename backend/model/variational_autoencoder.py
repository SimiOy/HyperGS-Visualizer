import torch
import torch.nn as nn
import torch.nn.functional as F
from .autoencoder import ConvSE


class SpectralVAE(nn.Module):
    def __init__(self, n_bands=128, latent_dim=32, beta=1.0):
        super().__init__()
        self.n_bands = n_bands
        self.latent_dim = latent_dim
        self.enc_len = n_bands // 4  # 2 pool ops
        self.beta = beta

        self.encoder = nn.Sequential(
            ConvSE(1, 32, 7),
            nn.MaxPool1d(2),
            ConvSE(32, 64, 5),
            nn.MaxPool1d(2),
            ConvSE(64, 64, 3),
        )
        self.fc_mu = nn.Linear(64 * self.enc_len, latent_dim)
        self.fc_logvar = nn.Linear(64 * self.enc_len, latent_dim)

        self.dec_fc = nn.Linear(latent_dim, 64 * self.enc_len)
        self.decoder = nn.Sequential(
            ConvSE(64, 64, 3),
            nn.Upsample(scale_factor=2),
            ConvSE(64, 32, 5),
            nn.Upsample(scale_factor=2),
            nn.Conv1d(32, 1, 7, padding=3),
            nn.Sigmoid(),
        )

    def encode(self, x):
        h = self.encoder(x.unsqueeze(1)).flatten(1)
        return self.fc_mu(h), self.fc_logvar(h)

    def reparametrize(self, mu, logvar):
        if self.training:
            std = (0.5 * logvar).exp()
            return mu + std * torch.randn_like(std)
        return mu

    def decode(self, z):
        h = F.relu(self.dec_fc(z)).view(z.size(0), 64, self.enc_len)
        return self.decoder(h)[:, 0, : self.n_bands]

    def forward(self, x):
        mu, logvar = self.encode(x)
        z = self.reparametrize(mu, logvar)
        return self.decode(z), z, mu, logvar

    def loss(self, recon, x, mu, logvar):
        """Mix of Huber loss (Original work) and KL loss (via beta)"""
        recon_loss = F.huber_loss(recon, x)
        kl_loss = -0.5 * torch.mean(1 + logvar - mu.pow(2) - logvar.exp())
        return recon_loss + self.beta * kl_loss, recon_loss, kl_loss
