"use client"

import { useState, useEffect } from 'react'

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

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '', description: '', costPrice: '', salePrice: '', stock: '', imageUrl: ''
  })

  const loadProducts = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error("Fallo al cargar inventario")
      const data = await res.json()
      setProducts(data)
      setErrorMsg("")
    } catch (err: any) {
      console.error("Error Trace [Inventory Load]:", err)
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!res.ok) throw new Error("Error al guardar producto")
      
      await loadProducts()
      setIsFormOpen(false)
      setFormData({ name: '', description: '', costPrice: '', salePrice: '', stock: '', imageUrl: '' })
    } catch (err: any) {
      console.error("Error Trace [Product Create]:", err)
      alert("Hubo un problema al crear el producto. Revisa la consola.")
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-down">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Gestión de Inventario</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Administra tus productos, precios y visualiza proyecciones.</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="mt-4 sm:mt-0 flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform hover:scale-105 font-medium"
        >
          {isFormOpen ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              <span>Cerrar Panel</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              <span>Nuevo Producto</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6 animate-fade-in-down">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
            <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">Registrar Producto</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Completa la información para agregarlo a la base de datos.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Producto</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="Ej: Coca Cola 2L" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Stock Inicial (Cantidad)</label>
              <input required type="number" min="0" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="Ej: 24" />
            </div>
            <div className="space-y-1 relative">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Precio de Costo (Lo que pagaste)</label>
              <div className="absolute left-3 top-[34px] text-slate-400">$</div>
              <input required type="number" step="0.01" min="0" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 pl-8 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="0.00" />
            </div>
            <div className="space-y-1 relative">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Precio de Venta (Al público)</label>
              <div className="absolute left-3 top-[34px] text-slate-400">$</div>
              <input required type="number" step="0.01" min="0" value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 pl-8 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="0.00" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Enlace de Imagen (URL opcional)</label>
              <input type="url" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="https://..." />
            </div>
          </div>
          
          <div className="pt-2">
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5">
              💾 Guardar Producto en Inventario
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm">
        {loading ? (
          <div className="p-12 pl-6 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Sincronizando inventario local...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900/50 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Inventario Vacío</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md">No tienes productos registrados aún. Añade tu primer producto usando el botón superior.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">
                  <th className="p-4 pl-6">Foto</th>
                  <th className="p-4">Producto</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Costo</th>
                  <th className="p-4">Venta</th>
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
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                          isLowStock 
                            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                        }`}>
                          {isLowStock && <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 mr-1.5 animate-pulse"></span>}
                          {p.stock} unid.
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-600 dark:text-slate-300">${p.costPrice}</td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">${p.salePrice}</td>
                      <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {profitMargin}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
