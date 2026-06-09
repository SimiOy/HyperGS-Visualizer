from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import numpy as np
import spectral.io.envi as envi

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "complex_facility" / "Images"


def _hdr_path(frame: int) -> Path:
    return DATA_DIR / f"MakoSpectrometer-t{frame:04d}.img.hdr"


@lru_cache(maxsize=8)
def load_cube(frame: int) -> np.ndarray:
    path = _hdr_path(frame)
    cube = np.asarray(envi.open(path).load()).astype(np.float32)
    cube -= cube.min()
    if cube.max() > 0:
        cube /= cube.max()
    return cube


@lru_cache(maxsize=1)
def wavelengths() -> list[float]:
    path = _hdr_path(0)
    return list(envi.open(path).bands.centers)
