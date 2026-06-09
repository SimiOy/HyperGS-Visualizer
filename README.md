# HyperGS Visualizer

Educational visualizer for [HyperGS: Hyperspectral 3D Gaussian Splatting](https://arxiv.org/abs/2412.12849) by Thirgood et al., CVPR 2025.

## Setup

### 1. Install Poetry

```bash
pip install poetry
```

### 2. Install dependencies

```bash
poetry install
```

### 3. Activate the virtual environment

```
poetry env activate
# then run the printed path, e.g.:
& "C:\Users\andre\AppData\Local\pypoetry\Cache\virtualenvs\hypergs-viz-3RQcimve-py3.13\Scripts\activate.ps1""
```

### 4. Download the HSI Nerfstudio dataset (not the HS-NeRF Dataset used in the paper)

```bash
python scripts/download_data.py
```

The `.zip` will be automaticlly extracted to the `data/` folder.

### 5. Run the main app GUI

```bash
python src/app.py
```

Then open the URL printed in the terminal (http://localhost:7860).

### Docker (soon maybe)
