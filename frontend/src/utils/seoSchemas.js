import { SITE_NAME, BRAND_ALIASES, getSiteUrl, toAbsoluteUrl } from '../config/seo'

export function organizationSchema() {
  const url = getSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${url}/#organization`,
    name: SITE_NAME,
    alternateName: BRAND_ALIASES,
    url,
    logo: `${url}/favicon.svg`,
    email: 'support@aurumjewelco.com',
    telephone: '+92-321-4248458',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Shop #2',
      addressLocality: 'Lahore',
      addressCountry: 'PK'
    },
    sameAs: []
  }
}

export function localBusinessSchema() {
  const url = getSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    '@id': `${url}/#store`,
    name: SITE_NAME,
    alternateName: BRAND_ALIASES,
    url,
    email: 'support@aurumjewelco.com',
    telephone: '+92-321-4248458',
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Shop #2',
      addressLocality: 'Lahore',
      addressCountry: 'PK'
    }
  }
}

export function websiteSchema() {
  const url = getSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${url}/#website`,
    name: SITE_NAME,
    alternateName: BRAND_ALIASES,
    url,
    publisher: { '@id': `${url}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url}/products?search={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  }
}

export function productSchema(product) {
  if (!product) return null
  const images = (product.images || []).map((img) => toAbsoluteUrl(img)).filter(Boolean)
  const inStock = Number(product.countInStock || 0) > 0
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.metaDescription || product.description || '',
    image: images.length ? images : undefined,
    sku: String(product._id || ''),
    brand: {
      '@type': 'Brand',
      name: product.brand || SITE_NAME
    },
    offers: {
      '@type': 'Offer',
      url: `${getSiteUrl()}/product/${product._id}`,
      priceCurrency: 'INR',
      price: Number(product.price || 0),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition'
    }
  }
  if (Number(product.rating) > 0 && Number(product.reviews) > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(product.rating),
      reviewCount: Number(product.reviews)
    }
  }
  return schema
}

export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url ? toAbsoluteUrl(item.url) : undefined
    }))
  }
}

export function itemListSchema(products, listName = 'Jewellery Collection') {
  const url = getSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    itemListElement: (products || []).slice(0, 20).map((p, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${url}/product/${p._id}`,
      name: p.name
    }))
  }
}
