import { useEffect, useState, useCallback } from "react";
import DataCube from "../components/DataCube";
import SpectralPlot from "../components/SpectralPlot";
import BandSlice from "../components/BandSlice";

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
  const [sliderBand, setSliderBand] = useState(0);
  const [sliderBandData, setSliderBandData] = useState<Float32Array | null>(null);
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

  // Fetch right-panel band whenever slider moves
  useEffect(() => {
    fetch(`${API}/band/${sliderBand}`)
      .then((r) => r.arrayBuffer())
      .then((buf) => setSliderBandData(new Float32Array(buf)));
  }, [sliderBand]);

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

  // Gen AI Assisted
  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      {/* Left - spectral curve */}
      <div style={{ ...panel, borderRight: "1px solid #1e1e2e" }}>
        <SpectralPlot
          wavelengths={meta?.wavelengths ?? []}
          spectrum={spectrum}
          color={COL_COLOR}
          highlightBand={sliderBand}
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
          highlightBand={sliderBand}
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

      {/* Right - band slice + slider */}
      <div style={{ ...panel, borderLeft: "1px solid #1e1e2e" }}>
        <BandSlice bandData={sliderBandData} highlightColor={COL_COLOR} />

        {/* Slider */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            Spectral band &nbsp;
            <span style={{ color: "#4caf50", fontWeight: 600 }}>{sliderBand}</span>
          </div>
          <input
            type="range"
            min={0}
            max={127}
            step={1}
            value={sliderBand}
            onChange={(e) => setSliderBand(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#4caf50" }}
          />
        </div>
      </div>
    </div>
  );
}
