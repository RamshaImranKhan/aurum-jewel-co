import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SeoHelmet from '../components/SeoHelmet'
import { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS } from '../config/seo'
import { organizationSchema, websiteSchema, itemListSchema } from '../utils/seoSchemas'
import { FaArrowRight, FaGem, FaShippingFast, FaHeadset, FaShieldAlt, FaRegStar } from 'react-icons/fa'
import './HomeScreen.css'
import { formatPriceINR } from '../utils/formatPrice'
import { productsAPI } from '../services/api'

const HomeScreen = () => {
  const [featured, setFeatured] = useState([])
  const [loadingFeatured, setLoadingFeatured] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const { data } = await productsAPI.getAll({ sort: 'rating' })
        const picks = Array.isArray(data) ? data.slice(0, 4) : []
        if (active) setFeatured(picks)
      } catch (e) {
        if (active) setFeatured([])
      } finally {
        if (active) setLoadingFeatured(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="home-screen">
      <SeoHelmet
        title="Fine Jewellery Online"
        description={DEFAULT_DESCRIPTION}
        keywords={DEFAULT_KEYWORDS}
        path="/"
        jsonLd={[organizationSchema(), websiteSchema(), itemListSchema(featured, 'Signature Picks')]}
      />
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <p className="hero-eyebrow">Fine jewellery, made for everyday glow</p>
          <h1>Aurum Jewel Co.</h1>
          <p>Rings, necklaces, earrings, and bracelets — crafted to shine and made to last.</p>
          <Link to="/products" className="cta-button">
            Shop the collection <FaArrowRight />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="features-container">
          <div className="feature-card">
            <FaShippingFast className="feature-icon" />
            <h3>Fast shipping</h3>
            <p>Free over Rs 75</p>
          </div>
          <div className="feature-card">
            <FaShieldAlt className="feature-icon" />
            <h3>Secure checkout</h3>
            <p>Protected payments</p>
          </div>
          <div className="feature-card">
            <FaHeadset className="feature-icon" />
            <h3>Concierge support</h3>
            <p>We’re here to help</p>
          </div>
          <div className="feature-card">
            <FaGem className="feature-icon" />
            <h3>Gift-ready</h3>
            <p>Luxury packaging included</p>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="featured-products">
        <div className="container">
          <h2>Signature Picks</h2>
          <div className="products-grid">
            {loadingFeatured ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#7f8c8d' }}>
                Loading signature picks…
              </div>
            ) : featured.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#7f8c8d' }}>
                No products yet. Run the backend seed script to add jewellery items.
              </div>
            ) : (
              featured.map((p) => (
                <div key={p._id} className="product-card">
                  <div className="product-image-placeholder">
                    {p.images && p.images.length > 0 ? (
                      <img src={p.images[0]} alt={`${p.name} - ${p.category || 'jewellery'}`} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <FaRegStar />
                    )}
                  </div>
                  <div className="product-info">
                    <h3>{p.name}</h3>
                    <p className="product-price">{formatPriceINR(p.price)}</p>
                    <Link to={`/product/${p._id}`} className="view-product-btn">
                      View Product
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="view-all">
            <Link to="/products" className="view-all-btn">
              Explore all jewellery
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomeScreen

