import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/products/[id]/movements — history for one product
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const movements = await prisma.stockMovement.findMany({
      where: { productId: parseInt(id) },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(movements)
  } catch (error) {
    console.error('GET Movements Error:', error)
    return NextResponse.json({ error: 'Error al obtener movimientos.' }, { status: 500 })
  }
}

// POST /api/products/[id]/movements — register a restock entry
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const productId = parseInt(id)

  try {
    const { quantity, totalCost, note } = await req.json()
    const qty = parseInt(quantity)
    const cost = parseFloat(totalCost)

    if (!qty || qty <= 0 || isNaN(cost) || cost < 0) {
      return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
    }

    const unitCost = cost / qty

    // Get current product to compute weighted average cost
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } })

    const currentStock = product.stock
    const currentCost = product.costPrice

    // Weighted average: (existing_units * existing_cost + new_units * new_cost) / total_units
    const newStock = currentStock + qty
    const avgCost = newStock > 0
      ? (currentStock * currentCost + qty * unitCost) / newStock
      : unitCost

    // Atomic: create movement + update product stock/cost
    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          type: 'ENTRADA',
          quantity: qty,
          totalCost: cost,
          unitCost,
          note: note?.trim() || null,
          productId
        }
      }),
      prisma.product.update({
        where: { id: productId },
        data: { stock: newStock, costPrice: avgCost }
      })
    ])

    return NextResponse.json({ movement, newStock, avgCost }, { status: 201 })
  } catch (error) {
    console.error('POST Movement Error:', error)
    return NextResponse.json({ error: 'Error al registrar movimiento.' }, { status: 500 })
  }
}
