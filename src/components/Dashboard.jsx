import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, ReferenceLine,
} from 'recharts'
import { useApp } from '../context/AppContext'
import {
  rollupByMonth, sumByCategory, sumBySavingsCategory,
  savingsRateByMonth, totalIncome, totalExpenses, totalSavings,
  uniqueCategories, monthLabel, filterTransactions,
} from '../lib/aggregations'
import SankeyDiagram from './SankeyDiagram'
import { Upload, AlertTriangle } from 'lucide-react'

const fmt = n => `€${Math.abs(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtShort = n => `€${Math.round(Math.abs(n)).toLocaleString('en')}`

// Savings bar — rounds the top corners only when there is NO leftover stacked above.
// When leftoverPos > 0, the top is kept flat so leftoverPos bar sits flush on top.
function SavingsBar({ x, y, width, height, payload }) {
  if (!height || height < 1) return null
  const hasLeftover = payload && payload.leftoverPos > 0
  const r = hasLeftover ? 0 : Math.min(4, height / 2, width / 2)
  return (
    <path
      d={`M${x},${y+height} H${x+width} V${y+r} Q${x+width},${y} ${x+width-r},${y} H${x+r} Q${x},${y} ${x},${y+r} Z`}
      fill="var(--accent)"
    />
  )
}

// Shortfall bar — only ever draws DOWNWARD (leftoverNeg is always ≤ 0).
// Because direction is fixed, we don't need to guess: topY = zero line, botY = below it.
function ShortfallBar({ x, y, width, height }) {
  if (!height) return null
  const absH = Math.abs(height)
  if (absH < 1) return null
  const topY = Math.min(y, y + height)  // zero-line side (flat)
  const botY = Math.max(y, y + height)  // below-zero side (rounded)
  const r = Math.min(4, absH / 2, width / 2)
  return (
    <path
      d={`M${x},${topY} H${x+width} V${botY-r} Q${x+width},${botY} ${x+width-r},${botY} H${x+r} Q${x},${botY} ${x},${botY-r} Z`}
      fill="var(--yellow)"
      fillOpacity={0.75}
    />
  )
}

// Custom tooltip — filters out zero-value rows so the tooltip stays clean
function MonthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const fmt2 = v => `€${Math.abs(v).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const rows = payload.filter(p => p.value !== 0)
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: 'var(--text)', boxShadow: '0 4px 24px rgba(0,0,0,.18)' }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {rows.map((item, i) => (
        <p key={i} style={{ color: item.fill ?? item.color, margin: '2px 0' }}>
          {item.name} : {item.value < 0 ? `−${fmt2(item.value)}` : fmt2(item.value)}
        </p>
      ))}
    </div>
  )
}

const TOOLTIP = {
  contentStyle: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text)',
    fontSize: 13,
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
  },
}

function Card({ title, children, action }) {
  return (
    <div className="card p-5">
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{title}</p>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

function Stat({ label, value, color, sub }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-bold tracking-tight" style={{ color: color ?? 'var(--text)' }}>{value}</p>
      {sub && <p className="text-xs mt-1.5" style={{ color: 'var(--text-subtle)' }}>{sub}</p>}
    </div>
  )
}

function EmptyState({ onImport }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
        <Upload size={24} style={{ color: 'var(--accent)' }} />
      </div>
      <div>
        <p className="font-semibold text-xl" style={{ color: 'var(--text)' }}>No data yet</p>
        <p className="text-sm mt-1.5 max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>Import a Monefy CSV export to visualise your finances</p>
      </div>
      <button onClick={onImport}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity"
        style={{ background: 'var(--accent)', color: '#fff' }}>
        Import CSV
      </button>
    </div>
  )
}

// Build year/month options from all transactions
function getDateOptions(transactions) {
  const years = [...new Set(transactions.map(t => t.date.getFullYear()))].sort((a, b) => b - a)
  return years
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Dashboard({ onRequestImport }) {
  const { transactions, getCategoryColor, getEffectiveType, countLeftoverAsSavings } = useApp()

  // Local dashboard filters (separate from global filters)
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [sortCats, setSortCats] = useState('amount') // 'amount' | 'alpha'
  const [catView, setCatView] = useState('total') // 'total' | 'avg'
  const [bigThreshold] = useState(200)

  const years = useMemo(() => getDateOptions(transactions), [transactions])

  // Apply year/month filter to transactions
  const filtered = useMemo(() => {
    if (selectedYear === 'all') return transactions
    const start = new Date(Number(selectedYear), selectedMonth === 'all' ? 0 : Number(selectedMonth), 1)
    const end = selectedMonth === 'all'
      ? new Date(Number(selectedYear) + 1, 0, 1)
      : new Date(Number(selectedYear), Number(selectedMonth) + 1, 1)
    return transactions.filter(t => t.date >= start && t.date < end)
  }, [transactions, selectedYear, selectedMonth])

  const monthly = useMemo(() => rollupByMonth(filtered, getEffectiveType), [filtered, getEffectiveType])
  const byCategory = useMemo(() => {
    const cats = sumByCategory(filtered, getEffectiveType)
    return sortCats === 'alpha' ? [...cats].sort((a, b) => a.name.localeCompare(b.name)) : cats
  }, [filtered, getEffectiveType, sortCats])
  const bySavings = useMemo(() => sumBySavingsCategory(filtered, getEffectiveType), [filtered, getEffectiveType])
  const allCats = useMemo(() => uniqueCategories(filtered), [filtered])

  const months = monthly.length || 1

  const income = useMemo(() => totalIncome(filtered, getEffectiveType), [filtered, getEffectiveType])
  const expenses = useMemo(() => totalExpenses(filtered, getEffectiveType), [filtered, getEffectiveType])
  const categorizedSavings = useMemo(() => totalSavings(filtered, getEffectiveType), [filtered, getEffectiveType])
  // Leftover = unspent income after expenses and explicit savings
  const net = income - expenses - categorizedSavings
  const leftover = Math.max(0, net)
  // Effective savings: explicit savings + optional leftover
  const effectiveSavings = categorizedSavings + (countLeftoverAsSavings ? leftover : 0)
  const rate = income > 0 ? Math.round((effectiveSavings / income) * 100) : 0

  // Sankey data
  const sankeyIncome = useMemo(() => {
    const map = {}
    for (const t of filtered) {
      if (getEffectiveType(t) !== 'income') continue
      map[t.category] = (map[t.category] ?? 0) + t.amount
    }
    return Object.entries(map).map(([name, value]) => ({
      name, value, color: getCategoryColor(name, allCats),
    })).sort((a, b) => b.value - a.value)
  }, [filtered, getEffectiveType, getCategoryColor, allCats])

  const sankeyExpense = useMemo(() => {
    const cats = byCategory.map(c => ({ name: c.name, value: c.value, color: getCategoryColor(c.name, allCats) }))
    const savCats = bySavings.map(c => ({ name: c.name, value: c.value, color: '#818cf8' }))
    return [...cats, ...savCats]
  }, [byCategory, bySavings, getCategoryColor, allCats])

  // Big purchases from filtered set
  const bigPurchases = useMemo(() =>
    filtered
      .filter(t => getEffectiveType(t) === 'expense' && Math.abs(t.amount) >= bigThreshold)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 10),
    [filtered, getEffectiveType, bigThreshold]
  )

  const monthlyDisplay = monthly.map(m => ({
    ...m,
    label: monthLabel(m.month),
    leftoverPos: Math.max(0, m.net),   // ≥ 0 — standard upward bar, no custom shape needed
    leftoverNeg: Math.min(0, m.net),   // ≤ 0 — ShortfallBar draws it downward
  }))
  const savingsRate = savingsRateByMonth(monthly, countLeftoverAsSavings)

  if (transactions.length === 0) return <EmptyState onImport={onRequestImport} />

  const filterBar = (
    <div className="card p-3 flex flex-wrap items-center gap-2 mb-5">
      <select className="input text-xs" value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setSelectedMonth('all') }}>
        <option value="all">All time</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <select className="input text-xs" value={selectedMonth} disabled={selectedYear === 'all'}
        onChange={e => setSelectedMonth(e.target.value)}>
        <option value="all">All months</option>
        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
      </select>
      <div className="ml-auto flex items-center gap-1">
        <span className="text-xs mr-1" style={{ color: 'var(--text-muted)' }}>Sort categories:</span>
        {[['amount','By amount'],['alpha','A–Z']].map(([val, label]) => (
          <button key={val} onClick={() => setSortCats(val)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              background: sortCats === val ? 'var(--accent)' : 'transparent',
              color: sortCats === val ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {filterBar}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Income" value={fmtShort(income)} color="var(--green)"
          sub={`avg ${fmtShort(income / months)}/mo`} />
        <Stat label="Expenses" value={fmtShort(expenses)} color="var(--red)"
          sub={`avg ${fmtShort(expenses / months)}/mo`} />
        <Stat label="Savings" value={fmtShort(effectiveSavings)} color="var(--accent)"
          sub={[...bySavings.map(s => s.name), (countLeftoverAsSavings && leftover > 0) ? 'leftover' : ''].filter(Boolean).join(', ') || 'income − expenses'} />
        <Stat label="Savings Rate" value={`${rate}%`}
          color={rate >= 20 ? 'var(--green)' : rate >= 10 ? 'var(--yellow)' : 'var(--red)'}
          sub="of total income" />
      </div>

      {/* Sankey — hero chart */}
      {sankeyIncome.length > 0 && sankeyExpense.length > 0 && (
        <Card title="Money Flow">
          <SankeyDiagram incomeGroups={sankeyIncome} expenseGroups={sankeyExpense} />
        </Card>
      )}

      {/* Monthly bar */}
      <Card title="Monthly Overview">
        <ResponsiveContainer width="100%" height={240}>
          {/* stackOffset="sign" is required for negative bars to render below the zero line */}
          <BarChart data={monthlyDisplay} barGap={3} barCategoryGap="32%" stackOffset="sign">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={fmtShort} domain={['auto', 'auto']} />
            <Tooltip content={<MonthTooltip />} />
            <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
            <Bar dataKey="income" name="Income" fill="var(--green)" radius={[4,4,0,0]} />
            <Bar dataKey="expenses" name="Expenses" fill="var(--red)" radius={[4,4,0,0]} />
            {/* savings: rounded top when alone, flat top when leftoverPos sits above */}
            <Bar dataKey="savings" name="Savings" fill="var(--accent)" stackId="sav" shape={<SavingsBar />} />
            <Bar dataKey="leftoverPos" name="Leftover" fill="var(--yellow)" stackId="sav" radius={[4,4,0,0]} />
            {/* leftoverNeg always ≤ 0 — ShortfallBar draws downward with rounded bottom */}
            <Bar dataKey="leftoverNeg" name="Shortfall" fill="var(--yellow)" stackId="sav" shape={<ShortfallBar />} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <Card
          title="Spending by Category"
          action={
            <div className="flex items-center gap-1">
              {[['total', 'Total'], ['avg', 'Avg/mo']].map(([val, label]) => (
                <button key={val} onClick={() => setCatView(val)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: catView === val ? 'var(--accent)' : 'transparent',
                    color: catView === val ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          }
        >
          <div className="space-y-1.5">
            {byCategory.map(row => {
              const displayValue = catView === 'avg' ? row.value / months : row.value
              // Bar width always relative to total (not per-month) for stable visual
              const pct = expenses > 0 ? (row.value / expenses) * 100 : 0
              return (
                <div key={row.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getCategoryColor(row.name, allCats) }} />
                      {row.name}
                    </span>
                    <span className="text-sm font-semibold">{fmt(displayValue)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: getCategoryColor(row.name, allCats) }} />
                  </div>
                </div>
              )
            })}
            {(bySavings.length > 0 || leftover > 0) && (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest pt-2" style={{ color: 'var(--accent)' }}>Savings</p>
                {bySavings.map(row => {
                  const displayValue = catView === 'avg' ? row.value / months : row.value
                  const pct = income > 0 ? (row.value / income) * 100 : 0
                  return (
                    <div key={row.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-2 text-sm">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
                          {row.name}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{fmt(displayValue)}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                      </div>
                    </div>
                  )
                })}
                {leftover > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--yellow)' }} />
                        <span style={{ color: 'var(--yellow)' }}>Leftover</span>
                        <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>(unspent)</span>
                      </span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--yellow)' }}>
                        {fmt(catView === 'avg' ? leftover / months : leftover)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                      <div className="h-full rounded-full" style={{ width: `${income > 0 ? (leftover / income) * 100 : 0}%`, background: 'var(--yellow)' }} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Savings rate */}
        <Card title="Savings Rate">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={savingsRate.map(s => ({ ...s, label: monthLabel(s.month) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={TOOLTIP.contentStyle} formatter={v => `${v}%`} />
              <Line type="monotone" dataKey="rate" name="Savings Rate" stroke="var(--accent)"
                strokeWidth={2} dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'var(--accent)' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Big purchases — prominent separate card */}
      {bigPurchases.length > 0 && (
        <Card
          title={`Large Purchases (> ${fmt(bigThreshold)})`}
          action={
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg"
              style={{ background: 'color-mix(in srgb, var(--red) 15%, transparent)', color: 'var(--red)' }}>
              <AlertTriangle size={12} />
              {bigPurchases.length} flagged
            </span>
          }
        >
          <div className="space-y-2">
            {bigPurchases.map((t, i) => (
              <div key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'color-mix(in srgb, var(--red) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--red) 20%, transparent)' }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getCategoryColor(t.category, allCats) }} />
                <span className="flex-1 min-w-0">
                  <span className="text-sm font-medium block truncate" style={{ color: 'var(--text)' }}>
                    {t.description || t.category}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t.category} · {t.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </span>
                <span className="font-bold text-sm flex-shrink-0" style={{ color: 'var(--red)' }}>
                  {fmt(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
