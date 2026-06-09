import { useRef, useEffect, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const CUBE_SIZE = 2;
const N = 128;

// build a DataTexture from a Float32Array, with Y flipped for Three.js
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

interface SceneProps {
  bandTexture: THREE.DataTexture | null;
  selectedPixel: { row: number; col: number } | null;
  onPixelClick: (row: number, col: number) => void;
  colColor: string;
  highlightBand: number;
}

function Scene({ bandTexture, selectedPixel, onPixelClick, colColor, highlightBand }: SceneProps) {
  const cubeRef = useRef<THREE.Mesh>(null!);

  const materials = [
    new THREE.MeshStandardMaterial({ color: "#1a1a2e", transparent: true, opacity: 0.18, depthWrite: false }),
    new THREE.MeshStandardMaterial({ color: "#1a1a2e", transparent: true, opacity: 0.18, depthWrite: false }),
    new THREE.MeshStandardMaterial({ color: "#1a1a2e", transparent: true, opacity: 0.18, depthWrite: false }),
    new THREE.MeshStandardMaterial({ color: "#1a1a2e", transparent: true, opacity: 0.18, depthWrite: false }),
    new THREE.MeshStandardMaterial({ color: "#ffffff", map: bandTexture ?? undefined }), // front - fully opaque
    new THREE.MeshStandardMaterial({ color: "#1a1a2e", transparent: true, opacity: 0.0, depthWrite: false }),
  ];

  useEffect(() => {
    if (bandTexture) {
      const mat = materials[4] as THREE.MeshStandardMaterial;
      mat.map = bandTexture;
      mat.needsUpdate = true;
    }
  }, [bandTexture]);

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (!e.face || !e.uv) return;
    if (e.face.materialIndex !== 4) return;
    const col = Math.max(0, Math.min(N - 1, Math.floor(e.uv.x * N)));
    const row = Math.max(0, Math.min(N - 1, Math.floor((1 - e.uv.y) * N)));
    // callback passed here
    onPixelClick(row, col);
  }

  const colX = selectedPixel ? (selectedPixel.col / N - 0.5) * CUBE_SIZE : 0;
  const colY = selectedPixel ? (0.5 - selectedPixel.row / N) * CUBE_SIZE : 0;

  // Gen AI Assisted
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.0} />
      <directionalLight position={[-3, 2, -3]} intensity={0.3} />

      <mesh ref={cubeRef} material={materials} onClick={handleClick}>
        <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
      </mesh>

      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)]} />
        <lineBasicMaterial color="#334" />
      </lineSegments>

      <mesh position={[0, 0, -CUBE_SIZE / 2 + (highlightBand / (N - 1)) * CUBE_SIZE]} renderOrder={1}>
        <planeGeometry args={[CUBE_SIZE, CUBE_SIZE]} />
        <meshStandardMaterial color="#09c413" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {selectedPixel && (
        <mesh position={[colX, colY, 0]} renderOrder={1}>
          <boxGeometry args={[CUBE_SIZE / N, CUBE_SIZE / N, CUBE_SIZE + 0.04]} />
          <meshStandardMaterial color={colColor} depthWrite={false} />
        </mesh>
      )}

      <OrbitControls makeDefault enablePan={false} />
    </>
  );
}

interface Props {
  bandData: Float32Array | null;
  selectedPixel: { row: number; col: number } | null;
  onPixelClick: (row: number, col: number) => void;
  colColor?: string;
  highlightBand?: number;
}

export default function DataCube({ bandData, selectedPixel, onPixelClick, colColor = "#ff6b35", highlightBand = 0 }: Props) {
  const [texture, setTexture] = useState<THREE.DataTexture | null>(null);

  useEffect(() => {
    if (bandData) setTexture(float32ToTexture(bandData));
  }, [bandData]);

  return (
    <Canvas
      camera={{ position: [2.8, 2.2, 3.2], fov: 42 }}
      style={{ width: "100%", height: "100%", background: "#0a0a12" }}
    >
      <Scene bandTexture={texture} selectedPixel={selectedPixel} onPixelClick={onPixelClick} colColor={colColor} highlightBand={highlightBand} />
    </Canvas>
  );
}
