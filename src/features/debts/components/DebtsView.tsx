"use client"

import { useState, useEffect, useCallback } from 'react'
import { useBcv } from '@/components/BcvProvider'

type DebtPayment = {
  id: number; amount: number; concept: string; createdAt: string
}
type SaleItem = { quantity: number; priceAtSale: number; product: { name: string } }
type FiadoSale = {
  id: number; createdAt: string; totalAmount: number; items: SaleItem[]
}
type Customer = {
  id: number; name: string; phone?: string; totalOwed: number
  sales: FiadoSale[]; payments: DebtPayment[]
}

export function DebtsView() {
  const { currencySymbol, convertToUsd } = useBcv()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [paying, setPaying] = useState<number | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payProcessing, setPayProcessing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'settled'>('active')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/debts')
      if (res.ok) setCustomers(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handlePay = async (customerId: number, totalOwed: number) => {
    const amount = parseFloat(payAmount)
    if (isNaN(amount) || amount <= 0) { alert('Ingresa un monto válido.'); return }
    if (amount > totalOwed) { alert(`El monto supera la deuda (${totalOwed.toFixed(2)} ${currencySymbol}).`); return }
    setPayProcessing(true)
    try {
      const res = await fetch(`/api/debts/${customerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, concept: amount >= totalOwed ? 'Saldado' : 'Abono' })
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      setPayAmount('')
      setPaying(null)
      await load()
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setPayProcessing(false)
    }
  }

  const filteredCustomers = customers.filter(c => {
    if (filter === 'active') return c.totalOwed > 0
    if (filter === 'settled') return c.totalOwed === 0 && c.sales.length > 0
    return c.sales.length > 0
  })

  const totalOwedAll = customers.reduce((s, c) => s + c.totalOwed, 0)
  const activeDebtors = customers.filter(c => c.totalOwed > 0).length

  const formatDateTime = (iso: string) => new Date(iso).toLocaleString('es-VE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="text-slate-500 dark:text-slate-400">Cargando fiados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-down">

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">💸 Control de Fiados</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Libreta digital de deudas y abonos</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1">
            {([['active', 'Con Deuda'], ['settled', 'Saldados'], ['all', 'Todos']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === val ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-orange-200 dark:border-orange-800/30 p-5 shadow-sm">
          <div className="text-2xl mb-1">⚠️</div>
          <div className="text-xs font-semibold text-orange-500 dark:text-orange-400 uppercase tracking-wide">Total Adeudado</div>
          <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">{totalOwedAll.toFixed(2)} <span className="text-sm font-medium text-slate-400">{currencySymbol}</span></div>
          <div className="text-xs text-slate-400 mt-1">~ {convertToUsd(totalOwedAll)} USD</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm">
          <div className="text-2xl mb-1">👤</div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Deudores Activos</div>
          <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">{activeDebtors}</div>
          <div className="text-xs text-slate-400 mt-1">de {customers.filter(c => c.sales.length > 0).length} clientes con fiados</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-200 dark:border-emerald-800/30 p-5 shadow-sm">
          <div className="text-2xl mb-1">✅</div>
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Cuentas Saldadas</div>
          <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">{customers.filter(c => c.totalOwed === 0 && c.sales.length > 0).length}</div>
          <div className="text-xs text-slate-400 mt-1">clientes al día</div>
        </div>
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-16 flex flex-col items-center text-center space-y-4 shadow-sm">
          <span className="text-6xl">🎉</span>
          <div>
            <p className="text-xl font-bold text-slate-700 dark:text-slate-300">
              {filter === 'active' ? '¡Sin deudas pendientes!' : 'Sin registros en esta categoría'}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {filter === 'active' ? 'Todos los fiados han sido saldados.' : 'Realiza ventas fiadas desde el Cajero.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map(customer => {
            const isExpanded = expanded === customer.id
            const isPaying = paying === customer.id
            const debtPct = totalOwedAll > 0 ? (customer.totalOwed / totalOwedAll) * 100 : 0
            const isSettled = customer.totalOwed === 0

            return (
              <div key={customer.id} className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm overflow-hidden transition-all ${isSettled ? 'border-emerald-200 dark:border-emerald-800/30' : 'border-orange-200 dark:border-orange-800/30'}`}>

                {/* Customer Header */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 ${isSettled ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}`}>
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">{customer.name}</span>
                        {isSettled ? (
                          <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">✅ Saldado</span>
                        ) : (
                          <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full font-bold">⚠️ Con deuda</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400 mt-0.5 flex items-center gap-3">
                        {customer.phone && <span>📞 {customer.phone}</span>}
                        <span>🧾 {customer.sales.length} venta{customer.sales.length !== 1 ? 's' : ''} fiada{customer.sales.length !== 1 ? 's' : ''}</span>
                        <span>💳 {customer.payments.length} pago{customer.payments.length !== 1 ? 's' : ''}</span>
                      </div>
                      {!isSettled && (
                        <div className="mt-2 w-48 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full" style={{ width: `${Math.min(debtPct * 3, 100)}%` }} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`text-2xl font-extrabold ${isSettled ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {customer.totalOwed.toFixed(2)} <span className="text-sm font-medium text-slate-400">{currencySymbol}</span>
                      </div>
                      {!isSettled && <div className="text-xs text-slate-400">~ {convertToUsd(customer.totalOwed)} USD</div>}
                    </div>

                    <div className="flex gap-2">
                      {!isSettled && (
                        <button
                          onClick={() => { setPaying(isPaying ? null : customer.id); setPayAmount('') }}
                          className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${isPaying ? 'bg-orange-500 border-orange-500 text-white' : 'border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`}
                        >
                          💳 Abonar
                        </button>
                      )}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : customer.id)}
                        className="px-4 py-2 rounded-xl text-sm font-bold border-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
                      >
                        {isExpanded ? '↑ Ocultar' : '↓ Detalle'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pay Panel */}
                {isPaying && !isSettled && (
                  <div className="mx-5 mb-4 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800/30 space-y-3">
                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                      Registrar pago — Deuda actual: <strong>{customer.totalOwed.toFixed(2)} {currencySymbol}</strong>
                    </p>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-sm">{currencySymbol}</span>
                        <input
                          type="number" step="0.01" min="0.01" max={customer.totalOwed}
                          value={payAmount}
                          onChange={e => setPayAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-10 pr-4 py-2.5 border border-orange-200 dark:border-orange-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                        />
                      </div>
                      <button
                        onClick={() => setPayAmount(String(customer.totalOwed.toFixed(2)))}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                      >
                        Todo
                      </button>
                      <button
                        disabled={payProcessing}
                        onClick={() => handlePay(customer.id, customer.totalOwed)}
                        className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition disabled:opacity-50"
                      >
                        {payProcessing ? '...' : '✓ Confirmar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700/40">

                      {/* Fiado Sales */}
                      <div className="p-5">
                        <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
                          <span className="w-5 h-5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-xs">💸</span>
                          Ventas Fiadas
                        </h4>
                        {customer.sales.length === 0 ? (
                          <p className="text-slate-400 text-sm">Sin ventas fiadas registradas.</p>
                        ) : (
                          <div className="space-y-3">
                            {customer.sales.map(sale => (
                              <div key={sale.id} className="bg-orange-50/50 dark:bg-orange-900/10 rounded-xl p-3 border border-orange-100 dark:border-orange-800/20">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs text-slate-400">{formatDateTime(sale.createdAt)}</span>
                                  <span className="font-bold text-orange-600 dark:text-orange-400 text-sm">{sale.totalAmount.toFixed(2)} {currencySymbol}</span>
                                </div>
                                <div className="space-y-1">
                                  {sale.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                      <span>{item.product.name} × {item.quantity}</span>
                                      <span>{(item.priceAtSale * item.quantity).toFixed(2)} {currencySymbol}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Payment History */}
                      <div className="p-5">
                        <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
                          <span className="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-xs">✅</span>
                          Historial de Pagos
                        </h4>
                        {customer.payments.length === 0 ? (
                          <p className="text-slate-400 text-sm">Sin abonos registrados aún.</p>
                        ) : (
                          <div className="space-y-2">
                            {customer.payments.map(payment => (
                              <div key={payment.id} className="flex items-center justify-between bg-emerald-50/70 dark:bg-emerald-900/10 rounded-xl px-3 py-2 border border-emerald-100 dark:border-emerald-800/20">
                                <div>
                                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{payment.concept}</span>
                                  <div className="text-xs text-slate-400 mt-0.5">{formatDateTime(payment.createdAt)}</div>
                                </div>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">+{payment.amount.toFixed(2)} {currencySymbol}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
