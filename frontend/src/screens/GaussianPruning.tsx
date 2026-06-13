import { useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Gaussian3D } from "../Gaussian3D";
import GaussianInstances from "../components/GaussianInstances";
import SpectralPlot from "../components/SpectralPlot";

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

// mock per-Gaussian importance score, eq. 17:
function computeImportance(gaussians: Gaussian3D[]): number[] {
  return gaussians.map((g) => {
    const matchQuality = 1 - Math.abs(Math.random() - Math.random()); // (1 - |C* - Dec|) mock
    return matchQuality * g.opacity; // alpha_i * T_i mock
  });
}

export default function GaussianPruning() {
  const gaussians = useMemo(() => generateGaussians(), []);

  // sorted descending to mirror eq.18's per-pixel ranking
  const sortedImportance = useMemo(() => computeImportance(gaussians).sort((a, b) => b - a), [gaussians]);
  const ranks = useMemo(() => sortedImportance.map((_, i) => i), [sortedImportance]);

  const [fov, setFov] = useState(50);
  const [near, setNear] = useState(1);
  const [far, setFar] = useState(40);
  const [theta, setTheta] = useState(50);
  const [radius, setRadius] = useState(15);

  // Camera object
  const sceneCamera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(fov, 1.6, near, far);
    const thetaRad = (theta * Math.PI) / 180;
    cam.position.set(radius * Math.sin(thetaRad), 0, radius * Math.cos(thetaRad));
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    return cam;
  }, [fov, near, far, radius, theta]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <Canvas
        camera={{ position: [30, 30, 30], fov: 42 }}
        style={{ width: "100%", height: "100%", background: "#0a0a12" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.0} />
        <GaussianInstances gaussians={gaussians} />
        <primitive object={sceneCamera} />
        <cameraHelper args={[sceneCamera]} />
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

        {/* Importance score distribution */}
        <div style={{ borderTop: "1px solid #1e1e2e" }}>
          <SpectralPlot
            wavelengths={ranks}
            spectrum={sortedImportance}
            color="#6dd49f"
            title="Importance score (sorted)"
            xLabel="rank"
          />
        </div>

        {/* Sliders */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            Camera FOV &nbsp;
            <span style={{ color: "#4caf50", fontWeight: 600 }}>{fov}</span>
          </div>
          <input
            type="range"
            min={20}
            max={100}
            step={1}
            value={fov}
            onChange={(e) => setFov(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#4caf50" }}
          />
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            Camera Near plane &nbsp;
            <span style={{ color: "#4caf50", fontWeight: 600 }}>{near}</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.1}
            value={near}
            onChange={(e) => setNear(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#4caf50" }}
          />
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            Camera Far plane &nbsp;
            <span style={{ color: "#4caf50", fontWeight: 600 }}>{far}</span>
          </div>
          <input
            type="range"
            min={10}
            max={60}
            step={1}
            value={far}
            onChange={(e) => setFar(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#4caf50" }}
          />
        </div>
        <br></br>
        <br></br>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            Camera Radius &nbsp;
            <span style={{ color: "#c39c40", fontWeight: 600 }}>{radius}</span>
          </div>
          <input
            type="range"
            min={5}
            max={20}
            step={1}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#c39c40" }}
          />
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            Camera Theta &nbsp;
            <span style={{ color: "#c39c40", fontWeight: 600 }}>{theta}</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={theta}
            onChange={(e) => setTheta(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#c39c40" }}
          />
        </div>
      </div>
    </div>
  );
}
