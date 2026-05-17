import { SITE_NAME, getSiteUrl, toAbsoluteUrl } from '../config/seo'

export function organizationSchema() {
  const url = getSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url,
    logo: `${url}/og-default.jpg`,
    email: 'support@aurumjewelco.com',
    address: {
      '@type': 'PostalAddress',
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
    name: SITE_NAME,
    url,
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
