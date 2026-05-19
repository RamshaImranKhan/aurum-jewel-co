import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { FaTimes, FaSpinner, FaCheck } from 'react-icons/fa'
import { ordersAPI } from '../../services/api'
import { formatPriceINR } from '../../utils/formatPrice'
import './AdminOrdersScreen.css'

const MANUAL_PAYMENT_METHODS = ['bank_transfer', 'easypaisa', 'jazzcash']

const AdminOrdersScreen = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await ordersAPI.getAdminAll()
      setOrders(response.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleConfirmPayment = async (orderId) => {
    if (!window.confirm('Mark this order as paid? Only confirm after you see the money in your account.')) {
      return
    }
    try {
      setConfirmingId(orderId)
      const response = await ordersAPI.confirmPayment(orderId)
      setOrders((prev) => prev.map((o) => (o._id === orderId ? response.data : o)))
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to confirm payment')
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <div className="admin-orders-screen">
      <Helmet>
        <title>Manage Orders | Admin Dashboard</title>
      </Helmet>
      <div className="admin-container">
        <div className="admin-header">
          <h1>Manage Orders</h1>
          <p>View orders and confirm bank / wallet transfers after payment arrives in your account</p>
        </div>

        {loading ? (
          <div className="admin-loading">
            <FaSpinner className="spinner" />
            <p>Loading the latest orders...</p>
          </div>
        ) : error ? (
          <div className="admin-error">
            <p>{error}</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Reference</th>
                  <th>Delivery</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center">
                      No orders have been placed yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order._id}>
                      <td className="font-mono text-primary">{order._id.substring(0, 8)}...</td>
                      <td className="font-semibold">{order.user ? order.user.name : 'Unknown'}</td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="font-bold">{formatPriceINR(order.totalPrice)}</td>
                      <td>
                        {order.isPaid ? (
                          <span className="status-badge success">
                            Paid {order.paidAt ? new Date(order.paidAt).toLocaleDateString() : ''}
                          </span>
                        ) : (
                          <span className="status-badge danger">
                            <FaTimes className="mr-1" /> Pending ({order.paymentMethod})
                          </span>
                        )}
                      </td>
                      <td className="order-ref-cell">
                        {order.paymentMethod === 'bank_transfer' ? (
                          <span className="sender-details">
                            {order.senderAccountTitle && <span>{order.senderAccountTitle}</span>}
                            {order.senderIban && <span className="mono">{order.senderIban}</span>}
                            {order.paymentReference && <span>Ref: {order.paymentReference}</span>}
                            {!order.senderIban && !order.paymentReference && '—'}
                          </span>
                        ) : (
                          order.paymentReference || '—'
                        )}
                      </td>
                      <td>
                        {order.isDelivered ? (
                          <span className="status-badge success">Delivered</span>
                        ) : (
                          <span className="status-badge danger">Not delivered</span>
                        )}
                      </td>
                      <td>
                        {!order.isPaid && MANUAL_PAYMENT_METHODS.includes(order.paymentMethod) && (
                          <button
                            type="button"
                            className="confirm-pay-btn"
                            disabled={confirmingId === order._id}
                            onClick={() => handleConfirmPayment(order._id)}
                          >
                            {confirmingId === order._id ? (
                              <FaSpinner className="spinner-inline" />
                            ) : (
                              <>
                                <FaCheck /> Confirm payment
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminOrdersScreen
