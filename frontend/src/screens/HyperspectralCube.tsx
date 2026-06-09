import { useEffect, useState, useCallback } from "react";
import DataCube from "../components/DataCube";
import SpectralPlot from "../components/SpectralPlot";

const API = "/api";
const CUBE_BAND = 60;
const COL_COLOR = "#ff6b35";

interface Meta {
  n_bands: number;
  wavelengths: number[];
}

export default function HyperspectralCube() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [cubeBandData, setCubeBandData] = useState<Float32Array | null>(null);
  const [spectrum, setSpectrum] = useState<number[] | null>(null);
  const [selectedPixel, setSelectedPixel] = useState<{
    row: number;
    col: number;
  } | null>(null);

  // Load metadata + fixed cube face once
  useEffect(() => {
    fetch(`${API}/meta`)
      .then((r) => r.json())
      .then(setMeta);
    fetch(`${API}/band/${CUBE_BAND}`)
      .then((r) => r.arrayBuffer())
      .then((buf) => setCubeBandData(new Float32Array(buf)));
  }, []);

  const handlePixelClick = useCallback((row: number, col: number) => {
    setSelectedPixel({ row, col });
    fetch(`${API}/spectrum/${row}/${col}`)
      .then((r) => r.json())
      .then((d) => setSpectrum(d.spectrum));
  }, []);

  const panel: React.CSSProperties = {
    width: 360,
    minWidth: 300,
    height: "100%",
    background: "#13131a",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      {/* Left - spectral curve */}
      <div style={{ ...panel, borderRight: "1px solid #1e1e2e" }}>
        <SpectralPlot
          wavelengths={meta?.wavelengths ?? []}
          spectrum={spectrum}
          color={COL_COLOR}
        />
        {selectedPixel && (
          <div
            style={{
              padding: "6px 12px",
              fontSize: 11,
              color: "#555",
              borderTop: "1px solid #1e1e2e",
            }}
          >
            pixel ({selectedPixel.row}, {selectedPixel.col})
          </div>
        )}
      </div>

      {/* Centre - 3D cube */}
      <div style={{ flex: 1, height: "100%", position: "relative" }}>
        <DataCube
          bandData={cubeBandData}
          selectedPixel={selectedPixel}
          onPixelClick={handlePixelClick}
          colColor={COL_COLOR}
        />
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 11,
            color: "#555",
            pointerEvents: "none",
          }}
        >
          click face to select pixel and drag to orbit
        </div>
      </div>
    </div>
  );
}
