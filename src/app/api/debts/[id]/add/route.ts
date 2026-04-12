import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const customerId = parseInt(id)
    const { amount, concept } = await request.json()

    const addAmount = parseFloat(amount)
    if (isNaN(addAmount) || addAmount <= 0) {
      return NextResponse.json({ error: "Monto inválido." }, { status: 400 })
    }

    const [expense, updatedCustomer] = await prisma.$transaction([
      prisma.expense.create({
        data: {
          amount: addAmount,
          concept: concept?.trim() || 'Deuda Anterior / Ajuste',
          category: 'DEUDA_VIEJA',
          account: 'HISTORICO',
          customerId: customerId
        }
      }),
      prisma.customer.update({
        where: { id: customerId },
        data: { totalOwed: { increment: addAmount } }
      })
    ])

    return NextResponse.json({ expense, customer: updatedCustomer }, { status: 201 })
  } catch (error) {
    console.error("POST Add Debt Error:", error)
    return NextResponse.json({ error: "Error al añadir deuda." }, { status: 500 })
  }
}
