import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days

    const since = new Date()
    since.setDate(since.getDate() - parseInt(period))

    const [allSales, topProducts, periodSales] = await Promise.all([
      // Full sales history (most recent 100)
      prisma.sale.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          items: { include: { product: { select: { name: true } } } },
          customer: { select: { name: true } }
        }
      }),

      // Top 5 products by quantity sold in period
      prisma.saleItem.groupBy({
        by: ['productId'],
        where: { sale: { createdAt: { gte: since } } },
        _sum: { quantity: true, priceAtSale: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),

      // Period summary
      prisma.sale.findMany({
        where: { createdAt: { gte: since } },
        select: { totalAmount: true, totalProfit: true, paymentType: true, createdAt: true }
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

    // Daily revenue for last 7 days chart
    const dailyMap: Record<string, { revenue: number; profit: number }> = {}
    for (let i = 6; i >= 0; i--) {
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

    return NextResponse.json({
      summary: { totalRevenue, totalProfit, totalSales, contadoSales, fiadoSales, fiadoRevenue, period: parseInt(period) },
      topProducts: topProductsMapped,
      dailyChart,
      recentSales: allSales
    })
  } catch (error) {
    console.error("GET Stats Error:", error)
    return NextResponse.json({ error: "Error al obtener estadísticas." }, { status: 500 })
  }
}
