"use client"

import { useState, useEffect, useCallback } from 'react'
import { useBcv } from '@/components/BcvProvider'

type Product = {
  id: number; name: string; salePrice: number; costPrice: number
  stock: number; imageUrl?: string; category?: { name: string }
}
type CartItem = { product: Product; quantity: number }
type Customer = { id: number; name: string; phone?: string; totalOwed: number }
type PaymentMethod = 'EFECTIVO' | 'PAGO_MOVIL' | 'PUNTO_VENTA' | 'FIADO'

// Informational payment methods (just for recording, don't change checkout flow)
const CONTADO_METHODS: { method: Exclude<PaymentMethod, 'FIADO'>; label: string; emoji: string }[] = [
  { method: 'EFECTIVO',     label: 'Efectivo',       emoji: '💵' },
  { method: 'PAGO_MOVIL',  label: 'Pago Móvil',     emoji: '📱' },
  { method: 'PUNTO_VENTA', label: 'Punto de Venta',  emoji: '💳' },
]

export function PosView() {
  const { convertToUsd, currencySymbol } = useBcv()
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [isFiado, setIsFiado] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<Exclude<PaymentMethod, 'FIADO'>>('EFECTIVO')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [successSale, setSuccessSale] = useState<any>(null)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isOldSale, setIsOldSale] = useState(false)
  const [customDate, setCustomDate] = useState('')

  // Set default custom date to now when the component mounts or when isOldSale is toggled
  useEffect(() => {
    if (isOldSale && !customDate) {
      const now = new Date()
      const offset = now.getTimezoneOffset() * 60000
      const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16)
      setCustomDate(localISOTime)
    }
  }, [isOldSale, customDate])

  const loadData = useCallback(async () => {
    setLoadingProducts(true)
    const [prodRes, custRes] = await Promise.all([fetch('/api/products'), fetch('/api/customers')])
    if (prodRes.ok) setProducts(await prodRes.json())
    if (custRes.ok) setCustomers(await custRes.json())
    setLoadingProducts(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category?.name || 'General'))).sort()]

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'all' || (p.category?.name || 'General') === categoryFilter
    return matchSearch && matchCat && p.stock > 0
  })

  const addToCart = (product: Product) => {
    setCart(prev => {
      const e = prev.find(i => i.product.id === product.id)
      if (e) {
        if (e.quantity >= product.stock) return prev
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQty = (id: number, delta: number) =>
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0))

  const removeFromCart = (id: number) => setCart(prev => prev.filter(i => i.product.id !== id))

  const cartTotal = cart.reduce((s, i) => s + i.product.salePrice * i.quantity, 0)
  const cartProfit = cart.reduce((s, i) => s + (i.product.salePrice - i.product.costPrice) * i.quantity, 0)

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) return
    const res = await fetch('/api/customers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCustomerName.trim(), phone: newCustomerPhone.trim() })
    })
    if (res.ok) {
      const c = await res.json()
      setCustomers(prev => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedCustomer(String(c.id))
      setNewCustomerName(''); setNewCustomerPhone(''); setShowNewCustomer(false)
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (isFiado && !selectedCustomer) {
      alert('Selecciona o crea un cliente para registrar un fiado.'); return
    }
    setProcessing(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity, priceAtSale: i.product.salePrice })),
          paymentType: isFiado ? 'FIADO' : 'CONTADO',
          paymentMethod: isFiado ? 'FIADO' : paymentMethod,
          customerId: isFiado ? (selectedCustomer || null) : null,
          createdAt: isOldSale ? customDate : undefined
        })
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error al procesar') }
      const sale = await res.json()
      const methodLabel = isFiado ? 'Fiado' : CONTADO_METHODS.find(m => m.method === paymentMethod)?.label || paymentMethod
      const methodEmoji = isFiado ? '💸' : CONTADO_METHODS.find(m => m.method === paymentMethod)?.emoji || '💵'
      setSuccessSale({
        ...sale, total: cartTotal, profit: cartProfit,
        methodLabel, methodEmoji, isFiado,
        customerName: customers.find(c => String(c.id) === selectedCustomer)?.name
      })
      setCart([]); setSelectedCustomer(''); setIsFiado(false); setPaymentMethod('EFECTIVO'); setIsOldSale(false); setCustomDate('')
      await loadData()
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  // ── SUCCESS SCREEN ──
  if (successSale) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in-down">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl space-y-5">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto text-4xl ${successSale.isFiado ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
            {successSale.methodEmoji}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">¡Venta Registrada!</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              {successSale.isFiado ? `Fiado anotado para ${successSale.customerName}` : `Cobrado · ${successSale.methodLabel}`}
            </p>
          </div>
          <div className={`rounded-xl p-5 border space-y-3 ${successSale.isFiado ? 'border-orange-100 dark:border-orange-800/30 bg-orange-50 dark:bg-orange-900/10' : 'border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30'}`}>
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {successSale.total.toFixed(2)} <span className="text-sm font-medium text-slate-400">{currencySymbol}</span>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Ganancia: <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{successSale.profit.toFixed(2)} {currencySymbol}</span>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 ${successSale.isFiado ? 'bg-orange-500 text-white' : 'bg-emerald-600 text-white'}`}>
              {successSale.methodEmoji} {successSale.methodLabel.toUpperCase()}
            </span>
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">📦 Productos</h2>
            <span className="text-sm text-slate-400">{filteredProducts.length} disponibles</span>
          </div>
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-3 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm" />
          </div>
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${categoryFilter === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                {cat === 'all' ? 'Todos' : cat}
              </button>
            ))}
          </div>
        </div>

        {loadingProducts ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto" style={{ maxHeight: '62vh' }}>
            {filteredProducts.map(p => {
              const inCart = cart.find(i => i.product.id === p.id)
              return (
                <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock === 0}
                  className={`relative text-left bg-white dark:bg-slate-800 border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group ${inCart ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-indigo-600'} ${p.stock === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}>
                  {inCart && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">{inCart.quantity}</span>
                  )}
                  <img src={p.imageUrl || '/images/product-placeholder.png'} alt={p.name}
                    onError={e => { (e.target as HTMLImageElement).src = '/images/product-placeholder.png' }}
                    className="w-full h-20 object-cover rounded-xl mb-3 bg-slate-100 dark:bg-slate-700" />
                  <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{p.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{p.category?.name || 'General'}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{p.salePrice.toFixed(2)} {currencySymbol}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${p.stock <= 5 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'}`}>{p.stock}</span>
                  </div>
                </button>
              )
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-4 py-16 text-center text-slate-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-medium">Sin resultados</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: CART / TICKET ── */}
      <div className="w-full lg:w-96 flex flex-col space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm flex flex-col">

          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">🧾 Ticket</h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700 transition-colors font-medium">Vaciar</button>
            )}
          </div>

          {/* Cart items */}
          <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: '28vh' }}>
            {cart.length === 0 ? (
              <div className="py-10 flex flex-col items-center text-slate-400 space-y-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm font-medium">Carrito vacío</p>
              </div>
            ) : cart.map(item => (
              <div key={item.product.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-100 dark:border-slate-700/30">
                <img src={item.product.imageUrl || '/images/product-placeholder.png'} alt={item.product.name}
                  onError={e => { (e.target as HTMLImageElement).src = '/images/product-placeholder.png' }}
                  className="w-10 h-10 object-cover rounded-lg shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.product.name}</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{item.product.salePrice.toFixed(2)} {currencySymbol}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 flex items-center justify-center text-base font-bold transition-colors">−</button>
                  <span className="w-6 text-center text-sm font-bold text-slate-800 dark:text-slate-100">{item.quantity}</span>
                  <button onClick={() => updateQty(item.product.id, 1)} disabled={item.quantity >= item.product.stock} className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 flex items-center justify-center text-base font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                  <button onClick={() => removeFromCart(item.product.id)} className="ml-1 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary + Checkout */}
          <div className="p-5 border-t border-slate-100 dark:border-slate-700/50 space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-slate-500 dark:text-slate-400 text-sm">{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{cartTotal.toFixed(2)} <span className="text-sm font-medium text-slate-400">{currencySymbol}</span></span>
            </div>
            {cart.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Ganancia estimada</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{cartProfit.toFixed(2)} {currencySymbol}</span>
              </div>
            )}

            {/* ── Método de cobro (informativo) ── */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Método de cobro</p>
              <div className="grid grid-cols-3 gap-2">
                {CONTADO_METHODS.map(opt => (
                  <button key={opt.method}
                    onClick={() => { setPaymentMethod(opt.method); setIsFiado(false) }}
                    className={`py-2 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1 ${
                      !isFiado && paymentMethod === opt.method
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}>
                    <span className="text-lg">{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Fiado toggle ── */}
            <button
              onClick={() => { setIsFiado(!isFiado); setSelectedCustomer('') }}
              className={`w-full py-2.5 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                isFiado
                  ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-orange-400 hover:text-orange-500'
              }`}
            >
              💸 {isFiado ? 'Marcado como Fiado — Click para cancelar' : 'Marcar como Fiado'}
            </button>

            {/* Customer selector (FIADO) */}
            {isFiado && (
              <div className="space-y-2 bg-orange-50 dark:bg-orange-900/10 rounded-xl p-3 border border-orange-100 dark:border-orange-800/30">
                <label className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Cliente</label>
                <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}
                  className="w-full border border-orange-200 dark:border-orange-800 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-400 outline-none">
                  <option value="">Seleccionar cliente…</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.totalOwed > 0 ? ` (debe ${c.totalOwed.toFixed(2)} ${currencySymbol})` : ''}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setShowNewCustomer(!showNewCustomer)} className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium">
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

            {/* ── Venta Vieja toggle ── */}
            <div className="space-y-2">
              <button
                onClick={() => { setIsOldSale(!isOldSale) }}
                className={`w-full py-2.5 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                  isOldSale
                    ? 'bg-slate-700 border-slate-700 text-white shadow-md'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400 hover:text-slate-600'
                }`}
              >
                📅 {isOldSale ? 'Venta Antigua Activa — Click para hoy' : 'Registrar Venta Antigua'}
              </button>
              
              {isOldSale && (
                <div className="bg-slate-100 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-2 animate-fade-in-down">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Fecha y Hora de la Venta</label>
                  <input 
                    type="datetime-local" 
                    value={customDate} 
                    onChange={e => setCustomDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}
            </div>

            {/* ── Cobrar button ── always the same, always green unless fiado ── */}
            <button onClick={handleCheckout} disabled={cart.length === 0 || processing}
              className={`w-full py-3.5 rounded-xl font-extrabold text-white text-base shadow-lg transition-all transform ${
                cart.length === 0 || processing
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  : isFiado
                    ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30 hover:-translate-y-0.5'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 hover:-translate-y-0.5'
              }`}>
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Procesando...
                </span>
              ) : isFiado ? '💸 Anotar Fiado' : '✅ Cobrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
