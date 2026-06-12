import torch.nn as nn
import torch.nn.functional as F


class SEBlock(nn.Module):
    def __init__(self, channels, reduction=4):
        super().__init__()
        self.fc = nn.Sequential(
            nn.Linear(channels, max(1, channels // reduction)),
            nn.ReLU(inplace=True),
            nn.Linear(max(1, channels // reduction), channels),
            nn.Sigmoid(),
        )

    def forward(self, x):
        squeeze = x.mean(2)  # squeeze = global avg over spectral length
        scale = self.fc(squeeze)  # excitiation
        return x * scale.unsqueeze(2)  # scale and combine


class ConvSE(nn.Module):
    def __init__(self, in_ch, out_ch, kernel):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv1d(in_ch, out_ch, kernel, padding=kernel // 2),
            nn.BatchNorm1d(out_ch),
            nn.ReLU(inplace=True),
        )
        self.se = SEBlock(out_ch)

    def forward(self, x):
        return self.se(self.conv(x))


class SpectralAE(nn.Module):
    def __init__(self, n_bands=128, latent_dim=32):
        super().__init__()
        self.n_bands = n_bands
        self.latent_dim = latent_dim
        self.enc_len = n_bands // 4  # 2 pool ops

        self.encoder = nn.Sequential(
            ConvSE(1, 32, 7),
            nn.MaxPool1d(2),
            ConvSE(32, 64, 5),
            nn.MaxPool1d(2),
            ConvSE(64, 64, 3),
        )
        self.enc_fc = nn.Linear(64 * self.enc_len, latent_dim)

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
        return self.enc_fc(h)

    def decode(self, z):
        h = F.relu(self.dec_fc(z)).view(z.size(0), 64, self.enc_len)
        return self.decoder(h)[:, 0, : self.n_bands]

    def forward(self, x):
        z = self.encode(x)
        return self.decode(z), z
