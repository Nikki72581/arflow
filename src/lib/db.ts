import { PrismaClient } from '@prisma/client'

function normalizeSchemaName(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!normalized) return 'preview'
  return normalized.length > 63 ? normalized.slice(0, 63) : normalized
}

function resolveSchemaName(): string | undefined {
  const explicit = process.env.PRISMA_SCHEMA?.trim()
  if (explicit) return explicit
  const gitRef = process.env.VERCEL_GIT_COMMIT_REF
  if (gitRef && gitRef !== 'main') return normalizeSchemaName(gitRef)
  if (process.env.VERCEL_ENV === 'preview') return 'preview'
  return undefined
}

function appendSchemaToUrl(url: string, schema?: string): string {
  if (!schema) return url
  try {
    const parsed = new URL(url)
    if (parsed.searchParams.has('schema')) return url
    parsed.searchParams.set('schema', schema)
    return parsed.toString()
  } catch {
    if (url.includes('schema=')) return url
    const joiner = url.includes('?') ? '&' : '?'
    return `${url}${joiner}schema=${schema}`
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const baseDatabaseUrl = process.env.DATABASE_URL
const schemaName = resolveSchemaName()
const databaseUrl = baseDatabaseUrl ? appendSchemaToUrl(baseDatabaseUrl, schemaName) : undefined

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Export as both 'prisma' and 'db' for backwards compatibility
export const db = prisma
export default prisma
