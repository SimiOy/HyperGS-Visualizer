import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const N = 128;

// Build a DataTexture from a Float32Array, with Y flipped for Three.js
function float32ToTexture(data: Float32Array): THREE.DataTexture {
  const rgba = new Uint8Array(N * N * 4);
  let min = Infinity,
    max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const range = max - min || 1;
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const srcIdx = row * N + col;
      // flip Y
      const dstIdx = (N - 1 - row) * N + col;
      const v = Math.round(((data[srcIdx] - min) / range) * 255);
      rgba[dstIdx * 4 + 0] = v;
      rgba[dstIdx * 4 + 1] = v;
      rgba[dstIdx * 4 + 2] = v;
      rgba[dstIdx * 4 + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(rgba, N, N, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

const sideMat = new THREE.MeshStandardMaterial({
  color: "#1a1a2e",
  transparent: true,
  opacity: 0.18,
  depthWrite: false,
});

interface Props {
  bandData: Float32Array | null;
}

export default function DataCube({ bandData }: Props) {
  const [texture, setTexture] = useState<THREE.DataTexture | null>(null);

  useEffect(() => {
    if (bandData) setTexture(float32ToTexture(bandData));
  }, [bandData]);

  const materials = [
    sideMat,
    sideMat,
    sideMat,
    sideMat,
    new THREE.MeshStandardMaterial({ color: "#ffffff", map: texture ?? undefined }), // front
    new THREE.MeshStandardMaterial({ color: "#1a1a2e", transparent: true, opacity: 0.0, depthWrite: false }), // back
  ];

  return (
    <Canvas
      camera={{ position: [2.8, 2.2, 3.2], fov: 42 }}
      style={{ width: "100%", height: "100%", background: "#0a0a12" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.0} />
      <mesh material={materials}>
        <boxGeometry args={[2, 2, 2]} />
      </mesh>
      <OrbitControls enablePan={false} />
    </Canvas>
  );
}
