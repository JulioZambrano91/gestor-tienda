import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  const start = Date.now()
  try {
    const { items, paymentType, paymentMethod, customerId, createdAt } = await request.json()
    // items: [{ productId, quantity, priceAtSale }]

    if (!items || items.length === 0) {
      logger.warn('POST /api/sales - Empty items list', 'API')
      return NextResponse.json({ error: "La venta debe tener al menos un producto." }, { status: 400 })
    }

    logger.info(`POST /api/sales - Processing sale: ${items.length} items, type: ${paymentType}`, 'API')

    // Fetch products to calculate cost & validate stock
    const productIds = items.map((i: any) => i.productId)
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } })

    let totalAmount = 0
    let totalProfit = 0

    for (const item of items) {
      const product = products.find((p: any) => p.id === item.productId)
      if (!product) {
        logger.warn(`POST /api/sales - Product ${item.productId} not found`, 'API')
        return NextResponse.json({ error: `Producto ${item.productId} no encontrado.` }, { status: 400 })
      }
      if (product.stock < item.quantity) {
        logger.warn(`POST /api/sales - Out of stock for "${product.name}"`, 'API')
        return NextResponse.json({ error: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}` }, { status: 400 })
      }
      const lineTotal = item.priceAtSale * item.quantity
      const lineProfit = (item.priceAtSale - product.costPrice) * item.quantity
      totalAmount += lineTotal
      totalProfit += lineProfit
    }

    // Create sale + items + update stock in a transaction
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          createdAt: createdAt ? new Date(createdAt) : undefined,
          totalAmount,
          totalProfit,
          paymentType: paymentType || 'CONTADO',
          paymentMethod: paymentMethod || (paymentType === 'FIADO' ? 'FIADO' : 'EFECTIVO'),
          customerId: customerId ? parseInt(customerId) : null,
          items: {
            create: items.map((i: any) => ({
              productId: i.productId,
              quantity: i.quantity,
              priceAtSale: i.priceAtSale,
            }))
          }
        },
        include: { items: true, customer: true }
      })

      // Decrement stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        })
      }

      // If FIADO, add to customer debt
      if (paymentType === 'FIADO' && customerId) {
        await tx.customer.update({
          where: { id: parseInt(customerId) },
          data: { totalOwed: { increment: totalAmount } }
        })
      }

      return newSale
    })

    logger.info(`POST /api/sales - SUCCESS! ID:${sale.id} Total:${totalAmount.toFixed(2)} (${Date.now() - start}ms)`, 'API')
    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    logger.error("POST /api/sales failed", 'API', error)
    return NextResponse.json({ error: "Error al procesar la venta." }, { status: 500 })
  }
}

export async function GET() {
  const start = Date.now()
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: true } },
        customer: true
      }
    })
    logger.info(`GET /api/sales - Found ${sales.length} sales (${Date.now() - start}ms)`, 'API')
    return NextResponse.json(sales)
  } catch (error) {
    logger.error("GET /api/sales failed", 'API', error)
    return NextResponse.json({ error: "Error al obtener ventas." }, { status: 500 })
  }
}
