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

// PATCH /api/sales/[id] — full edit including items
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const start = Date.now()
  try {
    const { items, paymentMethod, paymentType, customerId } = await req.json()
    const saleId = parseInt(id)

    const updatedSale = await prisma.$transaction(async (tx) => {
      // 1. Get current sale with items
      const oldSale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: true }
      })
      if (!oldSale) throw new Error('Venta no encontrada')

      // 2. Restore stock for each item in the old sale
      for (const item of oldSale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        })
      }

      // 3. Revert debt if old sale was FIADO
      if (oldSale.paymentType === 'FIADO' && oldSale.customerId) {
        await tx.customer.update({
          where: { id: oldSale.customerId },
          data: { totalOwed: { decrement: oldSale.totalAmount } }
        })
      }

      // 4. Calculate new totals (if items provided, otherwise use old ones)
      const currentItems = items || oldSale.items
      let totalAmount = 0
      let totalProfit = 0

      // Fetch products to get current cost prices for profit recalculation
      const productIds = currentItems.map((i: any) => i.productId)
      const products = await tx.product.findMany({ where: { id: { in: productIds } } })

      for (const item of currentItems) {
        const product = products.find((p) => p.id === item.productId)
        if (!product) throw new Error(`Producto ${item.productId} no encontrado`)
        
        // Validation: current stock (already restored) must be enough
        if (product.stock < item.quantity) {
          throw new Error(`Stock insuficiente para "${product.name}". Disponible: ${product.stock}`)
        }

        totalAmount += item.priceAtSale * item.quantity
        totalProfit += (item.priceAtSale - product.costPrice) * item.quantity
      }

      // 5. Update stock for new items
      for (const item of currentItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        })
      }

      // 6. Update Debt if new sale is FIADO
      const finalPaymentType = paymentType || oldSale.paymentType
      const finalCustomerId = customerId !== undefined ? (customerId ? parseInt(customerId) : null) : oldSale.customerId
      
      if (finalPaymentType === 'FIADO' && finalCustomerId) {
        await tx.customer.update({
          where: { id: finalCustomerId },
          data: { totalOwed: { increment: totalAmount } }
        })
      }

      // 7. Replace items and update Sale
      if (items) {
        // Delete old items
        await tx.saleItem.deleteMany({ where: { saleId } })
        
        // Insert new items
        await tx.saleItem.createMany({
          data: items.map((i: any) => ({
            saleId,
            productId: i.productId,
            quantity: i.quantity,
            priceAtSale: i.priceAtSale
          }))
        })
      }

      return await tx.sale.update({
        where: { id: saleId },
        data: {
          paymentMethod: paymentMethod || oldSale.paymentMethod,
          paymentType: finalPaymentType,
          customerId: finalCustomerId,
          totalAmount,
          totalProfit
        },
        include: { items: { include: { product: { select: { name: true } } } }, customer: { select: { name: true } } }
      })
    })

    return NextResponse.json(updatedSale)
  } catch (error: any) {
    console.error('PATCH Sale Error:', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar venta.' }, { status: 500 })
  }
}
