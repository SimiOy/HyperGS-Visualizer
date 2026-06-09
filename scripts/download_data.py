import zipfile
from pathlib import Path

import requests
from tqdm import tqdm

URL = "https://zenodo.org/records/18626884/files/data.zip?download=1"
ROOT = Path(__file__).parent.parent
DEST_DIR = ROOT / "data"
ZIP_PATH = ROOT / "data.zip"


def download(url: str, dest: Path) -> None:
    resp = requests.get(url, stream=True, timeout=60)
    resp.raise_for_status()
    total = int(resp.headers.get("content-length", 0))
    with (
        open(dest, "wb") as f,
        tqdm(total=total, unit="B", unit_scale=True, desc="Downloading") as bar,
    ):
        for chunk in resp.iter_content(1 << 20):
            f.write(chunk)
            bar.update(len(chunk))


def main() -> None:
    if not ZIP_PATH.exists():
        print(f"Downloading dataset from {URL}")
        download(URL, ZIP_PATH)
    else:
        print(f"Zip already exists at {ZIP_PATH}, skipping download.")

    DEST_DIR.mkdir(exist_ok=True)
    print(f"Extracting to {DEST_DIR} ...")
    with zipfile.ZipFile(ZIP_PATH, "r") as zf:
        zf.extractall(DEST_DIR)

    ZIP_PATH.unlink()
    print(f"Done. Data is in {DEST_DIR}")


if __name__ == "__main__":
    main()
