import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const fmt = n => `€${Math.round(n).toLocaleString('en')}`
const fmtFull = n => `€${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const TOOLTIP_STYLE = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--text)',
  fontSize: 13,
  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
}

// Input with a prefix/suffix symbol, avoiding Tailwind vs CSS specificity issues
function PrefixInput({ prefix, suffix, ...props }) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-sm pointer-events-none select-none z-10"
          style={{ color: 'var(--text-muted)' }}>{prefix}</span>
      )}
      <input
        type="number"
        className="input w-full"
        style={{ paddingLeft: prefix ? '1.6rem' : undefined, paddingRight: suffix ? '2.5rem' : undefined }}
        {...props}
      />
      {suffix && (
        <span className="absolute right-3 text-sm pointer-events-none select-none"
          style={{ color: 'var(--text-muted)' }}>{suffix}</span>
      )}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
      {hint && <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>{hint}</p>}
    </div>
  )
}

export default function CompoundInterest() {
  const [form, setForm] = useState({ principal: 1000, rate: 7, contribution: 200, years: 20, frequency: 12 })
  const set = (k, v) => setForm(f => ({ ...f, [k]: Number(v) }))

  const { data, finalBalance, totalContributions, totalInterest } = useMemo(() => {
    const { principal, rate, contribution, years, frequency } = form

    // Derive the effective monthly interest rate from the nominal annual rate and compounding frequency.
    // This is the key: contributions are ALWAYS monthly; only the interest compounding cadence changes.
    //   Monthly  (freq=12): effectiveMonthly = rate/12
    //   Quarterly (freq=4): effectiveMonthly = (1 + rate/4)^(1/3) - 1  (slightly lower APY than monthly)
    //   Annual   (freq=1):  effectiveMonthly = (1 + rate)^(1/12) - 1   (lowest APY)
    const annualRate = rate / 100
    const effectiveMonthlyRate = Math.pow(1 + annualRate / frequency, frequency / 12) - 1

    const rows = []
    let balance = principal
    let contributed = principal   // initial deposit counts as first contribution

    for (let y = 1; y <= years; y++) {
      // Simulate 12 individual monthly steps per year
      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + effectiveMonthlyRate) + contribution
      }
      contributed += contribution * 12  // 12 monthly deposits per year, always
      rows.push({
        year: y,
        balance: Math.round(balance),
        contributions: Math.round(contributed),
        interest: Math.round(balance - contributed),
      })
    }

    return { data: rows, finalBalance: balance, totalContributions: contributed, totalInterest: balance - contributed }
  }, [form])

  // Total return multiple: how many times your invested amount your final balance represents
  const multiplier = totalContributions > 0 ? (finalBalance / totalContributions).toFixed(2) : '0'

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Compound Interest</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>See how your money grows over time with regular contributions</p>
      </div>

      {/* Inputs */}
      <div className="card p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <Field label="Initial Principal" hint="Starting amount">
            <PrefixInput prefix="€" min={0} value={form.principal} onChange={e => set('principal', e.target.value)} />
          </Field>
          <Field label="Annual Rate" hint="Historical S&P 500 avg: ~7%">
            <PrefixInput suffix="%" min={0} max={100} step={0.1} value={form.rate} onChange={e => set('rate', e.target.value)} />
          </Field>
          <Field label="Monthly Contribution" hint="Fixed €/month, always 12×/year">
            <PrefixInput prefix="€" min={0} value={form.contribution} onChange={e => set('contribution', e.target.value)} />
          </Field>
          <Field label="Duration" hint="Years to grow">
            <PrefixInput suffix="yr" min={1} max={60} value={form.years} onChange={e => set('years', e.target.value)} />
          </Field>
          <Field label="Compounding frequency" hint="How often interest is applied: 12 = monthly, 4 = quarterly, 1 = yearly">
            <input type="number" min={1} max={365} className="input w-full" value={form.frequency}
              onChange={e => set('frequency', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Result cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Final Balance</p>
          <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>{fmt(finalBalance)}</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>You Invested</p>
          <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--green)' }}>{fmt(totalContributions)}</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Interest Earned</p>
          <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--yellow)' }}>{fmt(totalInterest)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>{multiplier}× total return</p>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Growth Projection</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
              label={{ value: 'Year', position: 'insideBottomRight', offset: -5, fill: 'var(--text-muted)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtFull} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Line type="monotone" dataKey="balance" name="Total Balance" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="contributions" name="Contributions" stroke="var(--green)" strokeWidth={2} dot={false} strokeDasharray="5 4" />
            <Line type="monotone" dataKey="interest" name="Interest" stroke="var(--yellow)" strokeWidth={2} dot={false} strokeDasharray="5 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-sm">
            <thead className="sticky top-0" style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                {['Year','Balance','Contributed','Interest Earned','Multiplier'].map(h => (
                  <th key={h} className="py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-left"
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.year} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2.5 px-4" style={{ color: 'var(--text-muted)' }}>{row.year}</td>
                  <td className="py-2.5 px-4 font-semibold" style={{ color: 'var(--accent)' }}>{fmt(row.balance)}</td>
                  <td className="py-2.5 px-4" style={{ color: 'var(--green)' }}>{fmt(row.contributions)}</td>
                  <td className="py-2.5 px-4" style={{ color: 'var(--yellow)' }}>{fmt(row.interest)}</td>
                  <td className="py-2.5 px-4" style={{ color: 'var(--text-muted)' }}>
                    {row.contributions > 0 ? `${(row.balance / row.contributions).toFixed(2)}×` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
