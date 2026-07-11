import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AppData, ProfitAllocation, Trade } from './types'
import { DEFAULT_DATA, loadData, saveData } from './utils/storage'
import { computeTotals, uid } from './utils/calc'
import { useToast } from './hooks/useToast'

import Header from './components/Header'
import Dashboard from './components/Dashboard'
import ActiveLedger from './components/ActiveLedger'
import SettledLedger from './components/SettledLedger'
import AllocationLedger from './components/AllocationLedger'
import TradeModal from './components/TradeModal'
import CloseTradeModal from './components/CloseTradeModal'
import AllocationModal from './components/AllocationModal'
import SettingsPanel from './components/SettingsPanel'
import ToastStack from './components/ToastStack'
import ConfirmDialog from './components/ConfirmDialog'

type View = 'dashboard' | 'active' | 'settled' | 'allocations'

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [view, setView] = useState<View>('dashboard')
  const [showSettings, setShowSettings] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Trade | null>(null)
  const [confirmUndo, setConfirmUndo] = useState<Trade | null>(null)
  const [editingAllocation, setEditingAllocation] = useState<ProfitAllocation | null>(null)
  const [showAllocationModal, setShowAllocationModal] = useState(false)
  const [confirmDeleteAllocation, setConfirmDeleteAllocation] = useState<ProfitAllocation | null>(null)
  const { toasts, push, dismiss } = useToast()

  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const ok = saveData(data)
    if (!ok) push('Could not save changes — local storage may be full or blocked.', 'error')
  }, [data])

  const activeTrades = useMemo(() => data.trades.filter((t) => t.status === 'Open'), [data.trades])
  const settledTrades = useMemo(() => data.trades.filter((t) => t.status !== 'Open'), [data.trades])
  const totals = useMemo(
    () => computeTotals(data.trades, data.settings.startingCash, data.profitAllocations),
    [data.trades, data.settings.startingCash, data.profitAllocations]
  )

  function openNewTrade() {
    setEditingTrade(null)
    setShowTradeModal(true)
  }

  function openEditTrade(trade: Trade) {
    setEditingTrade(trade)
    setShowTradeModal(true)
  }

  function handleSaveTrade(trade: Trade) {
    setData((prev) => {
      const exists = prev.trades.some((t) => t.id === trade.id)
      const trades = exists
        ? prev.trades.map((t) => (t.id === trade.id ? trade : t))
        : [...prev.trades, trade]
      return { ...prev, trades }
    })
    push(editingTrade ? 'Trade updated.' : 'Trade added to ledger.', 'success')
    setShowTradeModal(false)
    setEditingTrade(null)
  }

  function handleDeleteTrade(trade: Trade) {
    setConfirmDelete(trade)
  }

  function confirmDeleteTrade() {
    if (!confirmDelete) return
    setData((prev) => ({ ...prev, trades: prev.trades.filter((t) => t.id !== confirmDelete.id) }))
    push('Trade deleted.', 'success')
    setConfirmDelete(null)
  }

  function handleCloseTrade(trade: Trade) {
    setClosingTrade(trade)
  }

  function confirmCloseTrade(updated: Trade) {
    setData((prev) => ({
      ...prev,
      trades: prev.trades.map((t) => (t.id === updated.id ? updated : t)),
    }))
    push(`${updated.ticker} moved to Settled Ledger.`, 'success')
    setClosingTrade(null)
  }

  function handleUndoTrade(trade: Trade) {
    setConfirmUndo(trade)
  }

  function confirmUndoTrade() {
    if (!confirmUndo) return
    const restored: Trade = {
      ...confirmUndo,
      status: 'Open',
      closeDate: undefined,
      closePremium: undefined,
      closeFees: undefined,
      updatedAt: new Date().toISOString(),
    }
    setData((prev) => ({
      ...prev,
      trades: prev.trades.map((t) => (t.id === restored.id ? restored : t)),
    }))
    push(`${restored.ticker} restored to Active Ledger.`, 'success')
    setConfirmUndo(null)
  }

  function handleImport(newData: AppData) {
    setData(newData)
    push('Data imported successfully.', 'success')
    setShowSettings(false)
  }

  function handleUpdateSettings(startingCash: number, displayCurrency: string) {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, startingCash, displayCurrency } }))
    push('Settings saved.', 'success')
  }

  function handleExported() {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, lastExportedAt: new Date().toISOString() },
    }))
  }

  function handleFactoryReset() {
    setData(structuredCloneFallback(DEFAULT_DATA))
    push('All data cleared. Starting fresh.', 'info')
    setShowSettings(false)
  }

  // --- Profit Allocation ('Deployment' Ledger) handlers ---
  function openNewAllocation() {
    setEditingAllocation(null)
    setShowAllocationModal(true)
  }

  function openEditAllocation(allocation: ProfitAllocation) {
    setEditingAllocation(allocation)
    setShowAllocationModal(true)
  }

  function handleSaveAllocation(allocation: ProfitAllocation) {
    setData((prev) => {
      const exists = prev.profitAllocations.some((a) => a.id === allocation.id)
      const profitAllocations = exists
        ? prev.profitAllocations.map((a) => (a.id === allocation.id ? allocation : a))
        : [...prev.profitAllocations, allocation]
      return { ...prev, profitAllocations }
    })
    push(editingAllocation ? 'Allocation updated.' : 'Allocation recorded.', 'success')
    setShowAllocationModal(false)
    setEditingAllocation(null)
  }

  function handleDeleteAllocation(allocation: ProfitAllocation) {
    setConfirmDeleteAllocation(allocation)
  }

  function confirmDeleteAllocationAction() {
    if (!confirmDeleteAllocation) return
    setData((prev) => ({
      ...prev,
      profitAllocations: prev.profitAllocations.filter((a) => a.id !== confirmDeleteAllocation.id),
    }))
    push('Allocation deleted.', 'success')
    setConfirmDeleteAllocation(null)
  }

  return (
    <div className="min-h-screen bg-vault-950 text-slate-200">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-profit/5 blur-3xl" />
      </div>

      <div className="relative">
        <Header
          view={view}
          onChangeView={setView}
          onOpenSettings={() => setShowSettings(true)}
          onAddTrade={openNewTrade}
          activeCount={activeTrades.length}
          settledCount={settledTrades.length}
          allocationCount={data.profitAllocations.length}
        />

        <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          {view === 'dashboard' && (
            <Dashboard
              trades={data.trades}
              startingCash={data.settings.startingCash}
              currency={data.settings.displayCurrency}
              profitAllocations={data.profitAllocations}
              lastExportedAt={data.settings.lastExportedAt}
              onGoToActive={() => setView('active')}
              onGoToSettled={() => setView('settled')}
              onGoToAllocations={() => setView('allocations')}
              onGoToSettings={() => setShowSettings(true)}
              onAddTrade={openNewTrade}
            />
          )}
          {view === 'active' && (
            <ActiveLedger
              trades={activeTrades}
              currency={data.settings.displayCurrency}
              onAdd={openNewTrade}
              onEdit={openEditTrade}
              onDelete={handleDeleteTrade}
              onClose={handleCloseTrade}
            />
          )}
          {view === 'settled' && (
            <SettledLedger
              trades={settledTrades}
              currency={data.settings.displayCurrency}
              onUndo={handleUndoTrade}
              onDelete={handleDeleteTrade}
            />
          )}
          {view === 'allocations' && (
            <AllocationLedger
              allocations={data.profitAllocations}
              currency={data.settings.displayCurrency}
              realizedProfit={totals.realizedProfit}
              cashAvailableForTrade={totals.cashAvailableForTrade}
              onAdd={openNewAllocation}
              onEdit={openEditAllocation}
              onDelete={handleDeleteAllocation}
            />
          )}
        </main>
      </div>

      {showTradeModal && (
        <TradeModal
          trade={editingTrade}
          onSave={handleSaveTrade}
          onClose={() => {
            setShowTradeModal(false)
            setEditingTrade(null)
          }}
        />
      )}

      {closingTrade && (
        <CloseTradeModal
          trade={closingTrade}
          onConfirm={confirmCloseTrade}
          onClose={() => setClosingTrade(null)}
        />
      )}

      {showAllocationModal && (
        <AllocationModal
          allocation={editingAllocation}
          maxDeployable={totals.cashAvailableForTrade}
          currency={data.settings.displayCurrency}
          onSave={handleSaveAllocation}
          onClose={() => {
            setShowAllocationModal(false)
            setEditingAllocation(null)
          }}
        />
      )}

      {showSettings && (
        <SettingsPanel
          data={data}
          onClose={() => setShowSettings(false)}
          onImport={handleImport}
          onUpdateSettings={handleUpdateSettings}
          onFactoryReset={handleFactoryReset}
          onExported={handleExported}
          onToast={push}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Trade?"
          message={`This will permanently remove the ${confirmDelete.ticker} ${confirmDelete.strategy} trade from your ledger. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDeleteTrade}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmUndo && (
        <ConfirmDialog
          title="Undo Settlement?"
          message={`This will reverse the close and move ${confirmUndo.ticker} back to the Active Ledger as an Open position.`}
          confirmLabel="Undo & Reopen"
          onConfirm={confirmUndoTrade}
          onCancel={() => setConfirmUndo(null)}
        />
      )}

      {confirmDeleteAllocation && (
        <ConfirmDialog
          title="Delete Allocation?"
          message={`This will permanently remove this ${confirmDeleteAllocation.category} entry of ${confirmDeleteAllocation.amount.toLocaleString()} from the Deployment Ledger. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDeleteAllocationAction}
          onCancel={() => setConfirmDeleteAllocation(null)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

function structuredCloneFallback<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch {
    return obj
  }
}

export { uid }
