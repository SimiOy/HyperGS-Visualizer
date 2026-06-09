from __future__ import annotations


from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .data import n_frames, wavelengths

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

