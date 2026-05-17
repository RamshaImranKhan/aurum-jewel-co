import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import SeoHelmet from '../components/SeoHelmet'
import { productSchema, breadcrumbSchema } from '../utils/seoSchemas'
import { FaShoppingCart, FaHeart, FaStar, FaMinus, FaPlus, FaGem, FaCertificate } from 'react-icons/fa'
import './ProductDetailScreen.css'
import { formatPriceINR } from '../utils/formatPrice'
import { cartAPI, productsAPI } from '../services/api'

const ProductDetailScreen = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const { data } = await productsAPI.getById(id)
        if (active) setProduct(data)
      } catch (e) {
        if (active) {
          setProduct(null)
          setError(e?.response?.data?.message || e?.message || 'Failed to load product')
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [id])

  const handleAddToCart = async () => {
    const token = localStorage.getItem('token')
    if (!token) return navigate('/register')
    try {
      await cartAPI.addToCart(product._id, quantity)
      navigate('/cart')
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || 'Failed to add to cart')
    }
  }

  const handleBuyNow = async () => {
    const token = localStorage.getItem('token')
    if (!token) return navigate('/register')
    try {
      await cartAPI.addToCart(product._id, quantity)
      navigate('/checkout')
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || 'Failed to proceed to checkout')
    }
  }

  const increaseQuantity = () => {
    setQuantity(quantity + 1)
  }

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  if (loading) {
    return (
      <div className="product-detail-screen">
        <div className="container">
          <div className="not-found">
            <h2>Loading…</h2>
            <p>Fetching product details.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="product-detail-screen">
        <div className="container">
          <div className="not-found">
            <h2>Piece not found</h2>
            <p>{error || 'That item isn’t in our catalog right now.'}</p>
            <Link className="buy-now-btn" to="/products">
              Back to shop
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="product-detail-screen">
      <SeoHelmet
        fullTitle={product.metaTitle || ''}
        title={product.name}
        description={product.metaDescription || product.description}
        keywords={product.metaKeywords}
        path={`/product/${product._id}`}
        image={product.images?.[0]}
        type="product"
        jsonLd={[
          productSchema(product),
          breadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Shop', url: '/products' },
            { name: product.name, url: `/product/${product._id}` }
          ])
        ]}
      />
      <div className="container">
        <div className="product-detail-layout">
          {/* Product Images */}
          <div className="product-images">
            <div className="main-image">
              <div className="image-placeholder">
                {product.images && product.images[selectedImage] ? (
                  <img src={product.images[selectedImage]} alt={`${product.name} - ${product.category || 'jewellery'}`} loading="eager" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <><FaGem /></>
                )}
              </div>
            </div>
            <div className="thumbnail-images">
              {(product.images || []).map((img, index) => (
                <div
                  key={index}
                  className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                  onClick={() => setSelectedImage(index)}
                >
                  <img src={img} alt={`${product.name} thumbnail ${index + 1}`} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="product-info-section">
            <h1>{product.name}</h1>
            <div className="product-meta">
              <span className="meta-pill">{product.category}</span>
              <span className="meta-pill">{product.metal}</span>
              {product.gemstone && product.gemstone !== '—' && <span className="meta-pill">{product.gemstone}</span>}
            </div>

            <div className="product-rating-section">
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    className={i < Math.floor(product.rating) ? 'filled' : ''}
                  />
                ))}
              </div>
              <span className="rating-text">
                {product.rating} ({product.reviews} reviews)
              </span>
            </div>

            <div className="product-pricing">
              <span className="current-price">{formatPriceINR(product.price)}</span>
            </div>

            <div className="product-description">
              <h3>Details</h3>
              <p>{product.description}</p>
            </div>

            <div className="product-features">
              <h3>Why you’ll love it</h3>
              <ul>
                {product.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>

            <div className="authenticity">
              <FaCertificate />
              <div>
                <strong>Hallmark</strong>
                <p>{product.hallmark || '—'}</p>
              </div>
            </div>

            <div className="quantity-selector">
              <label>Quantity:</label>
              <div className="quantity-controls">
                <button onClick={decreaseQuantity} className="qty-btn">
                  <FaMinus />
                </button>
                <span className="quantity">{quantity}</span>
                <button onClick={increaseQuantity} className="qty-btn">
                  <FaPlus />
                </button>
              </div>
            </div>

            <div className="product-actions">
              <button onClick={handleAddToCart} className="add-to-cart-btn">
                <FaShoppingCart /> Add to Cart
              </button>
              <button onClick={handleBuyNow} className="buy-now-btn">
                Buy Now
              </button>
              <button className="wishlist-btn">
                <FaHeart />
              </button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="reviews-section">
          <h2>Customer Reviews</h2>
          <div className="reviews-list">
            {[1, 2, 3].map((review) => (
              <div key={review} className="review-card">
                <div className="review-header">
                  <div className="reviewer-info">
                    <div className="reviewer-avatar">U</div>
                    <div>
                      <h4>Customer {review}</h4>
                      <div className="review-stars">
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} className={i < 4 ? 'filled' : ''} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="review-date">2 days ago</span>
                </div>
                <p className="review-text">
                  Stunning in person — the finish is beautiful and it arrived in perfect packaging.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetailScreen

