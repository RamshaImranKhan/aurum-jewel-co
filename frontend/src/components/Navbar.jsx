import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FaShoppingCart, FaUser, FaSearch, FaBars, FaTimes, FaGem, FaArrowLeft } from 'react-icons/fa'
import { formatPriceINR } from '../utils/formatPrice'
import './Navbar.css'
import { cartAPI, productsAPI } from '../services/api'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = localStorage.getItem('token')
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')

  const isAdminRoute = location.pathname.startsWith('/admin')

  useEffect(() => {
    let active = true
    async function loadCartCount() {
      if (!isAuthenticated) {
        if (active) setCartCount(0)
        return
      }
      try {
        const { data } = await cartAPI.getCart()
        const count = (data?.items || []).reduce((sum, i) => sum + Number(i.qty || 0), 0)
        if (active) setCartCount(count)
      } catch (e) {
        if (active) setCartCount(0)
      }
    }
    loadCartCount()
    return () => {
      active = false
    }
  }, [isAuthenticated])

  useEffect(() => {
    let timeoutId
    if (searchQuery.trim().length >= 1) {
      setIsSearching(true)
      setShowSearchDropdown(true)
      timeoutId = setTimeout(async () => {
        try {
          const { data } = await productsAPI.getAll({ search: searchQuery, prefix: 'true' })
          setSearchResults(data.slice(0, 5)) // Limit to 5 results
        } catch (error) {
          console.error('Search error:', error)
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      }, 300) // 300ms debounce
    } else {
      setSearchResults([])
      setShowSearchDropdown(false)
      setIsSearching(false)
    }

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Close dropdown when picking an item
  const handleSelectProduct = (id) => {
    setSearchQuery('')
    setShowSearchDropdown(false)
    setIsMenuOpen(false)
    navigate(`/product/${id}`)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setShowSearchDropdown(false)
      navigate(`/products?search=${searchQuery}`)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    setCartCount(0)
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <h2 className="brand">
            <FaGem /> Aurum Jewel Co.
          </h2>
        </Link>

        <div className="navbar-search">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search rings, necklaces, earrings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              <FaSearch />
            </button>
          </form>
          
          {showSearchDropdown && (
            <div className="search-dropdown">
              {isSearching ? (
                <div className="search-dropdown-item text-center">Loading...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map(product => (
                  <div 
                    key={product._id} 
                    className="search-dropdown-item"
                    onClick={() => handleSelectProduct(product._id)}
                  >
                    <div className="search-item-img">
                      {product.images && product.images.length > 0 ? (
                        <img src={product.images[0]} alt={product.name} />
                      ) : (
                        <FaGem />
                      )}
                    </div>
                    <div className="search-item-info">
                      <div className="search-item-name">{product.name}</div>
                      <div className="search-item-price">{formatPriceINR(product.price)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="search-dropdown-item text-center">No products found</div>
              )}
            </div>
          )}
        </div>

        <div className="navbar-menu">
          {!isAdminRoute && (
            <>
              <Link to="/products" className="navbar-link">
                Shop
              </Link>
              <Link to="/cart" className="navbar-link cart-link">
                <FaShoppingCart />
                <span className="cart-badge">{cartCount}</span>
              </Link>
            </>
          )}

          {isAdminRoute && (
            <Link to="/" className="navbar-link">
              <FaArrowLeft /> Storefront
            </Link>
          )}

          {isAuthenticated ? (
            <div className="navbar-user">
              {userInfo.isAdmin && !isAdminRoute && (
                <Link to="/admin/dashboard" className="navbar-link">
                  Admin
                </Link>
              )}
              <Link to="/profile" className="navbar-link">
                <FaUser />
              </Link>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="navbar-link">
              Sign In
            </Link>
          )}
        </div>

        <div className="navbar-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </div>
      </div>

      {isMenuOpen && (
        <div className="navbar-mobile-menu">
          <form onSubmit={handleSearch} className="mobile-search-form">
            <input
              type="text"
              placeholder="Search jewellery..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input mobile-search-input"
            />
            <button type="submit" className="search-button mobile-search-button">
              <FaSearch />
            </button>
          </form>

          {!isAdminRoute && (
            <>
              <Link to="/products" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                Shop
              </Link>
              <Link to="/cart" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                Cart
              </Link>
            </>
          )}

          {isAdminRoute && (
            <Link to="/" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
              Back to Storefront
            </Link>
          )}

          {isAuthenticated ? (
            <>
              {userInfo.isAdmin && !isAdminRoute && (
                <Link to="/admin/dashboard" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                  Admin Dashboard
                </Link>
              )}
              <Link to="/profile" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                Profile
              </Link>
              <button onClick={handleLogout} className="mobile-link logout-btn">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar

