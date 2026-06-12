import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

export default function LatentSpace() {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [3, 3, 3], fov: 50 }}
        style={{ width: "100%", height: "100%", background: "#0a0a12" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.0} />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
