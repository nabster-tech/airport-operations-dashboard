import { useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import GridLayout, { useContainerWidth, verticalCompactor } from 'react-grid-layout';
import { GripVertical, Maximize2, MoreHorizontal, X, Download, MapPin } from 'lucide-react';
import { catalog, type CategoryId, type KpiId } from './catalog';
import { cols, pack, useCategoryWorkspace, type Position, type Breakpoint } from './workspace';
import {
  detailRows,
  exportRows,
  MetricChart,
  MetricTable,
  MetricValue,
  formatMetricValue,
} from './views';
import { usePresentation } from '../presentation';
import type { CategoryFilters, CategorySnapshot, KpiResult } from './models';
export function CategoryGrid({
  snapshot,
  filters,
  onFocus,
}: {
  snapshot: CategorySnapshot;
  filters: CategoryFilters;
  onFocus: (id: KpiId, trigger: HTMLElement) => void;
}) {
  const presentation = usePresentation();
  const { width, containerRef, mounted } = useContainerWidth();
  const category = snapshot.category;
  const state = useCategoryWorkspace(),
    doc = state.drafts[category] ?? state.documents[category],
    editing = Boolean(state.drafts[category]);
  const bp: Breakpoint = width >= 1000 ? 'desktop' : width >= 620 ? 'tablet' : 'mobile';
  const layout = doc.layouts[bp].filter((r) => !doc.hidden.includes(r.i));
  const change = state.change;
  const [lastHidden, setLastHidden] = useState<KpiId | null>(null);
  const act = (
    id: KpiId,
    action: 'hide' | 'table' | 'earlier' | 'later' | 'wide' | 'standard' | 'taller' | 'shorter',
  ) => {
    if (action === 'hide') setLastHidden(id);
    change(category, (current) => {
      if (action === 'hide') return { ...current, hidden: [...new Set([...current.hidden, id])] };
      if (action === 'table')
        return {
          ...current,
          tables: current.tables.includes(id)
            ? current.tables.filter((k) => k !== id)
            : [...current.tables, id],
        };
      const items = current.layouts[bp]
        .filter((r) => !current.hidden.includes(r.i))
        .sort((a, b) => a.y - b.y || a.x - b.x);
      const index = items.findIndex((r) => r.i === id);
      if (action === 'earlier' || action === 'later') {
        const next = index + (action === 'earlier' ? -1 : 1);
        if (next >= 0 && next < items.length)
          [items[index], items[next]] = [items[next], items[index]];
      } else if (action === 'taller' || action === 'shorter')
        items[index] = {
          ...items[index],
          h: Math.max(8, Math.min(24, items[index].h + (action === 'taller' ? 2 : -2))),
        };
      else
        items[index] = {
          ...items[index],
          w: action === 'wide' ? cols[bp] : bp === 'mobile' ? 1 : 3,
        };
      return {
        ...current,
        layouts: {
          ...current.layouts,
          [bp]: [
            ...pack(items, cols[bp]),
            ...current.layouts[bp].filter((r) => current.hidden.includes(r.i)),
          ],
        },
      };
    });
  };
  return (
    <div
      ref={containerRef}
      className={'dashboard-grid ' + (editing ? 'editing' : '')}
      data-testid="dashboard-grid"
      data-breakpoint={bp}
    >
      {editing && lastHidden && doc.hidden.includes(lastHidden) && (
        <div className="notice">
          <span>{catalog[lastHidden].title} hidden.</span>
          <button
            className="text-button"
            onClick={() => {
              restoreKpi(category, lastHidden);
              setLastHidden(null);
            }}
          >
            Undo hide
          </button>
        </div>
      )}
      {!layout.length && (
        <div className="empty-dashboard">
          <h2>No KPIs visible</h2>
          <p>Open Edit layout and use Restore KPIs to bring cards back.</p>
        </div>
      )}
      {mounted && width > 0 && (
        <GridLayout
          width={width}
          layout={layout}
          compactor={verticalCompactor}
          gridConfig={{ cols: cols[bp], rowHeight: 24, margin: [16, 16], containerPadding: [0, 0] }}
          dragConfig={{
            enabled: editing && bp !== 'mobile',
            handle: '.drag-handle',
            cancel: '.card-actions,.card-chart',
          }}
          resizeConfig={{ enabled: editing && bp !== 'mobile', handles: ['e', 's', 'se'] }}
          onLayoutChange={(next) => {
            if (!editing) return;
            const positions = next.map((r) => ({
              i: r.i as KpiId,
              x: r.x,
              y: r.y,
              w: r.w,
              h: r.h,
              minW: bp === 'mobile' ? 1 : 3,
              minH: 8,
              maxH: 24,
            }));
            if (
              JSON.stringify(layout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))) ===
              JSON.stringify(positions.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })))
            )
              return;
            change(category, (current) => ({
              ...current,
              layouts: {
                ...current.layouts,
                [bp]: current.layouts[bp].map((r) => positions.find((p) => p.i === r.i) ?? r),
              },
            }));
          }}
        >
          {[...layout]
            .sort((a, b) => a.y - b.y || a.x - b.x)
            .map((position) => {
              const metric = snapshot.metrics.find((m) => m.id === position.i)!;
              const entry = catalog[metric.id];
              return (
                <div key={metric.id} data-widget={metric.id}>
                  <article
                    className="kpi-card"
                    aria-label={entry.title}
                    data-testid={'card-' + metric.id}
                  >
                    <header className="card-header">
                      <div className="card-heading">
                        {editing && (
                          <button
                            className="drag-handle icon-button"
                            title="Drag to rearrange"
                            aria-label={'Drag ' + entry.title + '; keyboard ordering in settings'}
                          >
                            <GripVertical size={16} />
                          </button>
                        )}
                        <h3 title={entry.title}>{entry.title}</h3>
                      </div>
                      <div className="card-actions">
                        <button
                          className="icon-button focus-button"
                          aria-label={'Focus ' + entry.title}
                          onClick={(e) => onFocus(metric.id, e.currentTarget)}
                        >
                          <Maximize2 size={14} />
                        </button>
                        <Menu.Root>
                          <Menu.Trigger asChild>
                            <button
                              className="icon-button"
                              aria-label={'Settings for ' + entry.title}
                            >
                              <MoreHorizontal size={17} />
                            </button>
                          </Menu.Trigger>
                          <Menu.Portal>
                            <Menu.Content className="menu-content" align="end">
                              <Menu.Item
                                className="menu-item"
                                onSelect={() => act(metric.id, 'table')}
                              >
                                {doc.tables.includes(metric.id) ? 'Chart view' : 'Data table'}
                              </Menu.Item>
                              {editing ? (
                                <>
                                  <Menu.Item
                                    className="menu-item"
                                    onSelect={() => act(metric.id, 'earlier')}
                                  >
                                    Move earlier
                                  </Menu.Item>
                                  <Menu.Item
                                    className="menu-item"
                                    onSelect={() => act(metric.id, 'later')}
                                  >
                                    Move later
                                  </Menu.Item>
                                  <Menu.Item
                                    className="menu-item"
                                    onSelect={() => act(metric.id, 'standard')}
                                  >
                                    Standard width
                                  </Menu.Item>
                                  <Menu.Item
                                    className="menu-item"
                                    onSelect={() => act(metric.id, 'wide')}
                                  >
                                    Full width
                                  </Menu.Item>
                                  <Menu.Item
                                    className="menu-item danger-item"
                                    onSelect={() => act(metric.id, 'hide')}
                                  >
                                    Hide KPI
                                  </Menu.Item>
                                </>
                              ) : (
                                <Menu.Item
                                  className="menu-item"
                                  onSelect={() => state.begin(category)}
                                >
                                  Edit layout
                                </Menu.Item>
                              )}
                            </Menu.Content>
                          </Menu.Portal>
                        </Menu.Root>
                      </div>
                    </header>
                    <div className="metric-top">
                      <div className="metric-value">
                        <MetricValue metric={metric} />
                      </div>
                      <p className="metric-subtitle">
                        {metric.state === 'ready'
                          ? metric.spec.aggregation === 'count'
                            ? 'Recorded events'
                            : metric.rows.length + ' observations'
                          : metric.state === 'not-applicable'
                            ? 'Not applicable'
                            : 'No eligible data'}
                      </p>
                      <div className="metric-comparison">
                        {metric.spec.pairLabel
                          ? metric.spec.pairLabel +
                            ': ' +
                            formatMetricValue(metric, metric.reference, presentation)
                          : metric.spec.target !== undefined
                            ? 'Demo target ' +
                              (['INR', 'EUR', 'USD'].includes(metric.spec.unit)
                                ? formatMetricValue(metric, metric.spec.target, presentation)
                                : metric.spec.target + ' ' + metric.spec.unit)
                            : 'Static demonstration · provisional definition'}
                      </div>
                    </div>
                    <div className="card-chart">
                      {doc.tables.includes(metric.id) ? (
                        <MetricTable
                          label={entry.title}
                          {...detailRows(metric, filters, 'time', presentation)}
                        />
                      ) : (
                        <MetricChart metric={metric} filters={filters} />
                      )}
                    </div>
                    <footer className="card-footer">
                      <MapPin size={11} />
                      <span title={metric.scope}>{metric.scope}</span>
                      <span className="static-mark">DEMO</span>
                    </footer>
                  </article>
                </div>
              );
            })}
        </GridLayout>
      )}
    </div>
  );
}
export function KpiFocus({
  metric,
  filters,
  trigger,
  onClose,
}: {
  metric: KpiResult;
  filters: CategoryFilters;
  trigger: HTMLElement | null;
  onClose: () => void;
}) {
  const presentation = usePresentation();
  const [by, setBy] = useState<'time' | 'group' | 'records'>('time');
  const [tableOnly, setTableOnly] = useState(false);
  const entry = catalog[metric.id],
    table = detailRows(metric, filters, by, presentation);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="focus-dialog"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            (trigger?.isConnected
              ? trigger
              : document.querySelector<HTMLElement>('#category-title')
            )?.focus();
          }}
        >
          <div className="focus-heading">
            <div>
              <p className="eyebrow">MAIN FRAME</p>
              <Dialog.Title>{entry.title}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="icon-button" aria-label="Close focus view">
                <X size={22} />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="focus-description">
            {metric.spec.formula}
          </Dialog.Description>
          <div className="focus-statbar">
            <div>
              <div className="metric-value">
                <MetricValue metric={metric} />
              </div>
              <p className="muted">{metric.scope}</p>
              {metric.spec.pairLabel && (
                <p>
                  {metric.spec.pairLabel}:{' '}
                  {formatMetricValue(metric, metric.reference, presentation)}
                </p>
              )}
            </div>
            <div className="focus-controls">
              <label className="select-label">
                Breakdown
                <select value={by} onChange={(e) => setBy(e.target.value as typeof by)}>
                  <option value="time">Time interval</option>
                  <option value="group">Group / resource</option>
                  <option value="records">Underlying records</option>
                </select>
              </label>
              <button
                className="secondary-button"
                aria-pressed={tableOnly}
                onClick={() => setTableOnly((v) => !v)}
              >
                {tableOnly ? 'Show chart' : 'Table only'}
              </button>
              <button
                className="secondary-button"
                onClick={() => exportRows(metric.id + '-details.csv', table.columns, table.rows)}
              >
                <Download size={14} />
                Export details
              </button>
            </div>
          </div>
          {metric.spec.kind === 'scenario' && (
            <div className="scenario-note">
              <strong>Precomputed passenger scenario</strong>
              <p>
                One processing desk per 60 forecast passengers per 15-minute interval. These
                suggestions are read-only and do not dispatch resources.
              </p>
              <MetricTable
                label="Suggested desk allocation"
                columns={['Interval / terminal', 'Forecast passengers', 'Suggested desks']}
                rows={metric.rows.map((r) => [
                  r.label + ' ' + r.minute,
                  r.numerator,
                  Math.ceil(r.numerator / 60),
                ])}
              />
            </div>
          )}
          {!tableOnly && by !== 'records' && (
            <div className="focus-chart">
              <MetricChart metric={metric} filters={filters} by={by} />
            </div>
          )}
          {by === 'group' && metric.rows.length > 20 && (
            <p className="muted">Chart shows up to 20 groups; the table contains every group.</p>
          )}
          <div className="detail-table-heading">
            <h3>Underlying data</h3>
            <span>{table.rows.length} rows</span>
          </div>
          <div className="focus-table">
            <MetricTable label={entry.title + ' details'} {...table} />
          </div>
          <footer className="focus-footer">
            <span>{metric.spec.source}</span>
            <span>Definition v2 · provisional demo assumptions</span>
            <span>{presentation.snapshotLabel()}</span>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function restoreKpi(category: CategoryId, id: KpiId) {
  useCategoryWorkspace.getState().change(category, (doc) => {
    const layouts = { ...doc.layouts };
    for (const bp of ['desktop', 'tablet', 'mobile'] as const) {
      const bottom = Math.max(
        0,
        ...layouts[bp].filter((r) => !doc.hidden.includes(r.i)).map((r) => r.y + r.h),
      );
      layouts[bp] = layouts[bp].map((r) =>
        r.i === id ? ({ ...r, x: 0, y: bottom } as Position) : r,
      );
    }
    return { ...doc, layouts, hidden: doc.hidden.filter((k) => k !== id) };
  });
}
