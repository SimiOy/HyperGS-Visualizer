import { useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Gaussian3D } from "../Gaussian3D";
import GaussianInstances from "../components/GaussianInstances";

const SCENE_RADIUS = 10; // eq.16 R

// Preconfigured set of 3D Gaussians
function generateGaussians(count = 200): Gaussian3D[] {
  const gaussians: Gaussian3D[] = [];
  for (let i = 0; i < count; i++) {
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
    );
    const scale = new THREE.Vector3(0.5 + Math.random() * 1.5, 0.5 + Math.random() * 1.5, 0.5 + Math.random() * 1.5);
    const rotation = new THREE.Quaternion().random();
    gaussians.push(new Gaussian3D(position, scale, new THREE.Color("#6dd49f"), 1, rotation));
  }
  return gaussians;
}

export default function GaussianSplatting() {
  const gaussians = useMemo(() => generateGaussians(), []);
  const [fov, setFov] = useState(50);
  const [near, setNear] = useState(1);
  const [far, setFar] = useState(40);
  const [theta, setTheta] = useState(50);
  const [radius, setRadius] = useState(15);
  const [beta, setBeta] = useState(1.7);

  // Camera object
  const sceneCamera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(fov, 1.6, near, far);
    const thetaRad = (theta * Math.PI) / 180;
    cam.position.set(radius * Math.sin(thetaRad), 0, radius * Math.cos(thetaRad));
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    return cam;
  }, [fov, near, far, radius, theta]);

  const { insideGaussians, outsideGaussians } = useMemo(() => {
    const projScreenMatrix = new THREE.Matrix4().multiplyMatrices(
      sceneCamera.projectionMatrix, // K (intrinscs)
      sceneCamera.matrixWorldInverse, // E (view matrix)
    ); // P = K @ E
    const frustum = new THREE.Frustum().setFromProjectionMatrix(projScreenMatrix);

    const inside: Gaussian3D[] = [];
    const outside: Gaussian3D[] = [];
    for (const g of gaussians) {
      // eq. 16: h(d,i)
      const depth = sceneCamera.position.distanceTo(g.position);
      const h = (depth / (beta * SCENE_RADIUS)) ** 2;
      g.scale.copy(g.baseScale).multiplyScalar(h);

      if (frustum.containsPoint(g.position)) {
        g.opacity = 1;
        inside.push(g);
      } else {
        g.opacity = 0.15;
        outside.push(g);
      }
    }
    return { insideGaussians: inside, outsideGaussians: outside };
  }, [gaussians, sceneCamera, beta]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <Canvas
        camera={{ position: [30, 30, 30], fov: 42 }}
        style={{ width: "100%", height: "100%", background: "#0a0a12" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.0} />
        <GaussianInstances gaussians={insideGaussians} />
        <GaussianInstances gaussians={outsideGaussians} />
        <primitive object={sceneCamera} />
        <cameraHelper args={[sceneCamera]} />
        <OrbitControls makeDefault />
      </Canvas>

      {/* Right - camera setting sliders */}
      <div
        style={{
          width: 560,
          minWidth: 300,
          height: "100%",
          background: "#13131a",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid #1e1e2e",
          overflowY: "auto",
        }}
      >
        {/* Explanation */}
        <div style={{ flex: 1, padding: "16px", fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
          HyperGS modifies the adaptive densification processes by scaling the NDC term in eq. 16 by the square of the
          depth relative to the scene's radius (<code>h(d,i)</code>). This is done because Gaussians closer to the
          camera viewpoint are more susceptible to higher gradient differences in the NDC term, than Gaussians further
          away. This is visualized by scaling each 3D Gaussian's size in the scene proportional to this{" "}
          <code>h(d,i)</code> term.
          <br />
          <br />
          The <span style={{ color: "#4caf50", fontWeight: 600 }}>camera params</span> (FOV, Near plane, Far plane)
          define the camera's projection frustum (shown as a wireframe frustum). Gaussians falling outside this frustum
          are rendered more transparent to simbolize that they are not visible in the current camera projection.
          <br />
          <br />
          The <span style={{ color: "#c39c40", fontWeight: 600 }}>camera position</span> (Radius, Theta) orbits the
          camera around the scene origin. You can change theta to modify the camera's position on the circle, or the
          Radius to modify the orbit's distance from scene origin.
          <br />
          <br />
          <span style={{ color: "#e07a5f", fontWeight: 600 }}>Beta</span> controls eq. 16 from the paper, the
          depth-scaling function <code>h(d,i) = (depth_i / (beta × R))²</code>, where <code>depth_i</code> is the
          distance from the camera to Gaussian i and <code>R</code> is the scene radius. Play around with the parameter
          and notice how a lower beta exaggerates how much a Gaussian's size grows or shrinks with depth, while a higher
          beta dampens this effect so Gaussians stay closer to a uniform size regardless of depth.
        </div>

        {/* Sliders */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            Camera FOV &nbsp;
            <span style={{ color: "#4caf50", fontWeight: 600 }}>{fov}</span>
          </div>
          <input
            type="range"
            min={20}
            max={100}
            step={1}
            value={fov}
            onChange={(e) => setFov(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#4caf50" }}
          />
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            Camera Near plane &nbsp;
            <span style={{ color: "#4caf50", fontWeight: 600 }}>{near}</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.1}
            value={near}
            onChange={(e) => setNear(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#4caf50" }}
          />
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            Camera Far plane &nbsp;
            <span style={{ color: "#4caf50", fontWeight: 600 }}>{far}</span>
          </div>
          <input
            type="range"
            min={10}
            max={60}
            step={1}
            value={far}
            onChange={(e) => setFar(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#4caf50" }}
          />
        </div>
        <br></br>
        <br></br>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            Camera Radius &nbsp;
            <span style={{ color: "#c39c40", fontWeight: 600 }}>{radius}</span>
          </div>
          <input
            type="range"
            min={5}
            max={20}
            step={1}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#c39c40" }}
          />
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            Camera Theta &nbsp;
            <span style={{ color: "#c39c40", fontWeight: 600 }}>{theta}</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={theta}
            onChange={(e) => setTheta(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#c39c40" }}
          />
        </div>
        <br></br>
        <br></br>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            Beta (scaling factor) &nbsp;
            <span style={{ color: "#e07a5f", fontWeight: 600 }}>{beta.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={beta}
            onChange={(e) => setBeta(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#e07a5f" }}
          />
        </div>
      </div>
    </div>
  );
}
