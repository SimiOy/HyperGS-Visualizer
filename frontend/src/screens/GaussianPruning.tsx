import { useState, useMemo, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Gaussian3D } from "../Gaussian3D";
import GaussianInstances from "../components/GaussianInstances";
import SpectralPlot from "../components/SpectralPlot";

const API = "/api";
const MODEL = "ae";
const SPLIT = "train";

// Preconfigured set of 3D Gaussians
function generateGaussians(count = 200): Gaussian3D[] {
  const gaussians: Gaussian3D[] = [];
  for (let i = 0; i < count; i++) {
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
    );
    const scale = new THREE.Vector3(0.5 + Math.random() * 1.5, 0.5 + Math.random() * 1.5, 0.5 + Math.random() * 1.5);
    const rotation = new THREE.Quaternion().random();
    gaussians.push(new Gaussian3D(position, scale, new THREE.Color("#6dd49f"), 1, rotation));
  }
  return gaussians;
}

export default function GaussianPruning() {
  const gaussians = useMemo(() => generateGaussians(), []);
  const [topK, setTopK] = useState(5);

  const [nBands, setNBands] = useState(128);
  const [recon, setRecon] = useState<Float32Array | null>(null);
  const [groundTruth, setGroundTruth] = useState<Float32Array | null>(null);

  useEffect(() => {
    fetch(`${API}/meta`)
      .then((r) => r.json())
      .then((meta) => setNBands(meta.n_bands));
  }, []);

  // Dec(fi)
  useEffect(() => {
    fetch(`${API}/reconstruct/${MODEL}/${SPLIT}`)
      .then((r) => r.arrayBuffer())
      .then((buf) => setRecon(new Float32Array(buf)));
  }, []);

  // C*_d(p)
  useEffect(() => {
    fetch(`${API}/tsne/spectra/${SPLIT}`)
      .then((r) => r.arrayBuffer())
      .then((buf) => setGroundTruth(new Float32Array(buf)));
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <Canvas
        camera={{ position: [30, 30, 30], fov: 42 }}
        style={{ width: "100%", height: "100%", background: "#0a0a12" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.0} />
        <GaussianInstances gaussians={gaussians} />
        <OrbitControls makeDefault />
      </Canvas>

      {/* Right - camera setting sliders */}
      <div
        style={{
          width: 560,
          minWidth: 300,
          height: "100%",
          background: "#13131a",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid #1e1e2e",
          overflowY: "auto",
        }}
      >
        {/* Explanation */}
        <div style={{ flex: 1, padding: "16px", fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>Explain Here</div>

        {/* Sliders */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            Top-K per slice (τ) &nbsp;
            <span style={{ color: "#e07a5f", fontWeight: 600 }}>{topK}</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#e07a5f" }}
          />
        </div>
        <br></br>
        <br></br>
      </div>
    </div>
  );
}
