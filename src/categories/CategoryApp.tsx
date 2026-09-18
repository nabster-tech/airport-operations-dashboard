import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Menu from '@radix-ui/react-dropdown-menu';
import {
  Activity,
  ArrowDownToLine,
  Check,
  ChevronDown,
  Compass,
  Grip,
  Menu as MenuIcon,
  Navigation,
  Plus,
  Save,
  Search,
  Settings2,
  X,
} from 'lucide-react';
import {
  categories,
  catalog,
  categoryEntries,
  entries,
  type CategoryId,
  type KpiId,
} from './catalog';
import { defaultFilters, dimensionLabels, options, type CategoryFilters } from './models';
import { specs, useCategoryData } from './source';
import { useCategoryRoute, navigate } from './navigation';
import { useCategoryWorkspace } from './workspace';
import { CategoryGrid, KpiFocus, restoreKpi } from './CategoryGrid';
import { exportRows } from './views';
import { useDesktop } from '../components/useDesktop';
import './categories.css';
export default function CategoryApp() {
  const { category, invalid } = useCategoryRoute();
  const definition = categories.find((c) => c.id === category)!;
  const [range, setRange] = useState<CategoryFilters['range']>('today');
  const [filterMap, setFilterMap] = useState<Partial<Record<CategoryId, CategoryFilters>>>({});
  const filters = { ...defaultFilters, ...filterMap[category], range };
  const [mobileOpen, setMobileOpen] = useState(false),
    [search, setSearch] = useState('');
  const [focused, setFocused] = useState<{
    id: KpiId;
    category: CategoryId;
    trigger: HTMLElement | null;
  } | null>(null);
  const pendingFocus = useRef<KpiId | null>(null);
  const desktop = useDesktop();
  const state = useCategoryWorkspace(),
    doc = state.drafts[category] ?? state.documents[category],
    editing = Boolean(state.drafts[category]);
  const dirty = Object.keys(state.drafts).length > 0;
  const query = useCategoryData(category, filters);
  const members = categoryEntries(category);
  const dims = [...new Set(members.flatMap((k) => specs[k.id].dimensions))];
  const selectedMetric = query.data?.metrics.find((m) => m.id === focused?.id);
  const changeFilter = (key: keyof CategoryFilters, value: string) =>
    setFilterMap((m) => ({ ...m, [category]: { ...filters, [key]: value } }));
  useEffect(() => {
    const changed = () => {
      setMobileOpen(false);
      const id = pendingFocus.current;
      setFocused(id ? { id, category: catalog[id].category, trigger: null } : null);
      pendingFocus.current = null;
      requestAnimationFrame(() => {
        document.getElementById('category-title')?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
    };
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (invalid || !window.location.hash) window.location.replace('#/kpis/airside-operations');
  }, [invalid]);
  const select = (id: CategoryId) => {
    setFocused(null);
    setMobileOpen(false);
    navigate(id);
  };
  const searchResults = search.trim()
    ? entries.filter((e) =>
        (e.title + ' ' + e.category).toLowerCase().includes(search.trim().toLowerCase()),
      )
    : [];
  const sidebar = (
    <>
      <a
        className="brand"
        href="#/kpis/airside-operations"
        onClick={() => select('airside-operations')}
      >
        <span className="brand-mark">
          <Navigation size={24} fill="currentColor" />
        </span>
        <span>
          airside<span className="brand-period">.</span>
        </span>
      </a>
      <div className="airport-selector">
        <span className="airport-code">MDI</span>
        <div>
          <strong>Meridian International</strong>
          <span>Airport operations center</span>
        </div>
        <span className="airport-status" />
      </div>
      <label className="category-search">
        <Search size={15} />
        <span className="sr-only">Find a KPI</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find a KPI"
        />
      </label>
      {search && (
        <div className="kpi-search-results" aria-label="KPI search results">
          {searchResults.length ? (
            searchResults.map((k) => (
              <button
                key={k.id}
                onClick={() => {
                  setSearch('');
                  setMobileOpen(false);
                  if (k.category === category) setFocused({ id: k.id, category, trigger: null });
                  else {
                    pendingFocus.current = k.id;
                    navigate(k.category);
                  }
                }}
              >
                {k.title}
                <small>{categories.find((c) => c.id === k.category)?.label}</small>
              </button>
            ))
          ) : (
            <p>No matching KPI.</p>
          )}
        </div>
      )}
      <div className="sidebar-label">KPI CATEGORIES</div>
      <nav className="navigation category-navigation" aria-label="KPI categories">
        {categories.map((c, i) => (
          <a
            href={'#/kpis/' + c.id}
            key={c.id}
            className={'nav-item ' + (c.id === category ? 'active' : '')}
            aria-current={c.id === category ? 'page' : undefined}
            onClick={() => select(c.id)}
          >
            <span className="category-index">{String(i + 1).padStart(2, '0')}</span>
            <span>
              {c.label}
              {state.drafts[c.id] && <small className="draft-indicator">Unsaved changes</small>}
            </span>
            <span className="nav-count">{categoryEntries(c.id).length}</span>
          </a>
        ))}
      </nav>
      <div className="category-sidebar-footer">
        <Activity size={15} />
        <div>
          <strong>Static demo data</strong>
          <span>17 Sep 2026 · 14:00 IST</span>
        </div>
      </div>
    </>
  );
  const exportCategory = () => {
    if (!query.data) return;
    exportRows(
      category + '-' + range + '.csv',
      [
        'Category',
        'KPI ID',
        'KPI',
        'Value',
        'Unit',
        'Numerator',
        'Denominator',
        'Scope',
        'As of',
        'State',
        'Mode',
      ],
      query.data.metrics.map((m) => [
        definition.label,
        m.id,
        catalog[m.id].title,
        m.value ?? '',
        m.spec.unit,
        m.numerator,
        m.denominator,
        m.scope,
        m.asOf,
        m.state,
        'Static demo',
      ]),
    );
  };
  return (
    <div className="app-shell category-app">
      <a className="skip-link" href="#main-content">
        Skip to dashboard
      </a>
      {desktop ? (
        <aside className="sidebar category-sidebar" aria-label="KPI categories">
          {sidebar}
        </aside>
      ) : (
        <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="sidebar category-sidebar mobile-category-sidebar">
              <Dialog.Title className="sr-only">KPI categories</Dialog.Title>
              <Dialog.Description className="sr-only">
                Choose a category or search for a KPI.
              </Dialog.Description>
              <Dialog.Close asChild>
                <button className="icon-button sidebar-close" aria-label="Close navigation">
                  <X size={20} />
                </button>
              </Dialog.Close>
              {sidebar}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="flex items-center gap-3">
            {!desktop && (
              <button
                className="icon-button"
                aria-label="Open KPI categories"
                onClick={() => setMobileOpen(true)}
              >
                <MenuIcon size={20} />
              </button>
            )}
            <span className="breadcrumb">
              KPI Categories <span>/</span> <strong>{definition.label}</strong>
            </span>
          </div>
          <span className="category-demo-badge">STATIC DEMO</span>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <Compass size={13} /> AIRPORT OPERATIONS
              </div>
              <h1 id="category-title" tabIndex={-1}>
                {definition.label}
                <span className="title-period">.</span>
              </h1>
              <p>{definition.description}</p>
            </div>
            <div className="heading-actions">
              <button className="secondary-button" onClick={exportCategory} disabled={!query.data}>
                <ArrowDownToLine size={15} />
                Export category
              </button>
              {!editing && (
                <button className="primary-button" onClick={() => state.begin(category)}>
                  <Settings2 size={16} />
                  Edit layout
                </button>
              )}
            </div>
          </div>
          <p className="sr-only" role="status">
            {definition.label}: {members.length} KPIs
          </p>
          <div className="category-filterbar">
            <label>
              Time window
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as CategoryFilters['range'])}
              >
                <option value="today">Today</option>
                <option value="six">Last 6 hours</option>
                <option value="hour">Last hour</option>
              </select>
            </label>
            {dims.map((dim) => (
              <label key={dim} htmlFor={'filter-' + dim}>
                {dimensionLabels[dim]}
                <select
                  id={'filter-' + dim}
                  value={filters[dim]}
                  onChange={(e) => changeFilter(dim, e.target.value)}
                >
                  <option value="all">All {dimensionLabels[dim].toLowerCase()}s</option>
                  {options[dim].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              Granularity
              <select
                value={filters.granularity}
                onChange={(e) => changeFilter('granularity', e.target.value)}
              >
                <option value="quarter">15 minutes</option>
                <option value="hour">Hourly</option>
                <option value="day">Daily</option>
              </select>
            </label>
            <button
              className="text-button"
              onClick={() => {
                setRange('today');
                setFilterMap((m) => ({ ...m, [category]: defaultFilters }));
              }}
            >
              Reset filters
            </button>
          </div>
          {editing ? (
            <div className="edit-toolbar">
              <div>
                <span className="editing-icon">
                  <Grip size={19} />
                </span>
                <div>
                  <strong>Unsaved category layout</strong>
                  <span>Drag to move. Drag the right edge to set width.</span>
                </div>
              </div>
              <div className="edit-actions">
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <button className="secondary-button">
                      <Plus size={14} />
                      Restore KPIs <ChevronDown size={12} />
                    </button>
                  </Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Content className="menu-content" align="end">
                      {doc.hidden.length ? (
                        doc.hidden.map((id) => (
                          <Menu.Item
                            key={id}
                            className="menu-item"
                            onSelect={() => restoreKpi(category, id)}
                          >
                            {catalog[id].title}
                          </Menu.Item>
                        ))
                      ) : (
                        <Menu.Item disabled className="menu-item">
                          All KPIs are visible
                        </Menu.Item>
                      )}
                    </Menu.Content>
                  </Menu.Portal>
                </Menu.Root>
                <button className="text-button" onClick={() => state.reset(category)}>
                  Reset layout
                </button>
                <button className="secondary-button" onClick={() => state.cancel(category)}>
                  Cancel
                </button>
                <button className="primary-button" onClick={() => state.save(category)}>
                  <Save size={14} />
                  Save layout
                </button>
              </div>
            </div>
          ) : (
            <div className="overview-toolbar">
              <span className="scope-summary">
                <span className="overview-dot" />
                <strong>
                  {members.length - doc.hidden.length} of {members.length} KPIs visible
                </strong>
              </span>
              <span className="muted">
                Provisional demo definitions · open a KPI for its calculation
              </span>
            </div>
          )}
          {state.notice && (
            <div className="notice" role="status">
              <span>{state.notice}</span>
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={state.clear}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {invalid && <p role="status">Unknown category. Airside Operations is selected.</p>}
          {query.isPending ? (
            <div className="loading-grid" role="status" aria-label="Loading category">
              {members.map((k) => (
                <div key={k.id} className="skeleton-card" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="error-panel" role="alert">
              <h2>Could not load this category</h2>
              <button className="primary-button" onClick={() => void query.refetch()}>
                Try again
              </button>
            </div>
          ) : (
            <CategoryGrid
              key={category}
              snapshot={query.data}
              filters={filters}
              onFocus={(id, trigger) => setFocused({ id, category, trigger })}
            />
          )}
          <footer className="page-footer">
            <span>
              <Check size={12} /> {members.length} defined KPIs · {definition.label}
            </span>
            <span>Static snapshot · 17 Sep 2026 · 14:00 IST</span>
          </footer>
        </main>
      </div>
      {focused?.category === category && selectedMetric && (
        <KpiFocus
          key={focused.id}
          metric={selectedMetric}
          filters={filters}
          trigger={focused.trigger}
          onClose={() => setFocused(null)}
        />
      )}
    </div>
  );
}
