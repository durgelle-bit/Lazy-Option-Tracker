import React, { useMemo, useRef, useEffect } from 'react'
import { Trade } from '../types'
import { computeTotals, formatCurrency, formatPercent, isCredit, realizedPL } from '../utils/calc'
import {
  Wallet,
  TrendingUp,
  Gauge,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  ListChecks,
  Archive,
  Plus,
  PieChart,
} from 'lucide-react'
import Chart from 'chart.js/auto'

interface Props {
  trades: Trade[]
  startingCash: number
  currency: string
  onGoToActive: () => void
  onGoToSettled: () => void
  onAddTrade: () => void
}

export default function Dashboard({
  trades,
  startingCash,
  currency,
  onGoToActive,
  onGoToSettled,
  onAddTrade,
}: Props) {
  const totals = useMemo(() => computeTotals(trades, startingCash), [trades, startingCash])

  const closedTrades = useMemo(
    () => trades.filter((t) => t.status !== 'Open').sort((a, b) => (a.closeDate || '').localeCompare(b.closeDate || '')),
    [trades]
  )

  const chartRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    if (!chartRef.current) return
    if (chartInstance.current) {
      chartInstance.current.destroy()
      chartInstance.current = null
    }

    let running = startingCash
    const labels: string[] = ['Start']
    const values: number[] = [running]
    for (const t of closedTrades) {
      running += realizedPL(t)
      labels.push(t.closeDate ? new Date(t.closeDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : t.ticker)
      values.push(running)
    }

    if (values.length < 2) {
      return
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    const gradient = ctx.createLinearGradient(0, 0, 0, 220)
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)')
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.02)')

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Cumulative Equity',
            data: values,
            borderColor: '#38bdf8',
            backgroundColor: gradient,
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#38bdf8',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#141a24',
            borderColor: '#2a3442',
            borderWidth: 1,
            titleColor: '#94a3b8',
            bodyColor: '#e2e8f0',
            padding: 10,
            callbacks: {
              label: (item) => formatCurrency(Number(item.parsed.y ?? 0), currency),
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#5c6b80', maxRotation: 0, autoSkip: true, maxTicksLimit: 6, font: { size: 10 } },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: '#5c6b80',
              font: { size: 10 },
              callback: (v) => formatCurrency(Number(v), currency),
            },
          },
        },
      },
    })

    return () => {
      chartInstance.current?.destroy()
      chartInstance.current = null
    }
  }, [closedTrades, startingCash, currency])

  const strategyBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of trades.filter((t) => t.status === 'Open')) {
      map.set(t.strategy, (map.get(t.strategy) || 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [trades])

  const recentClosed = useMemo(() => [...closedTrades].reverse().slice(0, 5), [closedTrades])

  const velocityPositive = totals.globalVelocity >= 0

  return (
    <div className="animate-fade-in space-y-6">
      {/* Top Stat Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Cash"
          value={formatCurrency(totals.totalCash, currency)}
          icon={<Wallet size={18} />}
          accent="blue"
          sub={`Starting: ${formatCurrency(startingCash, currency)}`}
        />
        <StatCard
          label="Realized Profit"
          value={formatCurrency(totals.realizedProfit, currency)}
          icon={totals.realizedProfit >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
          accent={totals.realizedProfit >= 0 ? 'green' : 'red'}
          sub={`${totals.closedPositionsCount} settled trade${totals.closedPositionsCount === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Global Portfolio Velocity"
          value={formatPercent(totals.globalVelocity)}
          icon={<Gauge size={18} />}
          accent={velocityPositive ? 'green' : 'red'}
          sub="Annualized, capital-weighted"
          tooltip="Dollar-weighted average annualized return across all settled trades, based on capital deployed × days held."
        />
        <StatCard
          label="Win Rate"
          value={formatPercent(totals.winRate, 0)}
          icon={<Percent size={18} />}
          accent="gold"
          sub={`${totals.closedPositionsCount} closed positions`}
        />
      </div>

      {/* Exposure + Quick links row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="stat-card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">Equity Curve (Realized)</h3>
            <TrendingUp size={16} className="text-accent" />
          </div>
          {closedTrades.length > 0 ? (
            <div className="h-56">
              <canvas ref={chartRef} />
            </div>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center gap-2 text-center text-slate-500">
              <TrendingUp size={28} className="opacity-30" />
              <p className="text-sm">Close your first trade to see your equity curve here.</p>
            </div>
          )}
        </div>

        <div className="stat-card flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">Open Exposure</h3>
            <PieChart size={16} className="text-gold" />
          </div>
          <div className="space-y-3">
            <ExposureRow label="Credit Exposure (Cash-Secured)" value={totals.openCreditExposure} currency={currency} color="bg-profit" />
            <ExposureRow label="Debit Exposure (Long Premium)" value={totals.openDebitExposure} currency={currency} color="bg-accent" />
          </div>
          <div className="my-4 h-px bg-vault-700" />
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Open Strategy Mix</h4>
          <div className="flex-1 space-y-1.5 overflow-auto">
            {strategyBreakdown.length === 0 && <p className="text-sm text-slate-500">No open positions.</p>}
            {strategyBreakdown.map(([strategy, count]) => (
              <div key={strategy} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{strategy}</span>
                <span className="rounded-full bg-vault-700 px-2 py-0.5 text-xs font-semibold text-slate-200">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: Quick actions + recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <button
          onClick={onAddTrade}
          className="stat-card group flex flex-col items-start justify-between text-left transition hover:border-accent/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-vault-950">
            <Plus size={18} strokeWidth={2.5} />
          </div>
          <div className="mt-4">
            <p className="font-semibold text-white">Log New Trade</p>
            <p className="text-sm text-slate-500">Add an option position to your Active Ledger.</p>
          </div>
        </button>

        <button
          onClick={onGoToActive}
          className="stat-card group flex flex-col items-start justify-between text-left transition hover:border-accent/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vault-700 text-slate-300 transition group-hover:bg-accent group-hover:text-vault-950">
            <ListChecks size={18} />
          </div>
          <div className="mt-4">
            <p className="font-semibold text-white">{trades.filter((t) => t.status === 'Open').length} Open Positions</p>
            <p className="text-sm text-slate-500">Review your Active Ledger and manage positions.</p>
          </div>
        </button>

        <div className="stat-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">Recent Settlements</h3>
            <button onClick={onGoToSettled} className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
              <Archive size={12} /> View all
            </button>
          </div>
          {recentClosed.length === 0 ? (
            <p className="text-sm text-slate-500">No settled trades yet.</p>
          ) : (
            <div className="space-y-2">
              {recentClosed.map((t) => {
                const pl = realizedPL(t)
                return (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-200">{t.ticker}</span>
                      <span className="text-xs text-slate-500">{t.strategy}</span>
                    </div>
                    <span className={`font-mono font-semibold ${pl >= 0 ? 'text-profit-glow' : 'text-loss-glow'}`}>
                      {formatCurrency(pl, currency)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
  sub,
  tooltip,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: 'blue' | 'green' | 'red' | 'gold'
  sub?: string
  tooltip?: string
}) {
  const accentMap = {
    blue: 'text-accent bg-accent/10',
    green: 'text-profit-glow bg-profit/10',
    red: 'text-loss-glow bg-loss/10',
    gold: 'text-gold-glow bg-gold/10',
  }
  const glowMap = {
    blue: 'hover:shadow-glow-blue',
    green: 'hover:shadow-glow-green',
    red: 'hover:shadow-glow-red',
    gold: '',
  }
  return (
    <div className={`stat-card transition ${glowMap[accent]}`} title={tooltip}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentMap[accent]}`}>{icon}</div>
      </div>
      <p className="font-mono text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function ExposureRow({
  label,
  value,
  currency,
  color,
}: {
  label: string
  value: number
  currency: string
  color: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono font-semibold text-slate-200">{formatCurrency(value, currency)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-vault-700">
        <div className={`h-full ${color}`} style={{ width: value > 0 ? '100%' : '0%' }} />
      </div>
    </div>
  )
}
