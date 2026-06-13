import { useState, useMemo, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Gaussian3D } from "../Gaussian3D";
import GaussianInstances from "../components/GaussianInstances";
import SpectralPlot from "../components/SpectralPlot";

const API = "/api";
const MODEL = "ae";
const SPLIT = "train";

const N_GAUSSIANS = 200;
const N_VIEWS = 4;
const N_PIXELS = 8;
const N_SLICES = N_VIEWS * N_PIXELS; // (p,d) slices

interface Meta {
  n_bands: number;
  wavelengths: number[];
}

// Preconfigured set of 3D Gaussians
function generateGaussians(count = N_GAUSSIANS): Gaussian3D[] {
  const gaussians: Gaussian3D[] = [];
  for (let i = 0; i < count; i++) {
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
    );
    const scale = new THREE.Vector3(0.5 + Math.random() * 1.5, 0.5 + Math.random() * 1.5, 0.5 + Math.random() * 1.5);
    const rotation = new THREE.Quaternion().random();
    const g = new Gaussian3D(position, scale, new THREE.Color("#6dd49f"), 1, rotation);
    g.id = i;
    gaussians.push(g);
  }
  return gaussians;
}

function meanAbsDiff(a: Float32Array, aRow: number, b: Float32Array, bRow: number, nBands: number): number {
  const aOff = aRow * nBands;
  const bOff = bRow * nBands;
  let sum = 0;
  for (let i = 0; i < nBands; i++) {
    sum += Math.abs(a[aOff + i] - b[bOff + i]);
  }
  return sum / nBands;
}

// I[g_i,p,d], eq. 17
function computeImportanceTensor(
  gaussians: Gaussian3D[],
  recon: Float32Array,
  groundTruth: Float32Array,
  decIdx: number[],
  gtIdx: number[],
  nBands: number,
): number[][] {
  return gaussians.map((g, gi) =>
    Array.from({ length: N_SLICES }, (_, s) => {
      const matchQuality = 1 - meanAbsDiff(recon, decIdx[gi], groundTruth, gtIdx[s], nBands); // (1 - |C* - Dec|)
      return matchQuality * g.baseOpacity; // alpha_i (T_i omitted)
    }),
  );
}

// eq. 18: gi survives if Rank(gi, I[:,p,d]) < k for any (p,d) slice
function computeSurvivalCounts(importance: number[][], k: number): [number[], Map<number, number>] {
  const survivalCounts = new Array(importance.length).fill(0);
  const survivalMap: Map<number, number> = new Map();
  for (let gi = 0; gi < importance.length; gi++) {
    survivalMap.set(gi, 0);
  }
  for (let s = 0; s < N_SLICES; s++) {
    for (let gi = 0; gi < importance.length; gi++) {
      let rank = 0;
      for (let other = 0; other < importance.length; other++) {
        if (importance[other][s] > importance[gi][s]) rank++;
      }
      if (rank < k) {
        survivalCounts[gi]++;
        survivalMap.set(gi, s);
      }
    }
  }
  return [survivalCounts, survivalMap];
}

export default function GaussianPruning() {
  const gaussians = useMemo(() => generateGaussians(), []);
  const [topK, setTopK] = useState(5);

  const [meta, setMeta] = useState<Meta | null>(null);
  const [recon, setRecon] = useState<Float32Array | null>(null);
  const [groundTruth, setGroundTruth] = useState<Float32Array | null>(null);
  const [sampleVersion, setSampleVersion] = useState(0);
  const [gIdx, setGIdx] = useState(0);
  const [sIdx, setSIdx] = useState(0);

  useEffect(() => {
    fetch(`${API}/meta`)
      .then((r) => r.json())
      .then(setMeta);
  }, []);
  const nBands = meta?.n_bands ?? 128;

  // Dec(fi)
  useEffect(() => {
    fetch(`${API}/reconstruct/${MODEL}/${SPLIT}`)
      .then((r) => r.arrayBuffer())
      .then((buf) => setRecon(new Float32Array(buf)));
  }, []); // M x 128

  // C*_d(p)
  useEffect(() => {
    fetch(`${API}/tsne/spectra/${SPLIT}`)
      .then((r) => r.arrayBuffer())
      .then((buf) => setGroundTruth(new Float32Array(buf)));
  }, []); // M x 128

  // for Dec(f_i): 200 x 1
  const decPixelIdx = useMemo(() => {
    if (!recon) return null;
    const n = recon.length / nBands;
    return gaussians.map(() => Math.floor(Math.random() * n));
  }, [gaussians, recon, nBands, sampleVersion]);

  // for C*_d(p): N_slices x 1
  const gtPixelIdx = useMemo(() => {
    if (!groundTruth) return null;
    const n = groundTruth.length / nBands;
    return Array.from({ length: N_SLICES }, () => Math.floor(Math.random() * n));
  }, [groundTruth, nBands, sampleVersion]);

  const importanceTensor = useMemo(() => {
    if (!recon || !groundTruth || !decPixelIdx || !gtPixelIdx) return null;
    return computeImportanceTensor(gaussians, recon, groundTruth, decPixelIdx, gtPixelIdx, nBands);
  }, [gaussians, recon, groundTruth, decPixelIdx, gtPixelIdx, nBands]);

  // importanceTensor[gIdx][sIdx]: Dec(f_gIdx) vs C*_d(p) for slice sIdx
  const { decExample, gtExample } = useMemo(() => {
    if (!recon || !groundTruth || !decPixelIdx || !gtPixelIdx) return { decExample: null, gtExample: null };
    const decOff = decPixelIdx[gIdx] * nBands;
    const gtOff = gtPixelIdx[sIdx] * nBands;
    return {
      decExample: Array.from(recon.subarray(decOff, decOff + nBands)),
      gtExample: Array.from(groundTruth.subarray(gtOff, gtOff + nBands)),
    };
  }, [recon, groundTruth, decPixelIdx, gtPixelIdx, nBands, gIdx, sIdx]);

  // eq. 18: union of per-slice top-K survivors
  const { keptGaussians, prunedGaussians, survivalSorted, survivalMap } = useMemo(() => {
    gaussians.forEach((g, i) => {
      if (i === gIdx) {
        g.color = new THREE.Color("red");
      } else {
        g.color = new THREE.Color("#6dd49f");
      }
    });
    if (!importanceTensor) {
      return {
        keptGaussians: gaussians,
        prunedGaussians: [] as Gaussian3D[],
        survivalSorted: [] as number[],
        survivalMap: new Map<number, number>(),
      };
    }
    const [survivalCounts, survivalMap] = computeSurvivalCounts(importanceTensor, topK);
    const kept: Gaussian3D[] = [];
    const pruned: Gaussian3D[] = [];
    gaussians.forEach((g, i) => {
      if (survivalCounts[i] > 0) {
        g.opacity = 1;
        kept.push(g);
      } else {
        g.opacity = 0.15;
        pruned.push(g);
      }
    });
    return {
      keptGaussians: kept,
      prunedGaussians: pruned,
      survivalSorted: [...survivalCounts].sort((a, b) => b - a), // descending
      survivalMap,
    };
  }, [gaussians, importanceTensor, topK, gIdx]);

  const ranks = useMemo(() => survivalSorted.map((_, i) => i), [survivalSorted]);

  function handleSelect(id: number) {
    setGIdx(id);
    setSIdx(survivalMap.get(id) ?? 0);
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <Canvas
        camera={{ position: [30, 30, 30], fov: 42 }}
        style={{ width: "100%", height: "100%", background: "#0a0a12" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.0} />
        <GaussianInstances gaussians={keptGaussians} onSelect={handleSelect} />
        <GaussianInstances gaussians={prunedGaussians} onSelect={handleSelect} />
        <OrbitControls makeDefault />
      </Canvas>

      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 11,
          color: "#555",
          pointerEvents: "none",
        }}
      >
        click a Gaussian in the scene to inspect
      </div>

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
          For each Gaussian <code>gi</code> and each of the {N_SLICES} ({N_PIXELS} pixels x {N_VIEWS} views) sampled
          (p,d) pixel/view slices, HyperGS computes an importance score{" "}
          <code>I[gi,p,d] = (1-|C*_d(p)-Dec(fi)|) * alpha_i * T_i</code> (eq. 17), where <code>Dec(fi)</code> is the
          AE's decoded spectrum for that Gaussian and <code>C*_d(p)</code> is the ground-truth spectrum for that slice.
          The higher the importance score, the more relevant that Gaussian is for the Hyperspectral 3D reconstruction
          and thus higher the chances it is retained.
          <br />
          <br />A Gaussian survives (<span style={{ color: "#6dd49f", fontWeight: 600 }}>green</span>) if it ranks in
          the top-<code>τ</code> for at least one slice (pixel x view combination), otherwise it is pruned (eq. 18).
          Click any Gaussian to inspect it: it turns <span style={{ color: "red", fontWeight: 600 }}>red</span> and its{" "}
          <code>Dec(f_gi)</code> spectrum is plotted below, and the slice index jumps to the slice this Gaussian
          survived for (i.e best hyperspectral reconstruction).
          <br />
          <br />
          Use the <span style={{ color: "#e07a5f", fontWeight: 600 }}>slice index</span> slider to pick which slice's
          ground-truth spectrum <code>C*_d(p)</code> to compare against - the closer the two curves, the higher the{" "}
          <code>importance score</code> for that slice. The{" "}
          <span style={{ color: "#c39c40", fontWeight: 600 }}>Top-K (τ)</span> slider sets the pruning threshold. The
          plot above shows the eq. 18 survival count (i.e for how many slices was this Gaussian in the Top-K rank) for
          each Gaussian, sorted from highest to lowest.
          <br />
          <br />
          <span style={{ fontWeight: 600 }}>Resample</span> re-rolls which pixels' spectra and reconstructions are used
          for each of the {N_GAUSSIANS} Gaussians and {N_SLICES} slices from the already pre-processed hyperspectral
          dataset.
        </div>

        {/* Survival count distribution */}
        <div style={{ borderTop: "1px solid #1e1e2e" }}>
          <SpectralPlot
            wavelengths={ranks}
            spectrum={survivalSorted}
            color="#c39c40"
            title={`Survival count per Gaussian (sorted): ${keptGaussians.length}/${gaussians.length} kept`}
            xLabel="gaussian sorted idx"
          />
        </div>

        {/* g_idx and s_idx sliders and importance score plot */}
        <div style={{ borderTop: "1px solid #1e1e2e" }}>
          <SpectralPlot
            wavelengths={meta?.wavelengths ?? []}
            spectrum={decExample}
            spectrum2={gtExample}
            color="#6dd49f"
            color2="#e07a5f"
            label={`Dec(f_${gIdx})`}
            label2="C*_d(p)"
            title={`Example importance score pair: I[${gIdx},${sIdx}]`}
          />
        </div>
        <div style={{ padding: "8px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ display: "flex", gap: 24, fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            <div>
              Slice index (p,d) &nbsp;
              <span style={{ color: "#e07a5f", fontWeight: 600 }}>{sIdx}</span>
            </div>
            <div>
              Gaussian index (gi) &nbsp;
              <span style={{ color: "#6dd49f", fontWeight: 600 }}>{gIdx}</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={N_SLICES - 1}
            step={1}
            value={sIdx}
            onChange={(e) => setSIdx(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#e07a5f" }}
          />
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setSampleVersion((v) => v + 1)}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                color: "#ddd",
                background: "#1e1e2e",
                border: "1px solid #2a2a3a",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Resample
            </button>
          </div>
        </div>

        {/* Sliders */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>
            Top-K per slice (τ) &nbsp;
            <span style={{ color: "#c39c40", fontWeight: 600 }}>{topK}</span>
          </div>
          <input
            type="range"
            min={1}
            max={75}
            step={1}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#c39c40" }}
          />
        </div>
        <br></br>
        <br></br>
      </div>
    </div>
  );
}
