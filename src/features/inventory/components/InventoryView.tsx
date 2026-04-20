"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ProductForm } from '@/features/inventory/components/ProductForm'
import { ProductTable } from '@/features/inventory/components/ProductTable'
import { RestockView } from '@/features/inventory/components/RestockView'

type Product = {
  id: number; name: string; description?: string
  costPrice: number; salePrice: number; stock: number
  imageUrl?: string; categoryId: number; category?: { name: string }
}

type FormProduct = {
  id?: number; name: string; stock: string
  costPrice: string; salePrice: string; imageUrl: string; categoryId: string
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

export function InventoryView() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<FormProduct | undefined>()
  const [restockProduct, setRestockProduct] = useState<Product | null>(null)

  // —— Filtros ——
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'ok'>('all')

  // —— Paginación ——
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error('Error al cargar inventario')
      setProducts(await res.json())
      setErrorMsg('')
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  // Categorías únicas derivadas
  const categories = useMemo(() => {
    const map = new Map<string, string>()
    products.forEach(p => {
      const name = p.category?.name || 'Sin Categoría'
      map.set(String(p.categoryId), name)
    })
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [products])

  // Productos filtrados
  const filteredProducts = useMemo(() => {
    let result = products

    // Búsqueda por nombre
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q))
    }

    // Filtro por categoría
    if (categoryFilter !== 'all') {
      result = result.filter(p => String(p.categoryId) === categoryFilter)
    }

    // Filtro por stock
    if (stockFilter === 'low') {
      result = result.filter(p => p.stock <= 5)
    } else if (stockFilter === 'ok') {
      result = result.filter(p => p.stock > 5)
    }

    return result
  }, [products, searchTerm, categoryFilter, stockFilter])

  // Reset página cuando cambian los filtros
  useEffect(() => { setCurrentPage(1) }, [searchTerm, categoryFilter, stockFilter, pageSize])

  // Paginación derivada
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [filteredProducts, currentPage, pageSize])

  // Rango visible para label
  const rangeStart = filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, filteredProducts.length)

  const handleSuccess = () => {
    setIsFormOpen(false); setEditProduct(undefined); loadProducts()
  }

  const handleEdit = (product: Product) => {
    setEditProduct({
      id: product.id, name: product.name,
      stock: String(product.stock), costPrice: String(product.costPrice),
      salePrice: String(product.salePrice), imageUrl: product.imageUrl || '', 
      categoryId: String(product.categoryId)
    })
    setIsFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch {
      alert('No se pudo eliminar el producto.')
    }
  }

  // Generar páginas visibles para la barra de paginación
  const getVisiblePages = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '...')[] = [1]
    if (currentPage > 3) pages.push('...')
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  const hasActiveFilters = searchTerm || categoryFilter !== 'all' || stockFilter !== 'all'

  return (
    <div className="space-y-6 animate-fade-in-down">

      {/* Restock Modal */}
      {restockProduct && (
        <RestockView
          product={restockProduct}
          onClose={() => setRestockProduct(null)}
          onRestocked={() => { setRestockProduct(null); loadProducts() }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Gestión de Inventario</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {loading ? 'Cargando...' : products.length > 0
              ? `${products.length} producto${products.length !== 1 ? 's' : ''} registrado${products.length !== 1 ? 's' : ''}`
              : 'El inventario está esperando tu primer producto'}
          </p>
        </div>
        <button
          onClick={() => { setEditProduct(undefined); setIsFormOpen(!isFormOpen) }}
          className="mt-4 sm:mt-0 flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform hover:scale-105 font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            {isFormOpen && !editProduct
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            }
          </svg>
          <span>{isFormOpen && !editProduct ? 'Cerrar' : 'Nuevo Producto'}</span>
        </button>
      </div>

      {/* Error — friendly message, not a crash */}
      {errorMsg && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-5 flex items-center gap-4">
          <span className="text-3xl">⚠️</span>
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-300">No se pudo cargar el inventario</p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">{errorMsg}</p>
            <button onClick={loadProducts} className="text-xs mt-2 text-amber-700 dark:text-amber-300 underline hover:no-underline">
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {isFormOpen && (
        <ProductForm
          onSuccess={handleSuccess}
          onCancel={() => { setIsFormOpen(false); setEditProduct(undefined) }}
          editProduct={editProduct}
        />
      )}

      {/* ════════ Filtros ════════ */}
      {!loading && products.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">

            {/* Búsqueda */}
            <div className="flex-1 min-w-0">
              <label htmlFor="inv-search" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Buscar producto
              </label>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  id="inv-search"
                  type="text"
                  placeholder="Nombre del producto..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Categoría */}
            <div className="sm:w-48">
              <label htmlFor="inv-category" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Categoría
              </label>
              <select
                id="inv-category"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all text-sm appearance-none cursor-pointer"
              >
                <option value="all">Todas</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Stock */}
            <div className="sm:w-44">
              <label htmlFor="inv-stock" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Estado stock
              </label>
              <select
                id="inv-stock"
                value={stockFilter}
                onChange={e => setStockFilter(e.target.value as 'all' | 'low' | 'ok')}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all text-sm appearance-none cursor-pointer"
              >
                <option value="all">Todos</option>
                <option value="low">⚠️ Stock bajo (≤5)</option>
                <option value="ok">✅ Stock normal</option>
              </select>
            </div>

            {/* Limpiar filtros */}
            {hasActiveFilters && (
              <button
                onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setStockFilter('all') }}
                className="self-end px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-sm font-medium flex items-center gap-1.5 whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar
              </button>
            )}
          </div>

          {/* Resumen de filtros */}
          {hasActiveFilters && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              Mostrando <span className="font-semibold text-slate-600 dark:text-slate-300">{filteredProducts.length}</span> de {products.length} productos
            </p>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm">
        <ProductTable
          products={paginatedProducts}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRestock={p => setRestockProduct(p)}
        />

        {/* ════════ Paginación ════════ */}
        {!loading && filteredProducts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 dark:border-slate-700/50">
            {/* Info rango + selector de tamaño */}
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span>
                {rangeStart}–{rangeEnd} de <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredProducts.length}</span>
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs">Filas:</span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botones de página */}
            <div className="flex items-center gap-1">
              {/* Anterior */}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500 disabled:hover:border-slate-200 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Números */}
              {getVisiblePages().map((page, i) =>
                page === '...' ? (
                  <span key={`dots-${i}`} className="px-2 text-slate-400 dark:text-slate-500 text-sm select-none">…</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all
                      ${currentPage === page
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800'
                      }`}
                  >
                    {page}
                  </button>
                )
              )}

              {/* Siguiente */}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500 disabled:hover:border-slate-200 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
