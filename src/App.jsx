import { useState, useRef } from 'react'
import { AppProvider } from './context/AppContext'
import { parseMonefyCSV } from './lib/parseCSV'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import TransactionTable from './components/TransactionTable'
import CompoundInterest from './components/calculators/CompoundInterest'
import BudgetRules from './components/calculators/BudgetRules'
import Settings from './components/Settings'
import { Menu, X } from 'lucide-react'
import { useApp } from './context/AppContext'

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  transactions: 'Transactions',
  compound: 'Compound Interest',
  budget: 'Budget Rules',
  settings: 'Settings',
}

function AppInner() {
  const [tab, setTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { addTransactions } = useApp()
  const importRef = useRef(null)

  function handleImport(files) {
    const readers = [...files].map(f => new Promise(res => {
      if (!f.name.endsWith('.csv')) return res()
      const r = new FileReader()
      r.onload = e => { addTransactions(parseMonefyCSV(e.target.result)); res() }
      r.readAsText(f)
    }))
    Promise.all(readers).then(() => setTab('dashboard'))
  }

  function requestImport() {
    importRef.current?.click()
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0" style={{ width: 220 }}>
        <Sidebar tab={tab} setTab={setTab} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 flex" style={{ width: 220 }}>
            <Sidebar tab={tab} setTab={setTab} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <button className="md:hidden p-1.5 rounded-lg" onClick={() => setSidebarOpen(true)}
            style={{ color: 'var(--text-muted)' }}>
            <Menu size={20} />
          </button>
          <h1 className="font-semibold text-base" style={{ color: 'var(--text)' }}>
            {PAGE_TITLES[tab]}
          </h1>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6">
          {tab === 'dashboard' && <Dashboard onRequestImport={requestImport} />}
          {tab === 'transactions' && <TransactionTable onRequestImport={requestImport} />}
          {tab === 'compound' && <CompoundInterest />}
          {tab === 'budget' && <BudgetRules />}
          {tab === 'settings' && <Settings />}
        </div>
      </main>

      {/* Hidden file input for import trigger */}
      <input ref={importRef} type="file" accept=".csv" multiple className="hidden"
        onChange={e => handleImport(e.target.files)} />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
