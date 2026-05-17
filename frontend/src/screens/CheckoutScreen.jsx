import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ordersAPI } from '../services/api'
import { FaCreditCard, FaLock, FaMoneyBillWave, FaMobileAlt } from 'react-icons/fa'
import './CheckoutScreen.css'
import { formatPriceINR } from '../utils/formatPrice'

const CheckoutScreen = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    zipCode: '',
    country: 'Pakistan',
    paymentMethod: 'cod', // Default to COD
    mobileAccount: '',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: ''
  })

  // Note: hardcoded summary for demo purposes logic
  const [orderSummary] = useState({
    subtotal: 249.98,
    shipping: 0,
    tax: 24.99,
    total: 274.97
  })

  // Simulate processing delay for digital payments (connecting to real-time gateway)
  const simulatePaymentProcessing = async () => {
    return new Promise(resolve => setTimeout(resolve, 2000));
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      // Simulate gateway authorization taking time
      if (formData.paymentMethod !== 'cod') {
        await simulatePaymentProcessing()
      }

      const orderData = {
        shippingAddress: {
          address: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
          country: formData.country,
        },
        paymentMethod: formData.paymentMethod
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

  return (
    <div className="checkout-screen">
      <div className="container">
        <h1 className="page-title">Checkout</h1>

        <div className="checkout-layout">
          <div className="checkout-form-section">
            {error && <div className="error-message" style={{color: 'white', backgroundColor: '#ef4444', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem'}}>{error}</div>}
            
            <form onSubmit={handleSubmit} className="checkout-form">
              {/* Shipping Information */}
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

              {/* Payment Information */}
              <section className="form-section">
                <h2>
                  <FaCreditCard /> Payment Information
                </h2>
                
                <div className="payment-methods">
                  <label className={`payment-method-card ${formData.paymentMethod === 'cod' ? 'active' : ''}`}>
                    <input type="radio" name="paymentMethod" value="cod" checked={formData.paymentMethod === 'cod'} onChange={handleChange} />
                    <div className="method-details">
                      <span className="method-title"><FaMoneyBillWave className="method-icon"/> Cash on Delivery</span>
                      <span className="method-desc">Pay when you receive your order</span>
                    </div>
                  </label>

                  <label className={`payment-method-card ${formData.paymentMethod === 'easypaisa' ? 'active' : ''}`}>
                    <input type="radio" name="paymentMethod" value="easypaisa" checked={formData.paymentMethod === 'easypaisa'} onChange={handleChange} />
                    <div className="method-details">
                      <span className="method-title"><FaMobileAlt className="method-icon"/> EasyPaisa / JazzCash</span>
                      <span className="method-desc">Pay instantly via mobile wallet</span>
                    </div>
                  </label>

                  <label className={`payment-method-card ${formData.paymentMethod === 'card' ? 'active' : ''}`}>
                    <input type="radio" name="paymentMethod" value="card" checked={formData.paymentMethod === 'card'} onChange={handleChange} />
                    <div className="method-details">
                      <span className="method-title"><FaCreditCard className="method-icon"/> Credit / Debit Card</span>
                      <span className="method-desc">Secure online processing</span>
                    </div>
                  </label>
                </div>

                {/* Conditional Fields based on selection */}
                {formData.paymentMethod === 'easypaisa' && (
                  <div className="payment-details fade-in">
                    <div className="form-group">
                      <label>Mobile Account Number</label>
                      <input
                        type="text"
                        name="mobileAccount"
                        value={formData.mobileAccount}
                        onChange={handleChange}
                        placeholder="e.g. 03xx xxxxxxx"
                        required={formData.paymentMethod === 'easypaisa'}
                      />
                    </div>
                  </div>
                )}

                {formData.paymentMethod === 'card' && (
                  <div className="payment-details fade-in">
                    <div className="form-group">
                      <label>Card Number</label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleChange}
                        placeholder="1234 5678 9012 3456"
                        maxLength="19"
                        required={formData.paymentMethod === 'card'}
                      />
                    </div>
                    <div className="form-group">
                      <label>Cardholder Name</label>
                      <input
                        type="text"
                        name="cardName"
                        value={formData.cardName}
                        onChange={handleChange}
                        required={formData.paymentMethod === 'card'}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Expiry Date</label>
                        <input
                          type="text"
                          name="expiryDate"
                          value={formData.expiryDate}
                          onChange={handleChange}
                          placeholder="MM/YY"
                          maxLength="5"
                          required={formData.paymentMethod === 'card'}
                        />
                      </div>
                      <div className="form-group">
                        <label>CVV</label>
                        <input
                          type="text"
                          name="cvv"
                          value={formData.cvv}
                          onChange={handleChange}
                          placeholder="123"
                          maxLength="3"
                          required={formData.paymentMethod === 'card'}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <button type="submit" className="place-order-btn" disabled={loading}>
                <FaLock /> {loading ? (formData.paymentMethod !== 'cod' ? 'Processing Secure Payment...' : 'Placing Order...') : 'Place Order'}
              </button>
            </form>
          </div>

          <div className="order-summary-section">
            <div className="order-summary">
              <h2>Order Summary</h2>
              <div className="summary-item">
                <span>Subtotal</span>
                <span>{formatPriceINR(orderSummary.subtotal)}</span>
              </div>
              <div className="summary-item">
                <span>Shipping</span>
                <span>{orderSummary.shipping === 0 ? 'Free' : formatPriceINR(orderSummary.shipping)}</span>
              </div>
              <div className="summary-item">
                <span>Tax</span>
                <span>{formatPriceINR(orderSummary.tax)}</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-item total">
                <span>Total</span>
                <span>{formatPriceINR(orderSummary.total)}</span>
              </div>
            </div>

            <div className="security-badge">
              <FaLock />
              <p>Your payment information is secure and encrypted</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutScreen
