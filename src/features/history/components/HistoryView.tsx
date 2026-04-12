"use client"

import { useState, useEffect, useCallback } from 'react'
import { useBcv } from '@/components/BcvProvider'
import { logger } from '@/lib/logger'

type DayData = { date: string; revenue: number; profit: number }
// ... (rest of types)
type TopProduct = { productId: number; name: string; totalQty: number; totalRevenue: number }
type Summary = {
  totalRevenue: number; totalProfit: number; totalSales: number
  contadoSales: number; fiadoSales: number; fiadoRevenue: number; period: string
}
type SaleItem = { 
  id?: number; 
  productId: number; 
  quantity: number; 
  priceAtSale: number; 
  product: { name: string } 
}
type Sale = {
  id: number; createdAt: string; totalAmount: number; totalProfit: number
  paymentType: string; paymentMethod?: string; customer?: { name: string }; 
  customerId?: number | null; 
  items: SaleItem[]
}

const PERIODS = [
// ... (rest of constants)
  { label: '24h', value: '24h' },
  { label: '3d',  value: '3d'  },
  { label: '7d',  value: '7d'  },
  { label: '1m',  value: '30d' },
  { label: '3m',  value: '90d' },
  { label: 'Todo', value: '0'  },
]

const MONTH_LABELS: Record<string, string> = {
  '01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio',
  '07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre'
}

const METHOD_LABELS: Record<string, { label: string; color: string }> = {
  EFECTIVO:    { label: '💵 Efectivo',       color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  PAGO_MOVIL:  { label: '📱 Pago Móvil',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  PUNTO_VENTA: { label: '💳 Punto de Venta', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  FIADO:       { label: '💸 Fiado',          color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
}

export function HistoryView() {
  const { currencySymbol, convertToUsd } = useBcv()
  const [period, setPeriod] = useState('0')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [dailyChart, setDailyChart] = useState<DayData[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSale, setExpandedSale] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editSale, setEditSale] = useState<Sale | null>(null)
  
  // Filtering and Pagination
  const [methodFilter, setMethodFilter] = useState('all')
  const [productSearch, setProductSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const loadStats = useCallback(async () => {
    setLoading(true)
    logger.info(`Cargando estadísticas para periodo: ${period}...`, 'HISTORY')
    try {
      const res = await fetch(`/api/stats?period=${period}`)
      if (!res.ok) throw new Error('Error al consultar servidor')
      const data = await res.json()
      setSummary(data.summary)
      setTopProducts(data.topProducts)
      setDailyChart(data.dailyChart)
      setRecentSales(data.recentSales)
      logger.info('Estadísticas cargadas exitosamente', 'HISTORY')
    } catch (err) {
      logger.error('Error cargando historial de ventas', 'HISTORY', err)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { 
    loadStats()
    setCurrentPage(1) // Reset page when period changes
  }, [loadStats])

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta venta del historial? Esta acción no se puede deshacer.')) return
    setDeletingId(id)
    logger.info(`Eliminando venta #${id}...`, 'HISTORY')
    try {
      const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo borrar del servidor')
      setRecentSales(prev => prev.filter(s => s.id !== id))
      logger.info(`Venta #${id} eliminada correctamente`, 'HISTORY')
    } catch (error) {
      logger.error(`Error eliminando venta #${id}`, 'HISTORY', error)
      alert('No se pudo eliminar la venta.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSaveEdit = async () => {
    if (!editSale) return
    logger.info(`Actualizando venta #${editSale.id}...`, 'HISTORY')
    try {
      const res = await fetch(`/api/sales/${editSale.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentMethod: editSale.paymentMethod, 
          paymentType: editSale.paymentType,
          items: editSale.items // New: send items array
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar venta')
      }
      setEditSale(null)
      loadStats()
      logger.info('Venta actualizada correctamente', 'HISTORY')
    } catch (error: any) {
      logger.error(`Falló actualización de venta #${editSale.id}`, 'HISTORY', error)
      alert(error.message || 'Error al actualizar la venta.')
    }
  }
// ... rest of the file

  const maxRevenue = Math.max(...dailyChart.map(d => d.revenue), 1)

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-VE', { weekday: 'short', day: '2-digit', month: 'short' })
  }

  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const getMonthLabel = (key: string) => {
    const [year, month] = key.split('-')
    return `${MONTH_LABELS[month] || month} ${year}`
  }

  // Filter and Paginate
  const filteredSales = recentSales.filter(sale => {
    // 1. Method Filter
    const sMethod = sale.paymentMethod || (sale.paymentType === 'FIADO' ? 'FIADO' : 'EFECTIVO')
    const matchesMethod = methodFilter === 'all' || sMethod === methodFilter

    // 2. Product Filter
    const matchesProduct = productSearch === '' || sale.items.some(item => 
      item.product.name.toLowerCase().includes(productSearch.toLowerCase())
    )

    return matchesMethod && matchesProduct
  })

  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE)
  const paginatedSales = filteredSales.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  // Group current page by month
  const salesByMonth: Record<string, Sale[]> = {}
  for (const sale of paginatedSales) {
    const d = new Date(sale.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!salesByMonth[key]) salesByMonth[key] = []
    salesByMonth[key].push(sale)
  }
  const sortedMonths = Object.keys(salesByMonth).sort((a, b) => b.localeCompare(a))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <p className="text-slate-500 dark:text-slate-400">Calculando estadísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-down pb-10">

      {/* Edit Modal (Expanded) */}
      {editSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-6 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xl">✏️ Editar Venta #{editSale.id}</h3>
              <button 
                onClick={() => setEditSale(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Método de pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(METHOD_LABELS).map(([key, meta]) => (
                    <button key={key} type="button"
                      onClick={() => setEditSale({ ...editSale, paymentMethod: key, paymentType: key === 'FIADO' ? 'FIADO' : 'CONTADO' })}
                      className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${editSale.paymentMethod === key || (editSale.paymentType === key && key === 'FIADO')
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'}`}>
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Productos en esta venta</label>
                <div className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  {editSale.items.length === 0 ? (
                    <p className="text-xs text-center text-slate-400 italic py-4">No hay productos en la venta</p>
                  ) : (
                    editSale.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end pb-3 border-b border-slate-200 dark:border-slate-800 last:border-0 last:pb-0">
                        <div className="sm:col-span-2">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate mb-1">{item.product.name}</p>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-400 font-bold uppercase">Cant.</label>
                              <input 
                                type="number" 
                                min="1" 
                                className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm"
                                value={item.quantity}
                                onChange={e => {
                                  const newItems = [...editSale.items];
                                  newItems[idx].quantity = parseInt(e.target.value) || 0;
                                  setEditSale({ ...editSale, items: newItems });
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-400 font-bold uppercase">Precio</label>
                              <input 
                                type="number" 
                                step="0.01"
                                className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm"
                                value={item.priceAtSale}
                                onChange={e => {
                                  const newItems = [...editSale.items];
                                  newItems[idx].priceAtSale = parseFloat(e.target.value) || 0;
                                  setEditSale({ ...editSale, items: newItems });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Subtotal</p>
                          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                            {(item.quantity * item.priceAtSale).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <button 
                            onClick={() => {
                              const newItems = editSale.items.filter((_, i) => i !== idx);
                              setEditSale({ ...editSale, items: newItems });
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            title="Quitar producto"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a2 2 0 00-2 2v1h8V5a2 2 0 00-2-2m-4 0h4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-sm font-bold text-slate-500">Nuevo Total Calculado:</span>
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                  {editSale.items.reduce((s, i) => s + (i.quantity * i.priceAtSale), 0).toFixed(2)} {currencySymbol}
                </span>
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => setEditSale(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-500 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                  Cancelar
                </button>
                <button onClick={handleSaveEdit}
                  disabled={editSale.items.length === 0}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-500/20 transition">
                  Confirmar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">📊 Historial de Ventas</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {summary ? `${summary.totalSales} ventas · ${summary.totalRevenue.toFixed(2)} ${currencySymbol} total` : 'Cargando...'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1 self-start sm:self-auto">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p.value ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Ingresos Totales', value: `${summary.totalRevenue.toFixed(2)} ${currencySymbol}`, sub: `~ ${convertToUsd(summary.totalRevenue)} USD`, color: 'from-indigo-500 to-purple-600', icon: '💰' },
            { label: 'Ganancia Neta',    value: `${summary.totalProfit.toFixed(2)} ${currencySymbol}`, sub: summary.totalRevenue > 0 ? `${((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1)}% margen` : '0%', color: 'from-emerald-500 to-teal-600', icon: '📈' },
            { label: 'Ventas',           value: String(summary.totalSales), sub: `${summary.contadoSales} contado · ${summary.fiadoSales} fiado`, color: 'from-blue-500 to-cyan-600', icon: '🧾' },
            { label: 'Total en Fiados',  value: `${summary.fiadoRevenue.toFixed(2)} ${currencySymbol}`, sub: `${summary.fiadoSales} venta${summary.fiadoSales !== 1 ? 's' : ''} pendiente${summary.fiadoSales !== 1 ? 's' : ''}`, color: 'from-orange-500 to-red-500', icon: '💸' }
          ].map((kpi, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm overflow-hidden relative">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${kpi.color} opacity-5 rounded-full translate-x-6 -translate-y-6`} />
              <div className="text-2xl mb-2">{kpi.icon}</div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{kpi.label}</div>
              <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">{kpi.value}</div>
              <div className="text-xs text-slate-400 mt-1">{kpi.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search & Method Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 flex flex-col gap-4">
        {/* Product Search */}
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-3 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Filtrar historial por nombre de producto..." 
            value={productSearch}
            onChange={e => { setProductSearch(e.target.value); setCurrentPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm"
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => { setMethodFilter('all'); setCurrentPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${methodFilter === 'all' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
              Todos los métodos
            </button>
            {Object.entries(METHOD_LABELS).map(([key, meta]) => (
              <button key={key} onClick={() => { setMethodFilter(key); setCurrentPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${methodFilter === key ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                {meta.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Mostrando {filteredSales.length} {filteredSales.length === 1 ? 'venta' : 'ventas'}
          </div>
        </div>
      </div>

      {/* Daily Chart + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-5 text-base">Ingresos recientes</h3>
          <div className="flex items-end justify-between gap-2 h-40">
            {dailyChart.map((day) => {
              const pct = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0
              const profitPct = day.revenue > 0 ? (day.profit / day.revenue) * 100 : 0
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full flex flex-col items-center">
                    {day.revenue > 0 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-800 text-xs rounded-lg px-2 py-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                        {day.revenue.toFixed(0)} {currencySymbol}
                      </div>
                    )}
                    <div className="w-full rounded-t-lg transition-all duration-500 relative overflow-hidden" style={{ height: `${Math.max(pct, 4)}%`, minHeight: '4px', maxHeight: '128px' }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-indigo-600 to-indigo-400 dark:from-indigo-500 dark:to-indigo-400" />
                      {profitPct > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 dark:bg-emerald-400 opacity-60" style={{ height: `${profitPct}%` }} />
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 capitalize truncate w-full text-center">
                    {formatDate(day.date).split(',')[0]}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" /> Ingresos</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 opacity-70 inline-block" /> Ganancia</span>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-5 text-base">🏆 Más Vendidos</h3>
          {topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 space-y-2 text-center">
              <span className="text-3xl">📦</span>
              <p className="text-sm">Sin ventas en el período seleccionado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => {
                const maxQty = topProducts[0].totalQty || 1
                const pct = (p.totalQty / maxQty) * 100
                return (
                  <div key={p.productId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-600'} dark:bg-slate-700 dark:text-slate-300`}>{i + 1}</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{p.name}</span>
                      </div>
                      <span className="text-slate-400 text-xs font-medium">{p.totalQty} uds.</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sales History — grouped by month */}
      {recentSales.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm p-16 flex flex-col items-center text-center space-y-3 text-slate-400">
          <span className="text-5xl">🧾</span>
          <p className="font-bold text-lg">No hay ventas registradas</p>
          <p className="text-sm">Cambia el filtro de período o realiza ventas desde el Cajero</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMonths.map(monthKey => {
            const monthSales = salesByMonth[monthKey]
            const monthTotal = monthSales.reduce((s, r) => s + r.totalAmount, 0)
            const monthProfit = monthSales.reduce((s, r) => s + r.totalProfit, 0)
            return (
              <div key={monthKey} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
                {/* Month header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50 dark:bg-slate-900/30">
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">{getMonthLabel(monthKey)}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{monthSales.length} venta{monthSales.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-slate-800 dark:text-slate-100">{monthTotal.toFixed(2)} <span className="text-xs text-slate-400">{currencySymbol}</span></p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">+{monthProfit.toFixed(2)} {currencySymbol} ganancia</p>
                  </div>
                </div>

                {/* Sales rows */}
                <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
                  {monthSales.map(sale => {
                    const methodKey = sale.paymentMethod || (sale.paymentType === 'FIADO' ? 'FIADO' : 'EFECTIVO')
                    const methodMeta = METHOD_LABELS[methodKey] || METHOD_LABELS.EFECTIVO
                    return (
                      <div key={sale.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedSale(expandedSale === sale.id ? null : sale.id); } }}
                          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${sale.paymentType === 'FIADO' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                              {sale.paymentType === 'FIADO' ? '💸' : '💵'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Venta #{sale.id}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${methodMeta.color}`}>{methodMeta.label}</span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                <span>{formatDateTime(sale.createdAt)}</span>
                                {sale.customer && <span>· 👤 {sale.customer.name}</span>}
                                <span>· {sale.items.length} producto{sale.items.length !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <div className="text-right">
                              <div className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{sale.totalAmount.toFixed(2)} <span className="text-xs font-normal text-slate-400">{currencySymbol}</span></div>
                              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">+{sale.totalProfit.toFixed(2)}</div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={e => { e.stopPropagation(); setEditSale(sale) }}
                                className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                                title="Editar método de pago"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(sale.id) }}
                                disabled={deletingId === sale.id}
                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 transition-colors disabled:opacity-50"
                                title="Eliminar venta"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {expandedSale === sale.id && (
                          <div className="bg-slate-50 dark:bg-slate-900/30 px-6 py-4 border-t border-slate-100 dark:border-slate-700/30">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-slate-400 text-xs uppercase text-left">
                                  <th className="pb-2">Producto</th>
                                  <th className="pb-2 text-center">Cant.</th>
                                  <th className="pb-2 text-right">Precio</th>
                                  <th className="pb-2 text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/30">
                                {sale.items.map((item, idx) => (
                                  <tr key={idx} className="text-slate-700 dark:text-slate-300">
                                    <td className="py-1.5 font-medium">{item.product.name}</td>
                                    <td className="py-1.5 text-center text-slate-400">{item.quantity}</td>
                                    <td className="py-1.5 text-right">{item.priceAtSale.toFixed(2)} {currencySymbol}</td>
                                    <td className="py-1.5 text-right font-bold">{(item.priceAtSale * item.quantity).toFixed(2)} {currencySymbol}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-slate-200 dark:border-slate-700">
                                  <td colSpan={3} className="pt-2 text-xs font-bold text-slate-500 uppercase">Total</td>
                                  <td className="pt-2 text-right font-extrabold text-slate-800 dark:text-slate-100">{sale.totalAmount.toFixed(2)} {currencySymbol}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                Página {currentPage} de {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
