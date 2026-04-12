"use client"

import { useState, useEffect, useCallback } from 'react'
import { useBcv } from '@/components/BcvProvider'

type Movement = {
  id: number; type: string; quantity: number
  totalCost: number; unitCost: number; note: string | null; createdAt: string
}

type Product = {
  id: number; name: string; stock: number; costPrice: number; salePrice: number
  imageUrl?: string; category?: { name: string }
}

export function RestockView({
  product,
  onClose,
  onRestocked
}: {
  product: Product
  onClose: () => void
  onRestocked: () => void
}) {
  const { currencySymbol, convertToUsd } = useBcv()
  const [movements, setMovements] = useState<Movement[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [quantity, setQuantity] = useState('')
  const [totalCost, setTotalCost] = useState('')
  const [note, setNote] = useState('')

  const loadMovements = useCallback(async () => {
    setLoadingHistory(true)
    const res = await fetch(`/api/products/${product.id}/movements`)
    if (res.ok) setMovements(await res.json())
    setLoadingHistory(false)
  }, [product.id])

  useEffect(() => { loadMovements() }, [loadMovements])

  const unitCostPreview = quantity && totalCost
    ? parseFloat(totalCost) / parseInt(quantity)
    : null

  const newAvgCost = unitCostPreview !== null
    ? (product.stock * product.costPrice + parseInt(quantity) * unitCostPreview) / (product.stock + parseInt(quantity))
    : null

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/products/${product.id}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, totalCost, note })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al surtir')
      }
      setQuantity(''); setTotalCost(''); setNote('')
      await loadMovements()
      onRestocked()
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-down">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <img
              src={product.imageUrl || '/images/product-placeholder.png'}
              alt={product.name}
              onError={e => { (e.target as HTMLImageElement).src = '/images/product-placeholder.png' }}
              className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
            />
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">📦 Surtir Stock</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{product.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">Stock actual: <span className="font-bold text-indigo-600 dark:text-indigo-400">{product.stock} uds.</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Restock Form */}
          <form onSubmit={handleRestock} className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/50 space-y-4">
            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-widest">Nuevo Lote</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Unidades que llegan</label>
                <input required type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)}
                  placeholder="Ej: 500"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Costo total del lote ({currencySymbol})</label>
                <input required type="number" step="0.01" min="0" value={totalCost} onChange={e => setTotalCost(e.target.value)}
                  placeholder="Ej: 1400.00"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Nota (opcional)</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                placeholder="Ej: Compra de 12 bultos, proveedor La Planta"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition" />
            </div>

            {/* Preview of impact */}
            {unitCostPreview !== null && newAvgCost !== null && (
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-400">Costo unitario lote</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-1">{unitCostPreview.toFixed(4)} {currencySymbol}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-400">Nuevo costo prom.</p>
                  <p className={`font-extrabold text-sm mt-1 ${newAvgCost > product.costPrice ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {newAvgCost.toFixed(4)} {currencySymbol}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-400">Stock nuevo total</p>
                  <p className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm mt-1">
                    {product.stock + parseInt(quantity || '0')} uds.
                  </p>
                </div>
              </div>
            )}

            <button disabled={submitting} type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-500/20 disabled:opacity-50">
              {submitting ? 'Registrando...' : '📥 Registrar Entrada de Stock'}
            </button>
          </form>

          {/* History */}
          <div>
            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-widest mb-3">
              Historial de Movimientos
            </h4>
            {loadingHistory ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm">No hay movimientos registrados para este producto.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {movements.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700/30">
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${m.type === 'ENTRADA' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {m.type === 'ENTRADA' ? '📥 Entrada' : '📤 Venta'} · {m.quantity} uds.
                        </p>
                        {m.note && <p className="text-xs text-slate-400">{m.note}</p>}
                        <p className="text-[10px] text-slate-400">{new Date(m.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {m.totalCost.toFixed(2)} {currencySymbol}
                      </p>
                      <p className="text-xs text-slate-400">
                        {m.unitCost.toFixed(4)} {currencySymbol}/ud · ~ {convertToUsd(m.totalCost)} USD
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
