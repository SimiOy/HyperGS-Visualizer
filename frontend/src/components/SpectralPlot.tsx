import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface Props {
  wavelengths: number[];
  spectrum: number[] | null;
  color: string;
  highlightBand?: number;
  title?: string;
  xLabel?: string;
  spectrum2?: number[] | null;
  color2?: string;
  label?: string;
  label2?: string;
}

export default function SpectralPlot({
  wavelengths,
  spectrum,
  color,
  highlightBand,
  title = "Spectral profile",
  xLabel = "µm",
  spectrum2,
  color2,
  label,
  label2,
}: Props) {
  const data = [];
  if (spectrum) {
    for (let i = 0; i < spectrum.length; i++) {
      data.push({ wl: wavelengths[i], v: spectrum[i], v2: spectrum2 ? spectrum2[i] : undefined });
    }
  }

  // Gen AI Assisted
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          fontSize: 11,
          color: "#aaa",
          borderBottom: "1px solid #222",
        }}
      >
        {title}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 4px",
        }}
      >
        {!spectrum ? (
          <span style={{ fontSize: 11, color: "#555" }}>click a pixel on the cube</span>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 20, left: 8 }}>
              <XAxis
                dataKey="wl"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v: number) => v.toFixed(1)}
                tick={{ fill: "#888", fontSize: 9 }}
                tickLine={false}
                label={{
                  value: xLabel,
                  position: "insideBottomRight",
                  offset: -4,
                  fill: "#555",
                  fontSize: 9,
                }}
              />
              <YAxis hide />
              <Tooltip
                formatter={(v) => (typeof v === "number" ? v.toFixed(4) : String(v))}
                labelFormatter={(wl) => (typeof wl === "number" ? `${wl.toFixed(2)} ${xLabel}` : String(wl))}
                contentStyle={{
                  background: "#1a1a2e",
                  border: "1px solid #333",
                  fontSize: 10,
                }}
                itemStyle={{ color: "#ccc" }}
              />
              {highlightBand !== undefined && (
                <ReferenceLine
                  x={wavelengths[highlightBand]}
                  stroke="#4caf50"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
              )}
              {spectrum2 && <Legend wrapperStyle={{ fontSize: 10 }} />}
              <Line
                type="monotone"
                dataKey="v"
                name={label}
                stroke={color}
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
              {spectrum2 && (
                <Line
                  type="monotone"
                  dataKey="v2"
                  name={label2}
                  stroke={color2}
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
