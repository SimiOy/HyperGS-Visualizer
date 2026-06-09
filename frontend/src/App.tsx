import HyperspectralCube from "./screens/HyperspectralCube";

export default function App() {
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
        }}
      >
        <span style={{ fontWeight: 600, letterSpacing: 1 }}>HyperGS Visualizer</span>
        <span style={{ marginLeft: 16, fontSize: 12, color: "#888" }}>
          HyperGS: Hyperspectral 3D Gaussian Splatting
        </span>
      </header>
      <main style={{ flex: 1, overflow: "hidden" }}>
        <HyperspectralCube />
      </main>
    </div>
  );
}
