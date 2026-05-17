import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FaGem, FaTrash, FaEye, FaCartPlus, FaCheck } from 'react-icons/fa'
import './MyListScreen.css'
import { formatPriceINR } from '../utils/formatPrice'
import { cartAPI } from '../services/api'

const MyListScreen = () => {
  const [myList, setMyList] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [addingToCart, setAddingToCart] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Load user info
    const rawUser = localStorage.getItem('user')
    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser))
      } catch {
        setUser(null)
      }
    }

    // Load my list from localStorage
    const saved = localStorage.getItem('aurum_product_list')
    if (saved) {
      try {
        setMyList(JSON.parse(saved))
      } catch {
        setMyList([])
      }
    }

    // Load cart items if user is logged in
    loadCart()
    setLoading(false)
  }, [])

  const loadCart = async () => {
    try {
      const rawUser = localStorage.getItem('user')
      if (rawUser) {
        const { data } = await cartAPI.getCart()
        setCartItems(data?.items || [])
      }
    } catch (e) {
      setCartItems([])
    }
  }

  const removeFromList = (productId) => {
    const updated = myList.filter(p => p._id !== productId)
    setMyList(updated)
    localStorage.setItem('aurum_product_list', JSON.stringify(updated))
  }

  const clearList = () => {
    if (window.confirm('Are you sure you want to clear your entire list?')) {
      setMyList([])
      localStorage.removeItem('aurum_product_list')
    }
  }

  const isInCart = (productId) => {
    return cartItems.some(item => String(item.product?._id || item.product) === String(productId))
  }

  const addToCart = async (product) => {
    if (!user) {
      alert('Please log in to add items to cart')
      navigate('/login')
      return
    }

    setAddingToCart(product._id)
    try {
      await cartAPI.addToCart(product._id, 1)
      // Reload cart
      const { data } = await cartAPI.getCart()
      setCartItems(data?.items || [])
      
      setTimeout(() => {
        setAddingToCart(null)
      }, 1500)
    } catch (e) {
      alert('Failed to add to cart: ' + (e?.response?.data?.message || e?.message))
      setAddingToCart(null)
    }
  }

  const removeFromCart = async (itemId) => {
    try {
      await cartAPI.removeFromCart(itemId)
      // Reload cart
      const { data } = await cartAPI.getCart()
      setCartItems(data?.items || [])
    } catch (e) {
      alert('Failed to remove from cart: ' + (e?.response?.data?.message || e?.message))
    }
  }

  const getCartItemId = (productId) => {
    const item = cartItems.find(item => String(item.product?._id || item.product) === String(productId))
    return item?._id
  }

  const calculateTotal = () => {
    return myList.reduce((sum, p) => sum + (p.price || 0), 0)
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your list...</p>
      </div>
    )
  }

  return (
    <div className="my-list-screen">
      <Helmet>
        <title>My Product List | Aurum Jewel Co.</title>
        <meta name="description" content="View and manage your saved jewelry list." />
      </Helmet>
      <div className="container">
        <div className="page-header">
          <h1>💎 My Product List</h1>
          <p>Save your favorite pieces and compare them.</p>
        </div>

        {myList.length === 0 ? (
          <div className="empty-list">
            <FaGem className="empty-icon" />
            <h2>Your list is empty</h2>
            <p>Start adding products from our collection to your list!</p>
            <Link to="/products" className="browse-btn">
              Browse Collection
            </Link>
          </div>
        ) : (
          <div className="list-container">
            <div className="list-header">
              <span className="count-badge">{myList.length} product{myList.length === 1 ? '' : 's'} in your list</span>
              <button className="clear-btn" onClick={clearList}>
                <FaTrash /> Clear All
              </button>
            </div>

            <div className="products-grid-list">
              {myList.map((product) => (
                <div key={product._id} className="product-card-list">
                  <div className="product-image-container">
                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.name} className="product-img" />
                    ) : (
                      <div className="no-image"><FaGem /></div>
                    )}
                  </div>

                  <div className="product-details">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-metal">{product.metal}</p>
                    <p className="product-gemstone">{product.gemstone}</p>
                    
                    <div className="product-meta">
                      <span className="category-badge">{product.category}</span>
                      <span className="rating-badge">⭐ {product.rating || 0}</span>
                    </div>

                    <div className="product-price-section">
                      <span className="product-price">{formatPriceINR(product.price)}</span>
                      {product.originalPrice && (
                        <span className="original-price">{formatPriceINR(product.originalPrice)}</span>
                      )}
                    </div>
                  </div>

                  <div className="product-actions-list">
                    <Link
                      to={`/product/${product._id}`}
                      className="action-link view-link"
                      title="View full details"
                    >
                      <FaEye /> View Details
                    </Link>

                    {user ? (
                      <>
                        {isInCart(product._id) ? (
                          <button
                            className="action-btn remove-cart-btn"
                            onClick={() => removeFromCart(getCartItemId(product._id))}
                            title="Remove from cart"
                          >
                            <FaTrash /> Remove from Cart
                          </button>
                        ) : (
                          <button
                            className={`action-btn add-cart-btn ${addingToCart === product._id ? 'loading' : ''}`}
                            onClick={() => addToCart(product)}
                            disabled={addingToCart === product._id}
                            title="Add to cart"
                          >
                            {addingToCart === product._id ? (
                              <>✓ Added!</>
                            ) : (
                              <><FaCartPlus /> Add to Cart</>
                            )}
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        className="action-btn login-btn"
                        onClick={() => navigate('/login')}
                        title="Login to add to cart"
                      >
                        <FaCartPlus /> Login to Cart
                      </button>
                    )}

                    <button
                      className="action-btn remove-list-btn"
                      onClick={() => removeFromList(product._id)}
                      title="Remove from this list"
                    >
                      <FaTrash /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="list-footer">
              <div className="total-section">
                <span className="total-label">💰 Total Value:</span>
                <span className="total-price">{formatPriceINR(calculateTotal())}</span>
              </div>
              <div className="footer-actions">
                <Link to="/products" className="continue-btn">
                  Continue Shopping
                </Link>
                {user && (
                  <Link to="/cart" className="checkout-btn">
                    Go to Cart
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyListScreen
