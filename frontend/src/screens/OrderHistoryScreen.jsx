import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaBox, FaEye, FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa'
import './OrderHistoryScreen.css'
import { formatPriceINR } from '../utils/formatPrice'

const OrderHistoryScreen = () => {
  const [orders] = useState([
    {
      id: 'ORD-001',
      date: '2024-01-15',
      status: 'delivered',
      total: 274.97,
      items: 2
    },
    {
      id: 'ORD-002',
      date: '2024-01-10',
      status: 'processing',
      total: 149.99,
      items: 1
    },
    {
      id: 'ORD-003',
      date: '2024-01-05',
      status: 'delivered',
      total: 399.98,
      items: 3
    }
  ])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <FaCheckCircle className="status-icon delivered" />
      case 'processing':
        return <FaClock className="status-icon processing" />
      case 'cancelled':
        return <FaTimesCircle className="status-icon cancelled" />
      default:
        return <FaClock className="status-icon" />
    }
  }

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  return (
    <div className="order-history-screen">
      <div className="container">
        <div className="page-header">
          <h1>
            <FaBox /> Order History
          </h1>
          <p>View all your past orders</p>
        </div>

        {orders.length === 0 ? (
          <div className="no-orders">
            <FaBox className="no-orders-icon" />
            <h2>No orders yet</h2>
            <p>Start shopping to see your orders here</p>
            <Link to="/products" className="shop-now-btn">
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h3>Order {order.id}</h3>
                    <p className="order-date">Placed on {new Date(order.date).toLocaleDateString()}</p>
                  </div>
                  <div className="order-status">
                    {getStatusIcon(order.status)}
                    <span className={`status-text ${order.status}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                </div>

                <div className="order-details">
                  <div className="order-item-count">
                    <span>{order.items} item{order.items > 1 ? 's' : ''}</span>
                  </div>
                  <div className="order-total">
                    <span>Total: </span>
                    <span className="total-amount">{formatPriceINR(order.total)}</span>
                  </div>
                </div>

                <div className="order-actions">
                  <button className="view-order-btn">
                    <FaEye /> View Details
                  </button>
                  {order.status === 'delivered' && (
                    <button className="reorder-btn">
                      Reorder
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderHistoryScreen

