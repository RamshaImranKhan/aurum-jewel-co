import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaEdit, FaTrash, FaPlus, FaMagic } from 'react-icons/fa'
import { Helmet } from 'react-helmet-async'
import api, { productsAPI } from '../../services/api'
import { formatPriceINR } from '../../utils/formatPrice'
import './AdminProductListScreen.css'

const AdminProductListScreen = () => {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [bulkSeoLoading, setBulkSeoLoading] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            setLoading(true)
            const { data } = await api.get('/products')
            setProducts(data)
            setLoading(false)
        } catch (err) {
            setError(err?.response?.data?.message || err.message)
            setLoading(false)
        }
    }

    const createProductHandler = async () => {
        if (window.confirm('Are you sure you want to create a new product?')) {
            try {
                const { data } = await api.post('/products', {})
                navigate(`/admin/product/${data._id}/edit`)
            } catch (err) {
                alert(err?.response?.data?.message || err.message)
            }
        }
    }

    const deleteHandler = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await api.delete(`/products/${id}`)
                fetchProducts()
            } catch (err) {
                alert(err?.response?.data?.message || err.message)
            }
        }
    }

    const generateBulkSEOHandler = async () => {
        if (!window.confirm('Generate SEO metadata for products using AI?')) return
        try {
            setBulkSeoLoading(true)
            const { data } = await productsAPI.generateSEOBulk({ onlyMissing: true })
            alert(`${data?.message || 'Done'}\nUpdated: ${data?.updated || 0}\nFailed: ${data?.failed || 0}`)
            await fetchProducts()
        } catch (err) {
            alert(err?.response?.data?.message || err.message || 'Failed to run bulk SEO generation')
        } finally {
            setBulkSeoLoading(false)
        }
    }

    if (loading) return <div className="loading-container">Loading products...</div>
    if (error) return <div className="error-message">{error}</div>

    return (
        <div className="admin-product-list">
            <Helmet>
                <title>Manage Products | Admin Dashboard</title>
            </Helmet>
            <div className="container">
                <div className="admin-header">
                    <h1>Products</h1>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <button
                            className="create-btn"
                            onClick={generateBulkSEOHandler}
                            disabled={bulkSeoLoading}
                            style={{ background: '#2c3e50' }}
                        >
                            <FaMagic /> {bulkSeoLoading ? 'Generating SEO...' : 'Generate SEO (AI)'}
                        </button>
                        <button className="create-btn" onClick={createProductHandler}>
                            <FaPlus /> Create Product
                        </button>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>NAME</th>
                                <th>PRICE</th>
                                <th>CATEGORY</th>
                                <th>SEO STATUS</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product._id}>
                                    <td>{product._id.substring(0, 8)}...</td>
                                    <td>{product.name}</td>
                                    <td>{formatPriceINR(product.price)}</td>
                                    <td>{product.category}</td>
                                    <td>
                                        {product.metaTitle && product.metaDescription ? '✅ Completed' : '⚠️ Missing Data'}
                                    </td>
                                    <td className="actions">
                                        <Link to={`/admin/product/${product._id}/edit`} className="edit-btn">
                                            <FaEdit />
                                        </Link>
                                        <button className="delete-btn" onClick={() => deleteHandler(product._id)}>
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default AdminProductListScreen
