import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { uniqueCategories } from '../lib/aggregations'
import { ArrowUpDown, ArrowUp, ArrowDown, Upload, AlertTriangle } from 'lucide-react'

const fmt = n => `€${Math.abs(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = d => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export default function TransactionTable({ onRequestImport }) {
  const { filtered, filters, setFilters, transactions, getCategoryColor, getEffectiveType } = useApp()
  const allCategories = useMemo(() => uniqueCategories(transactions), [transactions])

  const [sort, setSort] = useState({ key: 'date', dir: -1 })
  const [threshold, setThreshold] = useState(200)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('')

  const rows = useMemo(() => {
    let list = filtered
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    }
    if (activeCategory) list = list.filter(t => t.category === activeCategory)
    return [...list].sort((a, b) => {
      const av = sort.key === 'date' ? a.date : sort.key === 'amount' ? a.amount : a[sort.key]
      const bv = sort.key === 'date' ? b.date : sort.key === 'amount' ? b.amount : b[sort.key]
      return av < bv ? -sort.dir : av > bv ? sort.dir : 0
    })
  }, [filtered, sort, search, activeCategory])

  const bigRows = useMemo(() =>
    rows.filter(t => getEffectiveType(t) === 'expense' && Math.abs(t.amount) >= threshold),
    [rows, threshold, getEffectiveType]
  )

  // Sum of current filtered rows
  const { sumExpenses, sumIncome } = useMemo(() => {
    let se = 0, si = 0
    for (const t of rows) {
      const etype = getEffectiveType(t)
      if (etype === 'expense') se += Math.abs(t.amount)
      else if (etype === 'income') si += t.amount
    }
    return { sumExpenses: se, sumIncome: si }
  }, [rows, getEffectiveType])

  function toggleSort(key) {
    setSort(s => s.key === key ? { key, dir: -s.dir } : { key, dir: -1 })
  }

  function SortIcon({ k }) {
    if (sort.key !== k) return <ArrowUpDown size={11} style={{ opacity: 0.35 }} />
    return sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
          <Upload size={24} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <p className="font-semibold text-xl" style={{ color: 'var(--text)' }}>No transactions</p>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>Import a Monefy CSV to see your transactions</p>
        </div>
        <button onClick={onRequestImport}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity"
          style={{ background: 'var(--accent)', color: '#fff' }}>
          Import CSV
        </button>
      </div>
    )
  }

  const thBase = "py-3 px-4 text-xs font-semibold uppercase tracking-wider text-left cursor-pointer select-none"

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>From</label>
          <input type="date" className="input" onChange={e => setFilters(f => ({ ...f, startDate: e.target.value ? new Date(e.target.value) : null }))} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>To</label>
          <input type="date" className="input" onChange={e => setFilters(f => ({ ...f, endDate: e.target.value ? new Date(e.target.value) : null }))} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Type</label>
          <select className="input" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Category</label>
          <select className="input" value={activeCategory} onChange={e => setActiveCategory(e.target.value)}>
            <option value="">All categories</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Flag &gt; €</label>
          <input type="number" className="input w-24" value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-36">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Search</label>
          <input type="text" placeholder="description or category…" className="input" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => { setFilters({ startDate: null, endDate: null, categories: [], type: 'all' }); setSearch(''); setActiveCategory('') }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-70 transition-opacity"
          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          Reset
        </button>
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>{rows.length}</span> of {transactions.length} transactions
          {activeCategory && <span className="ml-1" style={{ color: 'var(--accent)' }}>· {activeCategory}</span>}
        </p>
        <div className="flex gap-4 text-sm">
          {sumExpenses > 0 && (
            <span>Expenses: <strong style={{ color: 'var(--red)' }}>{fmt(sumExpenses)}</strong></span>
          )}
          {sumIncome > 0 && (
            <span>Income: <strong style={{ color: 'var(--green)' }}>{fmt(sumIncome)}</strong></span>
          )}
        </div>
      </div>

      {/* Big purchases — separate prominent section */}
      {bigRows.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)' }}>
          <div className="flex items-center gap-2 px-4 py-2.5"
            style={{ background: 'color-mix(in srgb, var(--red) 12%, transparent)', borderBottom: '1px solid color-mix(in srgb, var(--red) 20%, transparent)' }}>
            <AlertTriangle size={14} style={{ color: 'var(--red)' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--red)' }}>
              Large purchases — {bigRows.length} over {fmt(threshold)}
            </span>
            <span className="ml-auto text-sm font-bold" style={{ color: 'var(--red)' }}>
              {fmt(bigRows.reduce((s, t) => s + Math.abs(t.amount), 0))} total
            </span>
          </div>
          <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
            {bigRows.map((t, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3"
                style={{ background: 'color-mix(in srgb, var(--red) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--red) 15%, transparent)' }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getCategoryColor(t.category, allCategories) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{t.description || t.category}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.category} · {fmtDate(t.date)}</p>
                </div>
                <span className="font-bold text-sm" style={{ color: 'var(--red)' }}>{fmt(t.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
              <tr>
                <th className={thBase} style={{ color: 'var(--text-muted)' }} onClick={() => toggleSort('date')}>
                  <span className="flex items-center gap-1.5">Date <SortIcon k="date" /></span>
                </th>
                <th className={thBase} style={{ color: 'var(--text-muted)' }} onClick={() => toggleSort('category')}>
                  <span className="flex items-center gap-1.5">Category <SortIcon k="category" /></span>
                </th>
                <th className={thBase} style={{ color: 'var(--text-muted)' }}>Description</th>
                <th className={`${thBase} text-right`} style={{ color: 'var(--text-muted)' }} onClick={() => toggleSort('amount')}>
                  <span className="flex items-center justify-end gap-1.5">Amount <SortIcon k="amount" /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => {
                const effType = getEffectiveType(t)
                const isBig = effType === 'expense' && Math.abs(t.amount) >= threshold
                const amtColor = effType === 'income' ? 'var(--green)' : effType === 'savings' ? 'var(--accent)' : 'var(--red)'

                return (
                  <tr key={i} style={{
                    borderBottom: '1px solid var(--border)',
                    background: isBig ? 'color-mix(in srgb, var(--red) 6%, transparent)' : 'transparent',
                  }}>
                    <td className="py-3 px-4 whitespace-nowrap" style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmtDate(t.date)}</td>
                    <td className="py-3 px-4">
                      <button
                        className="flex items-center gap-2 hover:opacity-70 transition-opacity text-left"
                        onClick={() => setActiveCategory(activeCategory === t.category ? '' : t.category)}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getCategoryColor(t.category, allCategories) }} />
                        <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{t.category}</span>
                        {effType === 'savings' && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', fontSize: '0.65rem' }}>savings</span>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.description || '—'}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {isBig && (
                        <span className="inline-flex items-center mr-2">
                          <AlertTriangle size={12} style={{ color: 'var(--red)' }} />
                        </span>
                      )}
                      <span className="font-semibold text-sm" style={{ color: amtColor }}>
                        {effType === 'income' ? '+' : '-'}{fmt(t.amount)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
