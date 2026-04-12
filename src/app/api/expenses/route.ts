import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
    return NextResponse.json(expenses)
  } catch (error) {
    console.error("GET Expenses Error:", error)
    return NextResponse.json({ error: "Error al obtener gastos." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { amount, concept, category } = await request.json()
    if (!concept?.trim()) return NextResponse.json({ error: "Concepto requerido." }, { status: 400 })
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) return NextResponse.json({ error: "Monto inválido." }, { status: 400 })

    const expense = await prisma.expense.create({
      data: { amount: parsedAmount, concept: concept.trim(), category: category || 'OTRO' }
    })
    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error("POST Expense Error:", error)
    return NextResponse.json({ error: "Error al registrar gasto." }, { status: 500 })
  }
}
