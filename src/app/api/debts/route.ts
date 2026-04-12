import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET all customers with their debt detail
export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { totalOwed: 'desc' },
      include: {
        sales: {
          where: { paymentType: 'FIADO' },
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { product: { select: { name: true } } } } }
        },
        payments: { orderBy: { createdAt: 'desc' } },
        expenses: {
          where: { category: 'PRESTAMO' },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    return NextResponse.json(customers)
  } catch (error) {
    console.error("GET Debts Error:", error)
    return NextResponse.json({ error: "Error al obtener fiados." }, { status: 500 })
  }
}
