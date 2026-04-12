import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(customers)
  } catch (error) {
    console.error("GET Customers Error:", error)
    return NextResponse.json({ error: "Error al obtener clientes." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, phone } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido." }, { status: 400 })
    const customer = await prisma.customer.create({ data: { name: name.trim(), phone: phone?.trim() || null } })
    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error("POST Customer Error:", error)
    return NextResponse.json({ error: "Error al crear cliente." }, { status: 500 })
  }
}
