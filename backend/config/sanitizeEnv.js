function stripQuotes(value) {
  const s = String(value || '').trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1).trim()
  }
  return s
}

function sanitizeEnv() {
  const keys = [
    'MONGO_URI',
    'JWT_SECRET',
    'GEMINI_API_KEY',
    'FRONTEND_URL',
    'SITE_URL',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'EMAIL_FROM'
  ]
  for (const key of keys) {
    if (process.env[key]) {
      process.env[key] = stripQuotes(process.env[key])
    }
  }
}

module.exports = { sanitizeEnv, stripQuotes }
