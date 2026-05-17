const express = require('express')
const Product = require('../models/Product')

const router = express.Router()

function getSiteUrl(req) {
  const fromEnv = String(process.env.SITE_URL || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http'
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000'
  return `${proto}://${host}`.replace(/\/$/, '')
}

function xmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

router.get('/robots.txt', (req, res) => {
  const siteUrl = getSiteUrl(req)
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /checkout',
    'Disallow: /cart',
    'Disallow: /profile',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /order/',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    ''
  ].join('\n')
  res.type('text/plain').send(body)
})

router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const siteUrl = getSiteUrl(req)
    const products = await Product.find({}).select('_id updatedAt').lean().exec()
    const staticPaths = ['/', '/products', '/login', '/register']

    const urls = [
      ...staticPaths.map((path) => ({
        loc: `${siteUrl}${path === '/' ? '' : path}`,
        lastmod: new Date().toISOString()
      })),
      ...products.map((p) => ({
        loc: `${siteUrl}/product/${p._id}`,
        lastmod: new Date(p.updatedAt || Date.now()).toISOString()
      }))
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (row) => `  <url>
    <loc>${xmlEscape(row.loc)}</loc>
    <lastmod>${xmlEscape(row.lastmod)}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>`

    res.type('application/xml').send(xml)
  } catch (e) {
    next(e)
  }
})

module.exports = router
