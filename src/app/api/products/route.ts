import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { id: 'desc' }
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error("GET Products Error:", error)
    return NextResponse.json({ error: "No se pudieron obtener los productos." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, stock, costPrice, salePrice, imageUrl } = body
    
    const newProduct = await prisma.product.create({
      data: {
        name,
        stock: parseInt(stock) || 0,
        costPrice: parseFloat(costPrice) || 0,
        salePrice: parseFloat(salePrice) || 0,
        imageUrl: imageUrl || null
      }
    })
    
    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    console.error("POST Products Error:", error)
    return NextResponse.json({ error: "Error al crear el producto." }, { status: 500 })
  }
}
