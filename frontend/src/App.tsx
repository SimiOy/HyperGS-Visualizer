import { useState, type CSSProperties } from "react";
import HyperspectralCube from "./screens/HyperspectralCube";
import LatentSpace from "./screens/LatentSpace";
import GaussianSplatting from "./screens/GaussianSplatting";
import GaussianPruning from "./screens/GaussianPruning";

const SCREENS = [HyperspectralCube, LatentSpace, GaussianSplatting, GaussianPruning];
const SCREEN_SUBTITLES = [
  "Hyperspectral data cube",
  "AE/VAE embeddings projected with t-SNE",
  "Adapative Densification",
  "Importance Score Pruning",
];

const navBtn: CSSProperties = {
  padding: "6px 14px",
  fontSize: 12,
  color: "#ddd",
  background: "#1e1e2e",
  border: "1px solid #2a2a3a",
  borderRadius: 4,
  cursor: "pointer",
};

// Gen AI Assisted
export default function App() {
  const [screen, setScreen] = useState(0);
  const Screen = SCREENS[screen];

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid #2a2a3a",
          background: "#13131a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <span style={{ fontWeight: 600, letterSpacing: 1 }}>HyperGS Visualizer</span>
          <span style={{ marginLeft: 16, fontSize: 12, color: "#888" }}>{SCREEN_SUBTITLES[screen]}</span>
        </div>
        <div>
          <button
            onClick={() => setScreen((s) => Math.max(0, s - 1))}
            disabled={screen === 0}
            style={{ ...navBtn, opacity: screen === 0 ? 0.4 : 1 }}
          >
            Back
          </button>
          <button
            onClick={() => setScreen((s) => Math.min(SCREENS.length - 1, s + 1))}
            disabled={screen === SCREENS.length - 1}
            style={{ ...navBtn, marginLeft: 8, opacity: screen === SCREENS.length - 1 ? 0.4 : 1 }}
          >
            Next
          </button>
        </div>
      </header>
      <main style={{ flex: 1, overflow: "hidden" }}>
        <Screen />
      </main>
    </div>
  );
}
