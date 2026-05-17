import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaBoxes, FaUsers, FaChartLine, FaRupeeSign, FaFire, FaWarehouse, FaRobot } from 'react-icons/fa'
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
          <p>Loading AI dashboard...</p>
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
  const salesPrediction = dashboard?.salesPrediction || {}
  const topSelling = dashboard?.topSellingProducts || []
  const inventoryPrediction = dashboard?.inventoryPrediction || []
  const recommendations = dashboard?.recommendations || {}
  const customerAnalytics = dashboard?.customerAnalytics || {}
  const maxMonthlySales = Math.max(1, ...(salesPrediction?.monthlySales || []).map((m) => Number(m.sales || 0)))

  return (
    <div className="admin-dashboard">
      <Helmet>
        <title>Admin Dashboard | Aurum Jewel Co.</title>
      </Helmet>
      <div className="container">
        <div className="page-header">
          <h1>AI Admin Dashboard</h1>
          <p>Sales, recommendations, inventory risk, and customer analytics.</p>
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

        <div className="dashboard-panel">
          <h3>Sales Prediction</h3>
          <p>
            Expected next week: <strong>{formatPriceINR(salesPrediction.expectedNextWeekSales || 0)}</strong>
            {' '}| Expected monthly revenue:{' '}
            <strong>{formatPriceINR(salesPrediction.expectedMonthlyRevenue || 0)}</strong>
          </p>
          <div className="sales-chart">
            {(salesPrediction.monthlySales || []).map((row) => (
              <div key={row.monthKey} className="chart-row">
                <span>{row.month}</span>
                <div className="chart-bar-wrap">
                  <div className="chart-bar" style={{ width: `${Math.max(4, (Number(row.sales || 0) / maxMonthlySales) * 100)}%` }} />
                </div>
                <span>{formatPriceINR(row.sales || 0)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-columns">
          <div className="dashboard-panel">
            <h3><FaFire /> Top Selling Products</h3>
            <ol className="simple-list">
              {topSelling.map((item) => (
                <li key={item.name}>
                  <span>{item.name}</span>
                  <span>{item.qtySold} sold | Qty left: {item.currentQuantity ?? 0}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="dashboard-panel">
            <h3><FaFire /> Trending Items</h3>
            <ul className="simple-list">
              {(recommendations.trendingItems || []).map((item) => (
                <li key={item._id}>
                  <span>{item.name}</span>
                  <span>{item.qtySold} in 30d | Qty left: {item.currentQuantity ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="dashboard-panel">
          <h3><FaWarehouse /> Inventory Prediction</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Sold (30d)</th>
                  <th>Predicted Status</th>
                </tr>
              </thead>
              <tbody>
                {inventoryPrediction.map((row) => (
                  <tr key={row._id}>
                    <td>{row.name}</td>
                    <td>{row.currentStock}</td>
                    <td>{row.soldLast30Days}</td>
                    <td>{row.predictedStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-columns">
          <div className="dashboard-panel">
            <h3>Recommended Products</h3>
            <ul className="simple-list">
              {(recommendations.recommendedProducts || []).slice(0, 6).map((item) => (
                <li key={item._id}>
                  <span>{item.name}</span>
                  <span>{formatPriceINR(item.price || 0)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="dashboard-panel">
            <h3>Related Products</h3>
            <ul className="simple-list">
              {(recommendations.relatedProducts || []).slice(0, 6).map((item) => (
                <li key={item._id}>
                  <span>{item.name}</span>
                  <span>{item.category}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="dashboard-panel">
          <h3>Customer Analytics - Most Searched Topics</h3>
          <ul className="simple-list">
            {(customerAnalytics.mostSearchedProducts || []).map((item) => (
              <li key={item.topic}>
                <span>{item.topic}</span>
                <span>{item.count} searches</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-grid">
          <Link to="/admin/products" className="dashboard-card">
            <FaBoxes className="dashboard-icon" />
            <h3>Products</h3>
          </Link>
          <Link to="/admin/users" className="dashboard-card">
            <FaUsers className="dashboard-icon" />
            <h3>Users</h3>
          </Link>
          <Link to="/admin/orders" className="dashboard-card">
            <FaChartLine className="dashboard-icon" />
            <h3>Orders</h3>
          </Link>
          <Link to="/admin/seo" className="dashboard-card">
            <FaRobot className="dashboard-icon" />
            <h3>SEO Hub</h3>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardScreen
