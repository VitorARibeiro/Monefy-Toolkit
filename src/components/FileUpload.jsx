import { useRef, useState } from 'react'
import { parseMonefyCSV } from '../lib/parseCSV'
import { useApp } from '../context/AppContext'

export default function FileUpload() {
  const { addTransactions, transactions } = useApp()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [feedback, setFeedback] = useState('')

  function handleFiles(files) {
    let count = 0
    const readers = [...files].map(file => new Promise(resolve => {
      if (!file.name.endsWith('.csv')) return resolve()
      const reader = new FileReader()
      reader.onload = e => {
        const parsed = parseMonefyCSV(e.target.result)
        addTransactions(parsed)
        count += parsed.length
        resolve()
      }
      reader.readAsText(file)
    }))
    Promise.all(readers).then(() => {
      setFeedback(`Loaded ${count} transactions`)
      setTimeout(() => setFeedback(''), 3000)
    })
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  if (transactions.length > 0) {
    return (
      <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
        <span>{transactions.length} transactions loaded</span>
        <button
          onClick={() => inputRef.current.click()}
          className="px-3 py-1 rounded-lg border text-xs font-medium hover:opacity-80 transition-opacity"
          style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}
        >
          + Add CSV
        </button>
        <input ref={inputRef} type="file" accept=".csv" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Monefy Webviewer</h1>
        <p style={{ color: 'var(--text-muted)' }}>Upload your Monefy CSV export to get started</p>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
        className="w-full max-w-md border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all"
        style={{
          borderColor: dragging ? 'var(--accent)' : 'var(--border)',
          background: dragging ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--bg-card)',
          color: 'var(--text-muted)',
        }}
      >
        <div className="text-4xl mb-3">📂</div>
        <p className="font-medium" style={{ color: 'var(--text)' }}>Drop CSV files here</p>
        <p className="text-sm mt-1">or click to browse — multiple files supported</p>
      </div>

      {feedback && <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{feedback}</p>}

      <input ref={inputRef} type="file" accept=".csv" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
    </div>
  )
}
