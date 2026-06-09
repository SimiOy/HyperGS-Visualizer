import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  wavelengths: number[];
  spectrum: number[] | null;
  color: string;
}

export default function SpectralPlot({ wavelengths, spectrum, color }: Props) {
  const data = [];
  if (spectrum) {
    for (let i = 0; i < spectrum.length; i++) {
      data.push({ wl: wavelengths[i], v: spectrum[i] });
    }
  }

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
        Spectral profile
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
                  value: "µm",
                  position: "insideBottomRight",
                  offset: -4,
                  fill: "#555",
                  fontSize: 9,
                }}
              />
              <YAxis hide />
              <Tooltip
                formatter={(v: number) => v.toFixed(4)}
                labelFormatter={(wl: number) => `${wl.toFixed(2)} µm`}
                contentStyle={{
                  background: "#1a1a2e",
                  border: "1px solid #333",
                  fontSize: 10,
                }}
                itemStyle={{ color: "#ccc" }}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke={color}
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
