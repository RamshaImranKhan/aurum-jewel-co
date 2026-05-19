export const LIVE_SITE_URL = 'https://aurum-jewel-co.vercel.app'

export const SITE_NAME = 'Aurum Jewel Co.'
export const BRAND_ALIASES = ['Aurum Jewel', 'Aurum Jewel Co', 'Aurum Jewellery', 'Aurum Jewelry']
export const SITE_TAGLINE = 'Fine jewellery — crafted for everyday glow'
export const DEFAULT_DESCRIPTION =
  'Aurum Jewel Co. — shop Aurum Jewel fine jewellery online. Rings, necklaces, earrings, and bracelets with secure checkout and delivery in Pakistan.'
export const DEFAULT_KEYWORDS =
  'aurum jewel, aurum jewel co, aurum jewellery, aurum jewelry, fine jewellery, rings, necklaces, earrings, Lahore, Pakistan'
export const DEFAULT_OG_IMAGE =
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&q=80'
export const TWITTER_HANDLE = '@aurumjewelco'
export const CONTACT_EMAIL = 'support@aurumjewelco.com'

export function getSiteUrl() {
  const fromEnv = String(import.meta.env.VITE_SITE_URL || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (import.meta.env.PROD) return LIVE_SITE_URL
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return 'http://localhost:3000'
}

export function buildCanonical(path = '/') {
  const base = getSiteUrl()
  if (!path || path === '/') return `${base}/`
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}

export function toAbsoluteUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${getSiteUrl()}${url.startsWith('/') ? url : `/${url}`}`
}
