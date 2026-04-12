import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
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

    // ── By payment method breakdown ──
    const methods = ['EFECTIVO', 'PAGO_MOVIL', 'PUNTO_VENTA', 'FIADO'] as const
    const byMethod: Record<string, { revenue: number; count: number }> = {}
    for (const m of methods) byMethod[m] = { revenue: 0, count: 0 }
    
    // Add sales to methods
    for (const s of sales) {
      const key = s.paymentMethod || (s.paymentType === 'FIADO' ? 'FIADO' : 'EFECTIVO')
      if (byMethod[key]) { byMethod[key].revenue += s.totalAmount; byMethod[key].count++ }
    }

    // Debt payments are strictly "Contado" (usually cash or transfer)
    // We'll treat them as "EFECTIVO" for simplicity unless we add a method to DebtPayment later.
    // For now, let's just count them in total cash calculations.
    const totalDebtPaid = debtPayments.reduce((s, p) => s + p.amount, 0)
    
    // Total expenses
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

    // ── Monthly revenue (last 6 months) ──
    // ... (rest of the logic remains similar but we'll include expenses in summary)
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

    // ── Stock value ──
    const stockValue = products.reduce((s, p) => s + p.costPrice * p.stock, 0)
    const stockSaleValue = products.reduce((s, p) => s + p.salePrice * p.stock, 0)
    const lowStockProducts = products.filter(p => p.stock <= 5)

    // ── Overall totals ──
    const totalRevenue = sales.reduce((s, r) => s + r.totalAmount, 0)
    const totalProfit = sales.reduce((s, r) => s + r.totalProfit, 0)
    
    // "Dinero en caja" (Efectivo real) = (Ventas Efectivo + Abonos) - Gastos
    // Note: This logic assumes expenses are paid in cash. 
    const cashInHand = (byMethod['EFECTIVO'].revenue + totalDebtPaid) - totalExpenses

    return NextResponse.json({
      totalRevenue, 
      totalProfit, 
      totalExpenses,
      totalDebtPaid,
      cashInHand,
      totalSales: sales.length,
      byMethod,
      monthly,
      stockValue, 
      stockSaleValue,
      lowStockProducts,
      profitMarginPct: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0
    })
  } catch (error) {
    console.error("GET Finance Error:", error)
    return NextResponse.json({ error: "Error al obtener finanzas." }, { status: 500 })
  }
}
