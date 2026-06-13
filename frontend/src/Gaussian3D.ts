import * as THREE from "three";

export class Gaussian3D {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  covariance: THREE.Matrix3;
  color: THREE.Color;
  opacity: number;

  constructor(
    position: THREE.Vector3,
    scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1),
    covariance: THREE.Matrix3 = new THREE.Matrix3().identity(),
    color: THREE.Color,
    opacity = 1,
  ) {
    this.position = position;
    this.color = color;
    this.scale = scale;
    this.covariance = covariance;
    this.opacity = opacity;
  }

  toMatrix(): THREE.Matrix4 {
    const quaternion = new THREE.Quaternion();
    return new THREE.Matrix4().compose(this.position, quaternion, this.scale);
  }
}
