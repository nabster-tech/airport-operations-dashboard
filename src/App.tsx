import { useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Download,
  LayoutDashboard,
  Menu as MenuIcon,
  Pencil,
  RotateCcw,
  Save,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { airport, defaultFilters, rangeLabels, snapshotLabel, terminals } from './config';
import { useTelemetry } from './data/useTelemetry';
import { useWorkspace } from './layout/layoutStore';
import type { Filters, Movement, Terminal, TimeRange, WidgetId } from './types';
import { categories, registry } from './widgetRegistry';
import { DashboardGrid } from './components/DashboardGrid';
import { FocusDialog } from './components/FocusDialog';

function exportSnapshot(filters: Filters, snapshot: NonNullable<ReturnType<typeof useTelemetry>['data']>) {
  const rows = ['Metric,Value,Unit,Scope'];
  for (const model of Object.values(snapshot.widgets)) {
    rows.push(
      [registry[model.id].title, model.value ?? '', model.unit, model.scope]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `airside-${airport.id}-${filters.range}-${filters.terminal}-${filters.movement}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [focus, setFocus] = useState<{ id: WidgetId; trigger: HTMLElement | null } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const query = useTelemetry(filters);
  const document = useWorkspace((state) => state.draft ?? state.document);
  const editing = useWorkspace((state) => state.draft !== null);
  const notice = useWorkspace((state) => state.notice);
  const begin = useWorkspace((state) => state.begin);
  const cancel = useWorkspace((state) => state.cancel);
  const save = useWorkspace((state) => state.save);
  const reset = useWorkspace((state) => state.reset);
  const restore = useWorkspace((state) => state.restore);
  const clearNotice = useWorkspace((state) => state.clearNotice);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className={'app-shell ' + (sidebarOpen ? 'sidebar-open' : '')}>
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className="sidebar" aria-label="Dashboard navigation">
        <div className="brand"><span className="brand-mark">A</span><strong>Airside<span className="brand-period">.</span></strong></div>
        <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        <div className="airport-selector"><span className="airport-code">{airport.code}</span><div><strong>{airport.name}</strong><span>{airport.city} · Duty workspace</span></div><span className="airport-status" /></div>
        <p className="sidebar-label">WORKSPACE</p>
        <nav className="navigation">
          <button className="nav-item active"><LayoutDashboard size={17} />Overview<span className="nav-count">13</span></button>
          {categories.map(({ id, label, icon: Icon }) => <button className="nav-item" key={id}><Icon size={17} />{label}</button>)}
        </nav>
        <div className="sidebar-filters">
          <p className="sidebar-label">FILTERS</p>
          <label className="filter-label">Time window<select aria-label="Time window" value={filters.range} onChange={(event) => updateFilter('range', event.target.value as TimeRange)}>{Object.entries(rangeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="filter-label">Terminal<select aria-label="Terminal" value={filters.terminal} onChange={(event) => updateFilter('terminal', event.target.value as Terminal | 'all')}><option value="all">All terminals</option>{Object.entries(terminals).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="filter-label">Movement<select aria-label="Movement" value={filters.movement} onChange={(event) => updateFilter('movement', event.target.value as Movement | 'all')}><option value="all">All movements</option><option value="arrivals">Arrivals</option><option value="departures">Departures</option></select></label>
          <button className="reset-filters" onClick={() => setFilters(defaultFilters)}><RotateCcw size={14} />Reset filters</button>
        </div>
        <div className="sidebar-bottom"><div className="demo-panel"><span className="demo-orbit" /><div><strong>Static demonstration</strong><span>Dataset fixed at 17 Sep 2026</span></div></div></div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="breadcrumb"><button className="icon-button" aria-label="Toggle sidebar" onClick={() => setSidebarOpen(true)}><MenuIcon size={18} /></button><span>Operations</span><strong>/ Overview</strong></div>
          <div className="topbar-right"><span className="date-label"><CalendarDays size={14} />{snapshotLabel} IST</span><span className="demo-badge"><span className="tiny-dot" />STATIC DEMO</span></div>
        </header>

        <section className="page-heading">
          <div><p className="eyebrow"><SlidersHorizontal size={13} />OPERATIONS CONTROL</p><h1>Airport overview<span className="title-period">.</span></h1><p>Monitor passenger flow, flight performance and terminal operations from one workspace.</p></div>
          <div className="heading-actions"><button className="secondary-button" aria-label="Export snapshot" disabled={!query.data} onClick={() => query.data && exportSnapshot(filters, query.data)}><Download size={16} />Export</button>{!editing && <button className="primary-button" onClick={begin}><Pencil size={16} />Edit layout</button>}</div>
        </section>

        <div className="overview-toolbar"><div className="scope-summary"><span className="overview-dot" /><strong>{filters.terminal === 'all' ? 'All terminals' : terminals[filters.terminal]}</strong><span className="summary-separator" />{rangeLabels[filters.range]}<span className="summary-separator" />{filters.movement === 'all' ? 'All movements' : filters.movement}</div></div>

        {editing && <div className="edit-toolbar"><div><Pencil className="editing-icon" size={18} /><div><strong>Layout editor</strong><span>Drag, resize, hide or restore cards.</span></div></div><div className="edit-actions"><Menu.Root><Menu.Trigger asChild><button className="secondary-button">Restore cards <ChevronDown size={15} /></button></Menu.Trigger><Menu.Portal><Menu.Content className="menu-content" sideOffset={8}>{document.hidden.length ? document.hidden.map((id) => <Menu.Item className="menu-item" key={id} onSelect={() => restore(id)}>{registry[id].title}</Menu.Item>) : <Menu.Item className="menu-item" disabled>No hidden cards</Menu.Item>}</Menu.Content></Menu.Portal></Menu.Root><button className="text-button" onClick={reset}>Reset layout</button><button className="secondary-button" onClick={cancel}>Cancel</button><button className="primary-button" aria-label="Save layout" onClick={save}><Save size={15} />Save layout</button></div></div>}

        {notice && <div className="notice" role="status"><span>{notice}</span><button className="icon-button" aria-label="Dismiss notice" onClick={clearNotice}><X size={14} /></button></div>}
        <div className="attention-banner"><span className="attention-icon"><AlertTriangle size={18} /></span><p><strong>Terminal 2 security is elevated.</strong><span> Review checkpoint demand and passenger throughput before the next departure bank.</span></p><button onClick={(event) => setFocus({ id: 'security', trigger: event.currentTarget })}>View details</button></div>

        {query.isPending && <div className="notice" role="status">Preparing operational snapshot…</div>}
        {query.isError && <div className="notice" role="alert">The operational snapshot could not be loaded.</div>}
        {query.data && <DashboardGrid snapshot={query.data} onFocus={(id, trigger) => setFocus({ id, trigger })} />}
        <footer className="page-footer"><span>{airport.name} · Static proof of concept</span><span>Snapshot revision {query.data?.revision ?? '—'}</span></footer>
      </main>
      {focus && <FocusDialog id={focus.id} filters={filters} trigger={focus.trigger} onClose={() => setFocus(null)} />}
    </div>
  );
}

export default App;
