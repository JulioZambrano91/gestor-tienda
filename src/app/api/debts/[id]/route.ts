import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// POST a payment (abono or full settlement) to a customer's debt
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const customerId = parseInt(id)
    const { amount, concept } = await request.json()

    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 })

    const paymentAmount = parseFloat(amount)
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json({ error: "Monto inválido." }, { status: 400 })
    }
    if (paymentAmount > customer.totalOwed) {
      return NextResponse.json({ error: `El monto supera la deuda actual (${customer.totalOwed.toFixed(2)}).` }, { status: 400 })
    }

    const newOwed = Math.max(0, customer.totalOwed - paymentAmount)
    const finalConcept = concept?.trim() || (newOwed === 0 ? 'Saldado' : 'Abono')

    const [payment, updatedCustomer] = await prisma.$transaction([
      prisma.debtPayment.create({
        data: { customerId, amount: paymentAmount, concept: finalConcept }
      }),
      prisma.customer.update({
        where: { id: customerId },
        data: { totalOwed: newOwed }
      })
    ])

    return NextResponse.json({ payment, customer: updatedCustomer }, { status: 201 })
  } catch (error) {
    console.error("POST Payment Error:", error)
    return NextResponse.json({ error: "Error al registrar el pago." }, { status: 500 })
  }
}
