const fs = require('fs')
const path = require('path')

/**
 * Cursor environments sometimes block creating `.env` files.
 * This helper loads `backend/env.local.json` (if present) and
 * merges values into `process.env` for local development.
 */
function loadEnvFromJson() {
  const envPath = path.join(__dirname, '..', 'env.local.json')
  if (!fs.existsSync(envPath)) return

  try {
    const raw = fs.readFileSync(envPath, 'utf-8')
    const json = JSON.parse(raw)
    for (const [k, v] of Object.entries(json)) {
      if (process.env[k] == null && v != null) {
        process.env[k] = String(v)
      }
    }
  } catch (e) {
    console.warn('Failed to load env.local.json:', e.message)
  }
}

module.exports = loadEnvFromJson





