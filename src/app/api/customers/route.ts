import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  const start = Date.now()
  try {
    const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } })
    logger.info(`GET /api/customers - Found ${customers.length} customers (${Date.now() - start}ms)`, 'API')
    return NextResponse.json(customers)
  } catch (error) {
    logger.error("GET /api/customers failed", 'API', error)
    return NextResponse.json({ error: "Error al obtener clientes." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const start = Date.now()
  try {
    const { name, phone } = await request.json()
    if (!name?.trim()) {
      logger.warn('POST /api/customers - Missing name', 'API')
      return NextResponse.json({ error: "Nombre requerido." }, { status: 400 })
    }
    const customer = await prisma.customer.create({ data: { name: name.trim(), phone: phone?.trim() || null } })
    logger.info(`POST /api/customers - Created "${customer.name}" ID:${customer.id} (${Date.now() - start}ms)`, 'API')
    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    logger.error("POST /api/customers failed", 'API', error)
    return NextResponse.json({ error: "Error al crear cliente." }, { status: 500 })
  }
}
