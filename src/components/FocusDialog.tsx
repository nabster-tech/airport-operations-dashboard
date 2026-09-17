import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, Database, MapPin, X } from 'lucide-react';
import { registry } from '../widgetRegistry';
import { snapshotLabel } from '../config';
import { useDetails } from '../data/useTelemetry';
import type { Filters, WidgetId } from '../types';
import { DataTable, MetricChart } from './Charts';
import { MetricValue } from './KPICard';
export function FocusDialog({
  id,
  filters,
  trigger,
  onClose,
}: {
  id: WidgetId;
  filters: Filters;
  trigger: HTMLElement | null;
  onClose: () => void;
}) {
  const [breakdown, setBreakdown] = useState<'default' | 'group'>('default');
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const query = useDetails(id, filters, breakdown),
    def = registry[id],
    Icon = def.icon;
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
              : document.querySelector<HTMLElement>('#widget-' + id + ' .focus-button')
            )?.focus({ preventScroll: true });
          }}
        >
          <div className="focus-heading">
            <div>
              <p className="eyebrow">
                <ArrowUpRight size={12} />
                MAIN FRAME
              </p>
              <Dialog.Title>
                <Icon size={23} />
                {def.title}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="icon-button close-focus" aria-label="Close focus view">
                <X size={22} />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="focus-description">{def.description}</Dialog.Description>
          {query.isPending ? (
            <div className="focus-loading" role="status">
              Preparing the detail view…
            </div>
          ) : query.isError ? (
            <div role="alert">
              This detail view could not be loaded.{' '}
              <button onClick={() => void query.refetch()}>Try again</button>
            </div>
          ) : (
            <>
              <div className="focus-statbar">
                <div>
                  <div className="metric-value">
                    <MetricValue model={query.data.model} />
                  </div>
                  <span className="muted">{query.data.model.subtitle}</span>
                </div>
                <div className="focus-controls">
                  {def.groupLabel && (
                    <label className="select-label">
                      Breakdown
                      <select
                        value={breakdown}
                        onChange={(e) => setBreakdown(e.target.value as 'default' | 'group')}
                      >
                        <option value="default">
                          {id === 'throughput'
                            ? 'Time interval'
                            : id === 'turnaround'
                              ? 'Airline'
                              : id === 'security'
                                ? 'Checkpoint'
                                : 'Belt'}
                        </option>
                        <option value="group">{def.groupLabel}</option>
                      </select>
                    </label>
                  )}
                  <div className="segmented" aria-label="Detail display">
                    <button aria-pressed={view === 'chart'} onClick={() => setView('chart')}>
                      Chart & table
                    </button>
                    <button aria-pressed={view === 'table'} onClick={() => setView('table')}>
                      Table only
                    </button>
                  </div>
                </div>
              </div>
              {view === 'chart' && !(id === 'throughput' && breakdown === 'group') && (
                <div className="focus-chart">
                  <MetricChart model={query.data.model} />
                </div>
              )}
              <div className="detail-table-heading">
                <h3>{breakdown === 'group' ? def.groupLabel + ' breakdown' : 'Underlying data'}</h3>
                <span>{query.data.rows.length} rows</span>
              </div>
              <div className="focus-table">
                <DataTable
                  columns={query.data.columns}
                  rows={query.data.rows}
                  label={def.title + ' details'}
                />
              </div>
              <footer className="focus-footer">
                <span>
                  <Database size={13} />
                  {def.source}
                </span>
                <span>
                  <MapPin size={13} />
                  {query.data.model.scope}
                </span>
                <span>Static demo · {snapshotLabel} IST</span>
              </footer>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
