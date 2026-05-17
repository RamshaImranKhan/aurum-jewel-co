export const SITE_NAME = 'Aurum Jewel Co.'
export const SITE_TAGLINE = 'Fine jewellery — crafted for everyday glow'
export const DEFAULT_DESCRIPTION =
  'Shop luxury rings, necklaces, earrings, and bracelets. Hallmarked fine jewellery with secure checkout and fast shipping in Pakistan.'
export const DEFAULT_KEYWORDS =
  'jewellery, fine jewellery, gold jewellery, rings, necklaces, earrings, Lahore, Pakistan, Aurum Jewel Co'
export const DEFAULT_OG_IMAGE =
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&q=80'
export const TWITTER_HANDLE = '@aurumjewelco'
export const CONTACT_EMAIL = 'support@aurumjewelco.com'

export function getSiteUrl() {
  const fromEnv = String(import.meta.env.VITE_SITE_URL || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
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
