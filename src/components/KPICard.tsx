import { memo } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Expand,
  GripVertical,
  Maximize2,
  MoreHorizontal,
  Table2,
  Trash2,
  MapPin,
  Minimize2,
  LayoutGrid,
} from 'lucide-react';
import { money, number } from '../config';
import { registry } from '../widgetRegistry';
import { useWorkspace } from '../layout/layoutStore';
import type { Breakpoint, WidgetId, WidgetModel, WidgetSettings } from '../types';
import { ChartTable, MetricChart } from './Charts';
export function MetricValue({ model }: { model: WidgetModel }) {
  if (model.value === null) return <span className="metric-number">—</span>;
  const decimals = ['security', 'baggage', 'turnaround', 'otp', 'runway', 'mishandling'].includes(
    model.id,
  )
    ? 1
    : 0;
  return (
    <>
      <span className="metric-number">
        {model.unit === 'INR' ? money(model.value) : number(model.value, decimals)}
      </span>
      {model.unit !== 'INR' && <span className="metric-unit">{model.unit}</span>}
    </>
  );
}
interface Props {
  model: WidgetModel;
  editing: boolean;
  breakpoint: Breakpoint;
  settings: WidgetSettings;
  onFocus: (id: WidgetId, trigger: HTMLElement) => void;
}
export const KPICard = memo(function KPICard({
  model,
  editing,
  breakpoint,
  settings,
  onFocus,
}: Props) {
  const def = registry[model.id],
    Icon = def.icon;
  const setSettings = useWorkspace((s) => s.setSettings),
    hide = useWorkspace((s) => s.hide),
    move = useWorkspace((s) => s.move),
    resize = useWorkspace((s) => s.resize),
    begin = useWorkspace((s) => s.begin);
  return (
    <article
      id={'widget-' + model.id}
      aria-label={def.title}
      className={
        'kpi-card ' +
        (settings.density === 'compact' ? 'compact-card ' : '') +
        (model.state === 'ready' ? '' : 'metric-unavailable')
      }
      data-testid={'card-' + model.id}
    >
      <header className="card-header">
        <div className="card-heading">
          {editing ? (
            <button
              className="drag-handle icon-button"
              aria-label={'Drag ' + def.title + '; use settings to move with keyboard'}
              title="Drag to rearrange"
            >
              <GripVertical size={16} />
            </button>
          ) : (
            <Icon size={16} className="card-symbol" />
          )}
          <h3>{def.title}</h3>
        </div>
        <div className="card-actions">
          <button
            className="icon-button focus-button"
            aria-label={'Focus ' + def.title}
            title="Open focus view"
            onClick={(e) => onFocus(model.id, e.currentTarget)}
          >
            <Maximize2 size={14} />
          </button>
          <Menu.Root>
            <Menu.Trigger asChild>
              <button
                className="icon-button"
                aria-label={'Settings for ' + def.title}
                title="Card settings"
              >
                <MoreHorizontal size={17} />
              </button>
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content className="menu-content" sideOffset={8} align="end">
                <Menu.Label className="menu-label">DISPLAY</Menu.Label>
                <Menu.Item
                  className="menu-item"
                  onSelect={() => setSettings(model.id, { display: 'chart' })}
                >
                  <LayoutGrid size={14} />
                  Chart{settings.display === 'chart' && <Check className="menu-check" size={14} />}
                </Menu.Item>
                <Menu.Item
                  className="menu-item"
                  onSelect={() => setSettings(model.id, { display: 'table' })}
                >
                  <Table2 size={14} />
                  Data table
                  {settings.display === 'table' && <Check className="menu-check" size={14} />}
                </Menu.Item>
                <Menu.Item
                  className="menu-item"
                  onSelect={() =>
                    setSettings(model.id, {
                      density: settings.density === 'compact' ? 'comfortable' : 'compact',
                    })
                  }
                >
                  <Minimize2 size={14} />
                  {settings.density === 'compact' ? 'Comfortable spacing' : 'Compact spacing'}
                </Menu.Item>
                <Menu.Separator className="menu-separator" />
                {editing ? (
                  <>
                    <Menu.Label className="menu-label">LAYOUT</Menu.Label>
                    <Menu.Item
                      className="menu-item"
                      onSelect={() => move(model.id, breakpoint, -1)}
                    >
                      <ArrowUp size={14} />
                      Move earlier
                    </Menu.Item>
                    <Menu.Item className="menu-item" onSelect={() => move(model.id, breakpoint, 1)}>
                      <ArrowDown size={14} />
                      Move later
                    </Menu.Item>
                    <Menu.Item
                      className="menu-item"
                      onSelect={() => resize(model.id, breakpoint, 'standard')}
                    >
                      <Minimize2 size={14} />
                      Standard size
                    </Menu.Item>
                    <Menu.Item
                      className="menu-item"
                      onSelect={() => resize(model.id, breakpoint, 'large')}
                    >
                      <Expand size={14} />
                      Large size
                    </Menu.Item>
                    <Menu.Item
                      className="menu-item"
                      onSelect={() => resize(model.id, breakpoint, 'wide')}
                    >
                      <Expand size={14} />
                      Full width
                    </Menu.Item>
                    <Menu.Separator className="menu-separator" />
                    <Menu.Item className="menu-item danger-item" onSelect={() => hide(model.id)}>
                      <Trash2 size={14} />
                      Hide card
                    </Menu.Item>
                  </>
                ) : (
                  <Menu.Item className="menu-item" onSelect={begin}>
                    <GripVertical size={14} />
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
          <MetricValue model={model} />
        </div>
        <p className="metric-subtitle">
          {model.state === 'not-applicable' ? 'Not applicable to this movement' : model.subtitle}
        </p>
        <div className={'metric-comparison ' + model.tone}>
          <span className="tiny-dot" />
          {model.state === 'ready' ? model.comparison : 'Adjust your filters to explore'}
        </div>
      </div>
      <div className="card-chart">
        {settings.display === 'table' ? (
          <ChartTable model={model} compact={settings.density === 'compact'} />
        ) : (
          <MetricChart model={model} />
        )}
      </div>
      <footer className="card-footer">
        <MapPin size={11} />
        <span title={model.scope}>{model.scope}</span>
        <span className="static-mark">DEMO</span>
      </footer>
    </article>
  );
});
