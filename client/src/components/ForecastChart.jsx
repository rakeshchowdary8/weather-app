import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { temp, time } from "../utils/format";
export default function ForecastChart({ data, units, tz }) {
  const points = data
    .slice(0, 24)
    .map((x) => ({ ...x, label: time(x.time, tz) }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={points}>
          <defs>
            <linearGradient id="temp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity=".5" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis hide domain={["dataMin - 3", "dataMax + 3"]} />
          <Tooltip formatter={(v) => temp(v, units)} />
          <Area
            type="monotone"
            dataKey="temperature"
            stroke="#38bdf8"
            fill="url(#temp)"
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
