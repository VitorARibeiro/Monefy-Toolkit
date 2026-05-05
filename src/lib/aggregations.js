const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key) {
  const [, m] = key.split('-')
  return MONTH_LABELS[Number(m) - 1]
}

// getEffectiveType resolves category overrides from context
function effectiveType(t, getEffectiveType) {
  return getEffectiveType ? getEffectiveType(t) : t.type
}

export function rollupByMonth(transactions, getEffectiveType) {
  const map = {}
  for (const t of transactions) {
    const k = monthKey(t.date)
    if (!map[k]) map[k] = { month: k, income: 0, expenses: 0, savings: 0, net: 0 }
    const type = effectiveType(t, getEffectiveType)
    if (type === 'income') map[k].income += t.amount
    else if (type === 'savings') map[k].savings += Math.abs(t.amount)
    else if (type === 'expense') map[k].expenses += Math.abs(t.amount)
    // ignore = skip
    map[k].net = map[k].income - map[k].expenses - map[k].savings
  }
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
}

export function sumByCategory(transactions, getEffectiveType) {
  const map = {}
  for (const t of transactions) {
    const type = effectiveType(t, getEffectiveType)
    if (type !== 'expense') continue
    map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount)
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

export function sumBySavingsCategory(transactions, getEffectiveType) {
  const map = {}
  for (const t of transactions) {
    const type = effectiveType(t, getEffectiveType)
    if (type !== 'savings') continue
    map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount)
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

export function savingsRateByMonth(monthlyRollup, countLeftover = true) {
  return monthlyRollup.map(m => ({
    month: m.month,
    rate: m.income > 0
      ? Math.round(((m.savings + (countLeftover ? Math.max(0, m.net) : 0)) / m.income) * 100)
      : 0,
  }))
}

export function totalIncome(transactions, getEffectiveType) {
  return transactions
    .filter(t => effectiveType(t, getEffectiveType) === 'income')
    .reduce((s, t) => s + t.amount, 0)
}

export function totalExpenses(transactions, getEffectiveType) {
  return transactions
    .filter(t => effectiveType(t, getEffectiveType) === 'expense')
    .reduce((s, t) => s + Math.abs(t.amount), 0)
}

export function totalSavings(transactions, getEffectiveType) {
  return transactions
    .filter(t => effectiveType(t, getEffectiveType) === 'savings')
    .reduce((s, t) => s + Math.abs(t.amount), 0)
}

export function uniqueCategories(transactions) {
  return [...new Set(transactions.map(t => t.category))].sort()
}

export function filterTransactions(transactions, { startDate, endDate, categories, type }) {
  return transactions.filter(t => {
    if (startDate && t.date < startDate) return false
    if (endDate && t.date > endDate) return false
    if (categories?.length && !categories.includes(t.category)) return false
    if (type && type !== 'all' && t.type !== type) return false
    return true
  })
}
