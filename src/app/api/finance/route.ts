import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  const start = Date.now()
  try {
    const [sales, products, expenses, debtPayments] = await Promise.all([
      prisma.sale.findMany({
        select: { totalAmount: true, totalProfit: true, paymentType: true, paymentMethod: true, createdAt: true }
      }),
      prisma.product.findMany({
        select: { costPrice: true, salePrice: true, stock: true, name: true }
      }),
      prisma.expense.findMany(),
      prisma.debtPayment.findMany()
    ])

    // ... (rest of the calculation logic)
    const methods = ['EFECTIVO', 'PAGO_MOVIL', 'PUNTO_VENTA', 'FIADO'] as const
    const byMethod: Record<string, { revenue: number; count: number }> = {}
    for (const m of methods) byMethod[m] = { revenue: 0, count: 0 }
    
    for (const s of sales) {
      const key = s.paymentMethod || (s.paymentType === 'FIADO' ? 'FIADO' : 'EFECTIVO')
      if (byMethod[key]) { byMethod[key].revenue += s.totalAmount; byMethod[key].count++ }
    }

    const totalDebtPaid = debtPayments.reduce((s, p) => s + p.amount, 0)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

    const monthlyMap: Record<string, { revenue: number; profit: number; contado: number; fiado: number; expenses: number }> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyMap[key] = { revenue: 0, profit: 0, contado: 0, fiado: 0, expenses: 0 }
    }
    
    for (const s of sales) {
      const d = new Date(s.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyMap[key]) {
        monthlyMap[key].revenue += s.totalAmount
        monthlyMap[key].profit += s.totalProfit
        if (s.paymentType === 'FIADO') monthlyMap[key].fiado += s.totalAmount
        else monthlyMap[key].contado += s.totalAmount
      }
    }

    for (const e of expenses) {
      const d = new Date(e.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyMap[key]) monthlyMap[key].expenses += e.amount
    }

    const monthly = Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v }))

    const stockValue = products.reduce((s, p) => s + p.costPrice * p.stock, 0)
    const stockSaleValue = products.reduce((s, p) => s + p.salePrice * p.stock, 0)
    const lowStockProducts = products.filter(p => p.stock <= 5)

    const totalRevenue = sales.reduce((s, r) => s + r.totalAmount, 0)
    const totalProfit = sales.reduce((s, r) => s + r.totalProfit, 0)
    
    const cashInHand = (byMethod['EFECTIVO'].revenue + totalDebtPaid) - totalExpenses
    const pagoMovilBalance = byMethod['PAGO_MOVIL'].revenue
    const puntoVentaBalance = byMethod['PUNTO_VENTA'].revenue
    const globalBalance = cashInHand + pagoMovilBalance + puntoVentaBalance

    logger.info(`GET /api/finance - Report generated (${Date.now() - start}ms)`, 'API')

    return NextResponse.json({
      totalRevenue,
      totalProfit,
      totalExpenses,
      totalDebtPaid,
      cashInHand,
      pagoMovilBalance,
      puntoVentaBalance,
      globalBalance,
      totalSales: sales.length,
      byMethod,
      monthly,
      stockValue,
      stockSaleValue,
      lowStockProducts,
      profitMarginPct: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0
    })
  } catch (error) {
    logger.error("GET /api/finance failed", "API", error)
    return NextResponse.json({ error: "Error al obtener finanzas." }, { status: 500 })
  }
}
