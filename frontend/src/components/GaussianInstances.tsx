import { useRef, useEffect } from "react";
import * as THREE from "three";
import { Gaussian3D } from "../Gaussian3D";

export default function GaussianInstances({ gaussians }: { gaussians: Gaussian3D[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < gaussians.length; i++) {
      const g = gaussians[i];
      mesh.setMatrixAt(i, g.toMatrix());
      mesh.setColorAt(i, g.color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [gaussians]);

  if (gaussians.length === 0) return null;

  const opacity = gaussians[0].opacity;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, gaussians.length]}>
      <sphereGeometry args={[0.3, 12, 12]} />
      <meshStandardMaterial transparent={opacity < 1} opacity={opacity} />
    </instancedMesh>
  );
}
