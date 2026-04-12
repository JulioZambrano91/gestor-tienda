"use client"

import { useState, useEffect, useCallback } from 'react'
import { useBcv } from '@/components/BcvProvider'

type Product = {
  id: number
  name: string
  salePrice: number
  costPrice: number
  stock: number
  imageUrl?: string
  category?: { name: string }
}

type CartItem = {
  product: Product
  quantity: number
}

type Customer = {
  id: number
  name: string
  phone?: string
  totalOwed: number
}

export function PosView() {
  const { convertToUsd, currencySymbol } = useBcv()
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [paymentType, setPaymentType] = useState<'CONTADO' | 'FIADO'>('CONTADO')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [successSale, setSuccessSale] = useState<any>(null)
  const [loadingProducts, setLoadingProducts] = useState(true)

  const loadData = useCallback(async () => {
    setLoadingProducts(true)
    const [prodRes, custRes] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/customers')
    ])
    if (prodRes.ok) setProducts(await prodRes.json())
    if (custRes.ok) setCustomers(await custRes.json())
    setLoadingProducts(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) && p.stock > 0
  )

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev // no más stock
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQty = (productId: number, delta: number) => {
    setCart(prev =>
      prev
        .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    )
  }

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.product.salePrice * i.quantity, 0)
  const cartProfit = cart.reduce((sum, i) => sum + (i.product.salePrice - i.product.costPrice) * i.quantity, 0)

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) return
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCustomerName.trim(), phone: newCustomerPhone.trim() })
    })
    if (res.ok) {
      const cust = await res.json()
      setCustomers(prev => [...prev, cust].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedCustomer(String(cust.id))
      setNewCustomerName('')
      setNewCustomerPhone('')
      setShowNewCustomer(false)
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (paymentType === 'FIADO' && !selectedCustomer) {
      alert('Selecciona o crea un cliente para registrar un fiado.')
      return
    }
    setProcessing(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({
            productId: i.product.id,
            quantity: i.quantity,
            priceAtSale: i.product.salePrice
          })),
          paymentType,
          customerId: selectedCustomer || null
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al procesar')
      }
      const sale = await res.json()
      setSuccessSale({ ...sale, total: cartTotal, profit: cartProfit, paymentType, customerName: customers.find(c => String(c.id) === selectedCustomer)?.name })
      setCart([])
      setSelectedCustomer('')
      setPaymentType('CONTADO')
      await loadData()
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  if (successSale) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in-down">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl space-y-5">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">¡Venta Registrada!</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              {successSale.paymentType === 'FIADO' ? `Anotado como fiado para ${successSale.customerName}` : 'Pago en efectivo completado'}
            </p>
          </div>
          <div className={`rounded-xl p-4 border ${successSale.paymentType === 'FIADO' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'}`}>
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {successSale.total.toFixed(2)} <span className="text-sm font-medium text-slate-500">{currencySymbol}</span>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Ganancia: <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{successSale.profit.toFixed(2)} {currencySymbol}</span>
            </div>
            <div className={`mt-2 text-xs font-bold px-3 py-1 rounded-full inline-block ${successSale.paymentType === 'FIADO' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
              {successSale.paymentType === 'FIADO' ? '💸 FIADO' : '💵 CONTADO'}
            </div>
          </div>
          <button onClick={() => setSuccessSale(null)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition transform hover:-translate-y-0.5 shadow-lg shadow-indigo-500/30">
            ← Nueva Venta
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in-down" style={{ minHeight: 'calc(100vh - 180px)' }}>

      {/* ── LEFT: PRODUCT GRID ── */}
      <div className="flex-1 flex flex-col space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">📦 Productos</h2>
            <span className="text-sm text-slate-400">{filteredProducts.length} disponibles</span>
          </div>
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-3 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm"
            />
          </div>
        </div>

        {loadingProducts ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto" style={{ maxHeight: '65vh' }}>
            {filteredProducts.map(p => {
              const inCart = cart.find(i => i.product.id === p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.stock === 0}
                  className={`relative text-left bg-white dark:bg-slate-800 border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group ${inCart ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-indigo-600'} ${p.stock === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                >
                  {inCart && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">
                      {inCart.quantity}
                    </span>
                  )}
                  <img
                    src={p.imageUrl || '/images/product-placeholder.png'}
                    alt={p.name}
                    onError={e => { (e.target as HTMLImageElement).src = '/images/product-placeholder.png' }}
                    className="w-full h-20 object-cover rounded-xl mb-3 bg-slate-100 dark:bg-slate-700"
                  />
                  <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {p.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{p.category?.name || 'General'}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{p.salePrice.toFixed(2)} {currencySymbol}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${p.stock <= 5 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'}`}>
                      {p.stock} uds
                    </span>
                  </div>
                </button>
              )
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-4 py-16 text-center text-slate-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-medium">Sin resultados para "{search}"</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: CART / TICKET ── */}
      <div className="w-full lg:w-96 flex flex-col space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm flex flex-col flex-1">
          {/* Cart header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">🧾 Ticket</h2>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors font-medium">
                  Vaciar
                </button>
              )}
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '35vh' }}>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400 space-y-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm font-medium">Carrito vacío</p>
                <p className="text-xs text-center">Haz clic en un producto para añadirlo</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-100 dark:border-slate-700/30">
                  <img
                    src={item.product.imageUrl || '/images/product-placeholder.png'}
                    alt={item.product.name}
                    onError={e => { (e.target as HTMLImageElement).src = '/images/product-placeholder.png' }}
                    className="w-10 h-10 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.product.name}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{item.product.salePrice.toFixed(2)} {currencySymbol} / ud</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-base font-bold hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors flex items-center justify-center">−</button>
                    <span className="w-6 text-center text-sm font-bold text-slate-800 dark:text-slate-100">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} disabled={item.quantity >= item.product.stock} className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-base font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                    <button onClick={() => removeFromCart(item.product.id)} className="ml-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary + Checkout */}
          <div className="p-5 border-t border-slate-100 dark:border-slate-700/50 space-y-4">
            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 text-sm">Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{cartTotal.toFixed(2)} <span className="text-sm font-medium text-slate-400">{currencySymbol}</span></span>
            </div>
            {cart.length > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Ganancia estimada</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{cartProfit.toFixed(2)} {currencySymbol}</span>
              </div>
            )}

            {/* Payment type */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentType('CONTADO')}
                className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${paymentType === 'CONTADO' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-400'}`}
              >
                💵 Contado
              </button>
              <button
                onClick={() => setPaymentType('FIADO')}
                className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${paymentType === 'FIADO' ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-orange-400'}`}
              >
                💸 Fiado
              </button>
            </div>

            {/* Customer selector (FIADO) */}
            {paymentType === 'FIADO' && (
              <div className="space-y-2 bg-orange-50 dark:bg-orange-900/10 rounded-xl p-3 border border-orange-100 dark:border-orange-800/30">
                <label className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Cliente</label>
                <select
                  value={selectedCustomer}
                  onChange={e => setSelectedCustomer(e.target.value)}
                  className="w-full border border-orange-200 dark:border-orange-800 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                >
                  <option value="">Seleccionar cliente…</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.totalOwed > 0 ? ` (debe ${c.totalOwed.toFixed(2)} ${currencySymbol})` : ''}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(!showNewCustomer)}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium"
                >
                  {showNewCustomer ? '↑ Cancelar' : '+ Nuevo cliente'}
                </button>
                {showNewCustomer && (
                  <div className="space-y-2 pt-1">
                    <input type="text" placeholder="Nombre *" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-400 outline-none" />
                    <input type="text" placeholder="Teléfono (opcional)" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-400 outline-none" />
                    <button onClick={handleAddCustomer} className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg transition">Agregar Cliente</button>
                  </div>
                )}
              </div>
            )}

            {/* Checkout button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || processing}
              className={`w-full py-3.5 rounded-xl font-extrabold text-white text-base shadow-lg transition-all transform ${cart.length === 0 || processing ? 'bg-slate-300 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed' : paymentType === 'FIADO' ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30 hover:-translate-y-0.5' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 hover:-translate-y-0.5'}`}
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Procesando...
                </span>
              ) : paymentType === 'FIADO' ? '💸 Anotar Fiado' : '💵 Cobrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
