import React from 'react'
import { LayoutDashboard, ListChecks, Archive, Settings, Plus, ShieldCheck } from 'lucide-react'

type View = 'dashboard' | 'active' | 'settled'

interface Props {
  view: View
  onChangeView: (v: View) => void
  onOpenSettings: () => void
  onAddTrade: () => void
  activeCount: number
  settledCount: number
}

export default function Header({
  view,
  onChangeView,
  onOpenSettings,
  onAddTrade,
  activeCount,
  settledCount,
}: Props) {
  const navItems: { key: View; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'dashboard', label: 'Portfolio Vault', icon: <LayoutDashboard size={16} /> },
    { key: 'active', label: 'Option Ledger', icon: <ListChecks size={16} />, count: activeCount },
    { key: 'settled', label: 'Settled Archive', icon: <Archive size={16} />, count: settledCount },
  ]

  return (
    <header className="sticky top-0 z-30 border-b border-vault-700 bg-vault-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-soft shadow-glow-blue">
            <ShieldCheck size={18} className="text-vault-950" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-bold tracking-tight text-white">Option Vault</h1>
            <p className="text-[11px] font-medium text-slate-500">Local-first trade tracker</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-xl border border-vault-700 bg-vault-900/60 p-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onChangeView(item.key)}
              className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                view === item.key
                  ? 'bg-accent text-vault-950 shadow-glow-blue'
                  : 'text-slate-400 hover:bg-vault-800 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.label}</span>
              {typeof item.count === 'number' && item.count > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    view === item.key ? 'bg-vault-950/20 text-vault-950' : 'bg-vault-700 text-slate-300'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={onAddTrade} className="btn-primary">
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Log Trade</span>
          </button>
          <button onClick={onOpenSettings} className="btn-icon" title="Settings & Data Portability">
            <Settings size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
