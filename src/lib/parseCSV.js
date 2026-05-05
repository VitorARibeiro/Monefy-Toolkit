import Papa from 'papaparse'

function parseDate(raw) {
  // Monefy format: M/D/YYYY
  const [m, d, y] = raw.split('/')
  return new Date(Number(y), Number(m) - 1, Number(d))
}

function normaliseRow(row) {
  const amount = parseFloat(row['amount'] ?? row['converted amount'] ?? 0)
  return {
    date: parseDate(row['date']),
    account: row['account'] ?? '',
    category: (row['category'] ?? '').trim(),
    amount,
    currency: row['currency'] ?? 'EUR',
    description: (row['description'] ?? '').trim(),
    type: amount >= 0 ? 'income' : 'expense',
  }
}

function dedupeKey(t) {
  return `${t.date.toISOString().slice(0, 10)}|${t.category}|${t.amount}|${t.description}`
}

export function parseMonefyCSV(text) {
  const { data, errors } = Papa.parse(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase(),
  })
  if (errors.length) console.warn('CSV parse warnings:', errors)
  return data.map(normaliseRow)
}

export function mergeTransactions(existing, incoming) {
  const seen = new Set(existing.map(dedupeKey))
  const novel = incoming.filter(t => !seen.has(dedupeKey(t)))
  return [...existing, ...novel].sort((a, b) => a.date - b.date)
}
