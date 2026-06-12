import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Lut } from "three/examples/jsm/math/Lut.js";

const API = "/api";

const toggleBtn = (active: boolean): CSSProperties => ({
  padding: "6px 14px",
  fontSize: 12,
  color: active ? "#fff" : "#666",
  background: active ? "#2a2a3a" : "#13131a",
  border: "1px solid #2a2a3a",
  cursor: "pointer",
});

// Clip the colour rangebetwwn percentiles so a few outliers dont compress the rest of the
function percentileRange(values: Float32Array, lowPct = 0.02, highPct = 0.98): [number, number] {
  const sorted = Float32Array.from(values).sort();
  const lo = sorted[Math.floor((sorted.length - 1) * lowPct)];
  const hi = sorted[Math.floor((sorted.length - 1) * highPct)];
  return [lo, hi];
}

export default function LatentSpace() {
  const [model, setModel] = useState<"ae" | "vae">("ae");
  const [split, setSplit] = useState<"train" | "test">("train");
  const [points, setPoints] = useState<Float32Array | null>(null);
  const [indices, setIndices] = useState<Float32Array | null>(null);
  const [sliderBand, setSliderBand] = useState(0);
  const [nBands, setNBands] = useState(128);

  // Load metadata
  useEffect(() => {
    fetch(`${API}/meta`)
      .then((r) => r.json())
      .then((meta) => setNBands(meta.n_bands));
  }, []);

  // Load tsne based on model and split and update call
  useEffect(() => {
    fetch(`${API}/tsne/${model}/${split}`)
      .then((r) => r.arrayBuffer())
      .then((buf) => setPoints(new Float32Array(buf)));
  }, [model, split]);

  // Load tsne spectral indices based on split and update call
  useEffect(() => {
    fetch(`${API}/tsne/spectra/${split}`)
      .then((r) => r.arrayBuffer())
      .then((buf) => setIndices(new Float32Array(buf)));
  }, [split]);

  // Map the selected band value at each point through a colormap
  const colors = useMemo(() => {
    if (!indices) return null;
    const n = indices.length / nBands;
    const values = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      values[i] = indices[i * nBands + sliderBand];
    }

    const [min, max] = percentileRange(values);
    const lut = new Lut("rainbow", 512).setMin(min).setMax(max);
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const c = lut.getColor(values[i]);
      out[i * 3] = c.r;
      out[i * 3 + 1] = c.g;
      out[i * 3 + 2] = c.b;
    }
    return out;
  }, [indices, sliderBand, nBands]);

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
          camera={{ position: [40, 40, 40], fov: 42 }}
          style={{ width: "100%", height: "100%", background: "#0a0a12" }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1.0} />
          {points && (
            <points>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[points, 3]} />
                {colors && <bufferAttribute attach="attributes-color" args={[colors, 3]} />}
              </bufferGeometry>
              <pointsMaterial size={0.1} sizeAttenuation vertexColors />
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
        {/* Explanation */}
        <div style={{ flex: 1, padding: "16px", fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
          The slider picks one of the {nBands} spectral wavelengths. Each point is coloured by how bright that pixel was
          at the selected wavelength. The values are clipped to the 2nd-98th percentile so a few outliers don't squeeze
          the visuals.
          <br />
          <br />
          Moving the slider re-colours the same t-SNE layout. Watch whether clusters split apart or merge as you scan
          through wavelengths, which reveals whether those clusters differ at that particular wavelength. Check out the
          bright red points that appear at band 60 - the same plume intense values we saw on the first screen.
        </div>

        {/* Slider */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            Spectral band &nbsp;
            <span style={{ color: "#4caf50", fontWeight: 600 }}>{sliderBand}</span>
          </div>
          <input
            type="range"
            min={0}
            max={nBands - 1}
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
