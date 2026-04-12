import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  const start = Date.now()
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { id: 'desc' }
    })
    logger.info(`GET /api/products - ${products.length} products found (${Date.now() - start}ms)`, 'API')
    return NextResponse.json(products)
  } catch (error) {
    logger.error("GET /api/products failed", 'API', error)
    return NextResponse.json({ error: "No se pudieron obtener los productos." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const start = Date.now()
  try {
    const body = await request.json()
    const { name, stock, costPrice, salePrice, imageUrl, categoryId } = body

    const newProduct = await prisma.product.create({
      data: {
        name,
        stock: parseInt(stock) || 0,
        costPrice: parseFloat(costPrice) || 0,
        salePrice: parseFloat(salePrice) || 0,
        imageUrl: imageUrl || null,
        categoryId: categoryId ? parseInt(categoryId) : null,
      },
      include: { category: true }
    })

    logger.info(`POST /api/products - Created "${name}" ID:${newProduct.id} (${Date.now() - start}ms)`, 'API')
    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    logger.error("POST /api/products failed", 'API', error)
    return NextResponse.json({ error: "Error al crear el producto." }, { status: 500 })
  }
}
