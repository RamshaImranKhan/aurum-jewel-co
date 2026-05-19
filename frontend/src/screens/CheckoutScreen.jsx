import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ordersAPI, cartAPI, configAPI } from '../services/api'
import { FaCreditCard, FaLock, FaMoneyBillWave, FaMobileAlt, FaUniversity, FaCopy } from 'react-icons/fa'
import './CheckoutScreen.css'
import { formatPriceINR } from '../utils/formatPrice'
import { mergeMerchantBank } from '../config/merchantBank'

const CheckoutScreen = () => {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const [loading, setLoading] = useState(false)
  const [loadingCart, setLoadingCart] = useState(true)
  const [error, setError] = useState(null)
  const [cart, setCart] = useState({ items: [] })
  const [paymentConfig, setPaymentConfig] = useState(null)

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    zipCode: '',
    country: 'Pakistan',
    paymentMethod: 'cod',
    paymentReference: '',
    paymentNote: '',
    senderAccountTitle: '',
    senderIban: ''
  })

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    let active = true
    async function load() {
      try {
        const [cartRes, payRes] = await Promise.all([cartAPI.getCart(), configAPI.getPaymentMethods()])
        if (!active) return
        setCart(cartRes.data || { items: [] })
        setPaymentConfig(payRes.data)
        const methods = payRes.data
        if (!methods?.stripe?.enabled && !methods?.easypaisa?.enabled && !methods?.jazzcash?.enabled) {
          setFormData((f) => ({ ...f, paymentMethod: 'cod' }))
        }
      } catch (e) {
        if (active) setError(e?.response?.data?.message || e?.message || 'Failed to load checkout')
      } finally {
        if (active) setLoadingCart(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [token, navigate])

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const copyText = (text) => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard'))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!cartItems.length) {
      setError('Your cart is empty')
      return
    }

    if (formData.paymentMethod === 'bank_transfer') {
      const bankCheck = mergeMerchantBank(paymentConfig?.bank)
      if (!bankCheck.configured) {
        setError('Bank transfer is not set up yet. Please use Cash on Delivery or contact the store.')
        return
      }
      if (!formData.senderAccountTitle.trim() || !formData.senderIban.trim() || !formData.paymentReference.trim()) {
        setError('Please enter your account name, your IBAN, and the transaction reference from your bank app.')
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const orderData = {
        shippingAddress: {
          address: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
          country: formData.country
        },
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentReference,
        paymentNote: formData.paymentNote,
        senderAccountTitle: formData.senderAccountTitle,
        senderIban: formData.senderIban
      }

      const response = await ordersAPI.create(orderData)
      setLoading(false)

      if (formData.paymentMethod === 'card') {
        navigate(`/order/${response.data._id}/pay`)
      } else {
        navigate(`/thank-you/${response.data._id}`)
      }
    } catch (err) {
      setLoading(false)
      setError(err.response?.data?.message || err.message || 'Failed to place order')
    }
  }

  const bank = useMemo(() => mergeMerchantBank(paymentConfig?.bank), [paymentConfig])
  const jazzcash = paymentConfig?.jazzcash || {}
  const easypaisa = paymentConfig?.easypaisa || {}
  const showWallet = jazzcash.enabled || easypaisa.enabled

  if (loadingCart) {
    return (
      <div className="checkout-screen">
        <div className="container">
          <p>Loading checkout...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-screen">
      <div className="container">
        <h1 className="page-title">Checkout</h1>

        <div className="checkout-layout">
          <div className="checkout-form-section">
            {error && <div className="checkout-error">{error}</div>}

            <form onSubmit={handleSubmit} className="checkout-form">
              <section className="form-section">
                <h2>Shipping Information</h2>

                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
                  </div>
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>ZIP Code</label>
                    <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} required />
                  </div>
                </div>

                <div className="form-group">
                  <label>Country</label>
                  <select name="country" value={formData.country} onChange={handleChange} required>
                    <option value="Pakistan">Pakistan</option>
                  </select>
                </div>
              </section>

              <section className="form-section">
                <h2>
                  <FaCreditCard /> Payment Method
                </h2>
                <p className="payment-info-note">
                  For bank transfer: send the order total to our IBAN in your banking app, then enter your account
                  name and IBAN below. We never ask for your bank login password.
                </p>

                <div className="payment-methods">
                  {showWallet && (
                    <label className={`payment-method-card ${formData.paymentMethod === 'easypaisa' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="easypaisa"
                        checked={formData.paymentMethod === 'easypaisa'}
                        onChange={handleChange}
                      />
                      <div className="method-details">
                        <span className="method-title">
                          <FaMobileAlt className="method-icon" /> JazzCash / EasyPaisa
                        </span>
                        <span className="method-desc">Send payment to our mobile wallet number</span>
                      </div>
                    </label>
                  )}

                  {paymentConfig?.stripe?.enabled && (
                    <label className={`payment-method-card ${formData.paymentMethod === 'card' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={formData.paymentMethod === 'card'}
                        onChange={handleChange}
                      />
                      <div className="method-details">
                        <span className="method-title">
                          <FaCreditCard className="method-icon" /> Credit / Debit Card
                        </span>
                        <span className="method-desc">Secure card payment via Stripe</span>
                      </div>
                    </label>
                  )}

                  <label className={`payment-method-card ${formData.paymentMethod === 'cod' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={handleChange}
                    />
                    <div className="method-details">
                      <span className="method-title">
                        <FaMoneyBillWave className="method-icon" /> Cash on Delivery
                      </span>
                      <span className="method-desc">Pay when you receive your order</span>
                    </div>
                  </label>

                  <label
                    className={`payment-method-card ${formData.paymentMethod === 'bank_transfer' ? 'active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={formData.paymentMethod === 'bank_transfer'}
                      onChange={handleChange}
                    />
                    <div className="method-details">
                      <span className="method-title">
                        <FaUniversity className="method-icon" /> Pay to my bank account (IBAN)
                      </span>
                      <span className="method-desc">Transfer from your bank app — payment goes to our account</span>
                    </div>
                  </label>
                </div>

                {formData.paymentMethod === 'bank_transfer' && (
                  <div className="merchant-bank-box fade-in">
                    <h3>Step 1 — Send money to our account</h3>
                    {!bank.configured ? (
                      <p className="bank-setup-warning">
                        Store IBAN is not configured yet. Add <code>BANK_IBAN</code> on Railway or{' '}
                        <code>VITE_BANK_IBAN</code> on Vercel, then redeploy.
                      </p>
                    ) : (
                      <ul>
                        <li>
                          <strong>Account title:</strong> {bank.accountTitle}
                        </li>
                        {bank.bankName && (
                          <li>
                            <strong>Bank:</strong> {bank.bankName}
                            {bank.branch ? ` (${bank.branch})` : ''}
                          </li>
                        )}
                        {bank.accountNumber && (
                          <li className="copy-row">
                            <span>
                              <strong>Account #:</strong> {bank.accountNumber}
                            </span>
                            <button type="button" className="copy-mini" onClick={() => copyText(bank.accountNumber)}>
                              <FaCopy />
                            </button>
                          </li>
                        )}
                        {bank.iban && (
                          <li className="copy-row">
                            <span>
                              <strong>Our IBAN:</strong> {bank.iban}
                            </span>
                            <button type="button" className="copy-mini" onClick={() => copyText(bank.iban)}>
                              <FaCopy />
                            </button>
                          </li>
                        )}
                        <li>
                          <strong>Amount to send:</strong> {formatPriceINR(total)}
                        </li>
                      </ul>
                    )}

                    <h3 className="bank-step-two">Step 2 — Your bank details</h3>
                    <div className="form-group">
                      <label>Your account holder name (required)</label>
                      <input
                        type="text"
                        name="senderAccountTitle"
                        value={formData.senderAccountTitle}
                        onChange={handleChange}
                        placeholder="Name on your bank account"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Your IBAN (required)</label>
                      <input
                        type="text"
                        name="senderIban"
                        value={formData.senderIban}
                        onChange={handleChange}
                        placeholder="PK00XXXX… (the account you paid from)"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Bank transaction reference (required)</label>
                      <input
                        type="text"
                        name="paymentReference"
                        value={formData.paymentReference}
                        onChange={handleChange}
                        placeholder="Reference / TRX ID from your bank receipt"
                        required
                      />
                    </div>
                    <p className="bank-transfer-hint">
                      After you place the order, we confirm when the amount appears in our account.
                    </p>
                  </div>
                )}

                {formData.paymentMethod === 'easypaisa' && showWallet && (
                  <div className="merchant-bank-box fade-in">
                    <h3>Send payment to our wallet</h3>
                    <ul>
                      {jazzcash.enabled && (
                        <li className="copy-row">
                          <span>
                            <strong>JazzCash:</strong> {jazzcash.number} ({jazzcash.accountTitle})
                          </span>
                          <button type="button" className="copy-mini" onClick={() => copyText(jazzcash.number)}>
                            <FaCopy />
                          </button>
                        </li>
                      )}
                      {easypaisa.enabled && (
                        <li className="copy-row">
                          <span>
                            <strong>EasyPaisa:</strong> {easypaisa.number} ({easypaisa.accountTitle})
                          </span>
                          <button type="button" className="copy-mini" onClick={() => copyText(easypaisa.number)}>
                            <FaCopy />
                          </button>
                        </li>
                      )}
                      <li>
                        <strong>Amount:</strong> {formatPriceINR(total)}
                      </li>
                    </ul>
                    <div className="form-group">
                      <label>Transaction ID (required)</label>
                      <input
                        type="text"
                        name="paymentReference"
                        value={formData.paymentReference}
                        onChange={handleChange}
                        placeholder="TID from your JazzCash / EasyPaisa app"
                        required
                      />
                    </div>
                  </div>
                )}

                {formData.paymentMethod === 'easypaisa' && (
                  <div className="form-group">
                    <label>Note (optional)</label>
                    <input
                      type="text"
                      name="paymentNote"
                      value={formData.paymentNote}
                      onChange={handleChange}
                      placeholder="Sender name or extra details"
                    />
                  </div>
                )}
              </section>

              <button type="submit" className="place-order-btn" disabled={loading || !cartItems.length}>
                <FaLock /> {loading ? 'Placing order...' : 'Place Order'}
              </button>
            </form>
          </div>

          <div className="order-summary-section">
            <div className="order-summary">
              <h2>Order Summary</h2>
              {cartItems.map((item) => (
                <div key={item._id} className="summary-item">
                  <span>
                    {item.name} × {item.qty}
                  </span>
                  <span>{formatPriceINR(Number(item.price) * Number(item.qty))}</span>
                </div>
              ))}
              <div className="summary-divider" />
              <div className="summary-item">
                <span>Subtotal</span>
                <span>{formatPriceINR(subtotal)}</span>
              </div>
              <div className="summary-item">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : formatPriceINR(shipping)}</span>
              </div>
              <div className="summary-item">
                <span>Tax</span>
                <span>{formatPriceINR(tax)}</span>
              </div>
              {discount > 0 && (
                <div className="summary-item">
                  <span>Discount</span>
                  <span>-{formatPriceINR(discount)}</span>
                </div>
              )}
              <div className="summary-divider" />
              <div className="summary-item total">
                <span>Total</span>
                <span>{formatPriceINR(total)}</span>
              </div>
            </div>

            <div className="security-badge">
              <FaLock />
              <p>Your payment information is secure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutScreen
