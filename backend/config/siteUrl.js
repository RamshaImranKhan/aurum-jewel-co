const LIVE_SITE_URL = 'https://aurum-jewel-co.vercel.app'

function getSiteUrl(req) {
  const fromEnv = String(process.env.SITE_URL || process.env.FRONTEND_URL || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (req) {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https'
    const host = req.get('x-forwarded-host') || req.get('host')
    if (host && !String(host).includes('railway.app')) {
      return `${proto}://${host}`.replace(/\/$/, '')
    }
  }
  return LIVE_SITE_URL
}

module.exports = { LIVE_SITE_URL, getSiteUrl }
