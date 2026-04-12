"use client"

import { useBcv } from '@/components/BcvProvider'

type Product = {
  id: number
  name: string
  description?: string
  costPrice: number
  salePrice: number
  stock: number
  imageUrl?: string
  category?: { name: string }
}

export function ProductTable({ products, loading }: { products: Product[], loading: boolean }) {
  const { convertToUsd, currencySymbol } = useBcv()

  if (loading) {
    return (
      <div className="p-12 pl-6 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Sincronizando inventario local...</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900/50 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
        </div>
        <div>
          <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Inventario Vacío</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md">No tienes productos registrados aún. Añade tu primer producto usando el botón superior.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">
            <th className="p-4 pl-6">Foto</th>
            <th className="p-4">Producto</th>
            <th className="p-4">Stock</th>
            <th className="p-4">Costo ({currencySymbol.toUpperCase()})</th>
            <th className="p-4">Venta ({currencySymbol.toUpperCase()})</th>
            <th className="p-4">Margen %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {products.map(p => {
            const profitMargin = (((p.salePrice - p.costPrice) / p.salePrice) * 100).toFixed(0);
            const isLowStock = p.stock <= 5;
            return (
              <tr key={p.id} className="hover:bg-indigo-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                <td className="p-4 pl-6">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-12 h-12 object-cover rounded-lg shadow-sm border border-slate-200 dark:border-slate-700" />
                  ) : (
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600">
                      <span className="text-slate-400 text-xs font-bold">Sin foto</span>
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-800 dark:text-slate-100 text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{p.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{p.category?.name || "Sin Categoría"}</div>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${isLowStock
                      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                    }`}>
                    {isLowStock && <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 mr-1.5 animate-pulse"></span>}
                    {p.stock} unid.
                  </span>
                </td>
                <td className="p-4 font-medium text-slate-600 dark:text-slate-300">
                  <div className="flex flex-col">
                    <span>{p.costPrice} <span className="text-slate-400 ml-1 text-xs">{currencySymbol}</span></span>
                    <span className="text-xs text-slate-400">~{convertToUsd(p.costPrice)} USD</span>
                  </div>
                </td>
                <td className="p-4 font-bold text-slate-900 dark:text-white">
                  <div className="flex flex-col">
                    <span>{p.salePrice} <span className="text-emerald-500 dark:text-emerald-400 ml-1 text-xs">{currencySymbol}</span></span>
                    <span className="text-xs text-slate-400 font-normal">~{convertToUsd(p.salePrice)} USD</span>
                  </div>
                </td>
                <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">
                  {profitMargin}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
