import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { FaSpinner, FaCheck, FaUniversity, FaSave } from 'react-icons/fa'
import { ordersAPI, adminAPI } from '../../services/api'
import { formatPriceINR } from '../../utils/formatPrice'
import './AdminOrdersScreen.css'

const MANUAL_PAYMENT_METHODS = ['bank_transfer', 'easypaisa', 'jazzcash']

function paymentStatusLabel(order) {
  if (order.isPaid) return 'approved'
  if (order.paymentMethod === 'card') return 'pending'
  if (MANUAL_PAYMENT_METHODS.includes(order.paymentMethod)) return 'pending'
  if (order.paymentMethod === 'cod') return 'cod'
  return 'pending'
}

const AdminOrdersScreen = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)
  const [filter, setFilter] = useState('all')

  const [bankForm, setBankForm] = useState({
    bankAccountTitle: '',
    bankName: '',
    bankAccountNumber: '',
    bankIban: '',
    bankBranch: ''
  })
  const [bankSaving, setBankSaving] = useState(false)
  const [bankMessage, setBankMessage] = useState(null)

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

  const fetchBankSettings = async () => {
    try {
      const res = await adminAPI.getPaymentSettings()
      const saved = res.data?.saved || {}
      setBankForm({
        bankAccountTitle: saved.bankAccountTitle || '',
        bankName: saved.bankName || '',
        bankAccountNumber: saved.bankAccountNumber || '',
        bankIban: saved.bankIban || '',
        bankBranch: saved.bankBranch || ''
      })
    } catch {
      /* optional */
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchBankSettings()
  }, [])

  const handleBankSave = async (e) => {
    e.preventDefault()
    setBankSaving(true)
    setBankMessage(null)
    try {
      await adminAPI.updatePaymentSettings(bankForm)
      setBankMessage({ type: 'success', text: 'Your bank account details are saved. Customers will see them at checkout.' })
    } catch (err) {
      setBankMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to save bank details'
      })
    } finally {
      setBankSaving(false)
    }
  }

  const handleApprovePayment = async (orderId) => {
    if (
      !window.confirm(
        'Approve this payment? Only click Approve after you have received the money in your bank account.'
      )
    ) {
      return
    }
    try {
      setConfirmingId(orderId)
      const response = await ordersAPI.confirmPayment(orderId)
      setOrders((prev) => prev.map((o) => (o._id === orderId ? response.data : o)))
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to approve payment')
    } finally {
      setConfirmingId(null)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const status = paymentStatusLabel(order)
    if (filter === 'pending') return status === 'pending'
    if (filter === 'approved') return status === 'approved'
    return true
  })

  const pendingCount = orders.filter((o) => paymentStatusLabel(o) === 'pending').length

  return (
    <div className="admin-orders-screen">
      <Helmet>
        <title>Manage Orders | Admin Dashboard</title>
      </Helmet>
      <div className="admin-container">
        <div className="admin-header">
          <h1>Orders &amp; bank payments</h1>
          <p>
            Add your account below. When a customer pays by bank transfer, the order shows as{' '}
            <strong>Pending</strong> until you click <strong>Approve</strong>.
          </p>
        </div>

        <section className="admin-bank-settings-card">
          <h2>
            <FaUniversity /> Your bank account (customers transfer here)
          </h2>
          <form onSubmit={handleBankSave} className="admin-bank-form">
            <div className="form-row">
              <div className="form-group">
                <label>Account holder name</label>
                <input
                  type="text"
                  value={bankForm.bankAccountTitle}
                  onChange={(e) => setBankForm({ ...bankForm, bankAccountTitle: e.target.value })}
                  placeholder="Your name or business name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Bank name</label>
                <input
                  type="text"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  placeholder="e.g. HBL, Meezan"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Account number</label>
                <input
                  type="text"
                  value={bankForm.bankAccountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, bankAccountNumber: e.target.value })}
                  placeholder="0000000000000"
                />
              </div>
              <div className="form-group">
                <label>IBAN (required for bank transfer)</label>
                <input
                  type="text"
                  value={bankForm.bankIban}
                  onChange={(e) => setBankForm({ ...bankForm, bankIban: e.target.value })}
                  placeholder="PK00XXXX0000000000000000"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Branch (optional)</label>
              <input
                type="text"
                value={bankForm.bankBranch}
                onChange={(e) => setBankForm({ ...bankForm, bankBranch: e.target.value })}
                placeholder="City / branch"
              />
            </div>
            {bankMessage && (
              <p className={`bank-form-message ${bankMessage.type}`}>{bankMessage.text}</p>
            )}
            <button type="submit" className="save-bank-btn" disabled={bankSaving}>
              {bankSaving ? <FaSpinner className="spinner-inline" /> : <FaSave />}
              {bankSaving ? 'Saving…' : 'Save my account details'}
            </button>
          </form>
        </section>

        <div className="orders-filter-bar">
          <button
            type="button"
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({orders.length})
          </button>
          <button
            type="button"
            className={filter === 'pending' ? 'active' : ''}
            onClick={() => setFilter('pending')}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            className={filter === 'approved' ? 'active' : ''}
            onClick={() => setFilter('approved')}
          >
            Approved ({orders.filter((o) => paymentStatusLabel(o) === 'approved').length})
          </button>
        </div>

        {loading ? (
          <div className="admin-loading">
            <FaSpinner className="spinner" />
            <p>Loading orders…</p>
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
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Method</th>
                  <th>Payment status</th>
                  <th>Customer bank info</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center">
                      No orders in this list.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const payStatus = paymentStatusLabel(order)
                    return (
                      <tr key={order._id} className={payStatus === 'pending' ? 'row-pending' : ''}>
                        <td className="font-mono text-primary">{order._id.substring(0, 8)}…</td>
                        <td className="font-semibold">{order.user ? order.user.name : 'Unknown'}</td>
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="font-bold">{formatPriceINR(order.totalPrice)}</td>
                        <td className="method-cell">{order.paymentMethod?.replace('_', ' ')}</td>
                        <td>
                          {payStatus === 'approved' && (
                            <span className="status-badge success">Approved</span>
                          )}
                          {payStatus === 'pending' && (
                            <span className="status-badge warning">Pending</span>
                          )}
                          {payStatus === 'cod' && (
                            <span className="status-badge neutral">COD</span>
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
                        <td className="action-cell">
                          {payStatus === 'pending' && MANUAL_PAYMENT_METHODS.includes(order.paymentMethod) && (
                            <button
                              type="button"
                              className="confirm-pay-btn"
                              disabled={confirmingId === order._id}
                              onClick={() => handleApprovePayment(order._id)}
                              title="Click after you see the money in your bank account"
                            >
                              {confirmingId === order._id ? (
                                <FaSpinner className="spinner-inline" />
                              ) : (
                                <>
                                  <FaCheck /> Approve payment
                                </>
                              )}
                            </button>
                          )}
                          {payStatus === 'pending' && order.paymentMethod === 'card' && (
                            <span className="card-pending-hint">Customer did not finish card payment</span>
                          )}
                          {payStatus === 'approved' && (
                            <span className="approved-label">
                              <FaCheck /> Approved
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
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
