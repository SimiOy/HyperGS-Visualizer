import * as THREE from "three";

export class Gaussian3D {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  baseScale: THREE.Vector3;
  scale: THREE.Vector3;
  color: THREE.Color;
  opacity: number;
  baseOpacity: number;

  constructor(
    position: THREE.Vector3,
    scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1),
    color: THREE.Color,
    opacity = 1,
    rotation: THREE.Quaternion = new THREE.Quaternion(),
  ) {
    this.position = position;
    this.color = color;
    this.baseScale = scale.clone();
    this.scale = scale;
    this.opacity = opacity;
    this.baseOpacity = opacity;
    this.rotation = rotation;
  }

  toMatrix(): THREE.Matrix4 {
    return new THREE.Matrix4().compose(this.position, this.rotation, this.scale);
  }
}
