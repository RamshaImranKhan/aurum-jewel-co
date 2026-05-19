import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaBoxes, FaUsers, FaChartLine, FaRupeeSign, FaRobot, FaChartPie } from 'react-icons/fa'
import { Helmet } from 'react-helmet-async'
import { adminAPI } from '../../services/api'
import { formatPriceINR } from '../../utils/formatPrice'
import './AdminDashboardScreen.css'

const AdminDashboardScreen = () => {
  const navigate = useNavigate()
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [dashboard, setDashboard] = React.useState(null)

  React.useEffect(() => {
    if (!userInfo.isAdmin) {
      navigate('/')
    }
  }, [navigate, userInfo])

  React.useEffect(() => {
    if (!userInfo.isAdmin) return
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const { data } = await adminAPI.getDashboard()
        if (active) setDashboard(data)
      } catch (e) {
        if (active) setError(e?.response?.data?.message || e?.message || 'Failed to load dashboard')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [userInfo.isAdmin])

  if (!userInfo.isAdmin) {
    return null
  }

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <p className="dashboard-error">{error}</p>
        </div>
      </div>
    )
  }

  const cards = dashboard?.cards || {}
  const customerAnalytics = dashboard?.customerAnalytics || {}
  const salesPrediction = dashboard?.salesPrediction || {}

  return (
    <div className="admin-dashboard">
      <Helmet>
        <title>Admin Dashboard | Aurum Jewel Co.</title>
      </Helmet>
      <div className="container">
        <div className="page-header">
          <h1>AI Admin Dashboard</h1>
          <p>Quick overview and admin tools.</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <FaRupeeSign className="dashboard-icon" />
            <h4>Total Sales</h4>
            <strong>{formatPriceINR(cards.totalSales || 0)}</strong>
          </div>
          <div className="stat-card">
            <FaChartLine className="dashboard-icon" />
            <h4>Total Orders</h4>
            <strong>{cards.totalOrders || 0}</strong>
          </div>
          <div className="stat-card">
            <FaUsers className="dashboard-icon" />
            <h4>Active Users</h4>
            <strong>{cards.activeUsers || 0}</strong>
          </div>
          <div className="stat-card">
            <FaRobot className="dashboard-icon" />
            <h4>Returning Customers</h4>
            <strong>{customerAnalytics.returningCustomers || 0}</strong>
          </div>
        </div>

        <div className="dashboard-grid">
          <Link to="/admin/analytics" className="dashboard-card dashboard-card-featured">
            <FaChartPie className="dashboard-icon" />
            <h3>AI Insights</h3>
            <p>
              Sales forecast {formatPriceINR(salesPrediction.expectedNextWeekSales || 0)} next week · Search
              trends · Inventory
            </p>
          </Link>
          <Link to="/admin/products" className="dashboard-card">
            <FaBoxes className="dashboard-icon" />
            <h3>Products</h3>
            <p>Manage catalogue and stock</p>
          </Link>
          <Link to="/admin/users" className="dashboard-card">
            <FaUsers className="dashboard-icon" />
            <h3>Users</h3>
            <p>Customer accounts</p>
          </Link>
          <Link to="/admin/orders" className="dashboard-card">
            <FaChartLine className="dashboard-icon" />
            <h3>Orders</h3>
            <p>View and fulfil orders</p>
          </Link>
          <Link to="/admin/seo" className="dashboard-card">
            <FaRobot className="dashboard-icon" />
            <h3>SEO Hub</h3>
            <p>Blogs, backlinks, and on-page SEO</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardScreen
