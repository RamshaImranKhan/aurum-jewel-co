import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FaCheckCircle, FaSpinner, FaShoppingBag, FaBoxOpen } from 'react-icons/fa'
import { ordersAPI } from '../services/api'
import { formatPriceINR } from '../utils/formatPrice'
import './ThankYouScreen.css'

const PAYMENT_LABELS = {
  bank_transfer: 'Bank Transfer',
  easypaisa: 'JazzCash / EasyPaisa',
  jazzcash: 'JazzCash',
  card: 'Card',
  cod: 'Cash on Delivery'
}

const ThankYouScreen = () => {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        const response = await ordersAPI.getById(orderId)
        setOrder(response.data)
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch order details')
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  if (loading) {
    return (
      <div className="thankyou-screen loading-state">
        <FaSpinner className="spinner" />
        <h2>Loading your order details...</h2>
      </div>
    )
  }

  if (error) {
    return (
      <div className="thankyou-screen error-state">
        <div className="error-message">
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <Link to="/" className="continue-shopping-btn">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!order) {
    return null
  }

  const needsPaymentProof = ['bank_transfer', 'easypaisa', 'jazzcash'].includes(order.paymentMethod)
  const pendingManualPay = needsPaymentProof && !order.isPaid

  return (
    <div className="thankyou-screen">
      <div className="thankyou-container">
        <div className="success-header">
          <FaCheckCircle className="success-icon" />
          <h1>Thank You for Your Order!</h1>
          <p className="success-subtitle">
            {pendingManualPay
              ? 'Your order is saved. We will confirm it after we verify your payment.'
              : 'Your order has been placed successfully.'}
          </p>
          <p className="order-id-badge">
            Order ID: <span>{order._id}</span>
          </p>
        </div>

        {pendingManualPay && (
          <div className="pending-payment-banner">
            <h3>Payment verification pending</h3>
            <p>
              You submitted reference: <strong>{order.paymentReference}</strong>
              {order.paymentNote ? ` — ${order.paymentNote}` : ''}
            </p>
            <p>We will email you when payment is confirmed. Orders are processed after verification.</p>
          </div>
        )}

        <div className="order-details-grid">
          <div className="order-items-section">
            <h2>
              <FaBoxOpen /> Ordered Items
            </h2>
            <div className="items-list">
              {order.orderItems.map((item, index) => (
                <div key={index} className="order-item">
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-qty">Qty: {item.qty}</span>
                  </div>
                  <span className="item-price">{formatPriceINR(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="order-summary-section">
            <h2>Order Summary</h2>
            <div className="summary-card">
              <div className="summary-row">
                <span>Items Subtotal</span>
                <span>{formatPriceINR(order.itemsPrice)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>{order.shippingPrice === 0 ? 'Free' : formatPriceINR(order.shippingPrice)}</span>
              </div>
              <div className="summary-row">
                <span>Tax</span>
                <span>{formatPriceINR(order.taxPrice)}</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-row total-row">
                <span>{order.isPaid ? 'Total Paid' : 'Total Due'}</span>
                <span>{formatPriceINR(order.totalPrice)}</span>
              </div>
            </div>
          </div>

          <div className="shipping-info-section">
            <h2>Shipping Address</h2>
            <div className="address-card">
              <p>{order.shippingAddress.address}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.zipCode}
              </p>
              <p>{order.shippingAddress.country}</p>
            </div>
          </div>

          <div className="payment-info-section">
            <h2>Payment Method</h2>
            <div className="payment-card">
              <p>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</p>
              <p className={`payment-status ${order.isPaid ? 'paid' : 'pending'}`}>
                {order.isPaid ? 'Payment Received' : 'Payment Pending — awaiting verification'}
              </p>
              {order.paymentReference && <p className="payment-ref">Ref: {order.paymentReference}</p>}
            </div>
          </div>
        </div>

        <div className="thankyou-actions">
          <Link to="/orders" className="view-orders-btn">
            View All Orders
          </Link>
          <Link to="/" className="continue-shopping-btn">
            <FaShoppingBag /> Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ThankYouScreen
