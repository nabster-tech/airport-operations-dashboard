import { useCallback, useMemo } from 'react';
import GridLayout, { useContainerWidth, verticalCompactor } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import { LayoutGrid } from 'lucide-react';
import { definitions, minimumRows } from '../widgetRegistry';
import { useWorkspace } from '../layout/layoutStore';
import { breakpointFor, columnCounts } from '../layout/layoutPersistence';
import type { GridCoordinates, Snapshot, WidgetId } from '../types';
import { KPICard } from './KPICard';
interface Props {
  snapshot: Snapshot;
  onFocus: (id: WidgetId, trigger: HTMLElement) => void;
}
export function DashboardGrid({ snapshot, onFocus }: Props) {
  const { width, containerRef, mounted } = useContainerWidth();
  const document = useWorkspace((s) => s.draft ?? s.document),
    editing = useWorkspace((s) => s.draft !== null),
    update = useWorkspace((s) => s.updateLayout);
  const bp = breakpointFor(width),
    cols = columnCounts[bp];
  const layout = useMemo(
    () => document.layouts[bp].filter((r) => !document.hidden.includes(r.i)),
    [document.layouts, bp, document.hidden],
  );
  const sync = useCallback(
    (next: Layout) => {
      if (editing)
        update(
          bp,
          next.map(({ i, x, y, w, h }) => ({
            i: i as WidgetId,
            x,
            y,
            w,
            h,
            minW: bp === 'mobile' ? 1 : 3,
            minH: minimumRows(i as WidgetId),
          })) as GridCoordinates[],
        );
    },
    [editing, update, bp],
  );
  // DOM reading order follows visual order, including keyboard reorders and saved layouts.
  const ordered = useMemo(
    () =>
      [...layout]
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((r) => definitions.find((d) => d.id === r.i)!),
    [layout],
  );
  return (
    <div
      ref={containerRef}
      className={'dashboard-grid ' + (editing ? 'editing' : '')}
      data-testid="dashboard-grid"
      data-breakpoint={bp}
    >
      {!layout.length && (
        <div className="empty-dashboard">
          <LayoutGrid size={36} />
          <h2>Your workspace, your way</h2>
          <p>Use Restore cards to bring a KPI back to your dashboard.</p>
        </div>
      )}
      {mounted && width > 0 && (
        <GridLayout
          width={width}
          gridConfig={{ cols, rowHeight: 24, margin: [16, 16], containerPadding: [0, 0] }}
          layout={layout}
          compactor={verticalCompactor}
          dragConfig={{
            enabled: editing && bp !== 'mobile',
            handle: '.drag-handle',
            cancel: '.card-actions, .card-chart',
          }}
          resizeConfig={{ enabled: editing && bp !== 'mobile', handles: ['e', 's', 'se'] }}
          onLayoutChange={sync}
        >
          {ordered.map((def) => (
            <div key={def.id} data-widget={def.id}>
              <KPICard
                model={snapshot.widgets[def.id]}
                editing={editing}
                breakpoint={bp}
                settings={document.settings[def.id] ?? { display: 'chart', density: 'comfortable' }}
                onFocus={onFocus}
              />
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  );
}
