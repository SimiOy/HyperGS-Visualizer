import { useMemo } from "react";
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

  // Camera object
  const sceneCamera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(50, 1.6, 1, 40);
    cam.position.set(0, 0, -15);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    return cam;
  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [30, 30, 30], fov: 42 }}
        style={{ width: "100%", height: "100%", background: "#0a0a12" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.0} />
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.3} sizeAttenuation color="#6dd49f" />
        </points>
        <primitive object={sceneCamera} />
        <cameraHelper args={[sceneCamera]} />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
