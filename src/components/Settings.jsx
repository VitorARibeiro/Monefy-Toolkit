import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { CAT_TYPES } from '../lib/constants'
import { uniqueCategories } from '../lib/aggregations'

function Section({ title, description, children }) {
  return (
    <div className="card p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>{title}</h2>
        {description && <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const { transactions, categoryConfig, updateCategoryConfig, getCategoryColor, countLeftoverAsSavings, setCountLeftoverAsSavings } = useApp()
  const categories = useMemo(() => uniqueCategories(transactions), [transactions])

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Configure how categories are classified and displayed</p>
      </div>

      <Section
        title="Category Configuration"
        description={
          transactions.length === 0
            ? 'Import a CSV to configure your categories.'
            : 'Set how each category is treated. For example, mark "Investments" as Savings to exclude it from expense charts.'
        }
      >
        {transactions.length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--text-subtle)' }}>No data imported yet.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid gap-3 text-xs font-semibold uppercase tracking-wider px-1"
              style={{ gridTemplateColumns: '1fr 190px 40px', color: 'var(--text-muted)' }}>
              <span>Category</span>
              <span>Classify as</span>
              <span>Color</span>
            </div>

            {categories.map(cat => {
              const cfg = categoryConfig[cat] ?? {}
              const currentType = cfg.type ?? 'auto'
              const color = getCategoryColor(cat, categories)

              return (
                <div key={cat}
                  className="grid gap-3 items-center px-3 py-2.5 rounded-xl"
                  style={{ gridTemplateColumns: '1fr 190px 40px', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{cat}</span>
                  </div>

                  <select
                    value={currentType}
                    onChange={e => updateCategoryConfig(cat, { type: e.target.value === 'auto' ? undefined : e.target.value })}
                    className="input text-xs"
                    style={{ paddingTop: '0.3rem', paddingBottom: '0.3rem' }}>
                    <option value="auto">Auto (from amount sign)</option>
                    {Object.entries(CAT_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>

                  <input
                    type="color"
                    value={color}
                    onChange={e => updateCategoryConfig(cat, { color: e.target.value })}
                    className="w-9 h-9 rounded-lg cursor-pointer"
                    style={{ padding: '2px', background: 'var(--bg)', border: '1px solid var(--border)' }}
                    title="Pick color"
                  />
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="Savings Behaviour" description="Control how unspent income is classified.">
        <div className="flex items-center justify-between gap-4 py-1">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Count leftover as savings</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Unspent income (income − expenses − categorised savings) is automatically added to your savings total and rate.
            </p>
          </div>
          <button
            onClick={() => setCountLeftoverAsSavings(v => !v)}
            className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200"
            style={{ background: countLeftoverAsSavings ? 'var(--accent)' : 'var(--border)' }}
            aria-pressed={countLeftoverAsSavings}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200"
              style={{ transform: countLeftoverAsSavings ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </Section>

      <Section title="Data" description="Manage imported transaction data.">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {transactions.length > 0
            ? `${transactions.length} transactions loaded. Use the sidebar to import more CSV files or clear all data.`
            : 'No data imported. Use the sidebar to import a Monefy CSV export.'}
        </p>
      </Section>
    </div>
  )
}
