import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { FaEye, FaTimes, FaSpinner, FaCheck } from 'react-icons/fa'
import { ordersAPI } from '../../services/api'
import { formatPriceINR } from '../../utils/formatPrice'
import './AdminOrdersScreen.css'

const AdminOrdersScreen = () => {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true)
                const response = await ordersAPI.getAdminAll()
                setOrders(response.data)
                setLoading(false)
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to fetch orders')
                setLoading(false)
            }
        }
        fetchOrders()
    }, [])

    return (
        <div className="admin-orders-screen">
            <Helmet>
                <title>Manage Orders | Admin Dashboard</title>
            </Helmet>
            <div className="admin-container">
                <div className="admin-header">
                    <h1>Manage Orders</h1>
                    <p>View and track all customer orders across the platform</p>
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
                                    <th>Total Price</th>
                                    <th>Payment Status</th>
                                    <th>Delivery Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center">No orders have been placed yet.</td>
                                    </tr>
                                ) : (
                                    orders.map((order) => (
                                        <tr key={order._id}>
                                            <td className="font-mono text-primary">{order._id.substring(0, 8)}...</td>
                                            <td className="font-semibold">{order.user ? order.user.name : 'Unknown/Deleted'}</td>
                                            <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                            <td className="font-bold">{formatPriceINR(order.totalPrice)}</td>
                                            <td>
                                                {order.isPaid ? (
                                                    <span className="status-badge success">Paid: {new Date(order.paidAt).toLocaleDateString()}</span>
                                                ) : (
                                                    <span className="status-badge danger"><FaTimes className="mr-1" /> Pending</span>
                                                )}
                                            </td>
                                            <td>
                                                {order.isDelivered ? (
                                                    <span className="status-badge success">Delivered: {new Date(order.deliveredAt).toLocaleDateString()}</span>
                                                ) : (
                                                    <span className="status-badge danger"><FaTimes className="mr-1" /> Not Delivered</span>
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
