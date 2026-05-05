import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { totalExpenses, totalSavings, rollupByMonth, sumByCategory } from '../../lib/aggregations'

const fmt = n => `€${Math.abs(n).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtDec = n => `€${Math.abs(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

// Target-only display (no CSV data)
function GoalCard({ label, description, pct, income, note }) {
  const target = income * (pct / 100)
  return (
    <div className="rounded-xl p-4 space-y-1" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-base" style={{ color: 'var(--accent)' }}>{fmt(target)}<span className="text-xs font-normal">/mo</span></p>
          <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>{pct}% of income</p>
        </div>
      </div>
      {note && <p className="text-xs pt-1" style={{ color: 'var(--text-subtle)', borderTop: '1px solid var(--border)' }}>{note}</p>}
    </div>
  )
}

// Actual vs target bar (with CSV data)
function RuleBar({ label, description, pct, actual, income, onPctChange }) {
  const target = income * (pct / 100)
  // Bar shows how much of the allowed budget is used: actual / target (not actual / income)
  const over = actual !== null && target > 0 && actual > target
  const fill = actual !== null && target > 0 ? Math.min(100, (actual / target) * 100) : 0

  return (
    <div className="space-y-2 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
        </div>
        <div className="flex-shrink-0">
          <div className="relative flex items-center">
            <input type="number" min={1} max={100} value={pct} onChange={e => onPctChange(Number(e.target.value))}
              className="input text-center text-sm" style={{ width: '4rem', paddingRight: '1.4rem' }} />
            <span className="absolute right-2 text-sm pointer-events-none select-none" style={{ color: 'var(--text-muted)' }}>%</span>
          </div>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${fill}%`, background: over ? 'var(--red)' : 'var(--green)' }} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: 'var(--text-muted)' }}>
          Actual: <strong>{actual !== null ? fmtDec(actual) : '—'}</strong>/mo · Target: <strong>{fmtDec(target)}</strong>/mo
        </span>
        {actual !== null && (
          over
            ? <span className="badge-red">Over by {fmtDec(actual - target)}</span>
            : <span className="badge-green">Under by {fmtDec(target - actual)}</span>
        )}
      </div>
    </div>
  )
}

export default function BudgetRules() {
  const { transactions, getEffectiveType, countLeftoverAsSavings } = useApp()
  const hasData = transactions.length > 0

  const months = useMemo(() => Math.max(rollupByMonth(transactions, getEffectiveType).length, 1), [transactions, getEffectiveType])
  const avgIncome = useMemo(() => {
    if (!hasData) return 0
    const monthly = rollupByMonth(transactions, getEffectiveType)
    return monthly.reduce((s, m) => s + m.income, 0) / months
  }, [transactions, getEffectiveType, months, hasData])

  const [manualIncome, setManualIncome] = useState('')
  const income = Number(manualIncome) || avgIncome

  const byCategory = useMemo(() => sumByCategory(transactions, getEffectiveType), [transactions, getEffectiveType])
  const catMonthly = (keywords) => {
    const match = byCategory.find(c => keywords.some(k => c.name.toLowerCase().includes(k)))
    return match ? match.value / months : null
  }
  const totalExpMonthly = hasData ? totalExpenses(transactions, getEffectiveType) / months : null
  const categorizedSavingsMonthly = hasData ? totalSavings(transactions, getEffectiveType) / months : null
  // Savings actual = categorized savings + optional leftover
  const savingsActual = useMemo(() => {
    if (!hasData || categorizedSavingsMonthly === null) return null
    if (!countLeftoverAsSavings) return categorizedSavingsMonthly
    const inc = avgIncome
    const exp = totalExpMonthly ?? 0
    const leftover = Math.max(0, inc - exp - categorizedSavingsMonthly)
    return categorizedSavingsMonthly + leftover
  }, [hasData, categorizedSavingsMonthly, countLeftoverAsSavings, avgIncome, totalExpMonthly])
  const carMonthly = catMonthly(['car'])
  const rentMonthly = catMonthly(['rent', 'housing', 'house'])

  const [pcts, setPcts] = useState({ needs: 50, wants: 30, savings: 20, car: 13, rent: 30 })
  const set = (k, v) => setPcts(p => ({ ...p, [k]: v }))

  const incomeSection = (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Monthly Net Income</p>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: 'var(--text-muted)' }}>€</span>
          <input type="number" placeholder={avgIncome > 0 ? Math.round(avgIncome).toString() : '1500'}
            value={manualIncome} onChange={e => setManualIncome(e.target.value)}
            className="input w-full" style={{ paddingLeft: '1.75rem' }} />
        </div>
        {avgIncome > 0 && !manualIncome && (
          <span className="text-xs px-2.5 py-1 rounded-lg" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
            Auto-detected: {fmt(avgIncome)}/mo from CSV
          </span>
        )}
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--text-subtle)' }}>
        Using {fmt(income)}/month · {fmt(income * 12)}/year
      </p>
    </div>
  )

  // No CSV: show targets only
  if (!hasData) {
    return (
      <div className="space-y-5 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Budget Rules</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Common financial guidelines. Import a CSV to compare against your actual spending.</p>
        </div>

        {incomeSection}

        {income > 0 && (
          <>
            <div className="card p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>50 / 30 / 20 Rule</p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>Split your income between needs, wants, and savings</p>
              <GoalCard label="Needs" description="Essentials — rent, food, utilities, transport" pct={50} income={income} />
              <GoalCard label="Wants" description="Lifestyle — dining out, entertainment, shopping" pct={30} income={income} />
              <GoalCard label="Savings & Investments" description="Future — emergency fund, investments, retirement" pct={20} income={income}
                note={`Annual savings goal: ${fmt(income * 12 * 0.2)}`} />
            </div>

            <div className="card p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Other Guidelines</p>
              <GoalCard label="Car expenses" description="Fuel, parking, maintenance — keep under 13% of income" pct={13} income={income}
                note="Annual budget: " />
              <GoalCard label="Housing / Rent" description="Rent or mortgage — keep under 30% of net income" pct={30} income={income} />
            </div>

            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Emergency Fund Target</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[6, 9, 12].map(x => (
                  <div key={x} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{x}× expenses</p>
                    <p className="font-bold" style={{ color: 'var(--accent)' }}>{fmt(income * 0.7 * x)}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // With CSV: show full comparison with progress bars
  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Budget Rules</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Comparing your actual spending to common financial guidelines</p>
      </div>

      {incomeSection}

      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>50 / 30 / 20 Rule</p>
        <p className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>Needs / Wants / Savings — adjust % to your own target</p>
        <RuleBar label="Needs" description="Essentials — rent, food, utilities"
          pct={pcts.needs} actual={totalExpMonthly ? totalExpMonthly * 0.55 : null}
          income={income} onPctChange={v => set('needs', v)} />
        <RuleBar label="Wants" description="Lifestyle — dining, entertainment, shopping"
          pct={pcts.wants} actual={totalExpMonthly ? totalExpMonthly * 0.45 : null}
          income={income} onPctChange={v => set('wants', v)} />
        <RuleBar label="Savings & Investments" description="Future — emergency fund, investments"
          pct={pcts.savings} actual={savingsActual} income={income} onPctChange={v => set('savings', v)} />
        <p className="text-xs mt-3 pt-3" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
          Monthly savings target: <strong style={{ color: 'var(--accent)' }}>{fmt(income * (pcts.savings / 100))}</strong> · Annual: <strong style={{ color: 'var(--accent)' }}>{fmt(income * (pcts.savings / 100) * 12)}</strong>
        </p>
      </div>

      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Car Cost Rule</p>
        <p className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>Annual car costs should stay under 10–15% of gross income</p>
        <RuleBar label="Car expenses" description="Fuel, parking, maintenance, insurance"
          pct={pcts.car} actual={carMonthly} income={income} onPctChange={v => set('car', v)} />
        {carMonthly !== null && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Annual: <strong>{fmtDec(carMonthly * 12)}</strong> · Allowed at {pcts.car}%: <strong>{fmtDec(income * 12 * (pcts.car / 100))}</strong>
          </p>
        )}
      </div>

      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Housing Rule</p>
        <p className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>Rent/mortgage should not exceed 30% of net income</p>
        <RuleBar label="Housing" description="Rent, mortgage, housing costs"
          pct={pcts.rent} actual={rentMonthly} income={income} onPctChange={v => set('rent', v)} />
      </div>

      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Emergency Fund</p>
        <div className="grid grid-cols-4 gap-2">
          {[6, 9, 12].map(x => (
            <div key={x} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{x}× expenses</p>
              <p className="font-bold" style={{ color: 'var(--accent)' }}>
                {totalExpMonthly ? fmt(totalExpMonthly * x) : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
