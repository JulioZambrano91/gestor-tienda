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

export function InventoryView() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error("Fallo al cargar inventario")
      const data = await res.json()
      setProducts(data)
      setErrorMsg("")
      setIsFormOpen(false)
    } catch (err: any) {
      console.error("Error Trace [Inventory Load]:", err)
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

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
        <ProductForm 
          onSuccess={loadProducts} 
          onCancel={() => setIsFormOpen(false)} 
        />
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm">
        <ProductTable products={products} loading={loading} />
      </div>
    </div>
  )
}
