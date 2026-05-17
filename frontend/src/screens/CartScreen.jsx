import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaTrash, FaMinus, FaPlus, FaShoppingBag } from 'react-icons/fa'
import './CartScreen.css'
import { formatPriceINR } from '../utils/formatPrice'
import { cartAPI } from '../services/api'

const CartScreen = () => {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cart, setCart] = useState({ items: [] })
  const [couponCode, setCouponCode] = useState('')
  const [couponBusy, setCouponBusy] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      if (!token) {
        if (active) {
          setCart({ items: [] })
          setLoading(false)
        }
        return
      }
      setLoading(true)
      setError('')
      try {
        const { data } = await cartAPI.getCart()
        if (active) setCart(data || { items: [] })
      } catch (e) {
        if (active) setError(e?.response?.data?.message || e?.message || 'Failed to load cart')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [token])

  const removeFromCart = async (itemId) => {
    try {
      const { data } = await cartAPI.removeFromCart(itemId)
      setCart(data)
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || 'Failed to remove item')
    }
  }

  const updateQuantity = async (item, change) => {
    const newQty = Math.max(1, Number(item.qty || 1) + change)
    try {
      const { data } = await cartAPI.updateCartItem(item._id, newQty)
      setCart(data)
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || 'Failed to update quantity')
    }
  }

  const cartItems = useMemo(() => cart?.items || [], [cart])
  const appliedCoupon = cart?.coupon || { code: '', discountType: 'none', discountValue: 0 }
  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)
  const shippingBase = subtotal >= 75 ? 0 : cartItems.length ? 10 : 0
  const shipping = appliedCoupon.discountType === 'shipping' ? 0 : shippingBase
  const tax = Number((subtotal * 0.1).toFixed(2))
  const discount = (() => {
    if (appliedCoupon.discountType === 'percent') {
      return Number(((subtotal * Number(appliedCoupon.discountValue || 0)) / 100).toFixed(2))
    }
    if (appliedCoupon.discountType === 'flat') {
      return Number(Math.min(subtotal, Number(appliedCoupon.discountValue || 0)).toFixed(2))
    }
    return 0
  })()
  const total = Math.max(0, subtotal + shipping + tax - discount)

  const applyCoupon = async () => {
    const code = String(couponCode || '').trim().toUpperCase()
    if (!code) return
    setCouponBusy(true)
    try {
      const { data } = await cartAPI.applyCoupon(code)
      setCart(data || { items: [] })
      setCouponCode('')
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || 'Failed to apply coupon')
    } finally {
      setCouponBusy(false)
    }
  }

  const removeCoupon = async () => {
    setCouponBusy(true)
    try {
      const { data } = await cartAPI.removeCoupon()
      setCart(data || { items: [] })
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || 'Failed to remove coupon')
    } finally {
      setCouponBusy(false)
    }
  }

  if (!token) {
    return (
      <div className="cart-screen empty-cart">
        <div className="empty-cart-content">
          <FaShoppingBag className="empty-cart-icon" />
          <h2>Please sign up</h2>
          <p>Your cart is linked to your account.</p>
          <Link to="/register" className="shop-now-btn">
            Sign Up
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="cart-screen empty-cart">
        <div className="empty-cart-content">
          <div className="spinner"></div>
          <p>Loading cart…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="cart-screen empty-cart">
        <div className="empty-cart-content">
          <h2>Couldn’t load cart</h2>
          <p>{error}</p>
          <Link to="/products" className="shop-now-btn">
            Back to shop
          </Link>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="cart-screen empty-cart">
        <div className="empty-cart-content">
          <FaShoppingBag className="empty-cart-icon" />
          <h2>Your cart is empty</h2>
          <p>Start shopping to add items to your cart</p>
          <Link to="/products" className="shop-now-btn">
            Shop Now
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-screen">
      <div className="container">
        <h1 className="page-title">Shopping Cart</h1>

        <div className="cart-layout">
          <div className="cart-items-section">
            {cartItems.map((item) => (
              <div key={item._id} className="cart-item">
                <div className="item-image">
                  <div className="image-placeholder">
                    {item.image ? (
                      <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <FaShoppingBag />
                    )}
                  </div>
                </div>
                <div className="item-details">
                  <h3>{item.name}</h3>
                  <p className="item-price">{formatPriceINR(item.price)}</p>
                </div>
                <div className="item-quantity">
                  <button onClick={() => updateQuantity(item, -1)} className="qty-btn">
                    <FaMinus />
                  </button>
                  <span className="quantity">{item.qty}</span>
                  <button onClick={() => updateQuantity(item, 1)} className="qty-btn">
                    <FaPlus />
                  </button>
                </div>
                <div className="item-total">
                  <p>{formatPriceINR(Number(item.price || 0) * Number(item.qty || 0))}</p>
                </div>
                <button onClick={() => removeFromCart(item._id)} className="remove-btn">
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h2>Order Summary</h2>
            <div className="coupon-box">
              <label htmlFor="couponCode">Coupon Code</label>
              <div className="coupon-row">
                <input
                  id="couponCode"
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g. SAVE10)"
                  disabled={couponBusy}
                />
                <button
                  type="button"
                  className="coupon-apply-btn"
                  onClick={applyCoupon}
                  disabled={couponBusy || !couponCode.trim()}
                >
                  Apply
                </button>
              </div>
              <div className="coupon-help">
                Available: SAVE10 (10% off), FLAT5 (Rs. 5 off), FREESHIP (Free shipping)
              </div>
              {appliedCoupon.code && (
                <div className="coupon-applied">
                  Applied: <strong>{appliedCoupon.code}</strong>
                  <button type="button" className="coupon-remove-btn" onClick={removeCoupon} disabled={couponBusy}>
                    Remove
                  </button>
                </div>
              )}
            </div>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatPriceINR(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : formatPriceINR(shipping)}</span>
            </div>
            <div className="summary-row">
              <span>Tax</span>
              <span>{formatPriceINR(tax)}</span>
            </div>
            {discount > 0 && (
              <div className="summary-row discount">
                <span>Discount</span>
                <span>- {formatPriceINR(discount)}</span>
              </div>
            )}
            <div className="summary-divider"></div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatPriceINR(total)}</span>
            </div>
            <button onClick={() => navigate('/checkout')} className="checkout-btn">
              Proceed to Checkout
            </button>
            <Link to="/products" className="continue-shopping">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartScreen

