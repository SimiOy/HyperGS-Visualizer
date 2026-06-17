# HyperGS Visualizer

Educational visualizer for [HyperGS: Hyperspectral 3D Gaussian Splatting](https://arxiv.org/abs/2412.12849) by Thirgood et al., CVPR 2025.

## Setup

### Easiest is via _Docker_

Run from the repo root:

```bash
docker compose -f external_code/docker-compose.yml up --build
```

Access the app at: http://localhost:5173

## Dev Setup

### 1. Install Poetry

```bash
pip install poetry
```

### 2. Install dependencies

```bash
poetry install
```

And for torch with GPU support:

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124 --force-reinstall --no-deps
```

### 3. Activate the virtual environment

```
poetry env activate
# then run the printed path, e.g.:
& "C:\Users\andre\AppData\Local\pypoetry\Cache\virtualenvs\hypergs-viz-3RQcimve-py3.13\Scripts\activate.ps1""
```

### (Optional) 4. Download the HSI Nerfstudio dataset (not the HS-NeRF Dataset used in the paper)

```bash
python scripts/download_data.py
```

The `.zip` will be automatically extracted to the `data/` folder. Frame 0 is enough to run this project, so downloading the data is optional

### 5. Run the backend

```bash
uvicorn backend.main:app
```

### 6. Run the frontend

```bash
cd frontend && npm install && npm run dev
```

Open http://localhost:5173.
