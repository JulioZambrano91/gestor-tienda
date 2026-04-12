"use client"

import { useState, useEffect } from "react"
import { useBcv } from '@/components/BcvProvider'

type Category = { id: number; name: string }

type ProductData = {
  id?: number
  name: string
  stock: string
  costPrice: string
  salePrice: string
  imageUrl: string
  categoryId: string
}

export function ProductForm({
  onSuccess,
  onCancel,
  editProduct
}: {
  onSuccess: () => void
  onCancel: () => void
  editProduct?: ProductData
}) {
  const [formData, setFormData] = useState<ProductData>(
    editProduct ?? { name: '', stock: '', costPrice: '', salePrice: '', imageUrl: '', categoryId: '' }
  )
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)
  const { convertToUsd, currencySymbol } = useBcv()

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCategories(data)
    })
  }, [])

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategory.trim() })
    })
    if (res.ok) {
      const cat = await res.json()
      setCategories(prev => [...prev, cat])
      setFormData(prev => ({ ...prev, categoryId: String(cat.id) }))
      setNewCategory('')
      setShowNewCat(false)
    }
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const isEdit = !!editProduct?.id
      const url = isEdit ? `/api/products/${editProduct!.id}` : '/api/products'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!res.ok) throw new Error("Error al guardar producto")
      onSuccess()
    } catch (err: any) {
      console.error("Error Trace [Product Create]:", err)
      alert("Hubo un problema al guardar el producto. Revisa la consola.")
    } finally {
      setLoading(false)
    }
  }

  const isEdit = !!editProduct?.id

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6 animate-fade-in-down">
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4">
        <div>
          <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">
            {isEdit ? '✏️ Editar Producto' : '📦 Registrar Producto'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isEdit ? 'Modifica los campos que necesitas actualizar.' : 'Completa la información para agregarlo a la base de datos.'}
          </p>
        </div>
        <button type="button" onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nombre */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Producto</label>
          <input required type="text" value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            placeholder="Ej: Harina PAN" />
        </div>

        {/* Stock */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Stock (Cantidad)</label>
          <input required type="number" min="0" value={formData.stock}
            onChange={e => setFormData({ ...formData, stock: e.target.value })}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            placeholder="Ej: 24" />
        </div>

        {/* Costo */}
        <div className="space-y-1 relative">
          <label className="text-sm font-medium flex justify-between text-slate-700 dark:text-slate-300">
            <span>Costo ({currencySymbol.toUpperCase()})</span>
            <span className="text-slate-400 text-xs font-normal">~ {convertToUsd(parseFloat(formData.costPrice) || 0)} USD</span>
          </label>
          <div className="absolute left-3 top-[34px] text-slate-400 font-medium text-sm">{currencySymbol}</div>
          <input required type="number" step="0.01" min="0" value={formData.costPrice}
            onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 pl-10 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            placeholder="0.00" />
        </div>

        {/* Precio Venta */}
        <div className="space-y-1 relative">
          <label className="text-sm font-medium flex justify-between text-slate-700 dark:text-slate-300">
            <span>Precio Venta ({currencySymbol.toUpperCase()})</span>
            <span className="text-slate-400 text-xs font-normal">~ {convertToUsd(parseFloat(formData.salePrice) || 0)} USD</span>
          </label>
          <div className="absolute left-3 top-[34px] text-slate-400 font-medium text-sm">{currencySymbol}</div>
          <input required type="number" step="0.01" min="0" value={formData.salePrice}
            onChange={e => setFormData({ ...formData, salePrice: e.target.value })}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 pl-10 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            placeholder="0.00" />
        </div>

        {/* Categoría */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Categoría</label>
          <div className="flex gap-2">
            <select value={formData.categoryId}
              onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition">
              <option value="">Sin Categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" onClick={() => setShowNewCat(!showNewCat)}
              className="px-3 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition text-sm font-medium border border-indigo-200 dark:border-indigo-700">
              + Nueva
            </button>
          </div>
          {showNewCat && (
            <div className="flex gap-2 mt-2">
              <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)}
                placeholder="Ej: Bebidas, Lácteos..."
                className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm" />
              <button type="button" onClick={handleAddCategory}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">
                Añadir
              </button>
            </div>
          )}
        </div>

        {/* Imagen URL */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Imagen (URL opcional)</label>
          <input type="url" value={formData.imageUrl}
            onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            placeholder="https://..." />
        </div>
      </div>

      <div className="pt-2">
        <button disabled={loading} type="submit"
          className={`w-full font-bold py-3 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 ${loading
              ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
              : isEdit
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30'
            }`}>
          {loading ? 'Guardando...' : isEdit ? '✏️ Actualizar Producto' : '💾 Guardar en Inventario'}
        </button>
      </div>
    </form>
  )
}
