import React from 'react'
import { Helmet } from 'react-helmet-async'
import {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  TWITTER_HANDLE,
  buildCanonical,
  toAbsoluteUrl
} from '../config/seo'

function normalizeJsonLd(jsonLd) {
  if (!jsonLd) return []
  return Array.isArray(jsonLd) ? jsonLd.filter(Boolean) : [jsonLd]
}

const SeoHelmet = ({
  title,
  fullTitle = '',
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  noindex = false,
  jsonLd = null
}) => {
  const pageTitle = String(fullTitle || '').trim() || (title ? `${title} | ${SITE_NAME}` : SITE_NAME)
  const canonical = buildCanonical(path)
  const ogImage = toAbsoluteUrl(image)
  const schemas = normalizeJsonLd(jsonLd)

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <link rel="canonical" href={canonical} />
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : <meta name="robots" content="index, follow" />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}

      {schemas.map((schema, index) => (
        <script key={`jsonld-${index}`} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  )
}

export default SeoHelmet
