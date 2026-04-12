import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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
  try {
    const { searchParams } = new URL(request.url)
    const since = parseSince(searchParams.get('period'))
    const whereClause = since ? { createdAt: { gte: since } } : {}
    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 200
    })
    return NextResponse.json(expenses)
  } catch (error) {
    console.error('GET Expenses Error:', error)
    return NextResponse.json({ error: 'Error al obtener gastos.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { amount, concept, category, account } = await request.json()
    if (!concept?.trim()) return NextResponse.json({ error: 'Concepto requerido.' }, { status: 400 })
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) return NextResponse.json({ error: 'Monto inválido.' }, { status: 400 })

    const expense = await prisma.expense.create({
      data: {
        amount: parsedAmount,
        concept: concept.trim(),
        category: category || 'OTRO',
        account: account || 'EFECTIVO'
      }
    })
    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('POST Expense Error:', error)
    return NextResponse.json({ error: 'Error al registrar gasto.' }, { status: 500 })
  }
}
