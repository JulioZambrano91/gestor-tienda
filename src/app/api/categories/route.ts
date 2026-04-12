import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(categories)
  } catch (error) {
    console.error("GET Categories Error:", error)
    return NextResponse.json({ error: "No se pudieron obtener las categorías." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name } = body
    if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido." }, { status: 400 })
    const category = await prisma.category.create({ data: { name: name.trim() } })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error("POST Category Error:", error)
    return NextResponse.json({ error: "Error al crear categoría." }, { status: 500 })
  }
}
