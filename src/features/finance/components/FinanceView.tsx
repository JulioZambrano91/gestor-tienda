"use client"

import { useState, useEffect, useCallback } from 'react'
import { useBcv } from '@/components/BcvProvider'
import { logger } from '@/lib/logger'

type MethodData = { revenue: number; count: number }
type MonthData = { month: string; revenue: number; profit: number; contado: number; fiado: number; expenses: number }
type LowStock = { name: string; stock: number; costPrice: number; salePrice: number }
type Customer = { id: number; name: string; totalOwed: number }
type Expense = { id: number; amount: number; concept: string; category: string; account: string; customerId?: number | null; createdAt: string }

type FinanceData = {
  totalRevenue: number; totalProfit: number; totalExpenses: number; totalDebtPaid: number
  cashInHand: number; pagoMovilBalance: number; puntoVentaBalance: number; globalBalance: number
  totalSales: number; profitMarginPct: number
  byMethod: Record<string, MethodData>; monthly: MonthData[]
  stockValue: number; stockSaleValue: number; lowStockProducts: LowStock[]
}

const WITHDRAWAL_SAFETY_PCT = 30

const MONTH_LABELS: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
}

const PERIODS = [
  { label: 'Todo', value: '0' },
  { label: 'Hoy', value: '1' },
  { label: '7d', value: '7' },
  { label: '30d', value: '30' },
]

const ACCOUNT_META: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  EFECTIVO: { emoji: '💵', label: 'Efectivo', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  PAGO_MOVIL: { emoji: '📱', label: 'Pago Móvil', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  PUNTO_VENTA: { emoji: '💳', label: 'Punto de Venta', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
}

const METHOD_META: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  EFECTIVO: { emoji: '💵', label: 'Efectivo', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  PAGO_MOVIL: { emoji: '📱', label: 'Pago Móvil', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  PUNTO_VENTA: { emoji: '💳', label: 'Punto de Venta', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  FIADO: { emoji: '💸', label: 'Fiado', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
}

export function FinanceView() {
  const { currencySymbol, convertToUsd } = useBcv()
  const [data, setData] = useState<FinanceData | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [period, setPeriod] = useState('0')   // default: all time

  // Expense Form State
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseConcept, setExpenseConcept] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('COMPRA')
  const [expenseAccount, setExpenseAccount] = useState('EFECTIVO')
  const [expenseCustomerId, setExpenseCustomerId] = useState<string>('')
  const [submittingExpense, setSubmittingExpense] = useState(false)
  const [formTab, setFormTab] = useState<'OUT' | 'IN'>('OUT')


  // New Customer logic (to match POS experience)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [isAddingCustomer, setIsAddingCustomer] = useState(false)
  const [deletingExpId, setDeletingExpId] = useState<number | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  // Pagination for expenses
  const [currentPageExpenses, setCurrentPageExpenses] = useState(1)
  const EXPENSES_PER_PAGE = 5

  const loadData = useCallback(async (p: string) => {
    logger.info(`Cargando información financiera para periodo: ${p}...`, 'FINANCE')
    try {
      const [finRes, expRes, custRes] = await Promise.all([
        fetch('/api/finance'),
        fetch(`/api/expenses?period=${p}`),
        fetch('/api/customers')
      ])

      if (!finRes.ok) {
        const json = await finRes.json()
        throw new Error(json.error || 'Error al cargar finanzas')
      }

      const finData = await finRes.json()
      const expData = expRes.ok ? await expRes.json() : []
      const custData = custRes.ok ? await custRes.json() : []

      setData(finData)
      setExpenses(expData)
      setCustomers(custData)
      setErrorMsg('')
      logger.info('Datos financieros cargados exitosamente', 'FINANCE')
    } catch (err: any) {
      logger.error('Error cargando panel financiero', 'FINANCE', err)
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    loadData(period)
  }, [loadData, period])

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) return
    setIsAddingCustomer(true)
    logger.info(`Creando nuevo cliente "${newCustomerName}" desde Finanzas...`, 'FINANCE')
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCustomerName.trim(), phone: newCustomerPhone.trim() })
      })
      if (res.ok) {
        const c = await res.json()
        setCustomers(prev => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)))
        setExpenseCustomerId(String(c.id))
        setNewCustomerName('')
        setNewCustomerPhone('')
        setShowNewCustomer(false)
        logger.info(`Cliente "${c.name}" creado y seleccionado`, 'FINANCE')
      }
    } catch (err) {
      logger.error('Error al crear cliente desde finanzas', 'FINANCE', err)
    } finally {
      setIsAddingCustomer(false)
    }
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseAmount || !expenseConcept) return

    setSubmittingExpense(true)
    const finalCategory = formTab === 'IN' ? 'INGRESO_EXTRA' : expenseCategory
    logger.info(`Registrando movimiento: ${expenseConcept} por ${expenseAmount} ${currencySymbol} (Cat: ${finalCategory})...`, 'FINANCE')
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(expenseAmount),
          concept: expenseConcept,
          category: finalCategory,
          account: expenseAccount,
          customerId: finalCategory === 'PRESTAMO' ? (expenseCustomerId ? parseInt(expenseCustomerId) : null) : null
        })
      })
      if (!res.ok) throw new Error('Error al registrar salida en servidor')

      setExpenseAmount('')
      setExpenseConcept('')
      setExpenseCustomerId('')
      setCurrentPageExpenses(1) // Reset to page 1 on new expense
      await loadData(period)
      logger.info('Gasto registrado con éxito', 'FINANCE')
    } catch (err: any) {
      logger.error('Error al registrar gasto', 'FINANCE', err)
      alert(err.message)
    } finally {
      setSubmittingExpense(false)
    }
  }

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('¿Eliminar este registro de gasto? Esta acción devolverá el dinero al balance de la cuenta seleccionada.')) return
    setDeletingExpId(id)
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar el gasto')
      await loadData(period)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeletingExpId(null)
    }
  }

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return
    setSubmittingExpense(true)
    try {
      const res = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingExpense)
      })
      if (!res.ok) throw new Error('Error al actualizar el gasto')
      setEditingExpense(null)
      await loadData(period)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmittingExpense(false)
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <p className="text-slate-500 dark:text-slate-400">Cargando finanzas...</p>
        </div>
      </div>
    )
  }

  if (errorMsg || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-800 p-10 max-w-md text-center space-y-4 shadow-sm">
          <div className="text-5xl">⚠️</div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Error al cargar finanzas</h3>
          <p className="text-sm text-red-600 dark:text-red-400">{errorMsg || 'Respuesta inesperada del servidor.'}</p>
          <button onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition text-sm">
            🔄 Reintentar
          </button>
        </div>
      </div>
    )
  }

  // Empty state: loaded OK but no data yet
  if (data.totalSales === 0 && expenses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/50 p-12 max-w-lg text-center shadow-sm space-y-4">
          <div className="text-6xl">📊</div>
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">No hay finanzas registradas aún</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Comienza registrando ventas en el Cajero o añadiendo productos en el Inventario.
            Los datos financieros aparecerán aquí automáticamente.
          </p>
          <div className="flex gap-3 justify-center">
            <a href="/pos" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition">Ir al Cajero</a>
            <a href="/inventory" className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition">Ver Inventario</a>
          </div>
        </div>
      </div>
    )
  }

  // ── Withdrawal safety calculations ──
  // Restock capital needed = current stock value at cost
  const restockCapital = data.stockValue
  // Safety buffer on top of restock capital
  const safetyBuffer = restockCapital * (WITHDRAWAL_SAFETY_PCT / 100)
  // Minimum cash that must remain in hand before withdrawal is safe
  const minCashToKeep = restockCapital + safetyBuffer
  // Safe withdrawal considers ALL accounts combined
  const safeWithdrawal = Math.max(0, data.globalBalance - minCashToKeep)
  const canWithdraw = safeWithdrawal > 0

  const maxMonthRevenue = Math.max(...data.monthly.map(m => m.revenue), 1)

  const getMonthLabel = (key: string) => {
    const [year, month] = key.split('-')
    return `${MONTH_LABELS[month]} ${year.slice(2)}`
  }

  return (
    <div className="space-y-6 animate-fade-in-down pb-10">

      {/* Header with account balances */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">🏦 Panel Financiero</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Saldo en tiempo real por cuenta · Todo en {currencySymbol}</p>
          </div>
          {/* Period filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1 self-start sm:self-auto">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p.value ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3 accounts + global total */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Cash */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800/30 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">💵</span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Efectivo en Caja</span>
            </div>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {data.cashInHand.toFixed(2)} <span className="text-xs font-medium opacity-60">{currencySymbol}</span>
            </p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60">~ {convertToUsd(data.cashInHand)} USD</p>
            <p className="text-[10px] text-slate-400">Ventas efectivo + abonos − gastos</p>
          </div>

          {/* Pago Móvil */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800/30 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">📱</span>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Cuenta Pago Móvil</span>
            </div>
            <p className="text-2xl font-black text-blue-700 dark:text-blue-300">
              {data.pagoMovilBalance.toFixed(2)} <span className="text-xs font-medium opacity-60">{currencySymbol}</span>
            </p>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/60">~ {convertToUsd(data.pagoMovilBalance)} USD</p>
            <p className="text-[10px] text-slate-400">{data.byMethod['PAGO_MOVIL']?.count || 0} transacciones</p>
          </div>

          {/* Punto de Venta */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 border border-purple-200 dark:border-purple-800/30 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">💳</span>
              <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wide">Cuenta P. de Venta</span>
            </div>
            <p className="text-2xl font-black text-purple-700 dark:text-purple-300">
              {data.puntoVentaBalance.toFixed(2)} <span className="text-xs font-medium opacity-60">{currencySymbol}</span>
            </p>
            <p className="text-xs text-purple-600/70 dark:text-purple-400/60">~ {convertToUsd(data.puntoVentaBalance)} USD</p>
            <p className="text-[10px] text-slate-400">{data.byMethod['PUNTO_VENTA']?.count || 0} transacciones</p>
          </div>

          {/* Global Total */}
          <div className="bg-white dark:bg-slate-700 rounded-2xl p-4 border border-blue-700 dark:border-blue-300 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏦</span>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Total Global</span>
            </div>
            <p className="text-2xl font-black text-blue-700 dark:text-blue-300">
              {data.globalBalance.toFixed(2)} <span className="text-xs font-medium opacity-60">{currencySymbol}</span>
            </p>
            <p className="text-xs text-slate-400">~ {convertToUsd(data.globalBalance)} USD</p>
            <p className="text-[10px] text-slate-500">Caja + Móvil + P.Venta</p>
          </div>
        </div>
      </div>

      {/* Withdrawal Safety Advisor */}
      <div className={`rounded-2xl border p-6 shadow-sm ${canWithdraw
        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30'
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'
        }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl">{canWithdraw ? '✅' : '⚠️'}</span>
            <div>
              <h3 className={`font-extrabold text-base ${canWithdraw ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {canWithdraw ? 'Retiro Seguro Disponible' : 'Aún no es seguro retirar ganancias'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {canWithdraw
                  ? `Tienes capital suficiente para reponer stock y aún sobra margen de seguridad (${WITHDRAWAL_SAFETY_PCT}%).`
                  : `Necesitas al menos ${minCashToKeep.toFixed(2)} ${currencySymbol} en caja para cubrir la reposición más el ${WITHDRAWAL_SAFETY_PCT}% de colchón.`
                }
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Puedes retirar</p>
            <p className={`text-2xl font-black ${canWithdraw ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`}>
              {canWithdraw ? `${safeWithdrawal.toFixed(2)} ${currencySymbol}` : '—'}
            </p>
          </div>
        </div>
        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-3 mt-4 text-xs text-center">
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-3">
            <p className="text-slate-400 mb-1">Total en todas las cuentas</p>
            <p className="font-extrabold text-slate-800 dark:text-slate-100">{data.globalBalance.toFixed(2)} {currencySymbol}</p>
          </div>
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-3">
            <p className="text-slate-400 mb-1">Capital Reposición + {WITHDRAWAL_SAFETY_PCT}%</p>
            <p className="font-extrabold text-amber-700 dark:text-amber-400">{minCashToKeep.toFixed(2)} {currencySymbol}</p>
          </div>
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-3">
            <p className="text-slate-400 mb-1">Retiro Máximo Seguro</p>
            <p className={`font-extrabold ${canWithdraw ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-300 dark:text-slate-600'}`}>
              {canWithdraw ? `${safeWithdrawal.toFixed(2)} ${currencySymbol}` : '0.00'}
            </p>
          </div>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos Totales', val: data.totalRevenue, sub: `Abonos: ${data.totalDebtPaid.toFixed(2)} ${currencySymbol}`, icon: '💰', grad: 'from-indigo-500 to-purple-600' },
          { label: 'Gastos / Salidas', val: data.totalExpenses, sub: `${expenses.length} registros`, icon: '💸', grad: 'from-orange-500 to-red-600' },
          { label: 'Ganancia Neta', val: data.totalProfit, sub: `${data.profitMarginPct.toFixed(1)}% de margen`, icon: '📈', grad: 'from-emerald-500 to-teal-600' },
          { label: 'Valor del Stock', val: data.stockValue, sub: `P. venta: ${data.stockSaleValue.toFixed(2)} ${currencySymbol}`, icon: '🏪', grad: 'from-blue-500 to-cyan-600' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm overflow-hidden relative">
            <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${kpi.grad} opacity-5 rounded-full translate-x-8 -translate-y-8`} />
            <div className="text-2xl mb-2">{kpi.icon}</div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{kpi.label}</div>
            <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">{kpi.val.toFixed(2)} <span className="text-xs text-slate-400">{currencySymbol}</span></div>
            <div className="text-xs text-slate-400 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Expenses Control Tabs */}
      <div className="flex items-center gap-2 mb-4 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl w-full sm:w-max mt-6">
        <button 
          onClick={() => { setFormTab('OUT'); setCurrentPageExpenses(1) }} 
          className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${formTab === 'OUT' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600 dark:text-red-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
          💸 Salidas de Dinero
        </button>
        <button 
          onClick={() => { setFormTab('IN'); setCurrentPageExpenses(1) }} 
          className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${formTab === 'IN' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
          ➕ Saldos Extras
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Register Form */}
        <div className={`bg-white dark:bg-slate-800 rounded-2xl border ${formTab === 'IN' ? 'border-emerald-200 dark:border-emerald-800/50' : 'border-slate-200 dark:border-slate-700/50'} p-6 shadow-sm transition-colors`}>
          <h3 className={`font-bold mb-4 text-lg flex items-center gap-2 ${formTab === 'IN' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
            <span>{formTab === 'IN' ? '🟢' : '🔴'}</span> {formTab === 'IN' ? 'Registrar Saldo Extra' : 'Registrar Salida de Dinero'}
          </h3>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Concepto / Destino</label>
              <input
                required
                type="text"
                value={expenseConcept}
                onChange={e => setExpenseConcept(e.target.value)}
                placeholder={formTab === 'IN' ? "Ej: Saldo Inicial / Extra en efectivo" : "Ej: Reponer Harina PAN"}
                className={`w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 outline-none transition text-sm ${formTab === 'IN' ? 'border-emerald-300 dark:border-emerald-600 focus:ring-2 focus:ring-emerald-500' : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-red-500'}`}
              />
            </div>
            <div className={`grid ${formTab === 'IN' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Monto ({currencySymbol})</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 outline-none transition text-sm ${formTab === 'IN' ? 'border-emerald-300 dark:border-emerald-600 focus:ring-2 focus:ring-emerald-500' : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-red-500'}`}
                />
              </div>
              
              {formTab === 'OUT' && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Categoría</label>
                  <select
                    value={expenseCategory}
                    onChange={e => setExpenseCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 outline-none transition text-sm border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-red-500"
                  >
                      <option value="COMPRA">Compra Mercancía</option>
                      <option value="RETIRO">Retiro Ganancia</option>
                      <option value="SERVICIO">Pago de Servicio</option>
                      <option value="PRESTAMO">Fiado / Pendiente por Cobrar</option>
                      <option value="OTRO">Otro</option>
                  </select>
                </div>
              )}
            </div>

            {/* Customer Selector for FIADO (POS logic) */}
            {formTab === 'OUT' && expenseCategory === 'PRESTAMO' && (
                <div className="animate-fade-in-down space-y-2 bg-orange-50/50 dark:bg-orange-950/10 p-4 rounded-xl border border-orange-200 dark:border-orange-800/30">
                  <label className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase mb-1 block">👤 Cliente Deudor</label>
                  <select
                    required
                    value={expenseCustomerId}
                    onChange={e => setExpenseCustomerId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-orange-300 dark:border-orange-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none transition text-sm shadow-sm"
                  >
                    <option value="">Seleccionar Cliente…</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id.toString()}>
                        {c.name} {c.totalOwed > 0 ? `(debe ${c.totalOwed.toFixed(2)} ${currencySymbol})` : ''}
                      </option>
                    ))}
                  </select>
                  
                  <button type="button" onClick={() => setShowNewCustomer(!showNewCustomer)} 
                    className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-bold flex items-center gap-1">
                    {showNewCustomer ? '↑ Cancelar' : '+ Nuevo Cliente'}
                  </button>

                  {showNewCustomer && (
                    <div className="space-y-2 pt-2 border-t border-orange-100 dark:border-orange-900/40">
                      <input type="text" placeholder="Nombre completo *" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-400" />
                      <input type="text" placeholder="Teléfono" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-400" />
                      <button type="button" onClick={handleAddCustomer} disabled={isAddingCustomer}
                        className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition shadow-sm">
                        {isAddingCustomer ? 'Creando...' : 'Agregar Cliente'}
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-orange-500 mt-1 font-medium">
                    * El monto se asignará a la cuenta del cliente en Fiados.
                  </p>
                </div>
              )}

            {/* Account selector */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Caja / Cuenta involucrada</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(ACCOUNT_META).map(([key, meta]) => (
                  <button key={key} type="button" onClick={() => setExpenseAccount(key)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 text-xs font-bold transition-all ${
                      expenseAccount === key
                        ? (formTab === 'IN' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300')
                        : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 text-slate-500 hover:border-slate-300'
                    }`}>
                    <span className="text-base">{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              disabled={submittingExpense}
              type="submit"
              className={`w-full py-3 text-white font-bold rounded-xl transition shadow-lg disabled:opacity-50 ${formTab === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'}`}
            >
              {submittingExpense ? 'Procesando...' : (formTab === 'IN' ? '📈 Registrar Ingreso' : '📉 Registrar Salida')}
            </button>
          </form>
        </div>

        {/* Expense History List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg">
              {formTab === 'IN' ? 'Historial de Saldos Extras' : 'Últimas Salidas de Dinero'}
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {expenses.filter(e => formTab === 'IN' ? e.category === 'INGRESO_EXTRA' : e.category !== 'INGRESO_EXTRA').length} registros
            </span>
          </div>

          <div className="flex-1 space-y-2 mb-4">
            {expenses.filter(e => formTab === 'IN' ? e.category === 'INGRESO_EXTRA' : e.category !== 'INGRESO_EXTRA').length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-sm italic">
                {formTab === 'IN' ? 'No hay saldos extras registrados' : 'No hay salidas registradas aún'}
              </p>
            ) : (
              expenses
                .filter(e => formTab === 'IN' ? e.category === 'INGRESO_EXTRA' : e.category !== 'INGRESO_EXTRA')
                .slice((currentPageExpenses - 1) * EXPENSES_PER_PAGE, currentPageExpenses * EXPENSES_PER_PAGE)
                .map(exp => (
                  <div key={exp.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:border-slate-300 dark:hover:border-slate-600 ${exp.category === 'INGRESO_EXTRA' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-700/30'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {exp.category === 'COMPRA' ? '🛒' : exp.category === 'RETIRO' ? '🏦' : exp.category === 'SERVICIO' ? '⚡' : exp.category === 'INGRESO_EXTRA' ? '➕' : '📝'}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight">{exp.concept}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(exp.createdAt).toLocaleString()} · {exp.category.replace('_', ' ')}
                        </p>
                        <span className={`text-[10px] font-bold mt-0.5 inline-block ${(ACCOUNT_META[exp.account || 'EFECTIVO'] || ACCOUNT_META.EFECTIVO).color}`}>
                          {(ACCOUNT_META[exp.account || 'EFECTIVO'] || ACCOUNT_META.EFECTIVO).emoji} {(ACCOUNT_META[exp.account || 'EFECTIVO'] || ACCOUNT_META.EFECTIVO).label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className={`text-sm font-black ${exp.category === 'INGRESO_EXTRA' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {exp.category === 'INGRESO_EXTRA' ? '+' : '-'}{exp.amount.toFixed(2)} {currencySymbol}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => setEditingExpense(exp)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button 
                          disabled={deletingExpId === exp.id}
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                          title="Eliminar"
                        >
                          {deletingExpId === exp.id ? (
                            <div className="h-4 w-4 border-2 border-red-500 border-t-transparent animate-spin rounded-full" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a2 2 0 00-2 2v1h8V5a2 2 0 00-2-2m-4 0h4" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Pagination Controls */}
          {expenses.filter(e => formTab === 'IN' ? e.category === 'INGRESO_EXTRA' : e.category !== 'INGRESO_EXTRA').length > EXPENSES_PER_PAGE && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                disabled={currentPageExpenses === 1}
                onClick={() => setCurrentPageExpenses(prev => prev - 1)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl disabled:opacity-30 transition hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                Anterior
              </button>
              <span className="text-xs font-bold text-slate-400">
                Página {currentPageExpenses} de {Math.ceil(expenses.filter(e => formTab === 'IN' ? e.category === 'INGRESO_EXTRA' : e.category !== 'INGRESO_EXTRA').length / EXPENSES_PER_PAGE)}
              </span>
              <button
                disabled={currentPageExpenses >= Math.ceil(expenses.filter(e => formTab === 'IN' ? e.category === 'INGRESO_EXTRA' : e.category !== 'INGRESO_EXTRA').length / EXPENSES_PER_PAGE)}
                onClick={() => setCurrentPageExpenses(prev => prev + 1)}

                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl disabled:opacity-30 transition hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-5 text-base">💳 Ingresos Brutos por Método de Pago</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(METHOD_META).map(([key, meta]) => {
            const d = data.byMethod[key] || { revenue: 0, count: 0 }
            const pct = data.totalRevenue > 0 ? ((d.revenue / data.totalRevenue) * 100) : 0
            return (
              <div key={key} className={`${meta.bg} rounded-2xl p-5 border border-slate-100 dark:border-slate-700/30 space-y-3`}>
                <div className="text-2xl">{meta.emoji}</div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{meta.label}</div>
                <div className={`text-xl font-extrabold ${meta.color}`}>
                  {d.revenue.toFixed(2)} <span className="text-xs font-medium text-slate-400">{currencySymbol}</span>
                </div>
                <div className="text-xs text-slate-400">{d.count} transacción{d.count !== 1 ? 'es' : ''}</div>
                <div className="h-1.5 bg-white/50 dark:bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-current rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{pct.toFixed(1)}% del total</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-1 text-base">📅 Comparativa Mensual</h3>
        <p className="text-xs text-slate-400 mb-5">Ingresos vs Gastos · Verde translúcido = Ganancia (antes de gastos)</p>
        <div className="flex items-end justify-between gap-3 h-44">
          {data.monthly.map((m) => {
            const totalPct = maxMonthRevenue > 0 ? (m.revenue / maxMonthRevenue) * 100 : 0
            const expPct = maxMonthRevenue > 0 ? (m.expenses / maxMonthRevenue) * 100 : 0
            const profitPct = m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full relative flex items-end gap-1" style={{ height: '140px' }}>
                  {/* Revenue bar */}
                  <div className="flex-1 relative rounded-t-lg overflow-hidden bg-indigo-400 dark:bg-indigo-500"
                    style={{ height: `${Math.max(totalPct, m.revenue > 0 ? 5 : 0)}%` }}>
                    <div className="absolute bottom-0 left-0 right-0 bg-emerald-400/40" style={{ height: `${profitPct}%` }} />
                  </div>
                  {/* Expense bar */}
                  <div className="flex-1 relative rounded-t-md overflow-hidden bg-red-400 dark:bg-red-500/60"
                    style={{ height: `${Math.max(expPct, m.expenses > 0 ? 3 : 0)}%` }}>
                  </div>

                  {/* Tooltip */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow">
                    In: {m.revenue.toFixed(0)} | Out: {m.expenses.toFixed(0)}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 capitalize">{getMonthLabel(m.month)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stock analysis & Low Stock Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base">🏪 Análisis de Stock</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Valor Invertido</div>
              <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">{data.stockValue.toFixed(2)} <span className="text-xs text-slate-400">{currencySymbol}</span></div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800/30">
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Valor Potencial</div>
              <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">{data.stockSaleValue.toFixed(2)} <span className="text-xs text-slate-400">{currencySymbol}</span></div>
            </div>
          </div>
        </div>

        {data.lowStockProducts.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900/20 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
              <h4 className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Alertas de Stock ({data.lowStockProducts.length})</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.lowStockProducts.slice(0, 6).map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 rounded-xl px-3 py-2 border border-red-100 dark:border-red-800/20">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{p.name}</span>
                  <span className="text-[10px] font-black text-red-600 bg-white dark:bg-red-900/50 px-2 py-0.5 rounded-full">{p.stock} uds</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8 relative space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">✏️ Editar Salida</h3>
              <button onClick={() => setEditingExpense(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleUpdateExpense} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Concepto / Destino</label>
                <input required type="text" value={editingExpense.concept}
                  onChange={e => setEditingExpense({...editingExpense, concept: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Monto ({currencySymbol})</label>
                  <input required type="number" step="0.01" value={editingExpense.amount}
                    onChange={e => setEditingExpense({...editingExpense, amount: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Categoría</label>
                  <select value={editingExpense.category}
                    onChange={e => setEditingExpense({...editingExpense, category: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm">
                    <option value="COMPRA">Compra Mercancía</option>
                    <option value="RETIRO">Retiro Ganancia</option>
                    <option value="SERVICIO">Pago de Servicio</option>
                    <option value="PRESTAMO">Fiado / Pendiente por Cobrar</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              {/* Customer Selector for FIADO (POS logic) */}
              {expenseCategory === 'PRESTAMO' && (
                <div className="animate-fade-in-down space-y-2 bg-orange-50/50 dark:bg-orange-950/10 p-4 rounded-xl border border-orange-200 dark:border-orange-800/30">
                  <label className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase mb-1 block">👤 Cliente Deudor</label>
                  <select
                    required
                    value={expenseCustomerId}
                    onChange={e => setExpenseCustomerId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-orange-300 dark:border-orange-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none transition text-sm shadow-sm"
                  >
                    <option value="">Seleccionar Cliente…</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id.toString()}>
                        {c.name} {c.totalOwed > 0 ? `(debe ${c.totalOwed.toFixed(2)} ${currencySymbol})` : ''}
                      </option>
                    ))}
                  </select>
                  
                  <button type="button" onClick={() => setShowNewCustomer(!showNewCustomer)} 
                    className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-bold flex items-center gap-1">
                    {showNewCustomer ? '↑ Cancelar' : '+ Nuevo Cliente'}
                  </button>

                  {showNewCustomer && (
                    <div className="space-y-2 pt-2 border-t border-orange-100 dark:border-orange-900/40">
                      <input type="text" placeholder="Nombre completo *" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-400" />
                      <input type="text" placeholder="Teléfono" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-400" />
                      <button type="button" onClick={handleAddCustomer} disabled={isAddingCustomer}
                        className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition shadow-sm">
                        {isAddingCustomer ? 'Creando...' : 'Agregar Cliente'}
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-orange-500 mt-1 font-medium">
                    * El monto se asignará a la cuenta del cliente en Fiados.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Cuenta de salida</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(ACCOUNT_META).map(([key, meta]) => (
                    <button key={key} type="button" onClick={() => setEditingExpense({...editingExpense, account: key})}
                      className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl border-2 text-[10px] font-bold transition-all ${
                        editingExpense.account === key
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 text-slate-500 hover:border-slate-300'
                      }`}>
                      <span className="text-xl">{meta.emoji}</span>
                      <span>{meta.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setEditingExpense(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition">
                  Cancelar
                </button>
                <button disabled={submittingExpense} type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-500/20 disabled:opacity-50">
                  {submittingExpense ? 'Procesando...' : 'Aplicar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
