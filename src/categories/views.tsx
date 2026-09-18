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
import type { CategoryFilters, KpiResult } from './models';
import { usePresentation } from '../presentation';
export const format = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(n);
export function formatMetricValue(
  metric: KpiResult,
  value: number | null | undefined,
  presentation: ReturnType<typeof usePresentation>,
) {
  return ['INR', 'EUR', 'USD'].includes(metric.spec.unit)
    ? value == null
      ? '—'
      : presentation.moneyLabel(presentation.convertValue(value, metric.spec.unit) ?? 0)
    : format(value);
}
export function MetricValue({ metric }: { metric: KpiResult }) {
  const presentation = usePresentation();
  return (
    <>
      <span className="metric-number">{formatMetricValue(metric, metric.value, presentation)}</span>
      {!['INR', 'EUR', 'USD'].includes(metric.spec.unit) && (
        <span className="metric-unit">{presentation.displayUnit(metric.spec.unit)}</span>
      )}
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
  presentation: ReturnType<typeof usePresentation>,
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
            presentation.timeLabel(r.minute),
            r.label,
            presentation.convertValue(r.numerator, metric.spec.unit) ?? r.numerator,
            presentation.convertValue(r.denominator, metric.spec.unit) ?? r.denominator,
            presentation.convertValue(r.reference, metric.spec.unit) ?? 'Unavailable',
            r.note ?? '',
          ] as (string | number)[],
      ),
    };
  const groups = grouped(metric, filters.granularity, breakdown).map((point) => ({
    ...point,
    label:
      breakdown === 'time' && /^\d{2}:\d{2}$/.test(point.label)
        ? presentation.timeLabel(
            Number(point.label.slice(0, 2)) * 60 + Number(point.label.slice(3, 5)),
          )
        : point.label,
  }));
  return {
    columns: [
      breakdown === 'time' ? 'Airport interval' : 'Group',
      'Value (' + presentation.displayUnit(metric.spec.unit) + ')',
      'Numerator',
      'Denominator',
      ...(metric.spec.pairLabel ? [metric.spec.pairLabel] : []),
    ],
    rows: groups.map(
      (r) =>
        [
          r.label,
          presentation.convertValue(r.value, metric.spec.unit) ?? 'Unavailable',
          presentation.convertValue(r.numerator, metric.spec.unit) ?? r.numerator,
          presentation.convertValue(r.denominator, metric.spec.unit) ?? r.denominator,
          ...(metric.spec.pairLabel
            ? [presentation.convertValue(r.reference, metric.spec.unit) ?? 'Unavailable']
            : []),
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
  const presentation = usePresentation();
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
  const data = grouped(metric, filters.granularity, by).map((point) => ({
    ...point,
    label:
      by === 'time' && /^\d{2}:\d{2}$/.test(point.label)
        ? presentation.timeLabel(
            Number(point.label.slice(0, 2)) * 60 + Number(point.label.slice(3, 5)),
          )
        : point.label,
    value: presentation.convertValue(point.value, metric.spec.unit),
    reference: presentation.convertValue(point.reference, metric.spec.unit),
  }));
  const tooltip = {
    background: 'var(--tooltip-bg)',
    border: '1px solid var(--tooltip-border)',
    borderRadius: 8,
    color: 'var(--tooltip-text)',
  };
  if (metric.id === 'ap-stand-utilization' || metric.id === 'ap-taxiway-congestion') {
    const groups = grouped(metric, filters.granularity, 'group').map((point) => ({
      ...point,
      value: presentation.convertValue(point.value, metric.spec.unit),
    }));
    return (
      <div className="category-matrix">
        {groups.map((r) => (
          <div
            key={r.label}
            title={
              r.label + ': ' + format(r.value) + ' ' + presentation.displayUnit(metric.spec.unit)
            }
          >
            <span>{r.label}</span>
            <strong>
              {format(r.value)}
              <small>{presentation.displayUnit(metric.spec.unit)}</small>
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
        rows={events.map((r) => [
          presentation.timeLabel(r.minute),
          r.label,
          r.note ?? 'Recorded event',
        ])}
      />
    );
  }
  if (metric.spec.kind === 'report')
    return (
      <MetricTable
        label="Resource utilization report"
        {...detailRows(metric, filters, 'time', presentation)}
      />
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
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--chart-text)', fontSize: 9 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fill: 'var(--chart-text)', fontSize: 10 }} />
            <Tooltip
              contentStyle={tooltip}
              itemStyle={{ color: 'var(--tooltip-text)' }}
              cursor={{ stroke: 'var(--chart-grid)', fill: 'var(--chart-area)' }}
            />
            <Bar
              dataKey="value"
              name={presentation.displayUnit(metric.spec.unit)}
              fill="var(--chart-primary)"
              isAnimationActive={false}
            />
          </BarChart>
        ) : metric.spec.pairLabel ? (
          <ComposedChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="label"
              minTickGap={30}
              tick={{ fill: 'var(--chart-text)', fontSize: 10 }}
            />
            <YAxis tick={{ fill: 'var(--chart-text)', fontSize: 10 }} />
            <Tooltip
              contentStyle={tooltip}
              itemStyle={{ color: 'var(--tooltip-text)' }}
              cursor={{ stroke: 'var(--chart-grid)', fill: 'var(--chart-area)' }}
            />
            <Area
              dataKey="value"
              name="Measured"
              fill="var(--chart-area)"
              stroke="var(--chart-primary)"
              isAnimationActive={false}
            />
            <Line
              dataKey="reference"
              name={metric.spec.pairLabel}
              stroke="var(--chart-secondary)"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        ) : (
          <AreaChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--chart-primary)" stopOpacity={0.25} />
                <stop offset="1" stopColor="var(--chart-primary)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="3 5" />
            <XAxis
              dataKey="label"
              minTickGap={30}
              tick={{ fill: 'var(--chart-text)', fontSize: 10 }}
            />
            <YAxis tick={{ fill: 'var(--chart-text)', fontSize: 10 }} />
            <Tooltip
              contentStyle={tooltip}
              itemStyle={{ color: 'var(--tooltip-text)' }}
              cursor={{ stroke: 'var(--chart-grid)', fill: 'var(--chart-area)' }}
            />
            <Area
              dataKey="value"
              name={presentation.displayUnit(metric.spec.unit)}
              stroke="var(--chart-primary)"
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
