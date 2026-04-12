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
    
    const activeExpenses = expenses.filter(e => e.category !== 'DEUDA_VIEJA')

    // Calcular egresos por cuenta
    const expensesPerAccount = activeExpenses.reduce((acc, e) => {
      const key = e.account || 'EFECTIVO'
      if (e.category === 'INGRESO_EXTRA') {
        acc[key] = (acc[key] || 0) - e.amount
      } else {
        acc[key] = (acc[key] || 0) + e.amount
      }
      return acc
    }, {} as Record<string, number>)
    
    const justExpenses = activeExpenses.filter(e => e.category !== 'INGRESO_EXTRA')
    const totalExpenses = justExpenses.reduce((s, e) => s + e.amount, 0)

    const monthlyMap: Record<string, { revenue: number; profit: number; contado: number; fiado: number; expenses: number }> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyMap[key] = { revenue: 0, profit: 0, contado: 0, fiado: 0, expenses: 0 }
    }
    
    for (const s of sales) {
      const d = new Date(s.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      
      const isFiado = s.paymentType?.toUpperCase() === 'FIADO'
      
      if (monthlyMap[key]) {
        // En ingresos mensuales solo sumamos lo cobrado (no FIADO)
        if (!isFiado) {
          monthlyMap[key].revenue += s.totalAmount
          monthlyMap[key].profit += s.totalProfit
        }
        
        if (isFiado) monthlyMap[key].fiado += s.totalAmount
        else monthlyMap[key].contado += s.totalAmount
      }
    }

    // Sumar abonos a los ingresos mensuales reales
    for (const p of debtPayments) {
      const d = new Date(p.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyMap[key]) {
        monthlyMap[key].revenue += p.amount
      }
    }

    for (const e of expenses) {
      if (e.category === 'DEUDA_VIEJA' || e.category === 'INGRESO_EXTRA') continue
      const d = new Date(e.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyMap[key]) monthlyMap[key].expenses += e.amount
    }

    const monthly = Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v }))

    const stockValue = products.reduce((s, p) => s + p.costPrice * p.stock, 0)
    const stockSaleValue = products.reduce((s, p) => s + p.salePrice * p.stock, 0)
    const lowStockProducts = products.filter(p => p.stock <= 5)

    const realSales = sales.filter(s => s.paymentType?.toUpperCase() !== 'FIADO')
    const totalRevenue = realSales.reduce((s, r) => s + r.totalAmount, 0) + totalDebtPaid
    const totalProfit = realSales.reduce((s, r) => s + r.totalProfit, 0)
    
    // Balances con descuentos por cuenta precisos
    const cashInHand = (byMethod['EFECTIVO'].revenue + totalDebtPaid) - (expensesPerAccount['EFECTIVO'] || 0)
    const pagoMovilBalance = byMethod['PAGO_MOVIL'].revenue - (expensesPerAccount['PAGO_MOVIL'] || 0)
    const puntoVentaBalance = byMethod['PUNTO_VENTA'].revenue - (expensesPerAccount['PUNTO_VENTA'] || 0)
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
