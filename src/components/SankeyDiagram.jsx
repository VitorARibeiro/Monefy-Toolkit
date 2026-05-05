import { useRef, useEffect, useState } from 'react'
import { sankey as d3Sankey, sankeyLinkHorizontal, sankeyLeft } from 'd3-sankey'

const fmt = n => `€${Math.abs(n).toLocaleString('en', { maximumFractionDigits: 0 })}`
const truncate = (s, max = 14) => s.length > max ? s.slice(0, max - 1) + '…' : s

function buildSankeyData(incomeGroups, expenseGroups) {
  const totalIncome = incomeGroups.reduce((s, n) => s + n.value, 0)
  if (totalIncome === 0) return null

  const totalExpenses = expenseGroups.reduce((s, n) => s + n.value, 0)
  const net = totalIncome - totalExpenses

  const rightNodes = [...expenseGroups]
  if (net > 0.5) rightNodes.push({ name: 'Net Remaining', value: net, color: '#34d399' })

  const totalRight = rightNodes.reduce((s, n) => s + n.value, 0)

  const nodes = [
    ...incomeGroups.map(n => ({ ...n, side: 'income' })),
    ...rightNodes.map(n => ({ ...n, side: 'expense' })),
  ]

  const incomeOffset = 0
  const expenseOffset = incomeGroups.length

  const links = []
  for (let i = 0; i < incomeGroups.length; i++) {
    for (let j = 0; j < rightNodes.length; j++) {
      const val = incomeGroups[i].value * (rightNodes[j].value / totalRight)
      if (val > 0.01) {
        links.push({ source: incomeOffset + i, target: expenseOffset + j, value: val })
      }
    }
  }

  return { nodes, links }
}

export default function SankeyDiagram({ incomeGroups, expenseGroups }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(700)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      setWidth(entries[0].contentRect.width || 700)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Dynamic height: more categories → taller diagram, capped at 460px
  const numNodes = Math.max(incomeGroups.length, expenseGroups.length + 1)
  const height = Math.max(280, Math.min(460, numNodes * 34 + 60))
  // Adaptive margins: smaller on narrow screens
  const labelW = Math.min(130, Math.max(90, width * 0.18))
  const margin = { top: 12, bottom: 12, left: labelW, right: labelW }

  const data = buildSankeyData(incomeGroups, expenseGroups)
  if (!data) return null

  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  const generator = d3Sankey()
    .nodeId(d => d.index)
    .nodeAlign(sankeyLeft)
    .nodeWidth(14)
    .nodePadding(10)
    .extent([[0, 0], [innerW, innerH]])

  let graph
  try {
    graph = generator({
      nodes: data.nodes.map((d, i) => ({ ...d, index: i })),
      links: data.links.map(l => ({ ...l })),
    })
  } catch {
    return null
  }

  const linkPath = sankeyLinkHorizontal()

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg width={width} height={height} style={{ overflow: 'visible', display: 'block' }}>
        <g transform={`translate(${margin.left},${margin.top})`}>

          {/* Links */}
          {graph.links.map((link, i) => {
            const isIncome = data.nodes[link.source.index]?.side === 'income'
            const color = isIncome
              ? data.nodes[link.source.index]?.color
              : data.nodes[link.target.index]?.color
            return (
              <path
                key={i}
                d={linkPath(link)}
                fill="none"
                stroke={color ?? '#6366f1'}
                strokeWidth={Math.max(1, link.width)}
                strokeOpacity={0.18}
              />
            )
          })}

          {/* Nodes */}
          {graph.nodes.map((node, i) => {
            const isLeft = node.side === 'income'
            const nodeH = node.y1 - node.y0
            return (
              <rect
                key={i}
                x={node.x0}
                y={node.y0}
                width={node.x1 - node.x0}
                height={Math.max(1, nodeH)}
                fill={node.color ?? '#6366f1'}
                rx={3}
                opacity={0.9}
              />
            )
          })}

          {/* Labels — left side (income) */}
          {graph.nodes
            .filter(n => n.side === 'income')
            .map((node, i) => {
              const mid = (node.y0 + node.y1) / 2
              const nodeH = node.y1 - node.y0
              const pct = Math.round((node.value / incomeGroups.reduce((s, n) => s + n.value, 0)) * 100)
              return (
                <g key={i}>
                  <text
                    x={node.x0 - 10}
                    y={mid}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={nodeH > 24 ? 12 : 10}
                    fontWeight="600"
                    fill="var(--text)"
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    {truncate(node.name)}
                  </text>
                  {nodeH > 20 && (
                    <text
                      x={node.x0 - 10}
                      y={mid + 15}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontSize={10}
                      fill="var(--text-muted)"
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {fmt(node.value)} · {pct}%
                    </text>
                  )}
                </g>
              )
            })}

          {/* Labels — right side (expense/savings) */}
          {graph.nodes
            .filter(n => n.side === 'expense')
            .map((node, i) => {
              const mid = (node.y0 + node.y1) / 2
              const nodeH = node.y1 - node.y0
              const totalRight = expenseGroups.reduce((s, n) => s + n.value, 0) +
                (incomeGroups.reduce((s, n) => s + n.value, 0) - expenseGroups.reduce((s, n) => s + n.value, 0) > 0.5
                  ? incomeGroups.reduce((s, n) => s + n.value, 0) - expenseGroups.reduce((s, n) => s + n.value, 0)
                  : 0)
              const pct = totalRight > 0 ? Math.round((node.value / totalRight) * 100) : 0
              return (
                <g key={i}>
                  <text
                    x={node.x1 + 10}
                    y={mid}
                    textAnchor="start"
                    dominantBaseline="middle"
                    fontSize={nodeH > 24 ? 12 : 10}
                    fontWeight="600"
                    fill="var(--text)"
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    {truncate(node.name)}
                  </text>
                  {nodeH > 20 && (
                    <text
                      x={node.x1 + 10}
                      y={mid + 15}
                      textAnchor="start"
                      dominantBaseline="middle"
                      fontSize={10}
                      fill="var(--text-muted)"
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {fmt(node.value)} · {pct}%
                    </text>
                  )}
                </g>
              )
            })}
        </g>
      </svg>
    </div>
  )
}
