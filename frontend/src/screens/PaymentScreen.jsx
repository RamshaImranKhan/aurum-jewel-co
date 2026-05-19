import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { configAPI, ordersAPI } from '../services/api'
import { FaLock, FaSpinner, FaShieldAlt } from 'react-icons/fa'
import { formatPriceINR } from '../utils/formatPrice'
import './PaymentScreen.css'

// Initialize outside component to avoid recreating
let stripePromise = null;

const CheckoutForm = ({ order, clientSecret }) => {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)
    
    // Confirm payment directly with Stripe servers securely
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: {
          name: order.user ? order.user.name : 'Guest User'
        }
      }
    })

    if (stripeError) {
      setError(stripeError.message)
      setProcessing(false)
    } else {
      if (paymentIntent.status === 'succeeded') {
        try {
            await ordersAPI.payOrder(order._id, paymentIntent)
            setProcessing(false)
            navigate(`/thank-you/${order._id}`)
        } catch (backendErr) {
            setError('Payment was successful, but we failed to update your order in our database. Please contact support.')
            setProcessing(false)
        }
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stripe-form">
      <h2 className="payment-heading">
        <FaShieldAlt className="shield-icon" /> Secure Checkout
      </h2>
      <div className="order-summary-box">
        <p>Order ID: <strong>{order._id}</strong></p>
        <p className="amount-due">Total Due: <strong>{formatPriceINR(order.totalPrice)}</strong></p>
      </div>

      {error && <div className="payment-error-alert">{error}</div>}
      
      <div className="card-element-container">
        <label>Credit or debit card details</label>
        <div className="stripe-input-wrapper">
          <CardElement options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#2c3e50',
                fontFamily: 'Inter, system-ui, sans-serif',
                '::placeholder': { color: '#aab7c4' },
              },
              invalid: { color: '#e74c3c' },
            }
          }}/>
        </div>
      </div>
      
      <button disabled={processing || !stripe} className="stripe-pay-btn">
        <FaLock /> {processing ? 'Processing Payment...' : `Pay ${formatPriceINR(order.totalPrice)}`}
      </button>
      <p className="stripe-badges">Transactions are encrypted and secured via Stripe.</p>
    </form>
  )
}

const PaymentScreen = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const initializePayment = async () => {
      try {
        setLoading(true)
        // Fetch Order Details
        const orderRes = await ordersAPI.getById(orderId)
        setOrder(orderRes.data)
        
        if (orderRes.data.isPaid) {
          setError('This order has already been paid successfully.')
          setLoading(false)
          return
        }

        // Fetch Stripe Key
        if (!stripePromise) {
            const configRes = await configAPI.getStripeKey()
            const pubKey = configRes.data.publishableKey
            if (!pubKey) {
                throw new Error("Stripe Publishable Key not initialized in backend.")
            }
            stripePromise = loadStripe(pubKey)
        }

        // Create Intent
        const intentRes = await ordersAPI.createPaymentIntent(orderId)
        setClientSecret(intentRes.data.clientSecret)
        
        setLoading(false)
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to initialize payment gateway')
        setLoading(false)
      }
    }
    if (orderId) initializePayment()
  }, [orderId])

  return (
    <div className="payment-screen">
      <Helmet>
        <title>Secure Payment | Aurum Jewel Co.</title>
      </Helmet>
      <div className="payment-screen-container">
        {loading ? (
          <div className="payment-status-message">
            <FaSpinner className="payment-spinner" />
            <p>Initializing secure connection to Stripe...</p>
          </div>
        ) : error ? (
          <div className="payment-status-message error-message">
            <p className="error-text">{error}</p>
            <button type="button" className="back-checkout-btn" onClick={() => navigate('/checkout')}>
              Back to checkout
            </button>
          </div>
        ) : (
          clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm order={order} clientSecret={clientSecret} />
            </Elements>
          )
        )}
      </div>
    </div>
  )
}

export default PaymentScreen
