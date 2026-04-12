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

export function ProductTable({
  products,
  loading,
  onEdit,
  onDelete
}: {
  products: Product[]
  loading: boolean
  onEdit: (product: Product) => void
  onDelete: (id: number) => void
}) {
  const { convertToUsd, currencySymbol } = useBcv()

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Sincronizando inventario local...</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center space-y-5">
        <img
          src="/images/product-placeholder.png"
          alt="Sin productos"
          className="w-32 h-32 opacity-50 dark:opacity-30"
        />
        <div>
          <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Inventario Vacío</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md">
            No tienes productos registrados aún. Añade tu primer producto usando el botón superior.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <th className="p-4 pl-6">Foto</th>
            <th className="p-4">Producto</th>
            <th className="p-4">Stock</th>
            <th className="p-4">Costo ({currencySymbol.toUpperCase()})</th>
            <th className="p-4">Venta ({currencySymbol.toUpperCase()})</th>
            <th className="p-4">Margen</th>
            <th className="p-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {products.map(p => {
            const profitMargin = p.salePrice > 0
              ? (((p.salePrice - p.costPrice) / p.salePrice) * 100).toFixed(0)
              : '0'
            const isLowStock = p.stock <= 5
            return (
              <tr key={p.id} className="hover:bg-indigo-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                {/* Foto */}
                <td className="p-4 pl-6">
                  <img
                    src={p.imageUrl || '/images/product-placeholder.png'}
                    alt={p.name}
                    className="w-12 h-12 object-cover rounded-lg shadow-sm border border-slate-200 dark:border-slate-700"
                    onError={e => { (e.target as HTMLImageElement).src = '/images/product-placeholder.png' }}
                  />
                </td>

                {/* Nombre + Categoría */}
                <td className="p-4">
                  <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {p.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {p.category?.name || 'Sin Categoría'}
                  </div>
                </td>

                {/* Stock */}
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${isLowStock
                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                    }`}>
                    {isLowStock && <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400 mr-1.5 animate-pulse"></span>}
                    {p.stock} unid.
                  </span>
                </td>

                {/* Costo */}
                <td className="p-4 text-slate-600 dark:text-slate-300">
                  <div className="font-medium">{p.costPrice.toFixed(2)} <span className="text-xs text-slate-400">{currencySymbol}</span></div>
                  <div className="text-xs text-slate-400">~ {convertToUsd(p.costPrice)} USD</div>
                </td>

                {/* Venta */}
                <td className="p-4">
                  <div className="font-bold text-slate-900 dark:text-white">{p.salePrice.toFixed(2)} <span className="text-xs text-emerald-500">{currencySymbol}</span></div>
                  <div className="text-xs text-slate-400">~ {convertToUsd(p.salePrice)} USD</div>
                </td>

                {/* Margen */}
                <td className="p-4">
                  <span className={`font-bold text-sm ${parseFloat(profitMargin) >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500 dark:text-orange-400'}`}>
                    {profitMargin}%
                  </span>
                </td>

                {/* Acciones */}
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(p)}
                      title="Editar producto"
                      className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-100 dark:border-indigo-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) {
                          onDelete(p.id)
                        }
                      }}
                      title="Eliminar producto"
                      className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-100 dark:border-red-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
