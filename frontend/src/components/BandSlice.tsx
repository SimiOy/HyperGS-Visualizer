import { useEffect, useRef } from "react";

interface Props {
  bandData: Float32Array | null; // 128×128
  highlightColor: string;
}

export default function BandSlice({ bandData, highlightColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const SIZE = 128;

    ctx.clearRect(0, 0, SIZE, SIZE);

    if (!bandData) {
      ctx.fillStyle = "#1a1a24";
      ctx.fillRect(0, 0, SIZE, SIZE);
      return;
    }

    const imageData = ctx.createImageData(SIZE, SIZE);
    let min = Infinity,
      max = -Infinity;
    for (let i = 0; i < bandData.length; i++) {
      if (bandData[i] < min) min = bandData[i];
      if (bandData[i] > max) max = bandData[i];
    }
    const range = max - min || 1;
    for (let i = 0; i < bandData.length; i++) {
      const v = Math.round(((bandData[i] - min) / range) * 255);
      imageData.data[i * 4 + 0] = v;
      imageData.data[i * 4 + 1] = v;
      imageData.data[i * 4 + 2] = v;
      imageData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }, [bandData, highlightColor]);

  // Gen AI Assisted
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "8px 12px",
          fontSize: 11,
          color: "#aaa",
          borderBottom: "1px solid #222",
        }}
      >
        Single-band greyscale slice
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
        <canvas
          ref={canvasRef}
          width={128}
          height={128}
          style={{ imageRendering: "pixelated", width: "min(100%, 200px)", height: "auto" }}
        />
      </div>
    </div>
  );
}
