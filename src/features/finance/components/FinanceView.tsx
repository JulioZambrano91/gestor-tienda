"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useBcv } from '@/components/BcvProvider'
import { logger } from '@/lib/logger'

// ─── Types ────────────────────────────────────────────────────────────────────
type MethodData = { revenue: number; count: number }
type MonthData = { month: string; revenue: number; profit: number; contado: number; fiado: number; expenses: number }
type LowStock = { name: string; stock: number; costPrice: number; salePrice: number }
type Customer = { id: number; name: string; totalOwed: number }
type Expense = {
  id: number; amount: number; concept: string; category: string
  account: string; customerId?: number | null; createdAt: string
}
type FinanceData = {
  totalRevenue: number; totalProfit: number; totalExpenses: number; totalDebtPaid: number
  cashInHand: number; pagoMovilBalance: number; puntoVentaBalance: number
  bancoBalance: number; globalBalance: number
  totalSales: number; profitMarginPct: number
  byMethod: Record<string, MethodData>; monthly: MonthData[]
  availableMonths: string[]
  stockValue: number; stockSaleValue: number; lowStockProducts: LowStock[]
}

// ─── Constants ───────────────────────────────────────────────────────────────
const WITHDRAWAL_SAFETY_PCT = 30

const MONTH_LABELS: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
}

const BANCOS_VE = [
  'Mercantil', 'Banesco', 'BBVA Provincial', 'Venezuela', 'BNC', 'Bicentenario',
  'Agrícola de Venezuela', 'Fondo Común', 'Exterior', 'Banplus', 'Sofitasa',
  'Mi Banco', 'BanCaribe', 'Bancrecer', 'Generar', '100% Banco', 'Otro'
]

const EXPENSE_CATEGORIES = [
  { value: 'COMPRA', label: 'Compra Mercancía', emoji: '🛒' },
  { value: 'RETIRO', label: 'Retiro Ganancia', emoji: '🏦' },
  { value: 'SERVICIO', label: 'Pago de Servicio', emoji: '⚡' },
  { value: 'PRESTAMO', label: 'Fiado / Préstamo', emoji: '🤝' },
  { value: 'OTRO', label: 'Otro', emoji: '📝' },
]

type PeriodPreset = 'all' | 'today' | 'week' | 'month'



export function FinanceView() {
  const { currencySymbol, convertToUsd } = useBcv()
  const [data, setData] = useState<FinanceData | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // ─── Historial filters ────────────────────────────────────────────────────
  type HistoryView = 'month' | 'week' | 'day'
  const [historyView, setHistoryView] = useState<HistoryView>('month')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')

  // Tabs
  type FormTab = 'OUT' | 'IN' | 'TRANSFER'
  const [formTab, setFormTab] = useState<FormTab>('OUT')

  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseConcept, setExpenseConcept] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('COMPRA')
  const [expenseAccount, setExpenseAccount] = useState('EFECTIVO')
  const [transferToAccount, setTransferToAccount] = useState('BANCO')
  const [expenseCustomerId, setExpenseCustomerId] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [submittingExpense, setSubmittingExpense] = useState(false)

  // Banco selector state
  const [selectedBanco, setSelectedBanco] = useState('')
  const [showBancoSelector, setShowBancoSelector] = useState(false)

  // New customer
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [isAddingCustomer, setIsAddingCustomer] = useState(false)

  // Edit / Delete
  const [deletingExpId, setDeletingExpId] = useState<number | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const EXP_PER_PAGE = 10

  const printRef = useRef<HTMLDivElement>(null)

  // ─── Load ─────────────────────────────────────────────────────────────────
  const loadData = useCallback(async (period: string) => {
    logger.info(`Cargando finanzas periodo: ${period}`, 'FINANCE')
    try {
      const [finRes, expRes, custRes] = await Promise.all([
        fetch('/api/finance'),
        fetch(`/api/expenses?period=${period}`),
        fetch('/api/customers'),
      ])
      if (!finRes.ok) throw new Error((await finRes.json()).error || 'Error finanzas')
      setData(await finRes.json())
      setExpenses(expRes.ok ? await expRes.json() : [])
      setCustomers(custRes.ok ? await custRes.json() : [])
      setErrorMsg('')
      logger.info('Datos financieros cargados', 'FINANCE')
    } catch (err: any) {
      logger.error('Error cargando finanzas', 'FINANCE', err)
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { setLoading(true); loadData(selectedPeriod) }, [loadData, selectedPeriod])

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) return
    setIsAddingCustomer(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCustomerName.trim(), phone: newCustomerPhone.trim() })
      })
      if (res.ok) {
        const c = await res.json()
        setCustomers(prev => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)))
        setExpenseCustomerId(String(c.id))
        setNewCustomerName(''); setNewCustomerPhone(''); setShowNewCustomer(false)
      }
    } catch (err) { logger.error('Error creando cliente', 'FINANCE', err) }
    finally { setIsAddingCustomer(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseAmount || !expenseConcept) return
    setSubmittingExpense(true)
    try {
      let body: any = { 
        amount: parseFloat(expenseAmount), 
        concept: expenseConcept,
        createdAt: expenseDate 
      }

      if (formTab === 'TRANSFER') {
        body.category = 'TRANSFERENCIA'
        body.account = expenseAccount
        body.toAccount = transferToAccount
      } else if (formTab === 'IN') {
        body.category = 'INGRESO_EXTRA'
        body.account = expenseAccount
      } else {
        body.category = expenseCategory
        body.account = expenseAccount
        body.customerId = expenseCategory === 'PRESTAMO' && expenseCustomerId ? parseInt(expenseCustomerId) : null
      }

      const res = await fetch('/api/expenses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setExpenseAmount(''); setExpenseConcept(''); setExpenseCustomerId('')
      setExpenseDate(new Date().toISOString().split('T')[0])
      setCurrentPage(1)
      await loadData(selectedPeriod)
      logger.info('Movimiento registrado', 'FINANCE')
    } catch (err: any) {
      logger.error('Error registrando movimiento', 'FINANCE', err)
      alert(err.message)
    } finally { setSubmittingExpense(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este registro? El saldo será restaurado automáticamente.')) return
    setDeletingExpId(id)
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      await loadData(selectedPeriod)
    } catch (err: any) { alert(err.message) }
    finally { setDeletingExpId(null) }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return
    setSubmittingExpense(true)
    try {
      const res = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingExpense)
      })
      if (!res.ok) throw new Error('Error al actualizar')
      setEditingExpense(null)
      await loadData(selectedPeriod)
    } catch (err: any) { alert(err.message) }
    finally { setSubmittingExpense(false) }
  }

  // ─── PDF Export ──────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const printContents = printRef.current?.innerHTML || ''
    const storeName = 'Gestor de Tienda'
    const periodLabel = getPeriodLabel(selectedPeriod)
    const now = new Date().toLocaleString('es-VE')

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <title>Reporte Financiero – ${periodLabel}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; background: #fff; color: #1e293b; padding: 32px; font-size: 12px; }
          .pdf-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
          .pdf-header h1 { font-size: 22px; font-weight: 900; color: #1e293b; }
          .pdf-header p { color: #64748b; font-size: 11px; margin-top: 2px; }
          .pdf-header .meta { text-align: right; }
          .badge { display: inline-block; background: #f1f5f9; color: #475569; border-radius: 6px; padding: 3px 10px; font-size: 10px; font-weight: 700; margin-top: 4px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
          .summary-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
          .summary-box .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 6px; }
          .summary-box .value { font-size: 18px; font-weight: 900; color: #1e293b; }
          .summary-box .sub { font-size: 9px; color: #94a3b8; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          thead th { background: #f8fafc; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 10px; text-align: left; color: #64748b; border-bottom: 1px solid #e2e8f0; }
          tbody tr { border-bottom: 1px solid #f1f5f9; }
          tbody tr:last-child { border: none; }
          tbody td { padding: 8px 10px; font-size: 11px; color: #334155; vertical-align: middle; }
          .amount-out { color: #ef4444; font-weight: 700; }
          .amount-in { color: #10b981; font-weight: 700; }
          .amount-tr { color: #6366f1; font-weight: 700; }
          .category-pill { display: inline-block; border-radius: 4px; padding: 1px 6px; font-size: 9px; font-weight: 700; background: #f1f5f9; color: #475569; }
          .footer { border-top: 1px solid #e2e8f0; margin-top: 28px; padding-top: 14px; text-align: center; color: #94a3b8; font-size: 9px; }
        </style>
      </head>
      <body>
        <div class="pdf-header">
          <div>
            <h1>📊 Reporte Financiero</h1>
            <p>${storeName}</p>
          </div>
          <div class="meta">
            <p style="font-weight:700;font-size:13px">${periodLabel}</p>
            <p>Generado: ${now}</p>
            <span class="badge">${expenses.length} transacciones</span>
          </div>
        </div>
        ${printContents}
        <div class="footer">
          Documento generado automáticamente por el Sistema de Gestión de ${storeName} · ${now}
        </div>
      </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  function getPeriodLabel(p: string): string {
    if (p === 'all') return 'Todo el tiempo'
    if (p === 'today') return 'Hoy'
    if (p === 'week') return 'Esta semana'
    if (p === 'month') return 'Este mes'
    if (p.startsWith('month-')) {
      const [, y, m] = p.split('-')
      return `${MONTH_LABELS[m]} ${y}`
    }
    if (p.startsWith('week-')) {
      const dateStr = p.replace('week-', '')
      const mon = new Date(dateStr)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      const fmt = (d: Date) => `${d.getDate()} ${MONTH_LABELS[String(d.getMonth() + 1).padStart(2, '0')]}`
      return `Sem. ${fmt(mon)} – ${fmt(sun)}`
    }
    return p
  }

  // ─── Derived ──────────────────────────────────────────────────────────────
  const filteredExpenses = expenses
  const totalPages = Math.ceil(filteredExpenses.length / EXP_PER_PAGE)
  const pagedExp = filteredExpenses.slice((currentPage - 1) * EXP_PER_PAGE, currentPage * EXP_PER_PAGE)

  const getCategoryMeta = (cat: string) => {
    if (cat === 'INGRESO_EXTRA') return { label: 'Saldo Extra', emoji: '➕', color: 'text-emerald-600' }
    if (cat === 'TRANSFER_OUT') return { label: 'Transferencia', emoji: '🔄', color: 'text-indigo-600' }
    if (cat === 'TRANSFERENCIA') return { label: 'Transferencia', emoji: '🔄', color: 'text-indigo-600' }
    return EXPENSE_CATEGORIES.find(c => c.value === cat) ?? { emoji: '📝', label: cat, color: 'text-slate-500' }
  }

  const getAccountLabel = (acc: string) => {
    if (acc === 'EFECTIVO') return { emoji: '💵', label: 'Efectivo' }
    if (acc === 'PAGO_MOVIL') return { emoji: '📱', label: selectedBanco || 'Banco (Pago Móvil)' }
    if (acc === 'PUNTO_VENTA') return { emoji: '💳', label: selectedBanco || 'Banco (Tarjeta)' }
    if (acc === 'BANCO') return { emoji: '🏦', label: selectedBanco || 'Cuenta Bancaria' }
    return { emoji: '📂', label: acc }
  }

  // ─── Loading / Error ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center space-y-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
        <p className="text-slate-500 dark:text-slate-400">Cargando finanzas...</p>
      </div>
    </div>
  )

  if (errorMsg || !data) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 p-10 max-w-md text-center space-y-4 shadow-sm">
        <div className="text-5xl">⚠️</div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Error al cargar</h3>
        <p className="text-sm text-red-600">{errorMsg}</p>
        <button onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition text-sm">
          🔄 Reintentar
        </button>
      </div>
    </div>
  )

  const restockCapital = data.stockValue
  const safetyBuffer = restockCapital * (WITHDRAWAL_SAFETY_PCT / 100)
  const minCashToKeep = restockCapital + safetyBuffer
  const safeWithdrawal = Math.max(0, data.globalBalance - minCashToKeep)
  const canWithdraw = safeWithdrawal > 0
  const maxMonthRevenue = Math.max(...data.monthly.map(m => m.revenue), 1)
  const getMonthLabel = (key: string) => {
    const [year, month] = key.split('-')
    return `${MONTH_LABELS[month]} ${year.slice(2)}`
  }

  const bancoLabel = selectedBanco ? `🏦 ${selectedBanco}` : '🏦 Cuenta Bancaria'

  return (
    <div className="space-y-6 animate-fade-in-down pb-16">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">🏦 Panel Financiero</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Balance en tiempo real · Moneda local {currencySymbol}</p>
          </div>
          {/* Banco selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBancoSelector(!showBancoSelector)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 transition border border-slate-200 dark:border-slate-600"
            >
              🏦 {selectedBanco || 'Seleccionar Banco'} ▾
            </button>
          </div>
        </div>

        {showBancoSelector && (
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in-down">
            <p className="text-xs font-bold text-slate-400 uppercase mb-3">Banco de Venezuela asociado a la Cuenta Bancaria:</p>
            <div className="flex flex-wrap gap-2">
              {BANCOS_VE.map(banco => (
                <button key={banco} onClick={() => { setSelectedBanco(banco); setShowBancoSelector(false) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${selectedBanco === banco
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}>
                  {banco}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 3 ACCOUNT CARDS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Efectivo */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-800/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💵</span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Efectivo en Caja</span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${data.cashInHand >= 0 ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                {data.cashInHand >= 0 ? '▲' : '▼'}
              </span>
            </div>
            <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300 leading-none">
              {data.cashInHand.toFixed(2)}
              <span className="text-sm font-medium text-emerald-600/60 dark:text-emerald-400/60 ml-1">{currencySymbol}</span>
            </p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60 font-medium">≈ {convertToUsd(data.cashInHand)} USD</p>
            <p className="text-[10px] text-slate-400">Ventas efectivo + abonos − gastos caja</p>
          </div>

          {/* Cuenta Bancaria (Pago Móvil + Punto Venta) */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-2xl p-5 border border-blue-200 dark:border-blue-800/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏦</span>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                  {selectedBanco || 'Cuenta Bancaria'}
                </span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${data.bancoBalance >= 0 ? 'bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                {data.bancoBalance >= 0 ? '▲' : '▼'}
              </span>
            </div>
            <p className="text-3xl font-black text-blue-700 dark:text-blue-300 leading-none">
              {data.bancoBalance.toFixed(2)}
              <span className="text-sm font-medium text-blue-600/60 dark:text-blue-400/60 ml-1">{currencySymbol}</span>
            </p>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/60 font-medium">≈ {convertToUsd(data.bancoBalance)} USD</p>
            <div className="text-[10px] text-slate-400 space-y-0.5">
              <div>📱 Pago Móvil: {data.pagoMovilBalance.toFixed(2)} {currencySymbol}</div>
              <div>💳 Punto de Venta: {data.puntoVentaBalance.toFixed(2)} {currencySymbol}</div>
            </div>
          </div>

          {/* Total Global */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-indigo-500 dark:border-indigo-500/30 space-y-2 shadow-xl shadow-indigo-100 dark:shadow-none relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/10 rounded-full translate-x-8 -translate-y-8 blur-xl transition-transform group-hover:scale-110" />
            <div className="flex items-center gap-2 relative z-10">
              <span className="text-2xl">💼</span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Total Global</span>
            </div>
            <div className="relative z-10">
              <p className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                {data.globalBalance.toFixed(2)}
                <span className="text-sm font-medium text-slate-400 ml-1">{currencySymbol}</span>
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-1">≈ {convertToUsd(data.globalBalance)} USD</p>
              <p className="text-[10px] text-slate-400 mt-2">Suma de Efectivo + Bancos</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── WITHDRAWAL ADVISOR ─────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 shadow-sm ${canWithdraw
        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30'
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{canWithdraw ? '✅' : '⚠️'}</span>
            <div>
              <h3 className={`font-extrabold text-base ${canWithdraw ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {canWithdraw ? 'Retiro Seguro Disponible' : 'Aún no es seguro retirar'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {canWithdraw
                  ? `Capital disponible para retirar sin comprometer el stock (${WITHDRAWAL_SAFETY_PCT}% buffer).`
                  : `Necesitas ${minCashToKeep.toFixed(2)} ${currencySymbol} para cubrir reposición + ${WITHDRAWAL_SAFETY_PCT}% colchón.`}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Puedes retirar</p>
            <p className={`text-2xl font-black ${canWithdraw ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-300'}`}>
              {canWithdraw ? `${safeWithdrawal.toFixed(2)} ${currencySymbol}` : '—'}
            </p>
            {canWithdraw && <p className="text-xs text-slate-400">≈ {convertToUsd(safeWithdrawal)} USD</p>}
          </div>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Ingresos Totales', val: data.totalRevenue, usd: convertToUsd(data.totalRevenue),
            sub: `Abonos: ${data.totalDebtPaid.toFixed(2)} ${currencySymbol}`, icon: '💰', grad: 'from-indigo-500 to-purple-600', textColor: 'text-indigo-600 dark:text-indigo-400'
          },
          {
            label: 'Gastos / Salidas', val: data.totalExpenses, usd: convertToUsd(data.totalExpenses),
            sub: `${expenses.filter(e => e.category !== 'INGRESO_EXTRA' && e.category !== 'TRANSFER_OUT').length} registros`, icon: '💸', grad: 'from-orange-500 to-red-600', textColor: 'text-red-600 dark:text-red-400'
          },
          {
            label: 'Ganancia Neta', val: data.totalProfit, usd: convertToUsd(data.totalProfit),
            sub: `${data.profitMarginPct.toFixed(1)}% margen`, icon: '📈', grad: 'from-emerald-500 to-teal-600', textColor: 'text-emerald-600 dark:text-emerald-400'
          },
          {
            label: 'Valor del Stock', val: data.stockValue, usd: convertToUsd(data.stockValue),
            sub: `P. Venta: ${data.stockSaleValue.toFixed(2)} ${currencySymbol}`, icon: '🏪', grad: 'from-blue-500 to-cyan-600', textColor: 'text-blue-600 dark:text-blue-400'
          },
        ].map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm overflow-hidden relative">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${kpi.grad} opacity-5 rounded-full translate-x-8 -translate-y-8`} />
            <div className="text-2xl mb-2">{kpi.icon}</div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{kpi.label}</div>
            <div className={`text-xl font-extrabold mt-1 ${kpi.textColor}`}>
              {kpi.val.toFixed(2)} <span className="text-xs text-slate-400">{currencySymbol}</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">≈ {kpi.usd} USD</div>
            <div className="text-[10px] text-slate-400 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ── FULL FINANCE PANEL: FORM + HISTORY ─────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* ── FORM ─────────────────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Tab selector */}
          <div className="bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl flex gap-1">
            {([
              ['OUT', '💸', 'Salida'],
              ['IN', '➕', 'Ingreso Extra'],
              ['TRANSFER', '🔄', 'Transferir'],
            ] as const).map(([tab, icon, label]) => (
              <button key={tab} onClick={() => setFormTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all ${formTab === tab
                  ? tab === 'OUT' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm'
                    : tab === 'IN' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Form card */}
          <div className={`bg-white dark:bg-slate-800 rounded-2xl border p-6 shadow-sm transition-colors ${formTab === 'IN' ? 'border-emerald-200 dark:border-emerald-800/50'
            : formTab === 'TRANSFER' ? 'border-indigo-200 dark:border-indigo-800/50'
              : 'border-slate-200 dark:border-slate-700/50'}`}>
            <h3 className={`font-bold mb-4 text-base flex items-center gap-2 ${formTab === 'IN' ? 'text-emerald-700 dark:text-emerald-400'
              : formTab === 'TRANSFER' ? 'text-indigo-700 dark:text-indigo-400'
                : 'text-slate-700 dark:text-slate-200'}`}>
              {formTab === 'IN' ? '🟢 Registrar Ingreso Extra'
                : formTab === 'TRANSFER' ? '🔄 Transferencia entre Cuentas'
                  : '🔴 Registrar Salida de Dinero'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Concepto */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                  {formTab === 'TRANSFER' ? 'Descripción de la transferencia' : 'Concepto / Destino'}
                </label>
                <input required type="text" value={expenseConcept}
                  onChange={e => setExpenseConcept(e.target.value)}
                  placeholder={formTab === 'IN' ? 'Ej: Saldo inicial en efectivo'
                    : formTab === 'TRANSFER' ? 'Ej: Pasé efectivo al banco'
                      : 'Ej: Compra de mercancía'}
                  className={`w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 outline-none transition text-sm ${formTab === 'IN' ? 'border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-500'
                    : formTab === 'TRANSFER' ? 'border-indigo-300 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-500'
                      : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-red-500'}`} />
              </div>
              
              {/* Fecha de movimiento */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Fecha del Movimiento</label>
                <input type="date" value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 outline-none transition text-sm ${formTab === 'IN' ? 'border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-500'
                    : formTab === 'TRANSFER' ? 'border-indigo-300 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-500'
                      : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-red-500'}`} />
                <p className="text-[10px] text-slate-400 mt-1">* Útil para registrar movimientos de días o meses pasados.</p>
              </div>

              {/* Amount + Category (OUT only) */}
              <div className={`grid ${formTab === 'OUT' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Monto ({currencySymbol})</label>
                  <input required type="number" step="0.01" min="0.01" value={expenseAmount}
                    onChange={e => setExpenseAmount(e.target.value)}
                    placeholder="0.00"
                    className={`w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 outline-none transition text-sm ${formTab === 'IN' ? 'border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-500'
                      : formTab === 'TRANSFER' ? 'border-indigo-300 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-500'
                        : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-red-500'}`} />
                </div>
                {formTab === 'OUT' && (
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Categoría</label>
                    <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 outline-none text-sm focus:ring-2 focus:ring-red-500">
                      {EXPENSE_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Customer selector (PRESTAMO) */}
              {formTab === 'OUT' && expenseCategory === 'PRESTAMO' && (
                <div className="bg-orange-50/50 dark:bg-orange-950/10 p-4 rounded-xl border border-orange-200 dark:border-orange-800/30 space-y-2">
                  <label className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase block">👤 Cliente Deudor</label>
                  <select required value={expenseCustomerId} onChange={e => setExpenseCustomerId(e.target.value)}
                    className="w-full px-4 py-2 border border-orange-300 dark:border-orange-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">Seleccionar Cliente…</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.totalOwed > 0 ? `(debe ${c.totalOwed.toFixed(2)} ${currencySymbol})` : ''}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setShowNewCustomer(!showNewCustomer)}
                    className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-bold">
                    {showNewCustomer ? '↑ Cancelar' : '+ Nuevo Cliente'}
                  </button>
                  {showNewCustomer && (
                    <div className="space-y-2 pt-2 border-t border-orange-100 dark:border-orange-900/40">
                      <input type="text" placeholder="Nombre completo *" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-400" />
                      <input type="text" placeholder="Teléfono" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-400" />
                      <button type="button" onClick={handleAddCustomer} disabled={isAddingCustomer}
                        className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition">
                        {isAddingCustomer ? 'Creando...' : 'Agregar Cliente'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Account Selector */}
              {formTab !== 'TRANSFER' ? (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Cuenta</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'EFECTIVO', emoji: '💵', label: 'Efectivo' },
                      { key: 'PAGO_MOVIL', emoji: '📱', label: 'Pago Móvil' },
                      { key: 'PUNTO_VENTA', emoji: '💳', label: 'P. Venta' },
                    ].map(acc => (
                      <button key={acc.key} type="button" onClick={() => setExpenseAccount(acc.key)}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 text-xs font-bold transition-all ${expenseAccount === acc.key
                          ? formTab === 'IN'
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                            : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                          : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 text-slate-500 hover:border-slate-300'}`}>
                        <span className="text-base">{acc.emoji}</span>
                        <span>{acc.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Transfer FROM → TO */
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Desde</label>
                    <div className="space-y-2">
                      {[
                        { key: 'EFECTIVO', emoji: '💵', label: 'Efectivo' },
                        { key: 'BANCO', emoji: '🏦', label: selectedBanco || 'Banco' },
                      ].map(acc => (
                        <button key={acc.key} type="button" onClick={() => setExpenseAccount(acc.key)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${expenseAccount === acc.key
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                            : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 text-slate-500 hover:border-slate-300'}`}>
                          <span>{acc.emoji}</span> {acc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Hacia</label>
                    <div className="space-y-2">
                      {[
                        { key: 'BANCO', emoji: '🏦', label: selectedBanco || 'Banco' },
                        { key: 'EFECTIVO', emoji: '💵', label: 'Efectivo' },
                      ].map(acc => (
                        <button key={acc.key} type="button" onClick={() => setTransferToAccount(acc.key)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${transferToAccount === acc.key
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 text-slate-500 hover:border-slate-300'}`}>
                          <span>{acc.emoji}</span> {acc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="col-span-2 text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                    * Una transferencia no afecta el balance total, solo mueve dinero entre cuentas.
                  </p>
                </div>
              )}

              <button disabled={submittingExpense} type="submit"
                className={`w-full py-3 text-white font-bold rounded-xl transition shadow-lg disabled:opacity-50 text-sm ${formTab === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : formTab === 'TRANSFER' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'}`}>
                {submittingExpense ? 'Procesando...'
                  : formTab === 'IN' ? '📈 Registrar Ingreso'
                    : formTab === 'TRANSFER' ? '🔄 Confirmar Transferencia'
                      : '📉 Registrar Salida'}
              </button>
            </form>
          </div>
        </div>

        {/* ── HISTORY ──────────────────────────────────────────────────── */}
        <div className="xl:col-span-3 flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">

          {/* History header + filters */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-700/40 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg">📋 Historial de Movimientos</h3>
              <button onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-200 dark:shadow-none">
                📄 Exportar PDF
              </button>
            </div>

            {/* Period filter tabs */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Quick presets */}
              {([['all', 'Todo'], ['today', 'Hoy'], ['week', 'Esta semana'], ['month', 'Este mes']] as const).map(([val, label]) => (
                <button key={val} onClick={() => { setSelectedPeriod(val); setCurrentPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedPeriod === val
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-400'}`}>
                  {label}
                </button>
              ))}

              {/* View mode: month/week/day */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg p-0.5 ml-auto">
                {(['month', 'week', 'day'] as const).map(v => (
                  <button key={v} onClick={() => setHistoryView(v)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${historyView === v ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                    {v === 'month' ? 'Mes' : v === 'week' ? 'Sem.' : 'Día'}
                  </button>
                ))}
              </div>
            </div>

            {/* Specific period selectors */}
            {historyView === 'month' && data?.availableMonths && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {data.availableMonths.map(mKey => {
                  const [y, m] = mKey.split('-')
                  const label = `${MONTH_LABELS[m]} ${y}`
                  const value = `month-${y}-${m}`
                  return (
                    <button key={mKey} onClick={() => { setSelectedPeriod(value); setCurrentPage(1) }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${selectedPeriod === value
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
                        : 'bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}>
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
            {historyView === 'week' && (
              <div className="flex items-center gap-2 pt-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Inicio de semana (Lunes):</label>
                <input type="date" onChange={e => { if (e.target.value) { setSelectedPeriod(`week-${e.target.value}`); setCurrentPage(1) } }}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
            {historyView === 'day' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Fecha:</label>
                <input type="date" onChange={e => { if (e.target.value) { setSelectedPeriod(`day-${e.target.value}`); setCurrentPage(1) } }}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
          </div>

          {/* Print-friendly content area */}
          <div ref={printRef} className="flex-1 overflow-hidden">
            {/* PDF summary (hidden in normal view) */}
            <div className="hidden print-summary">
              <div className="summary-grid">
                <div className="summary-box">
                  <div className="label">Efectivo</div>
                  <div className="value">{data.cashInHand.toFixed(2)} {currencySymbol}</div>
                  <div className="sub">≈ {convertToUsd(data.cashInHand)} USD</div>
                </div>
                <div className="summary-box">
                  <div className="label">Cuenta Bancaria</div>
                  <div className="value">{data.bancoBalance.toFixed(2)} {currencySymbol}</div>
                  <div className="sub">≈ {convertToUsd(data.bancoBalance)} USD</div>
                </div>
                <div className="summary-box">
                  <div className="label">Total Global</div>
                  <div className="value">{data.globalBalance.toFixed(2)} {currencySymbol}</div>
                  <div className="sub">≈ {convertToUsd(data.globalBalance)} USD</div>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th>Categoría</th>
                    <th>Cuenta</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map(exp => {
                    const cat = getCategoryMeta(exp.category)
                    const isIn = exp.category === 'INGRESO_EXTRA'
                    const isTr = exp.category === 'TRANSFER_OUT' || exp.category === 'TRANSFERENCIA'
                    return (
                      <tr key={exp.id}>
                        <td>{new Date(exp.createdAt).toLocaleDateString('es-VE')}</td>
                        <td>{exp.concept}</td>
                        <td><span className="category-pill">{cat.emoji} {cat.label}</span></td>
                        <td>{getAccountLabel(exp.account).emoji} {getAccountLabel(exp.account).label}</td>
                        <td style={{ textAlign: 'right' }} className={isIn ? 'amount-in' : isTr ? 'amount-tr' : 'amount-out'}>
                          {isIn ? '+' : isTr ? '⇄' : '-'}{exp.amount.toFixed(2)} {currencySymbol}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Normal list view */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400 font-medium">
                  {filteredExpenses.length} registros · periodo: <span className="font-bold text-indigo-600 dark:text-indigo-400">{getPeriodLabel(selectedPeriod)}</span>
                </p>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="text-slate-400 text-sm">Sin movimientos en este período</p>
                </div>
              ) : (
                pagedExp.map(exp => {
                  const isIn = exp.category === 'INGRESO_EXTRA'
                  const isTr = exp.category === 'TRANSFER_OUT' || exp.category === 'TRANSFERENCIA'
                  const cat = getCategoryMeta(exp.category)
                  const acc = getAccountLabel(exp.account)
                  return (
                    <div key={exp.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-sm ${isIn
                        ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30'
                        : isTr ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30'
                          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-700/30'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl shrink-0">{cat.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{exp.concept}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-slate-400">
                              {new Date(exp.createdAt).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`text-[10px] font-bold ${(cat as any).color || 'text-slate-500'}`}>{cat.label}</span>
                            <span className="text-[10px] text-slate-400">{acc.emoji} {acc.label}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className={`text-sm font-black whitespace-nowrap ${isIn ? 'text-emerald-600 dark:text-emerald-400' : isTr ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isIn ? '+' : isTr ? '⇄' : '-'}{exp.amount.toFixed(2)} {currencySymbol}
                        </span>
                        <div className="flex gap-1">
                          <button onClick={() => setEditingExpense(exp)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition"
                            title="Editar">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button disabled={deletingExpId === exp.id} onClick={() => handleDelete(exp.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            title="Eliminar">
                            {deletingExpId === exp.id
                              ? <div className="h-3.5 w-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                              : <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a2 2 0 00-2 2v1h8V5a2 2 0 00-2-2m-4 0h4" /></svg>
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/40">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-600 transition">
                ← Anterior
              </button>
              <span className="text-xs font-bold text-slate-400">
                Página {currentPage} de {totalPages} · {filteredExpenses.length} registros
              </span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-600 transition">
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MONTHLY CHART ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-1 text-base">📅 Evolución Histórica</h3>
        <p className="text-xs text-slate-400 mb-5">Ingresos (azul) vs Gastos (rojo) — Basado en tu historial real</p>
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex items-end justify-between gap-3 h-44 min-w-[600px]">
          {data.monthly.map((m) => {
            const totalPct = maxMonthRevenue > 0 ? (m.revenue / maxMonthRevenue) * 100 : 0
            const expPct = maxMonthRevenue > 0 ? (m.expenses / maxMonthRevenue) * 100 : 0
            const profitPct = m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full relative flex items-end gap-1" style={{ height: '140px' }}>
                  <div className="flex-1 relative rounded-t-lg overflow-hidden bg-indigo-400 dark:bg-indigo-500"
                    style={{ height: `${Math.max(totalPct, m.revenue > 0 ? 5 : 0)}%` }}>
                    <div className="absolute bottom-0 left-0 right-0 bg-emerald-400/40" style={{ height: `${profitPct}%` }} />
                  </div>
                  <div className="flex-1 relative rounded-t-md overflow-hidden bg-red-400 dark:bg-red-500/60"
                    style={{ height: `${Math.max(expPct, m.expenses > 0 ? 3 : 0)}%` }} />
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] rounded-lg px-2.5 py-1.5 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg pointer-events-none">
                    <div>Ingresos: {m.revenue.toFixed(0)} {currencySymbol}</div>
                    <div>Gastos: {m.expenses.toFixed(0)} {currencySymbol}</div>
                    <div>Ganancia: {m.profit.toFixed(0)} {currencySymbol}</div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 capitalize">{getMonthLabel(m.month)}</span>
              </div>
            )
          })}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 justify-end text-xs">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-400 inline-block" /> Ingresos</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Gastos</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400/60 inline-block" /> Ganancia</div>
        </div>
      </div>

      {/* ── STOCK ALERT ────────────────────────────────────────────────── */}
      {data.lowStockProducts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900/20 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <h4 className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-widest">
              Stock Bajo ({data.lowStockProducts.length} productos)
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {data.lowStockProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 rounded-xl px-3 py-2 border border-red-100 dark:border-red-800/20">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{p.name}</span>
                <span className="text-[10px] font-black text-red-600 bg-white dark:bg-red-900/50 px-2 py-0.5 rounded-full ml-1">{p.stock} uds</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ─────────────────────────────────────────────────── */}
      {editingExpense && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8 relative space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">✏️ Editar Registro</h3>
              <button onClick={() => setEditingExpense(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Concepto</label>
                <input required type="text" value={editingExpense.concept}
                  onChange={e => setEditingExpense({ ...editingExpense, concept: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Monto ({currencySymbol})</label>
                  <input required type="number" step="0.01" value={editingExpense.amount}
                    onChange={e => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Categoría</label>
                  <select value={editingExpense.category}
                    onChange={e => setEditingExpense({ ...editingExpense, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                    <option value="INGRESO_EXTRA">➕ Saldo Extra</option>
                    {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Cuenta</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'EFECTIVO', emoji: '💵', label: 'Efectivo' },
                    { key: 'PAGO_MOVIL', emoji: '📱', label: 'Pago Móvil' },
                    { key: 'PUNTO_VENTA', emoji: '💳', label: 'P. Venta' },
                  ].map(acc => (
                    <button key={acc.key} type="button" onClick={() => setEditingExpense({ ...editingExpense, account: acc.key })}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 text-xs font-bold transition-all ${editingExpense.account === acc.key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 text-slate-500 hover:border-slate-300'}`}>
                      <span className="text-base">{acc.emoji}</span><span>{acc.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingExpense(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition text-sm">
                  Cancelar
                </button>
                <button disabled={submittingExpense} type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-500/20 disabled:opacity-50 text-sm">
                  {submittingExpense ? 'Procesando...' : '💾 Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
