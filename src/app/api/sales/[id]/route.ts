import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// DELETE /api/sales/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.sale.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE Sale Error:', error)
    return NextResponse.json({ error: 'Error al eliminar venta.' }, { status: 500 })
  }
}

// PATCH /api/sales/[id] — update payment method / type
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { paymentMethod, paymentType } = await req.json()
    const updated = await prisma.sale.update({
      where: { id: parseInt(id) },
      data: {
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(paymentType ? { paymentType } : {})
      },
      include: { items: { include: { product: { select: { name: true } } } }, customer: { select: { name: true } } }
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH Sale Error:', error)
    return NextResponse.json({ error: 'Error al actualizar venta.' }, { status: 500 })
  }
}
