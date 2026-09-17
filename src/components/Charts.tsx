import { useId, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Info } from 'lucide-react';
import { colors, compact, money, number } from '../config';
import { modelTable } from '../data/StaticTelemetrySource';
import { waitTone } from '../data/selectors';
import type { GatesPayload, WidgetModel } from '../types';
const tooltipStyle = {
  background: '#182333',
  border: '1px solid #3d5068',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 12,
};
const axis = { stroke: colors.muted, fontSize: 10, tickLine: false, axisLine: false };
const palette = [colors.teal, colors.blue, colors.amber, colors.red];
export function DataTable({
  columns,
  rows,
  label,
  compact: small = false,
}: {
  columns: string[];
  rows: (string | number)[][];
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={'data-table-wrap ' + (small ? 'is-compact' : '')}
      tabIndex={0}
      role="region"
      aria-label={label + ' table, scroll for more rows'}
    >
      <table>
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th scope="col" key={c}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>
                    {typeof c === 'number' ? number(c, Number.isInteger(c) ? 0 : 2) : c}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>No records for this selection.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export function ChartTable({ model, compact = false }: { model: WidgetModel; compact?: boolean }) {
  const table = modelTable(model);
  return <DataTable {...table} label={model.id} compact={compact} />;
}
function GateMatrix({ data }: { data: GatesPayload }) {
  const [selected, setSelected] = useState<string | null>(null);
  const gate = data.rows.find((r) => r.id === selected);
  return (
    <div className="gate-visual">
      <div className="gate-matrix">
        {data.rows.map((g) => (
          <button
            key={g.id}
            className={'gate ' + g.status + (g.id === selected ? ' selected' : '')}
            aria-pressed={g.id === selected}
            aria-label={g.id + ', ' + g.status + ', ' + g.assignment}
            onClick={() => setSelected(g.id)}
            title={g.id + ' · ' + g.status}
          >
            {g.id}
          </button>
        ))}
      </div>
      <div className="chart-legend gate-legend">
        {(['free', 'occupied', 'reserved', 'unavailable'] as const).map((s) => (
          <span key={s}>
            <i className={'dot ' + s} />
            {s} <strong>{data.rows.filter((r) => r.status === s).length}</strong>
          </span>
        ))}
      </div>
      <p className="gate-detail" aria-live="polite">
        {gate
          ? gate.id + ' · ' + gate.status + ' · ' + gate.assignment
          : 'Select a gate to inspect its assignment'}
      </p>
    </div>
  );
}
export function MetricChart({ model }: { model: WidgetModel }) {
  const uid = useId().replace(/:/g, '');
  const data = model.data;
  if (model.state !== 'ready')
    return (
      <div className="empty-metric">
        <Info size={25} />
        <strong>{model.state === 'not-applicable' ? 'Not applicable' : 'No matching data'}</strong>
        <span>
          {model.state === 'not-applicable'
            ? 'Choose a supported movement to view this metric.'
            : 'Try another terminal or time window.'}
        </span>
      </div>
    );
  if (data.kind === 'series' || data.kind === 'revenue' || data.kind === 'runway') {
    const points = data.points;
    const color =
      model.id === 'mishandling'
        ? colors.amber
        : model.id === 'revenue'
          ? colors.blue
          : colors.teal;
    const forecast = data.kind === 'series' && Boolean(data.forecastLabel);
    return (
      <div className="chart-flex">
        <div
          className="chart-canvas"
          role="img"
          aria-label={model.id + ' chart; exact values available in the card menu or focus view'}
        >
          <ResponsiveContainer width="100%" height="100%" debounce={30} minHeight={70}>
            {model.id === 'mishandling' ? (
              <LineChart data={points} margin={{ top: 12, right: 10, bottom: 0, left: -22 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} strokeDasharray="3 5" />
                <XAxis dataKey="label" {...axis} minTickGap={28} />
                <YAxis {...axis} domain={[0, 'auto']} tickFormatter={(v: number) => v.toFixed(1)} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff' }} />
                <Line
                  dataKey="value"
                  name="Incidents / 1,000"
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            ) : (
              <AreaChart data={points} margin={{ top: 12, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={colors.grid} vertical={false} strokeDasharray="3 5" />
                <XAxis dataKey="label" {...axis} minTickGap={36} />
                <YAxis
                  {...axis}
                  width={40}
                  tickFormatter={(v: number) => compact(v)}
                  domain={data.kind === 'runway' ? [0, 100] : [0, 'auto']}
                />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff' }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name={
                    data.kind === 'revenue'
                      ? 'Net sales (INR)'
                      : data.kind === 'runway'
                        ? 'Occupancy %'
                        : 'Passengers'
                  }
                  stroke={color}
                  strokeWidth={2}
                  fill={'url(#' + uid + ')'}
                  isAnimationActive={false}
                />
                {forecast && (
                  <Area
                    type="monotone"
                    dataKey="forecast"
                    name="Forecast"
                    stroke={colors.blue}
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    fill="transparent"
                    isAnimationActive={false}
                  />
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
        {forecast && (
          <div className="chart-legend">
            <span>
              <i style={{ background: colors.teal }} />
              Actual passengers
            </span>
            <span>
              <i className="dashed" style={{ background: colors.blue }} />
              Forecast
            </span>
          </div>
        )}
        {data.kind === 'runway' && (
          <div className="runway-labels">
            {data.rows.map((r) => (
              <span key={r.label}>
                <i className="dot good" />
                {r.label}
                <strong>{number(r.value, 1)}%</strong>
              </span>
            ))}
          </div>
        )}
        {data.kind === 'revenue' && (
          <div className="revenue-summary">
            {data.rows.map((r, i) => (
              <div key={r.label}>
                <span>
                  <i className="dot" style={{ background: palette[i] }} />
                  {r.label}
                </span>
                <strong>{money(r.value)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (data.kind === 'bars')
    return (
      <div className="chart-flex">
        <div className="chart-canvas" role="img" aria-label={model.id + ' comparison chart'}>
          <ResponsiveContainer width="100%" height="100%" debounce={30} minHeight={70}>
            <BarChart
              data={data.rows}
              layout="vertical"
              margin={{ top: 4, right: 26, left: 0, bottom: 0 }}
              barSize={12}
            >
              <CartesianGrid stroke={colors.grid} horizontal={false} strokeDasharray="3 5" />
              <XAxis type="number" {...axis} domain={[0, 'auto']} unit="m" />
              <YAxis
                type="category"
                dataKey="label"
                {...axis}
                interval={0}
                width={model.id === 'turnaround' ? 100 : 80}
                tickFormatter={(v: string) =>
                  v.replace('International', 'Intl').replace('Meridian', 'Merid.')
                }
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: '#fff' }}
                cursor={{ fill: '#ffffff06' }}
              />
              {data.target && (
                <ReferenceLine x={data.target} stroke={colors.amber} strokeDasharray="4 4" />
              )}
              <Bar dataKey="value" name="Minutes" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {data.rows.map((r, i) => (
                  <Cell
                    key={r.label}
                    fill={
                      data.thresholds
                        ? waitTone(r.value) === 'good'
                          ? colors.teal
                          : waitTone(r.value) === 'warning'
                            ? colors.amber
                            : colors.red
                        : r.value > (data.target ?? Infinity)
                          ? colors.amber
                          : palette[i % 2]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-legend">
          {data.thresholds ? (
            <>
              <span>
                <i className="dot good" />
                &lt;10m
              </span>
              <span>
                <i className="dot warning" />
                10–20m
              </span>
              <span>
                <i className="dot danger" />
                &gt;20m
              </span>
            </>
          ) : (
            <span>
              <i className="dot warning" />
              Target {data.target} min
            </span>
          )}
        </div>
      </div>
    );
  if (data.kind === 'donut')
    return (
      <div className="donut-visual">
        <div className="donut-canvas">
          <ResponsiveContainer width="100%" height="100%" minHeight={90}>
            <PieChart>
              <Pie
                data={[
                  { name: 'On time', value: data.onTime },
                  { name: 'Late', value: data.late },
                ]}
                dataKey="value"
                innerRadius="71%"
                outerRadius="92%"
                startAngle={90}
                endAngle={-270}
                paddingAngle={3}
                stroke="none"
                isAnimationActive={false}
              >
                <Cell fill={colors.teal} />
                <Cell fill={colors.amber} />
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center">
            <strong>{data.onTime}</strong>
            <span>on time</span>
          </div>
        </div>
        <div className="chart-legend">
          <span>
            <i className="dot good" />
            On time {data.onTime}
          </span>
          <span>
            <i className="dot warning" />
            Late {data.late}
          </span>
        </div>
        <span className="muted small center">{data.excluded} excluded / pending</span>
      </div>
    );
  if (data.kind === 'flights')
    return (
      <div className="chart-flex">
        <div className="flight-direction-values">
          {data.rows.map((r) => (
            <div key={r.label}>
              <span>{r.label}</span>
              <strong>{r.onTime + r.delayed + r.cancelled + r.unknown}</strong>
            </div>
          ))}
        </div>
        <div className="chart-canvas">
          <ResponsiveContainer width="100%" height="100%" minHeight={50}>
            <BarChart
              data={data.rows}
              layout="vertical"
              margin={{ left: 0, right: 0, top: 5, bottom: 0 }}
              barSize={18}
            >
              <XAxis hide type="number" />
              <YAxis dataKey="label" type="category" {...axis} width={76} />
              <Tooltip contentStyle={tooltipStyle} />
              {(['onTime', 'delayed', 'cancelled', 'unknown'] as const).map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={['On time', 'Delayed', 'Cancelled', 'Unknown'][i]}
                  stackId="status"
                  fill={[colors.teal, colors.amber, colors.red, colors.muted][i]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-legend">
          <span>
            <i className="dot good" />
            On time
          </span>
          <span>
            <i className="dot warning" />
            Delayed
          </span>
          <span>
            <i className="dot danger" />
            Cancelled
          </span>
          <span>
            <i className="dot" style={{ background: colors.muted }} />
            Unknown
          </span>
        </div>
      </div>
    );
  if (data.kind === 'queues')
    return (
      <div className="queue-list">
        {data.rows.map((r) => {
          const percent = (r.count / r.capacity) * 100;
          return (
            <div className="queue-row" key={r.terminal}>
              <div>
                <span>{r.label}</span>
                <strong className={percent >= 80 ? 'text-amber' : ''}>
                  {number(percent)}
                  <small>%</small>
                </strong>
              </div>
              <div className="progress-track">
                <div
                  style={{
                    width: percent + '%',
                    background: percent >= 80 ? colors.amber : colors.teal,
                  }}
                />
              </div>
              <div className="queue-caption">
                <span>
                  {r.count} / {r.capacity} passengers
                </span>
                <span>{r.desks} desks</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  if (data.kind === 'cargo') {
    const percent = ((model.value ?? 0) / data.target) * 100;
    return (
      <div className="cargo-visual">
        <div className="progress-track cargo-progress">
          <div style={{ width: Math.min(percent, 100) + '%' }} />
        </div>
        <div className="target-label">
          <span>{number(percent, 1)}% complete</span>
          <span>Target {number(data.target)} t</span>
        </div>
        <div className="cargo-breakdown">
          {data.rows.map((r, i) => (
            <div key={r.label}>
              <span>
                <i className="dot" style={{ background: palette[i] }} />
                {r.label}
              </span>
              <strong>
                {number(r.value, 1)} <small>t</small>
              </strong>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (data.kind === 'parking')
    return (
      <div className="parking-visual">
        <div className="parking-chart">
          <ResponsiveContainer width="100%" height="100%" minHeight={70}>
            <RadialBarChart
              innerRadius="65%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              data={[{ value: model.value, fill: colors.teal }]}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar
                dataKey="value"
                cornerRadius={6}
                background={{ fill: '#263246' }}
                isAnimationActive={false}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <span>{number(model.value ?? 0)}%</span>
        </div>
        <div className="parking-rows">
          {data.rows.map((r) => (
            <div key={r.label}>
              <span>{r.label}</span>
              <strong>
                {r.occupied} <small>/ {r.capacity}</small>
              </strong>
              <div className="progress-track">
                <div
                  style={{
                    width: (r.occupied / r.capacity) * 100 + '%',
                    background: r.occupied / r.capacity > 0.8 ? colors.amber : colors.blue,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  return <GateMatrix data={data} />;
}
