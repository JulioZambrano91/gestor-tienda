import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const expenseId = parseInt(id)
  const start = Date.now()

  try {
    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({ where: { id: expenseId } })
      if (!expense) throw new Error('Gasto no encontrado')

      // Si era un préstamo, devolver la deuda al cliente
      if (expense.category === 'PRESTAMO' && expense.customerId) {
        await tx.customer.update({
          where: { id: expense.customerId },
          data: { totalOwed: { decrement: expense.amount } }
        })
      }

      await tx.expense.delete({ where: { id: expenseId } })
    })

    logger.info(`DELETE /api/expenses/${id} - Deleted successfully (${Date.now() - start}ms)`, 'API')
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(`DELETE /api/expenses/${id} failed`, 'API', error)
    return NextResponse.json({ error: 'Error al eliminar el gasto.' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const expenseId = parseInt(id)
  const start = Date.now()

  try {
    const { amount, concept, category, account, customerId } = await req.json()
    
    const updated = await prisma.$transaction(async (tx) => {
      const oldExpense = await tx.expense.findUnique({ where: { id: expenseId } })
      if (!oldExpense) throw new Error('Gasto no encontrado')

      const parsedAmount = amount !== undefined ? parseFloat(amount) : oldExpense.amount
      const newCategory = category || oldExpense.category
      const newCustomerId = customerId !== undefined ? (customerId ? parseInt(customerId) : null) : oldExpense.customerId

      // Ajuste de deuda si cambia el préstamo
      // 1. Revertir deuda antigua si era préstamo
      if (oldExpense.category === 'PRESTAMO' && oldExpense.customerId) {
        await tx.customer.update({
          where: { id: oldExpense.customerId },
          data: { totalOwed: { decrement: oldExpense.amount } }
        })
      }

      // 2. Aplicar nueva deuda si es préstamo
      if (newCategory === 'PRESTAMO' && newCustomerId) {
        await tx.customer.update({
          where: { id: newCustomerId },
          data: { totalOwed: { increment: parsedAmount } }
        })
      }

      return await tx.expense.update({
        where: { id: expenseId },
        data: {
          amount: parsedAmount,
          concept: concept?.trim() || undefined,
          category: newCategory,
          account: account || undefined,
          customerId: newCustomerId
        }
      })
    })

    logger.info(`PATCH /api/expenses/${id} - Updated successfully (${Date.now() - start}ms)`, 'API')
    return NextResponse.json(updated)
  } catch (error) {
    logger.error(`PATCH /api/expenses/${id} failed`, 'API', error)
    return NextResponse.json({ error: 'Error al actualizar el gasto.' }, { status: 500 })
  }
}
