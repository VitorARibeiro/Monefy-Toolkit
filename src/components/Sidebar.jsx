import {
  LayoutDashboard, ArrowLeftRight, TrendingUp, PieChart,
  Settings, Upload, Sun, Moon, X
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useRef } from 'react'
import { parseMonefyCSV } from '../lib/parseCSV'

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions',      icon: ArrowLeftRight },
  { id: 'compound',     label: 'Compound Interest', icon: TrendingUp },
  { id: 'budget',       label: 'Budget Rules',      icon: PieChart },
  { id: 'settings',     label: 'Settings',          icon: Settings },
]

export default function Sidebar({ tab, setTab, onClose }) {
  const { theme, setTheme, transactions, addTransactions, clearTransactions } = useApp()
  const inputRef = useRef(null)

  function handleFiles(files) {
    const readers = [...files].map(f => new Promise(res => {
      if (!f.name.endsWith('.csv')) return res()
      const r = new FileReader()
      r.onload = e => { addTransactions(parseMonefyCSV(e.target.result)); res() }
      r.readAsText(f)
    }))
    Promise.all(readers).then(() => { if (onClose) onClose() })
  }

  return (
    <aside
      className="flex flex-col h-full"
      style={{ background: 'var(--sidebar-bg)', width: '220px', flexShrink: 0 }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <span className="font-bold text-base tracking-tight" style={{ color: '#ffffff' }}>Finance</span>
          <span className="font-bold text-base tracking-tight" style={{ color: 'var(--sidebar-text-muted)' }}> Toolkit</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--sidebar-text)' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => { setTab(id); if (onClose) onClose() }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
              style={{
                background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
              }}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-5 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1rem' }}>
        {/* CSV upload */}
        <button
          onClick={() => inputRef.current.click()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{ color: 'var(--sidebar-text)', background: 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Upload size={16} strokeWidth={1.8} />
          {transactions.length > 0 ? `${transactions.length} transactions` : 'Import CSV'}
        </button>
        <input ref={inputRef} type="file" accept=".csv" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />

        {/* Clear data */}
        {transactions.length > 0 && (
          <button
            onClick={() => { if (confirm('Clear all transaction data?')) clearTransactions() }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all"
            style={{ color: 'rgba(248,113,113,0.7)', background: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Clear data
          </button>
        )}

        {/* Dark mode */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{ color: 'var(--sidebar-text)', background: 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {theme === 'dark' ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
    </aside>
  )
}
