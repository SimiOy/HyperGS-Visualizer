import { useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// Preconfigured set of 3D Gaussian centres
function generateGaussians(count = 200): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
  }
  return positions;
}

export default function GaussianSplatting() {
  const positions = useMemo(() => generateGaussians(), []);
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

  // check Gaussians inside and outside frustrum
  const { insidePositions, outsidePositions } = useMemo(() => {
    const projScreenMatrix = new THREE.Matrix4().multiplyMatrices(
      sceneCamera.projectionMatrix, // K (intrinscs)
      sceneCamera.matrixWorldInverse, // E (view matrix)
    ); // P = K @ E
    const frustum = new THREE.Frustum().setFromProjectionMatrix(projScreenMatrix);

    const inside: number[] = [];
    const outside: number[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < positions.length; i += 3) {
      v.set(positions[i], positions[i + 1], positions[i + 2]);
      (frustum.containsPoint(v) ? inside : outside).push(v.x, v.y, v.z);
    }
    return {
      insidePositions: new Float32Array(inside),
      outsidePositions: new Float32Array(outside),
    };
  }, [positions, sceneCamera]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <Canvas
        camera={{ position: [30, 30, 30], fov: 42 }}
        style={{ width: "100%", height: "100%", background: "#0a0a12" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.0} />
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[insidePositions, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.3} sizeAttenuation color="#6dd49f" />
        </points>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[outsidePositions, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.3} sizeAttenuation color="#6dd49f" transparent opacity={0.15} />
        </points>
        <primitive object={sceneCamera} />
        <cameraHelper args={[sceneCamera]} />
        <OrbitControls makeDefault />
      </Canvas>

      {/* Right - camera setting sliders */}
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
