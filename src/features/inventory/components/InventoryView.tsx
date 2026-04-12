"use client"

import { useState, useEffect, useCallback } from 'react'
import { ProductForm } from '@/features/inventory/components/ProductForm'
import { ProductTable } from '@/features/inventory/components/ProductTable'
import { RestockView } from '@/features/inventory/components/RestockView'

type Product = {
  id: number; name: string; description?: string
  costPrice: number; salePrice: number; stock: number
  imageUrl?: string; category?: { name: string }
}

type FormProduct = {
  id?: number; name: string; stock: string
  costPrice: string; salePrice: string; imageUrl: string; categoryId: string
}

export function InventoryView() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<FormProduct | undefined>()
  const [restockProduct, setRestockProduct] = useState<Product | null>(null)

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

  const handleSuccess = () => {
    setIsFormOpen(false); setEditProduct(undefined); loadProducts()
  }

  const handleEdit = (product: Product) => {
    setEditProduct({
      id: product.id, name: product.name,
      stock: String(product.stock), costPrice: String(product.costPrice),
      salePrice: String(product.salePrice), imageUrl: product.imageUrl || '', categoryId: ''
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

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm">
        <ProductTable
          products={products}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRestock={p => setRestockProduct(p)}
        />
      </div>
    </div>
  )
}
