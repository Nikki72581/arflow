const { execSync } = require('node:child_process')
const { URL } = require('node:url')

function normalizeSchemaName(name) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!normalized) return 'preview'
  return normalized.length > 63 ? normalized.slice(0, 63) : normalized
}

function resolveSchemaName() {
  const explicit = process.env.PRISMA_SCHEMA && process.env.PRISMA_SCHEMA.trim()
  if (explicit) return explicit
  const gitRef = process.env.VERCEL_GIT_COMMIT_REF
  if (gitRef && gitRef !== 'main') return normalizeSchemaName(gitRef)
  if (process.env.VERCEL_ENV === 'preview') return 'preview'
  return undefined
}

function appendSchemaToUrl(url, schema) {
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

const baseDatabaseUrl = process.env.DATABASE_URL
const schemaName = resolveSchemaName()
if (baseDatabaseUrl && schemaName) {
  process.env.DATABASE_URL = appendSchemaToUrl(baseDatabaseUrl, schemaName)
}

execSync('prisma migrate deploy', { stdio: 'inherit', env: process.env })
execSync('prisma generate', { stdio: 'inherit', env: process.env })
execSync('next build', { stdio: 'inherit', env: process.env })
