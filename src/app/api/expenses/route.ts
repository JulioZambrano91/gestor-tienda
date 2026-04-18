import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

function parseDateRange(period: string | null): { gte?: Date; lte?: Date } | null {
  if (!period || period === '0' || period === 'all') return null
  const now = new Date()

  // Hoy
  if (period === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const end = new Date(now); end.setHours(23, 59, 59, 999)
    return { gte: start, lte: end }
  }

  // Esta semana (Lunes - Domingo)
  if (period === 'week') {
    const day = now.getDay() // 0=Sun
    const diff = (day === 0 ? -6 : 1 - day)
    const start = new Date(now); start.setDate(now.getDate() + diff); start.setHours(0, 0, 0, 0)
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
    return { gte: start, lte: end }
  }

  // Este mes
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { gte: start, lte: end }
  }

  // Mes específico: "month-YYYY-MM"
  if (period.startsWith('month-')) {
    const [, year, month] = period.split('-')
    const start = new Date(parseInt(year), parseInt(month) - 1, 1)
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
    return { gte: start, lte: end }
  }

  // Semana específica: "week-YYYY-MM-DD" (lunes de esa semana)
  if (period.startsWith('week-')) {
    const dateStr = period.replace('week-', '')
    const start = new Date(dateStr); start.setHours(0, 0, 0, 0)
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
    return { gte: start, lte: end }
  }

  // Día específico: "day-YYYY-MM-DD"
  if (period.startsWith('day-')) {
    const dateStr = period.replace('day-', '')
    const start = new Date(dateStr); start.setHours(0, 0, 0, 0)
    const end = new Date(dateStr); end.setHours(23, 59, 59, 999)
    return { gte: start, lte: end }
  }

  // Legado: e.g. "7d", "30d"
  const match = period.match(/^(\d+)(h|d)$/)
  if (match) {
    const [, num, unit] = match
    const n = parseInt(num)
    const d = new Date(now)
    if (unit === 'h') d.setHours(d.getHours() - n)
    if (unit === 'd') d.setDate(d.getDate() - n)
    return { gte: d }
  }

  return null
}

export async function GET(request: Request) {
  const start = Date.now()
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')
    const dateRange = parseDateRange(period)
    logger.info(`GET /api/expenses?period=${period || 'all'}`, 'API')

    const whereClause: any = { category: { not: 'DEUDA_VIEJA' } }
    if (dateRange) whereClause.createdAt = dateRange

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 500
    })
    logger.info(`GET /api/expenses - Found ${expenses.length} expenses (${Date.now() - start}ms)`, 'API')
    return NextResponse.json(expenses)
  } catch (error) {
    logger.error('GET /api/expenses failed', 'API', error)
    return NextResponse.json({ error: 'Error al obtener gastos.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const start = Date.now()
  try {
    const body = await request.json()
    const { amount, concept, category, account, customerId, toAccount, createdAt } = body

    if (!concept?.trim()) {
      logger.warn('POST /api/expenses - Missing concept', 'API')
      return NextResponse.json({ error: 'Concepto requerido.' }, { status: 400 })
    }
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      logger.warn(`POST /api/expenses - Invalid amount: ${amount}`, 'API')
      return NextResponse.json({ error: 'Monto inválido.' }, { status: 400 })
    }

    const manualDate = createdAt ? new Date(createdAt) : new Date()

    // ─── TRANSFERENCIA entre cuentas ─────────────────────────────────────────
    if (category === 'TRANSFERENCIA' && toAccount) {
      await prisma.$transaction([
        // Egreso en cuenta origen
        prisma.expense.create({
          data: {
            amount: parsedAmount,
            concept: concept.trim(),
            category: 'TRANSFER_OUT',
            account: account || 'EFECTIVO',
            createdAt: manualDate
          }
        }),
        // Ingreso en cuenta destino
        prisma.expense.create({
          data: {
            amount: parsedAmount,
            concept: concept.trim(),
            category: 'INGRESO_EXTRA',
            account: toAccount,
            createdAt: manualDate
          }
        })
      ])
      logger.info(`POST /api/expenses - Transfer ${parsedAmount} from ${account} to ${toAccount}`, 'API')
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    // ─── Gasto normal / ingreso extra ────────────────────────────────────────
    const expense = await prisma.$transaction(async (tx) => {
      const e = await tx.expense.create({
        data: {
          amount: parsedAmount,
          concept: concept.trim(),
          category: category || 'OTRO',
          account: account || 'EFECTIVO',
          createdAt: manualDate,
          customerId: customerId ? (typeof customerId === 'string' ? parseInt(customerId) : customerId) : null
        }
      })

      // Si es un préstamo, sumamos a la deuda del cliente
      if (category === 'PRESTAMO' && customerId) {
        await tx.customer.update({
          where: { id: typeof customerId === 'string' ? parseInt(customerId) : customerId },
          data: { totalOwed: { increment: parsedAmount } }
        })
      }
      return e
    })

    logger.info(`POST /api/expenses - Registered "${concept}" for ${amount} (${Date.now() - start}ms)`, 'API')
    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    logger.error('POST /api/expenses failed', 'API', error)
    return NextResponse.json({ error: 'Error al registrar gasto.' }, { status: 500 })
  }
}
