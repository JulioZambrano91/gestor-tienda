"use client"

import { useState, useEffect, useCallback } from 'react'
import { ProductForm } from '@/features/inventory/components/ProductForm'
import { ProductTable } from '@/features/inventory/components/ProductTable'

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

type FormProduct = {
  id?: number
  name: string
  stock: string
  costPrice: string
  salePrice: string
  imageUrl: string
  categoryId: string
}

export function InventoryView() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<FormProduct | undefined>(undefined)

  const loadProducts = useCallback(async () => {
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
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  const handleSuccess = () => {
    setIsFormOpen(false)
    setEditProduct(undefined)
    loadProducts()
  }

  const handleEdit = (product: Product) => {
    setEditProduct({
      id: product.id,
      name: product.name,
      stock: String(product.stock),
      costPrice: String(product.costPrice),
      salePrice: String(product.salePrice),
      imageUrl: product.imageUrl || '',
      categoryId: ''
    })
    setIsFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error("Error al eliminar")
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch (err: any) {
      console.error("Delete error:", err)
      alert("No se pudo eliminar el producto.")
    }
  }

  const handleNewProduct = () => {
    setEditProduct(undefined)
    setIsFormOpen(!isFormOpen)
  }

  return (
    <div className="space-y-6 animate-fade-in-down">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Gestión de Inventario</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {products.length > 0 ? `${products.length} producto${products.length !== 1 ? 's' : ''} registrado${products.length !== 1 ? 's' : ''}` : 'Sin productos registrados'}
          </p>
        </div>
        <button
          onClick={handleNewProduct}
          className="mt-4 sm:mt-0 flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform hover:scale-105 font-medium"
        >
          {isFormOpen && !editProduct ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Cerrar</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Nuevo Producto</span>
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl">
          <p className="text-sm text-red-700 dark:text-red-400">⚠️ {errorMsg}</p>
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
        />
      </div>
    </div>
  )
}
