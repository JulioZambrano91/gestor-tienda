import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { logger } from './logger'

const prismaClientSingleton = () => {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' })
  const client = new PrismaClient({
    adapter,
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ],
  })

  // @ts-ignore
  client.$on('query', (e: any) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`${e.query} (${e.duration}ms)`, 'DB')
    }
  })

  // @ts-ignore
  client.$on('info', (e: any) => logger.info(e.message, 'DB'))
  // @ts-ignore
  client.$on('warn', (e: any) => logger.warn(e.message, 'DB'))
  // @ts-ignore
  client.$on('error', (e: any) => logger.error(e.message, 'DB'))

  return client
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
