import { useRef, useEffect } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { Gaussian3D } from "../Gaussian3D";

interface Props {
  gaussians: Gaussian3D[];
  onSelect?: (id: number) => void;
}

export default function GaussianInstances({ gaussians, onSelect }: Props) {
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

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    onSelect?.(gaussians[e.instanceId].id);
  }

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, gaussians.length]} onClick={handleClick}>
      <sphereGeometry args={[0.3, 12, 12]} />
      <meshStandardMaterial transparent={opacity < 1} opacity={opacity} />
    </instancedMesh>
  );
}
