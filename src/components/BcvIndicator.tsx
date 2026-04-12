"use client"

import { useBcv } from '@/components/BcvProvider'

export function BcvIndicator() {
  const { bcvRate, loading } = useBcv()

  if (loading) {
    return (
      <div className="bg-indigo-700 dark:bg-indigo-900/50 px-3 py-1 rounded-full text-xs animate-pulse text-indigo-200">
        Cargando BCV...
      </div>
    )
  }

  if (!bcvRate) {
    return (
      <div className="bg-red-500/20 px-3 py-1 rounded-full text-xs text-red-200" title="Error al cargar divisa">
        BCV No disp.
      </div>
    )
  }

  return (
    <div className="bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold text-emerald-100 flex items-center space-x-1 shadow-sm">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      <span>BCV: Bs. {bcvRate}</span>
    </div>
  )
}
