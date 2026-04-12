import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

function parseSince(period: string | null): Date | null {
  if (!period || period === '0' || period === 'all') return null
  const now = new Date()
  const match = period.match(/^(\d+)(h|d)$/)
  if (!match) return null
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
    const period = searchParams.get('period')
    const since = parseSince(period)
    logger.info(`GET /api/expenses?period=${period || 'all'}`, 'API')

    const whereClause = since ? { createdAt: { gte: since } } : {}
    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 200
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
    const { amount, concept, category, account, customerId } = await request.json()
    if (!concept?.trim()) {
      logger.warn('POST /api/expenses - Missing concept', 'API')
      return NextResponse.json({ error: 'Concepto requerido.' }, { status: 400 })
    }
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      logger.warn(`POST /api/expenses - Invalid amount: ${amount}`, 'API')
      return NextResponse.json({ error: 'Monto inválido.' }, { status: 400 })
    }

    const expense = await prisma.$transaction(async (tx) => {
      const e = await tx.expense.create({
        data: {
          amount: parsedAmount,
          concept: concept.trim(),
          category: category || 'OTRO',
          account: account || 'EFECTIVO',
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
