import { useId } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { grouped } from './source';
import { catalog } from './catalog';
import { timeLabel, type CategoryFilters, type KpiResult } from './models';
export const format = (n: number | null) =>
  n === null ? '—' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(n);
export function MetricValue({ metric }: { metric: KpiResult }) {
  return (
    <>
      <span className="metric-number">{format(metric.value)}</span>
      <span className="metric-unit">{metric.spec.unit}</span>
    </>
  );
}
export function MetricTable({
  columns,
  rows,
  label,
}: {
  columns: string[];
  rows: (string | number)[][];
  label: string;
}) {
  return (
    <div className="data-table-wrap" role="region" aria-label={label} tabIndex={0}>
      <table>
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j}>{typeof v === 'number' ? format(v) : v}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>No records in this selection.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export function detailRows(
  metric: KpiResult,
  filters: CategoryFilters,
  breakdown: 'time' | 'group' | 'records',
) {
  if (breakdown === 'records')
    return {
      columns: [
        'Record',
        'Airport time',
        'Group',
        'Numerator',
        'Denominator',
        'Reference',
        'Notes',
      ],
      rows: metric.rows.map(
        (r) =>
          [
            r.id,
            timeLabel(r.minute),
            r.label,
            r.numerator,
            r.denominator,
            r.reference ?? 'Unavailable',
            r.note ?? '',
          ] as (string | number)[],
      ),
    };
  const groups = grouped(metric, filters.granularity, breakdown);
  return {
    columns: [
      breakdown === 'time' ? 'Airport interval' : 'Group',
      'Value (' + metric.spec.unit + ')',
      'Numerator',
      'Denominator',
      ...(metric.spec.pairLabel ? [metric.spec.pairLabel] : []),
    ],
    rows: groups.map(
      (r) =>
        [
          r.label,
          r.value ?? 'Unavailable',
          r.numerator,
          r.denominator,
          ...(metric.spec.pairLabel ? [r.reference ?? 'Unavailable'] : []),
        ] as (string | number)[],
    ),
  };
}
export function MetricChart({
  metric,
  filters,
  by = 'time',
}: {
  metric: KpiResult;
  filters: CategoryFilters;
  by?: 'time' | 'group';
}) {
  const uid = useId().replaceAll(':', '');
  if (metric.state !== 'ready')
    return (
      <div className="empty-metric">
        <strong>
          {metric.state === 'not-applicable' ? 'Not applicable' : 'No eligible observations'}
        </strong>
        <span>
          {metric.state === 'not-applicable'
            ? 'Choose a compatible movement.'
            : 'Try another reporting window or filter.'}
        </span>
      </div>
    );
  const data = grouped(metric, filters.granularity, by);
  const tooltip = {
    background: '#172334',
    border: '1px solid #43546a',
    borderRadius: 8,
    color: '#f1f5f9',
  };
  if (metric.id === 'ap-stand-utilization' || metric.id === 'ap-taxiway-congestion') {
    const groups = grouped(metric, filters.granularity, 'group');
    return (
      <div className="category-matrix">
        {groups.map((r) => (
          <div key={r.label} title={r.label + ': ' + format(r.value) + ' ' + metric.spec.unit}>
            <span>{r.label}</span>
            <strong>
              {format(r.value)}
              <small>{metric.spec.unit}</small>
            </strong>
          </div>
        ))}
      </div>
    );
  }
  if (metric.spec.kind === 'events') {
    const events = metric.rows.filter((r) => r.numerator > 0);
    return (
      <MetricTable
        label={catalog[metric.id].title + ' events'}
        columns={['Time', 'Event / location', 'Notes']}
        rows={events.map((r) => [timeLabel(r.minute), r.label, r.note ?? 'Recorded event'])}
      />
    );
  }
  if (metric.spec.kind === 'report')
    return (
      <MetricTable label="Resource utilization report" {...detailRows(metric, filters, 'time')} />
    );
  return (
    <div
      className="category-chart"
      role="img"
      aria-label={catalog[metric.id].title + ' chart; exact values in detail table'}
    >
      <ResponsiveContainer width="100%" height="100%" debounce={30} minHeight={60}>
        {by === 'group' ? (
          <BarChart data={data.slice(0, 20)} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#2b3748" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#abbacf', fontSize: 9 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fill: '#abbacf', fontSize: 10 }} />
            <Tooltip contentStyle={tooltip} />
            <Bar dataKey="value" name={metric.spec.unit} fill="#55d9bd" isAnimationActive={false} />
          </BarChart>
        ) : metric.spec.pairLabel ? (
          <ComposedChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#2b3748" vertical={false} />
            <XAxis dataKey="label" minTickGap={30} tick={{ fill: '#abbacf', fontSize: 10 }} />
            <YAxis tick={{ fill: '#abbacf', fontSize: 10 }} />
            <Tooltip contentStyle={tooltip} />
            <Area
              dataKey="value"
              name="Measured"
              fill="#55d9bd22"
              stroke="#55d9bd"
              isAnimationActive={false}
            />
            <Line
              dataKey="reference"
              name={metric.spec.pairLabel}
              stroke="#a3baff"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        ) : (
          <AreaChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#55d9bd" stopOpacity={0.25} />
                <stop offset="1" stopColor="#55d9bd" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#2b3748" vertical={false} strokeDasharray="3 5" />
            <XAxis dataKey="label" minTickGap={30} tick={{ fill: '#abbacf', fontSize: 10 }} />
            <YAxis tick={{ fill: '#abbacf', fontSize: 10 }} />
            <Tooltip contentStyle={tooltip} />
            <Area
              dataKey="value"
              name={metric.spec.unit}
              stroke="#55d9bd"
              fill={'url(#' + uid + ')'}
              isAnimationActive={false}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
export function exportRows(filename: string, columns: string[], rows: (string | number)[][]) {
  const text = [columns, ...rows]
    .map((r) => r.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
