import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

// period can be: '1h'=24h, '3d', '7d', '30d', '90d', '0'=all-time
function parsePeriod(param: string): Date | null {
  const now = new Date()
  if (param === '0' || param === 'all') return null  // all time
  const match = param.match(/^(\d+)(h|d)$/)
  if (!match) {
    // legacy: plain number = days
    const days = parseInt(param)
    if (isNaN(days)) return null
    const d = new Date(now)
    d.setDate(d.getDate() - days)
    return d
  }
  const [, num, unit] = match
  const n = parseInt(num)
  if (unit === 'h') { const d = new Date(now); d.setHours(d.getHours() - n); return d }
  if (unit === 'd') { const d = new Date(now); d.setDate(d.getDate() - n); return d }
  return null
}

export async function GET(request: Request) {
  const start = Date.now()
  try {
    const { searchParams } = new URL(request.url)
    const periodParam = searchParams.get('period') || '30d'
    const since = parsePeriod(periodParam)

    logger.info(`GET /api/stats?period=${periodParam}`, 'API')

    const whereClause = since ? { createdAt: { gte: since } } : {}

    const [allSales, topProducts, periodSales] = await Promise.all([
      // Full sales history (most recent 200)
      prisma.sale.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
          customer: { select: { id: true, name: true } }
        }
      }),

      // Top 5 products by quantity sold in period
      prisma.saleItem.groupBy({
        by: ['productId'],
        where: { sale: whereClause },
        _sum: { quantity: true, priceAtSale: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),

      // Period summary
      prisma.sale.findMany({
        where: whereClause,
        select: { totalAmount: true, totalProfit: true, paymentType: true, paymentMethod: true, createdAt: true }
      })
    ])

    // Lookup product names for topProducts
    const productIds = topProducts.map((t: any) => t.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true }
    })
    const topProductsMapped = topProducts.map((t: any) => ({
      productId: t.productId,
      name: products.find((p: any) => p.id === t.productId)?.name || 'Desconocido',
      totalQty: t._sum.quantity,
      totalRevenue: t._sum.priceAtSale
    }))

    // Period stats
    const totalRevenue = periodSales.reduce((s: number, r: any) => s + r.totalAmount, 0)
    const totalProfit = periodSales.reduce((s: number, r: any) => s + r.totalProfit, 0)
    const totalSales = periodSales.length
    const contadoSales = periodSales.filter((r: any) => r.paymentType === 'CONTADO').length
    const fiadoSales = periodSales.filter((r: any) => r.paymentType === 'FIADO').length
    const fiadoRevenue = periodSales.filter((r: any) => r.paymentType === 'FIADO').reduce((s: number, r: any) => s + r.totalAmount, 0)

    // Daily chart — adapt chart window to period
    const isShort = periodParam.endsWith('h') || periodParam === '3d' || periodParam === '1d'
    const chartDays = isShort ? 3 : 7
    const dailyMap: Record<string, { revenue: number; profit: number }> = {}
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dailyMap[key] = { revenue: 0, profit: 0 }
    }
    for (const s of periodSales) {
      const key = new Date(s.createdAt).toISOString().slice(0, 10)
      if (dailyMap[key]) {
        dailyMap[key].revenue += s.totalAmount
        dailyMap[key].profit += s.totalProfit
      }
    }
    const dailyChart = Object.entries(dailyMap).map(([date, vals]) => ({ date, ...vals }))

    // Group sales by month-year
    const byMonth: Record<string, typeof allSales> = {}
    for (const sale of allSales) {
      const d = new Date(sale.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!byMonth[key]) byMonth[key] = []
      byMonth[key].push(sale)
    }

    logger.info(`GET /api/stats SUCCESS - ${totalSales} sales processed (${Date.now() - start}ms)`, 'API')
    return NextResponse.json({
      summary: { totalRevenue, totalProfit, totalSales, contadoSales, fiadoSales, fiadoRevenue, period: periodParam },
      topProducts: topProductsMapped,
      dailyChart,
      recentSales: allSales,
      byMonth
    })
  } catch (error) {
    logger.error('GET /api/stats failed', 'API', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas.' }, { status: 500 })
  }
}
