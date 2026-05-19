import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SeoHelmet from '../components/SeoHelmet'
import { itemListSchema } from '../utils/seoSchemas'
import { FaGem, FaFilter, FaEye, FaPlus, FaTrash } from 'react-icons/fa'
import './ProductListScreen.css'
import { formatPriceINR } from '../utils/formatPrice'
import { cartAPI, productsAPI } from '../services/api'

const ProductListScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cartItems, setCartItems] = useState([])
  const [cartBusyByProduct, setCartBusyByProduct] = useState({})
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest'
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setCartItems([])
      return
    }

    let active = true
    async function loadCart() {
      try {
        const { data } = await cartAPI.getCart()
        if (active) setCartItems(Array.isArray(data?.items) ? data.items : [])
      } catch {
        if (active) setCartItems([])
      }
    }
    loadCart()
    return () => {
      active = false
    }
  }, [])

  const isInCart = (productId) => {
    return cartItems.some((item) => String(item.product?._id || item.product) === String(productId))
  }

  const updateCartAction = async (product) => {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('Please sign up or log in to manage cart items.')
      return
    }

    const productId = product?._id
    if (!productId) return

    setCartBusyByProduct((prev) => ({ ...prev, [productId]: true }))
    try {
      if (isInCart(productId)) {
        const currentItem = cartItems.find((item) => String(item.product?._id || item.product) === String(productId))
        if (!currentItem?._id) throw new Error('Item not found in cart')
        const { data } = await cartAPI.removeFromCart(currentItem._id)
        setCartItems(Array.isArray(data?.items) ? data.items : [])
      } else {
        const { data } = await cartAPI.addToCart(productId, 1)
        setCartItems(Array.isArray(data?.items) ? data.items : [])
      }
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || 'Cart action failed')
    } finally {
      setCartBusyByProduct((prev) => ({ ...prev, [productId]: false }))
    }
  }

  useEffect(() => {
    const urlCategory = (searchParams.get('category') || '').trim()
    const urlMinPrice = (searchParams.get('minPrice') || '').trim()
    const urlMaxPrice = (searchParams.get('maxPrice') || '').trim()
    const urlSort = (searchParams.get('sort') || 'newest').trim() || 'newest'

    setFilters((prev) => {
      const next = {
        ...prev,
        category: urlCategory,
        minPrice: urlMinPrice,
        maxPrice: urlMaxPrice,
        sort: urlSort
      }
      if (
        next.category === prev.category &&
        next.minPrice === prev.minPrice &&
        next.maxPrice === prev.maxPrice &&
        next.sort === prev.sort
      ) {
        return prev
      }
      return next
    })
  }, [searchParams])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const search = (searchParams.get('search') || '').trim()
        const params = {
          search: search || undefined,
          category: filters.category || undefined,
          minPrice: filters.minPrice || undefined,
          maxPrice: filters.maxPrice || undefined,
          sort: filters.sort || undefined
        }
        const { data } = await productsAPI.getAll(params)
        if (active) setProducts(Array.isArray(data) ? data : [])
      } catch (e) {
        if (active) {
          setProducts([])
          const msg = e?.response?.data?.message || e?.message || 'Failed to load products'
          setError(
            msg === 'Network Error' || !e?.response
              ? 'Cannot reach the server. Check Railway backend is running and MONGO_URI is set, then refresh.'
              : msg
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [filters.category, filters.minPrice, filters.maxPrice, filters.sort, searchParams])

  const searchQuery = (searchParams.get('search') || '').trim()

  const handleFilterChange = (e) => {
    const { name } = e.target
    let { value } = e.target
    if (name === 'minPrice' || name === 'maxPrice') {
      value = String(value || '').replace(/[^\d]/g, '')
    }
    setFilters((prev) => ({ ...prev, [name]: value }))

    setSearchParams((prevParams) => {
      const next = new URLSearchParams(prevParams)
      if (value) next.set(name, value)
      else next.delete(name)
      if (name === 'sort' && !value) next.set('sort', 'newest')
      return next
    })
  }

  const categories = useMemo(() => {
    const set = new Set()
    for (const p of products) if (p?.category) set.add(p.category)
    return Array.from(set).sort()
  }, [products])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Curating sparkle...</p>
      </div>
    )
  }

  return (
    <div className="product-list-screen">
      <SeoHelmet
        title={searchQuery ? `Search: ${searchQuery}` : 'Shop Aurum Jewel Collections'}
        description="Shop Aurum Jewel Co. collections — rings, necklaces, earrings, and bracelets. Filter by category and price."
        keywords="aurum jewel shop, aurum jewel co, shop jewellery, rings, necklaces, earrings, bracelets, lahore jewellery"
        path={searchQuery ? `/products?search=${encodeURIComponent(searchQuery)}` : '/products'}
        jsonLd={itemListSchema(products, 'Shop Collections')}
      />
      <div className="container">
        <div className="page-header">
          <h1>Jewellery Collection</h1>
          <p>Discover your next signature piece.</p>
        </div>

        {error && (
          <div style={{ marginBottom: '1rem', color: '#b00020', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button
          type="button"
          className="filters-toggle"
          onClick={() => setShowFilters((open) => !open)}
          aria-expanded={showFilters}
        >
          <FaFilter />
          {showFilters ? 'Hide filters' : 'Show filters'}
        </button>

        <div className="products-layout">
          <aside className={`filters-sidebar ${showFilters ? 'is-open' : ''}`}>
            <div className="filters-header">
              <FaFilter />
              <h3>Filters</h3>
            </div>

            <div className="filter-group">
              <label>Category</label>
              <select name="category" value={filters.category} onChange={handleFilterChange}>
                <option value="">All Jewellery</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Price Range</label>
              <div className="price-inputs">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  name="minPrice"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={handleFilterChange}
                />
                <span>-</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  name="maxPrice"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={handleFilterChange}
                />
              </div>
            </div>

            <div className="filter-group">
              <label>Sort By</label>
              <select name="sort" value={filters.sort} onChange={handleFilterChange}>
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </aside>

          {/* Products Grid */}
          <main className="products-main">
            <div className="products-count">
              Showing {products.length} piece{products.length === 1 ? '' : 's'}
            </div>
            <div className="products-grid">
              {products.map((product) => (
                <div key={product._id} className="product-card">
                  <Link to={`/product/${product._id}`} className="product-image-link">
                    <div className="product-image-placeholder">
                      {product.images && product.images.length > 0 ? (
                        <img src={product.images[0]} alt={`${product.name} - ${product.category || 'jewellery'}`} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <FaGem />
                      )}
                    </div>
                  </Link>
                  <div className="product-info">
                    <span className="product-category">{product.category}</span>
                    <h3>{product.name}</h3>
                    <div className="product-rating">
                      ⭐ {product.rating}
                    </div>
                    <p className="product-sub">{product.metal}</p>
                    <p className="product-price">{formatPriceINR(product.price)}</p>
                    <div className="product-actions">
                      <Link to={`/product/${product._id}`} className="view-btn">
                        <FaEye /> View
                      </Link>
                      <button
                        type="button"
                        className={`add-btn ${isInCart(product._id) ? 'in-cart' : ''}`}
                        onClick={() => updateCartAction(product)}
                        disabled={Boolean(cartBusyByProduct[product._id])}
                      >
                        {isInCart(product._id) ? (
                          <>
                            <FaTrash /> Remove
                          </>
                        ) : (
                          <>
                            <FaPlus /> Add
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default ProductListScreen

