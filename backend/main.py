from __future__ import annotations


from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .data import band_image, n_frames, spectrum, wavelengths

app = FastAPI(title="HyperGS Visualizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/meta")
def meta():
    return {
        "n_frames": n_frames(),
        "n_bands": 128,
        "height": 128,
        "width": 128,
        "wavelengths": wavelengths(),
    }


@app.get("/band/{band}")
def get_band(band: int):
    if not 0 <= band < 128:
        raise HTTPException(400, f"band must be 0-127, got {band}")
    img = band_image(band)  # (128, 128)
    return Response(content=img.tobytes(), media_type="application/octet-stream")


@app.get("/spectrum/{row}/{col}")
def get_spectrum(row: int, col: int):
    if not (0 <= row < 128 and 0 <= col < 128):
        raise HTTPException(400, "row and col must be 0-127")
    return {"spectrum": spectrum(row, col), "wavelengths": wavelengths()}
