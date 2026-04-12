import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, stock, costPrice, salePrice, imageUrl, categoryId } = body

    const updated = await prisma.product.update({
      where: { id: parseInt(id) },
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
    return NextResponse.json(updated)
  } catch (error) {
    console.error("PUT Product Error:", error)
    return NextResponse.json({ error: "Error al actualizar producto." }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.product.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE Product Error:", error)
    return NextResponse.json({ error: "Error al eliminar producto." }, { status: 500 })
  }
}
