import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { mergeTransactions } from '../lib/parseCSV'
import { filterTransactions } from '../lib/aggregations'

const AppContext = createContext(null)

const DEFAULT_PALETTE = [
  '#6366f1','#f59e0b','#10b981','#f43f5e','#3b82f6',
  '#ec4899','#8b5cf6','#14b8a6','#f97316','#84cc16',
  '#06b6d4','#a855f7','#eab308','#22c55e','#64748b',
]

function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

export function AppProvider({ children }) {
  const [transactions, setTransactions] = useState([])
  const [filters, setFilters] = useState({ startDate: null, endDate: null, categories: [], type: 'all' })
  // Use versioned key so old 'light' preference is ignored; new default is dark
  const [theme, setTheme] = useState(() => loadLS('ft-theme-v4', 'dark'))
  // { [category]: { color, type: 'expense'|'savings'|'income'|'ignore', displayName } }
  const [categoryConfig, setCategoryConfig] = useState(() => loadLS('ft-category-config', {}))
  // Whether unspent income (leftover) is automatically counted as savings
  const [countLeftoverAsSavings, setCountLeftoverAsSavings] = useState(() => loadLS('ft-leftover-savings', true))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('ft-theme-v4', JSON.stringify(theme))
  }, [theme])

  useEffect(() => {
    localStorage.setItem('ft-category-config', JSON.stringify(categoryConfig))
  }, [categoryConfig])

  useEffect(() => {
    localStorage.setItem('ft-leftover-savings', JSON.stringify(countLeftoverAsSavings))
  }, [countLeftoverAsSavings])

  const addTransactions = useCallback((incoming) => {
    setTransactions(prev => mergeTransactions(prev, incoming))
  }, [])

  const clearTransactions = useCallback(() => setTransactions([]), [])

  const getCategoryColor = useCallback((category, allCategories) => {
    if (categoryConfig[category]?.color) return categoryConfig[category].color
    const idx = (allCategories ?? []).indexOf(category) % DEFAULT_PALETTE.length
    return DEFAULT_PALETTE[Math.max(0, idx)]
  }, [categoryConfig])

  const updateCategoryConfig = useCallback((category, patch) => {
    setCategoryConfig(prev => ({
      ...prev,
      [category]: { ...prev[category], ...patch },
    }))
  }, [])

  const getEffectiveType = useCallback((t) => {
    const cfg = categoryConfig[t.category]
    if (cfg?.type) return cfg.type
    return t.type
  }, [categoryConfig])

  const filtered = filterTransactions(transactions, filters)

  return (
    <AppContext.Provider value={{
      transactions, addTransactions, clearTransactions,
      filters, setFilters,
      filtered,
      theme, setTheme,
      categoryConfig, updateCategoryConfig,
      getCategoryColor,
      getEffectiveType,
      countLeftoverAsSavings, setCountLeftoverAsSavings,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
