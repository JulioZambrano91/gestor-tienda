"use client"

import { useState, useEffect, useCallback } from 'react'
import { useBcv } from '@/components/BcvProvider'

type DayData = { date: string; revenue: number; profit: number }
type TopProduct = { productId: number; name: string; totalQty: number; totalRevenue: number }
type Summary = {
  totalRevenue: number; totalProfit: number; totalSales: number
  contadoSales: number; fiadoSales: number; fiadoRevenue: number; period: number
}
type SaleItem = { quantity: number; priceAtSale: number; product: { name: string } }
type Sale = {
  id: number; createdAt: string; totalAmount: number; totalProfit: number
  paymentType: string; customer?: { name: string }; items: SaleItem[]
}

export function HistoryView() {
  const { currencySymbol, convertToUsd } = useBcv()
  const [period, setPeriod] = useState('30')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [dailyChart, setDailyChart] = useState<DayData[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSale, setExpandedSale] = useState<number | null>(null)

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stats?period=${period}`)
      if (!res.ok) throw new Error("Error cargando estadísticas")
      const data = await res.json()
      setSummary(data.summary)
      setTopProducts(data.topProducts)
      setDailyChart(data.dailyChart)
      setRecentSales(data.recentSales)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { loadStats() }, [loadStats])

  const maxRevenue = Math.max(...dailyChart.map(d => d.revenue), 1)

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-VE', { weekday: 'short', day: '2-digit', month: 'short' })
  }

  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

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
    <div className="space-y-6 animate-fade-in-down">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">📊 Estadísticas</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Rendimiento financiero de tu tienda</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1">
          {[['7', '7 días'], ['30', '30 días'], ['90', '3 meses']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setPeriod(val)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${period === val ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Ingresos Totales', value: `${summary.totalRevenue.toFixed(2)} ${currencySymbol}`,
              sub: `~ ${convertToUsd(summary.totalRevenue)} USD`,
              color: 'from-indigo-500 to-purple-600', icon: '💰'
            },
            {
              label: 'Ganancia Neta', value: `${summary.totalProfit.toFixed(2)} ${currencySymbol}`,
              sub: summary.totalRevenue > 0 ? `${((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1)}% de margen` : '0%',
              color: 'from-emerald-500 to-teal-600', icon: '📈'
            },
            {
              label: 'Ventas Realizadas', value: String(summary.totalSales),
              sub: `${summary.contadoSales} contado · ${summary.fiadoSales} fiado`,
              color: 'from-blue-500 to-cyan-600', icon: '🧾'
            },
            {
              label: 'Total en Fiados', value: `${summary.fiadoRevenue.toFixed(2)} ${currencySymbol}`,
              sub: `${summary.fiadoSales} venta${summary.fiadoSales !== 1 ? 's' : ''} pendiente${summary.fiadoSales !== 1 ? 's' : ''}`,
              color: 'from-orange-500 to-red-500', icon: '💸'
            }
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

      {/* Daily Chart + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-5 text-base">Ingresos últimos 7 días</h3>
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
                  <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 capitalize truncate w-full text-center">
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
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 space-y-2">
              <span className="text-3xl">📦</span>
              <p className="text-sm">Sin ventas en el período</p>
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
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-600'} dark:bg-slate-700 dark:text-slate-300`}>
                          {i + 1}
                        </span>
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

      {/* Sales History */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Historial de Ventas</h3>
          <p className="text-slate-400 text-sm mt-0.5">Últimas {recentSales.length} transacciones</p>
        </div>
        {recentSales.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-3 text-slate-400">
            <span className="text-5xl">🧾</span>
            <p className="font-medium">No hay ventas registradas aún</p>
            <p className="text-sm">Realiza tu primera venta desde el Panel de Cajero</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
            {recentSales.map(sale => (
              <div key={sale.id}>
                <button
                  onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${sale.paymentType === 'FIADO' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                      {sale.paymentType === 'FIADO' ? '💸' : '💵'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          Venta #{sale.id}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${sale.paymentType === 'FIADO' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                          {sale.paymentType}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{formatDateTime(sale.createdAt)}</span>
                        {sale.customer && <span>· 👤 {sale.customer.name}</span>}
                        <span>· {sale.items.length} producto{sale.items.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="font-extrabold text-slate-800 dark:text-slate-100">{sale.totalAmount.toFixed(2)} <span className="text-xs font-normal text-slate-400">{currencySymbol}</span></div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">+{sale.totalProfit.toFixed(2)} {currencySymbol}</div>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-300 dark:text-slate-600 mx-auto mt-1 transition-transform ${expandedSale === sale.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
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
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
