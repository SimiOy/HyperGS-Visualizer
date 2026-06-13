import * as THREE from "three";

export class Gaussian3D {
  position: THREE.Vector3;
  baseScale: THREE.Vector3;
  scale: THREE.Vector3;
  color: THREE.Color;
  opacity: number;

  constructor(
    position: THREE.Vector3,
    scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1),
    color: THREE.Color,
    opacity = 1,
  ) {
    this.position = position;
    this.color = color;
    this.baseScale = scale.clone();
    this.scale = scale;
    this.opacity = opacity;
  }

  toMatrix(): THREE.Matrix4 {
    const quaternion = new THREE.Quaternion();
    return new THREE.Matrix4().compose(this.position, quaternion, this.scale);
  }
}
