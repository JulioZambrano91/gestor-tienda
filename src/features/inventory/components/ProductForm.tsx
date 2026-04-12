"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useBcv } from '@/components/BcvProvider'

type Category = { id: number; name: string }

type ProductData = {
  id?: number
  name: string
  stock: string
  costPrice: string   // unit cost (auto-computed or manual)
  totalCost: string   // total investment for this batch
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
  editProduct?: Omit<ProductData, 'totalCost'>
}) {
  const { convertToUsd, currencySymbol } = useBcv()
  const [formData, setFormData] = useState<ProductData>(
    editProduct
      ? { ...editProduct, totalCost: '' }
      : { name: '', stock: '', costPrice: '', totalCost: '', salePrice: '', imageUrl: '', categoryId: '' }
  )
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => { if (Array.isArray(d)) setCategories(d) })
  }, [])

  // Auto-compute unit cost from total cost + stock
  useEffect(() => {
    const total = parseFloat(formData.totalCost)
    const qty = parseInt(formData.stock)
    if (!isNaN(total) && !isNaN(qty) && qty > 0 && total > 0) {
      setFormData(prev => ({ ...prev, costPrice: (total / qty).toFixed(4) }))
    }
  }, [formData.totalCost, formData.stock])

  const uploadFile = useCallback(async (file: File) => {
    setUploadProgress(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Error al subir imagen')
      const { url } = await res.json()
      setFormData(prev => ({ ...prev, imageUrl: url }))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUploadProgress(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) uploadFile(file)
  }, [uploadFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

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
      setNewCategory(''); setShowNewCat(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const isEdit = !!editProduct?.id
      const url = isEdit ? `/api/products/${editProduct!.id}` : '/api/products'
      const method = isEdit ? 'PUT' : 'POST'

      const payload = {
        name: formData.name,
        stock: formData.stock,
        costPrice: formData.costPrice,
        salePrice: formData.salePrice,
        imageUrl: formData.imageUrl,
        categoryId: formData.categoryId,
        // For new products, also record the initial stock movement
        ...((!isEdit && formData.totalCost) ? { totalCost: formData.totalCost } : {})
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error("Error al guardar producto")
      onSuccess()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isEdit = !!editProduct?.id
  const unitCost = parseFloat(formData.costPrice) || 0
  const salePrice = parseFloat(formData.salePrice) || 0
  const margin = salePrice > 0 ? (((salePrice - unitCost) / salePrice) * 100) : 0

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl space-y-6 animate-fade-in-down">
      <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-4">
        <div>
          <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">
            {isEdit ? '✏️ Editar Producto' : '📦 Registrar Producto'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isEdit ? 'Modifica los campos que necesitas actualizar.' : 'Completa los datos del nuevo ingreso al inventario.'}
          </p>
        </div>
        <button type="button" onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT column */}
        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nombre del Producto *</label>
            <input required type="text" value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="Ej: Harina PAN" />
          </div>

          {/* Stock */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Unidades en Stock *</label>
            <input required type="number" min="0" value={formData.stock}
              onChange={e => setFormData({ ...formData, stock: e.target.value })}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="Ej: 500" />
            <p className="text-xs text-slate-400">Total de unidades individuales disponibles para venta</p>
          </div>

          {/* Total Cost */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Inversión Total ({currencySymbol.toUpperCase()}) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-slate-400 text-sm">{currencySymbol}</span>
              <input type="number" step="0.01" min="0" value={formData.totalCost}
                onChange={e => setFormData({ ...formData, totalCost: e.target.value })}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 pl-10 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="Ej: 1400.00 (total pagado por todos los productos)" />
            </div>
            <p className="text-xs text-slate-400">Lo que pagaste en total. Si no rellenas esto, usa el costo unitario.</p>
          </div>

          {/* Unit Cost (auto or manual) */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex justify-between">
              <span>Costo Unitario ({currencySymbol.toUpperCase()})</span>
              <span className="text-slate-400 text-xs font-normal">~ {convertToUsd(unitCost)} USD</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-slate-400 text-sm">{currencySymbol}</span>
              <input required type="number" step="0.0001" min="0" value={formData.costPrice}
                onChange={e => setFormData({ ...formData, costPrice: e.target.value, totalCost: '' })}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 pl-10 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none transition"
                placeholder="Auto-calculado o manual" />
            </div>
            {formData.totalCost && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                ✅ Calculado: {currencySymbol} {unitCost.toFixed(4)} / unidad
              </p>
            )}
          </div>

          {/* Sale Price */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex justify-between">
              <span>Precio de Venta / Unidad ({currencySymbol.toUpperCase()}) *</span>
              <span className="text-slate-400 text-xs font-normal">~ {convertToUsd(salePrice)} USD</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-slate-400 text-sm">{currencySymbol}</span>
              <input required type="number" step="0.01" min="0" value={formData.salePrice}
                onChange={e => setFormData({ ...formData, salePrice: e.target.value })}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 pl-10 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition"
                placeholder="0.00" />
            </div>
          </div>

          {/* Margin preview */}
          {unitCost > 0 && salePrice > 0 && (
            <div className={`rounded-xl p-3 border text-sm font-medium flex items-center justify-between ${
              margin >= 20 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400'
              : margin > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-400'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400'
            }`}>
              <span>Margen de ganancia:</span>
              <span className="font-bold text-base">{margin.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* RIGHT column */}
        <div className="space-y-5">
          {/* Image dropzone */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Imagen del Producto</label>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-700/30'
              }`}
              style={{ minHeight: '180px' }}
            >
              {uploadProgress ? (
                <div className="flex flex-col items-center gap-2 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  <span className="text-xs text-slate-400">Subiendo imagen...</span>
                </div>
              ) : formData.imageUrl ? (
                <>
                  <img src={formData.imageUrl} alt="preview"
                    onError={e => { (e.target as HTMLImageElement).src = '/images/product-placeholder.png' }}
                    className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-bold">🔄 Cambiar imagen</span>
                  </div>
                </>
              ) : (
                <div className="py-10 flex flex-col items-center gap-3 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Arrastra la foto aquí</p>
                    <p className="text-xs mt-1">o haz clic para buscar en tu PC</p>
                  </div>
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">JPG, PNG, WEBP</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
            {formData.imageUrl && (
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                className="text-xs text-red-500 hover:text-red-700 transition-colors">
                ✕ Quitar imagen
              </button>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Categoría</label>
            <div className="flex gap-2">
              <select value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition">
                <option value="">Sin Categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="button" onClick={() => setShowNewCat(!showNewCat)}
                className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition text-sm font-semibold border border-indigo-200 dark:border-indigo-700">
                + Nueva
              </button>
            </div>
            {showNewCat && (
              <div className="flex gap-2 mt-2">
                <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)}
                  placeholder="Ej: Lácteos, Bebidas..."
                  className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm" />
                <button type="button" onClick={handleAddCategory}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition">
                  Crear
                </button>
              </div>
            )}
          </div>

          {/* Summary box when all pricing is filled */}
          {unitCost > 0 && salePrice > 0 && formData.stock && (
            <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/50 space-y-2 text-sm">
              <p className="font-bold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-widest">Resumen del Lote</p>
              <div className="flex justify-between">
                <span className="text-slate-500">Inversión total</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {((formData.totalCost ? parseFloat(formData.totalCost) : unitCost * parseInt(formData.stock || '0'))).toFixed(2)} {currencySymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ingresos si se vende todo</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {(salePrice * parseInt(formData.stock || '0')).toFixed(2)} {currencySymbol}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                <span className="text-slate-500">Ganancia potencial</span>
                <span className={`font-extrabold ${margin > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {((salePrice - unitCost) * parseInt(formData.stock || '0')).toFixed(2)} {currencySymbol}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <button disabled={loading} type="submit"
        className={`w-full font-bold py-3.5 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 ${loading
          ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
          : isEdit
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30'
        }`}>
        {loading ? 'Guardando...' : isEdit ? '✏️ Actualizar Producto' : '💾 Registrar en Inventario'}
      </button>
    </form>
  )
}
