import React from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaCopy, FaExternalLinkAlt, FaSearch, FaLink, FaRocket, FaTools } from 'react-icons/fa'
import { adminAPI } from '../../services/api'
import { buildCanonical } from '../../config/seo'
import './AdminSeoScreen.css'

const TABS = [
  { id: 'onpage', label: 'On-Page SEO', icon: FaSearch },
  { id: 'parasite', label: 'Parasite SEO', icon: FaRocket },
  { id: 'offpage', label: 'Backlinks', icon: FaLink },
  { id: 'optimize', label: 'Optimize Site', icon: FaTools }
]

const PLATFORM_OPTIONS = [
  { id: 'medium', label: 'Medium' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'quora', label: 'Quora' },
  { id: 'reddit', label: 'Reddit' }
]

function copyText(text) {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard'))
}

const AdminSeoScreen = () => {
  const [tab, setTab] = React.useState('onpage')
  const [loadingAudit, setLoadingAudit] = React.useState(true)
  const [audit, setAudit] = React.useState(null)
  const [auditError, setAuditError] = React.useState('')
  const [selectedProductId, setSelectedProductId] = React.useState('')
  const [platform, setPlatform] = React.useState('medium')
  const [templateLoading, setTemplateLoading] = React.useState(false)
  const [templateData, setTemplateData] = React.useState(null)

  React.useEffect(() => {
    let active = true
    async function loadAudit() {
      setLoadingAudit(true)
      setAuditError('')
      try {
        const { data } = await adminAPI.getSeoAudit()
        if (active) {
          setAudit(data)
          if (data?.products?.length && !selectedProductId) {
            setSelectedProductId(String(data.products[0]._id))
          }
        }
      } catch (e) {
        if (active) setAuditError(e?.response?.data?.message || e.message || 'Failed to load SEO audit')
      } finally {
        if (active) setLoadingAudit(false)
      }
    }
    loadAudit()
    return () => {
      active = false
    }
  }, [])

  const loadTemplate = React.useCallback(async () => {
    if (!selectedProductId) return
    setTemplateLoading(true)
    try {
      const { data } = await adminAPI.getParasiteTemplate(selectedProductId)
      setTemplateData(data)
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Failed to load template')
    } finally {
      setTemplateLoading(false)
    }
  }, [selectedProductId])

  React.useEffect(() => {
    if (tab === 'parasite' && selectedProductId) loadTemplate()
  }, [tab, selectedProductId, loadTemplate])

  const activeTemplate = templateData?.templates?.[platform] || ''
  const siteUrl = buildCanonical('/').replace(/\/$/, '')

  return (
    <div className="admin-seo-screen">
      <Helmet>
        <title>SEO Growth Hub | Admin</title>
      </Helmet>
      <div className="container">
        <div className="seo-header">
          <h1>SEO Growth Hub</h1>
          <p>On-page SEO, parasite content, backlinks, and site optimization for Aurum Jewel Co.</p>
          <div className="seo-links">
            <a href="/sitemap.xml" target="_blank" rel="noreferrer">
              View sitemap.xml <FaExternalLinkAlt />
            </a>
            <a href="/robots.txt" target="_blank" rel="noreferrer">
              View robots.txt <FaExternalLinkAlt />
            </a>
            <span>Canonical base: {siteUrl}</span>
          </div>
        </div>

        <div className="seo-tabs">
          {TABS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? 'active' : ''}
                onClick={() => setTab(item.id)}
              >
                <Icon /> {item.label}
              </button>
            )
          })}
        </div>

        {tab === 'onpage' && (
          <div className="seo-panel">
            <h2>On-Page SEO Audit</h2>
            <p>Improve titles, descriptions, keywords, images, and content inside your website.</p>
            {loadingAudit && <p>Loading audit...</p>}
            {auditError && <p className="seo-error">{auditError}</p>}
            {audit?.summary && (
              <div className="seo-summary">
                <div><strong>{audit.summary.totalProducts}</strong><span>Products</span></div>
                <div><strong>{audit.summary.good}</strong><span>Good</span></div>
                <div><strong>{audit.summary.needsWork}</strong><span>Needs work</span></div>
                <div><strong>{audit.summary.critical}</strong><span>Critical</span></div>
              </div>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Issues</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(audit?.products || []).map((row) => (
                    <tr key={row._id}>
                      <td>{row.name}</td>
                      <td>{row.score}/{row.maxScore}</td>
                      <td><span className={`seo-badge ${row.status}`}>{row.status}</span></td>
                      <td>{row.issues.join(', ') || 'All good'}</td>
                      <td>
                        <Link to={`/admin/product/${row._id}/edit`}>Edit SEO</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'parasite' && (
          <div className="seo-panel">
            <h2>Parasite SEO Templates</h2>
            <p>Publish on high-authority platforms (Medium, LinkedIn, Quora, Reddit) and link back to your product page.</p>
            <div className="seo-controls">
              <label>
                Product
                <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                  {(audit?.products || []).map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Platform
                <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  {PLATFORM_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={loadTemplate} disabled={templateLoading}>
                {templateLoading ? 'Loading...' : 'Refresh template'}
              </button>
            </div>
            {templateData?.productUrl && (
              <p className="template-url">Target URL: <a href={templateData.productUrl}>{templateData.productUrl}</a></p>
            )}
            <textarea readOnly rows={14} value={activeTemplate} />
            <button type="button" className="copy-btn" onClick={() => copyText(activeTemplate)}>
              <FaCopy /> Copy template
            </button>
          </div>
        )}

        {tab === 'offpage' && (
          <div className="seo-panel">
            <h2>Off-Page SEO & Backlink Outreach</h2>
            <p>Backlinks are trust signals from other websites. Focus on quality mentions, not spam links.</p>
            <ul className="seo-checklist">
              <li>Guest post on jewellery/fashion blogs with a link to your homepage or product page.</li>
              <li>Share product stories on Instagram, Facebook, and LinkedIn with your website URL.</li>
              <li>Answer Quora questions and include helpful links only when relevant.</li>
              <li>List your business on Google Business Profile and local directories.</li>
              <li>Ask happy customers for reviews that mention your brand name.</li>
            </ul>
            <h3>Outreach email template</h3>
            <textarea
              readOnly
              rows={10}
              value={templateData?.backlinkPitch || `Hi,\n\nI run Aurum Jewel Co., a fine jewellery store in Lahore. We publish helpful buying guides and product pages.\n\nWebsite: ${siteUrl}\n\nIf relevant to your audience, we would appreciate a mention or backlink.\n\nThank you!`}
            />
            <button
              type="button"
              className="copy-btn"
              onClick={() => copyText(templateData?.backlinkPitch || `Website: ${siteUrl}`)}
            >
              <FaCopy /> Copy outreach email
            </button>
            {selectedProductId && (
              <button type="button" className="copy-btn secondary" onClick={loadTemplate}>
                Load product-specific pitch
              </button>
            )}
          </div>
        )}

        {tab === 'optimize' && (
          <div className="seo-panel">
            <h2>Optimize Website Performance</h2>
            <ul className="seo-checklist">
              <li>Use compressed images (WebP) and lazy loading on product cards.</li>
              <li>Keep page titles unique and under 60 characters.</li>
              <li>Keep meta descriptions between 150-160 characters.</li>
              <li>Ensure mobile-friendly layout and fast checkout.</li>
              <li>Use HTTPS in production and set `VITE_SITE_URL` + `SITE_URL` to your live domain.</li>
              <li>Submit sitemap in Google Search Console: {siteUrl}/sitemap.xml</li>
            </ul>
            <div className="tool-links">
              <a href="https://pagespeed.web.dev/" target="_blank" rel="noreferrer">
                Google PageSpeed Insights <FaExternalLinkAlt />
              </a>
              <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer">
                Google Search Console <FaExternalLinkAlt />
              </a>
              <a href="https://gtmetrix.com/" target="_blank" rel="noreferrer">
                GTmetrix <FaExternalLinkAlt />
              </a>
            </div>
            <h3>SEM Competitor Research (manual)</h3>
            <p>
              Use SEMrush, Ahrefs, or SpyFu to track competitor keywords, paid ads, and traffic sources.
              Export keyword gaps and update your product SEO fields accordingly.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminSeoScreen
