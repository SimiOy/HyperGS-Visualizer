import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

const API = "/api";

export default function LatentSpace() {
  const [points, setPoints] = useState<Float32Array | null>(null);

  // Load tsne based on model and split and update call
  useEffect(() => {
    fetch(`${API}/tsne/ae/train`)
      .then((r) => r.arrayBuffer())
      .then((buf) => setPoints(new Float32Array(buf)));
  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
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
  );
}
