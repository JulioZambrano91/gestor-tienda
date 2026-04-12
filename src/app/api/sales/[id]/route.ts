import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// DELETE /api/sales/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const saleId = parseInt(id)

    // 1. Fetch sale with items to know what to restore
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true }
    })

    if (!sale) {
      return NextResponse.json({ error: 'Venta no encontrada.' }, { status: 404 })
    }

    // 2. Perform restoration and deletion in a transaction
    await prisma.$transaction(async (tx) => {
      // Restore stock for each product in the sale
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        })
      }

      // If it was FIADO, reduce the customer's debt
      if (sale.paymentType === 'FIADO' && sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { totalOwed: { decrement: sale.totalAmount } }
        })
      }

      // Delete the sale record (cascade will handle items)
      await tx.sale.delete({
        where: { id: saleId }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE Sale Error:', error)
    return NextResponse.json({ error: 'Error al eliminar la venta y restaurar el stock.' }, { status: 500 })
  }
}

// PATCH /api/sales/[id] — update payment method / type
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { paymentMethod, paymentType } = await req.json()
    const updated = await prisma.sale.update({
      where: { id: parseInt(id) },
      data: {
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(paymentType ? { paymentType } : {})
      },
      include: { items: { include: { product: { select: { name: true } } } }, customer: { select: { name: true } } }
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH Sale Error:', error)
    return NextResponse.json({ error: 'Error al actualizar venta.' }, { status: 500 })
  }
}
