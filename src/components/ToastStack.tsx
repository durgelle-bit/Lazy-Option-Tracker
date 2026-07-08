import React from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { ToastMsg } from '../hooks/useToast'

interface Props {
  toasts: ToastMsg[]
  onDismiss: (id: string) => void
}

const iconMap = {
  success: <CheckCircle2 size={16} className="text-profit-glow" />,
  error: <XCircle size={16} className="text-loss-glow" />,
  info: <Info size={16} className="text-accent" />,
}

const borderMap = {
  success: 'border-profit/30',
  error: 'border-loss/30',
  info: 'border-accent/30',
}

export default function ToastStack({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-80 animate-slide-up items-start gap-2.5 rounded-xl border ${borderMap[t.type]} bg-vault-850 px-4 py-3 shadow-card`}
        >
          {iconMap[t.type]}
          <p className="flex-1 text-sm text-slate-200">{t.text}</p>
          <button onClick={() => onDismiss(t.id)} className="text-slate-500 hover:text-slate-300">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
