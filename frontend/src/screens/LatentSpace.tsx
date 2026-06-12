import { useEffect, useState, type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

const API = "/api";

const toggleBtn = (active: boolean): CSSProperties => ({
  padding: "6px 14px",
  fontSize: 12,
  color: active ? "#fff" : "#666",
  background: active ? "#2a2a3a" : "#13131a",
  border: "1px solid #2a2a3a",
  cursor: "pointer",
});

export default function LatentSpace() {
  const [model, setModel] = useState<"ae" | "vae">("ae");
  const [split, setSplit] = useState<"train" | "test">("train");
  const [points, setPoints] = useState<Float32Array | null>(null);
  const [sliderBand, setSliderBand] = useState(0);

  // Load tsne based on model and split and update call
  useEffect(() => {
    fetch(`${API}/tsne/${model}/${split}`)
      .then((r) => r.arrayBuffer())
      .then((buf) => setPoints(new Float32Array(buf)));
  }, [model, split]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      {/* Centre - 3D point cloud */}
      <div style={{ flex: 1, height: "100%", position: "relative" }}>
        <div style={{ position: "absolute", top: 14, left: 14, zIndex: 1, display: "flex", gap: 8 }}>
          <div style={{ display: "flex" }}>
            <button style={toggleBtn(model === "ae")} onClick={() => setModel("ae")}>
              AE
            </button>
            <button style={toggleBtn(model === "vae")} onClick={() => setModel("vae")}>
              VAE
            </button>
          </div>
          <div style={{ display: "flex" }}>
            <button style={toggleBtn(split === "train")} onClick={() => setSplit("train")}>
              Train
            </button>
            <button style={toggleBtn(split === "test")} onClick={() => setSplit("test")}>
              Test
            </button>
          </div>
        </div>
        <Canvas
          camera={{ position: [3, 3, 3], fov: 50 }}
          style={{ width: "100%", height: "100%", background: "#0a0a12" }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1.0} />
          {points && (
            <points>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[points, 3]} />
              </bufferGeometry>
              <pointsMaterial color="#4cc9f0" size={0.1} sizeAttenuation />
            </points>
          )}
          <OrbitControls makeDefault />
        </Canvas>
      </div>

      {/* Right - band slider for coloring */}
      <div
        style={{
          width: 360,
          minWidth: 300,
          height: "100%",
          background: "#13131a",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid #1e1e2e",
        }}
      >
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
