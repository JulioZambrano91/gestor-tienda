"use client"

import { useState } from "react"
import { useBcv } from '@/components/BcvProvider'

export function ProductForm({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: '', stock: '', costPrice: '', salePrice: '', imageUrl: ''
  })
  const [loading, setLoading] = useState(false)
  const { bcvRate, convertToUsd, currencySymbol } = useBcv()
  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setLoading(true)
    console.log(e)

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!res.ok) throw new Error("Error al guardar producto")
      onSuccess()
    } catch (err: any) {
      console.error("Error Trace [Product Create]:", err)
      alert("Hubo un problema al crear el producto. Revisa la consola.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6 animate-fade-in-down">
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4">
        <div>
          <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <span>Registrar Producto</span>
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Completa la información para agregarlo a la base de datos.</p>
        </div>
        <button type="button" onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Producto</label>
          <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="Ej: Harina PAN" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Stock Inicial (Cantidad)</label>
          <input required type="number" min="0" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="Ej: 24" />
        </div>
        <div className="space-y-1 relative">
          <label className="text-sm font-medium flex justify-between text-slate-700 dark:text-slate-300">
            <span>Costo ({currencySymbol.toUpperCase()})</span>
            <span className="text-slate-400 text-xs font-normal">~ {convertToUsd(parseFloat(formData.costPrice) || 0)} USD</span>
          </label>
          <div className="absolute left-3 top-[34px] text-slate-400 font-medium">{currencySymbol}</div>
          <input required type="number" step="0.01" min="0" value={formData.costPrice} onChange={e => setFormData({ ...formData, costPrice: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 pl-10 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="0.00" />
        </div>
        <div className="space-y-1 relative">
          <label className="text-sm font-medium flex justify-between text-slate-700 dark:text-slate-300">
            <span>Precio Venta ({currencySymbol.toUpperCase()})</span>
            <span className="text-slate-400 text-xs font-normal">~ {convertToUsd(parseFloat(formData.salePrice) || 0)} USD</span>
          </label>
          <div className="absolute left-3 top-[34px] text-slate-400 font-medium">{currencySymbol}</div>
          <input required type="number" step="0.01" min="0" value={formData.salePrice} onChange={e => setFormData({ ...formData, salePrice: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 pl-10 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="0.00" />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Enlace de Imagen (URL opcional)</label>
          <input type="url" value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="https://..." />
        </div>
      </div>

      <div className="pt-2">
        <button disabled={loading} type="submit" className={`w-full font-bold py-3 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 ${loading ? 'bg-slate-400 text-slate-200 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30'}`}>
          {loading ? 'Guardando...' : '💾 Guardar Producto en Inventario'}
        </button>
      </div>
    </form>
  )
}
