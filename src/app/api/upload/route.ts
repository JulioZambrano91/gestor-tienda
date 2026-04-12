import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  const start = Date.now()
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      logger.warn('POST /api/upload - No file provided', 'API')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
    if (!allowedTypes.includes(file.type)) {
      logger.warn(`POST /api/upload - Invalid file type: ${file.type}`, 'API')
      return NextResponse.json({ error: 'Tipo de archivo no permitido.' }, { status: 400 })
    }

    logger.info(`POST /api/upload - Uploading ${file.name} (${file.size} bytes)`, 'API')
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), 'public', 'images', 'products')
    await mkdir(uploadDir, { recursive: true })

    // Unique name to avoid collisions
    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const filepath = join(uploadDir, filename)

    await writeFile(filepath, buffer)
    const url = `/images/products/${filename}`

    logger.info(`POST /api/upload - SUCCESS! URL: ${url} (${Date.now() - start}ms)`, 'API')
    return NextResponse.json({ url }, { status: 201 })
  } catch (error) {
    logger.error('POST /api/upload failed', 'API', error)
    return NextResponse.json({ error: 'Error al guardar la imagen.' }, { status: 500 })
  }
}
