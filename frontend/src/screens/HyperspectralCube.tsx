import { useEffect, useState, useCallback } from "react";
import DataCube from "../components/DataCube";

const API = "/api";
const CUBE_BAND = 60;

interface Meta {
  n_bands: number;
  wavelengths: number[];
}

export default function HyperspectralCube() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [cubeBandData, setCubeBandData] = useState<Float32Array | null>(null);

  // Load metadata + fixed cube face once
  useEffect(() => {
    fetch(`${API}/meta`)
      .then((r) => r.json())
      .then(setMeta);
    fetch(`${API}/band/${CUBE_BAND}`)
      .then((r) => r.arrayBuffer())
      .then((buf) => setCubeBandData(new Float32Array(buf)));
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
      {/* Centre - 3D cube */}
      <div style={{ flex: 1, height: "100%", position: "relative" }}>
        <DataCube
          bandData={cubeBandData}
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
