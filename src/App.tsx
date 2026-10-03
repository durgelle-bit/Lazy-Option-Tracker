import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AppData, ProfitAllocation, SharePurchase, Trade } from './types'
import { DEFAULT_DATA, loadData, saveData } from './utils/storage'
import {
  cashSafeForDeployment,
  computeTotals,
  deriveHoldingsSummary,
  deriveMonthlyPL,
  deriveStockPLEvents,
  isShortPut,
  reserveBuffer,
  uid,
} from './utils/calc'
import { useToast } from './hooks/useToast'

import Header from './components/Header'
import Dashboard from './components/Dashboard'
import ActiveLedger from './components/ActiveLedger'
import SettledLedger from './components/SettledLedger'
import AllocationLedger from './components/AllocationLedger'
import SecuritiesLedger from './components/SecuritiesLedger'
import MonthlyPLLedger from './components/MonthlyPLLedger'
import TradeModal from './components/TradeModal'
import CloseTradeModal from './components/CloseTradeModal'
import AllocationModal from './components/AllocationModal'
import BuySharesModal from './components/BuySharesModal'
import SettingsPanel from './components/SettingsPanel'
import ToastStack from './components/ToastStack'
import ConfirmDialog from './components/ConfirmDialog'

type View = 'dashboard' | 'active' | 'settled' | 'allocations' | 'securities' | 'monthly'

interface CoveredCallPrefill {
  ticker: string
  strategy: 'Covered Call'
  strike?: number
  notes?: string
}

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
  const [tradePrefill, setTradePrefill] = useState<CoveredCallPrefill | undefined>(undefined)
  const [editingPurchase, setEditingPurchase] = useState<SharePurchase | null>(null)
  const [showBuySharesModal, setShowBuySharesModal] = useState(false)
  const [buySharesPrefillTicker, setBuySharesPrefillTicker] = useState<string | undefined>(undefined)
  const [confirmDeletePurchase, setConfirmDeletePurchase] = useState<SharePurchase | null>(null)
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
    () => computeTotals(data.trades, data.settings.startingCash, data.profitAllocations, data.sharePurchases),
    [data.trades, data.settings.startingCash, data.profitAllocations, data.sharePurchases]
  )
  const holdings = useMemo(
    () => deriveHoldingsSummary(data.trades, data.sharePurchases),
    [data.trades, data.sharePurchases]
  )
  const stockPLEvents = useMemo(
    () => deriveStockPLEvents(data.trades, data.sharePurchases),
    [data.trades, data.sharePurchases]
  )
  const monthlyPL = useMemo(
    () => deriveMonthlyPL(data.trades, data.sharePurchases),
    [data.trades, data.sharePurchases]
  )
  // Cash Safe For Deployment — needed by the Buy Shares modal's live preview, computed the
  // same way the Dashboard headline figure is, so the two numbers can never drift apart.
  const cashSafe = useMemo(() => {
    const reserveBufferAmount = reserveBuffer(data.settings.startingCash, data.settings.reserveBufferPercent)
    return cashSafeForDeployment(
      totals.cashAvailableForTrade,
      reserveBufferAmount,
      data.settings.reserveBufferEnabled,
      totals.openExposureTotal,
      totals.heldSecuritiesValue
    )
  }, [
    totals.cashAvailableForTrade,
    totals.openExposureTotal,
    totals.heldSecuritiesValue,
    data.settings.startingCash,
    data.settings.reserveBufferPercent,
    data.settings.reserveBufferEnabled,
  ])

  function openNewTrade() {
    setEditingTrade(null)
    setTradePrefill(undefined)
    setShowTradeModal(true)
  }

  function openSellCoveredCall(ticker: string, availableShares: number, avgCostBasis: number) {
    setEditingTrade(null)
    setTradePrefill({
      ticker,
      strategy: 'Covered Call',
      strike: Math.round(avgCostBasis),
      notes: `Covered by ${availableShares} assigned shares (avg cost $${avgCostBasis.toFixed(2)}).`,
    })
    setShowTradeModal(true)
  }

  function openEditTrade(trade: Trade) {
    setEditingTrade(trade)
    setTradePrefill(undefined)
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
    setTradePrefill(undefined)
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
    if (updated.status === 'Assigned' && isShortPut(updated.strategy)) {
      const shares = updated.contracts * 100
      push(
        `${updated.ticker} assigned — ${shares} shares added to Assigned Securities at $${updated.strike.toFixed(2)}.`,
        'success'
      )
    } else if (updated.status === 'Assigned' && updated.strategy === 'Covered Call') {
      const shares = updated.contracts * 100
      push(`${updated.ticker} called away — ${shares} shares removed from Assigned Securities.`, 'success')
    } else {
      push(`${updated.ticker} moved to Settled Ledger.`, 'success')
    }
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

  function handleUpdateSettings(
    startingCash: number,
    displayCurrency: string,
    reserveBufferEnabled: boolean,
    reserveBufferPercent: number
  ) {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, startingCash, displayCurrency, reserveBufferEnabled, reserveBufferPercent },
    }))
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

  // --- Buy Shares (direct cash share purchase) handlers ---
  function openBuyShares(ticker?: string) {
    setEditingPurchase(null)
    setBuySharesPrefillTicker(ticker)
    setShowBuySharesModal(true)
  }

  function openEditPurchase(purchase: SharePurchase) {
    setEditingPurchase(purchase)
    setBuySharesPrefillTicker(undefined)
    setShowBuySharesModal(true)
  }

  function handleSavePurchase(purchase: SharePurchase) {
    setData((prev) => {
      const exists = prev.sharePurchases.some((p) => p.id === purchase.id)
      const sharePurchases = exists
        ? prev.sharePurchases.map((p) => (p.id === purchase.id ? purchase : p))
        : [...prev.sharePurchases, purchase]
      return { ...prev, sharePurchases }
    })
    push(
      editingPurchase
        ? 'Share purchase updated.'
        : `Bought ${purchase.shares} shares of ${purchase.ticker} — added to Assigned Securities.`,
      'success'
    )
    setShowBuySharesModal(false)
    setEditingPurchase(null)
    setBuySharesPrefillTicker(undefined)
  }

  function handleDeletePurchase(purchase: SharePurchase) {
    setConfirmDeletePurchase(purchase)
  }

  function confirmDeletePurchaseAction() {
    if (!confirmDeletePurchase) return
    setData((prev) => ({
      ...prev,
      sharePurchases: prev.sharePurchases.filter((p) => p.id !== confirmDeletePurchase.id),
    }))
    push('Share purchase deleted.', 'success')
    setConfirmDeletePurchase(null)
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
          securitiesCount={holdings.length}
        />

        <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          {view === 'dashboard' && (
            <Dashboard
              trades={data.trades}
              startingCash={data.settings.startingCash}
              currency={data.settings.displayCurrency}
              profitAllocations={data.profitAllocations}
              lastExportedAt={data.settings.lastExportedAt}
              reserveBufferEnabled={data.settings.reserveBufferEnabled}
              reserveBufferPercent={data.settings.reserveBufferPercent}
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
          {view === 'securities' && (
            <SecuritiesLedger
              holdings={holdings}
              stockPLEvents={stockPLEvents}
              currency={data.settings.displayCurrency}
              onSellCoveredCall={openSellCoveredCall}
              onBuyShares={openBuyShares}
              onEditPurchase={openEditPurchase}
              onDeletePurchase={handleDeletePurchase}
              sharePurchases={data.sharePurchases}
            />
          )}
          {view === 'monthly' && <MonthlyPLLedger rows={monthlyPL} currency={data.settings.displayCurrency} />}
          {view === 'allocations' && (
            <AllocationLedger
              allocations={data.profitAllocations}
              currency={data.settings.displayCurrency}
              realizedProfit={totals.realizedProfit}
              realizedStockPL={totals.realizedStockPL}
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
          prefill={tradePrefill}
          onSave={handleSaveTrade}
          onClose={() => {
            setShowTradeModal(false)
            setEditingTrade(null)
            setTradePrefill(undefined)
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

      {showBuySharesModal && (
        <BuySharesModal
          purchase={editingPurchase}
          prefillTicker={buySharesPrefillTicker}
          holdings={holdings}
          cashSafeForDeployment={cashSafe}
          currency={data.settings.displayCurrency}
          onSave={handleSavePurchase}
          onClose={() => {
            setShowBuySharesModal(false)
            setEditingPurchase(null)
            setBuySharesPrefillTicker(undefined)
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
          message={
            confirmDelete.status === 'Assigned' && isShortPut(confirmDelete.strategy)
              ? `This will permanently remove the ${confirmDelete.ticker} ${confirmDelete.strategy} trade AND the ${confirmDelete.contracts * 100} assigned shares it created in Assigned Securities. This cannot be undone.`
              : confirmDelete.status === 'Assigned' && confirmDelete.strategy === 'Covered Call'
              ? `This will permanently remove the ${confirmDelete.ticker} Covered Call trade and restore the ${confirmDelete.contracts * 100} called-away shares to Assigned Securities. This cannot be undone.`
              : `This will permanently remove the ${confirmDelete.ticker} ${confirmDelete.strategy} trade from your ledger. This cannot be undone.`
          }
          confirmLabel="Delete"
          danger
          onConfirm={confirmDeleteTrade}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmUndo && (
        <ConfirmDialog
          title="Undo Settlement?"
          message={
            confirmUndo.status === 'Assigned' && isShortPut(confirmUndo.strategy)
              ? `This will reverse the close, move ${confirmUndo.ticker} back to the Active Ledger, and remove the ${confirmUndo.contracts * 100} assigned shares it created in Assigned Securities.`
              : confirmUndo.status === 'Assigned' && confirmUndo.strategy === 'Covered Call'
              ? `This will reverse the close, move ${confirmUndo.ticker} back to the Active Ledger, and restore the ${confirmUndo.contracts * 100} called-away shares to Assigned Securities.`
              : `This will reverse the close and move ${confirmUndo.ticker} back to the Active Ledger as an Open position.`
          }
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

      {confirmDeletePurchase && (
        <ConfirmDialog
          title="Delete Share Purchase?"
          message={`This will permanently remove the purchase of ${confirmDeletePurchase.shares} shares of ${confirmDeletePurchase.ticker} from Assigned Securities. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDeletePurchaseAction}
          onCancel={() => setConfirmDeletePurchase(null)}
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
