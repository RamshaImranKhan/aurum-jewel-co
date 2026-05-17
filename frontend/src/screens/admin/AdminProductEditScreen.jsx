import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api, { productsAPI } from '../../services/api'
import { Helmet } from 'react-helmet-async'
import { FaMagic } from 'react-icons/fa'
import './AdminProductEditScreen.css'

const AdminProductEditScreen = () => {
    const { id } = useParams()
    const navigate = useNavigate()

    const [name, setName] = useState('')
    const [price, setPrice] = useState(0)
    const [originalPrice, setOriginalPrice] = useState(0)
    const [category, setCategory] = useState('')
    const [quantity, setQuantity] = useState(0)
    const [image, setImage] = useState('')
    const [metal, setMetal] = useState('')
    const [gemstone, setGemstone] = useState('')
    const [hallmark, setHallmark] = useState('')
    const [description, setDescription] = useState('')
    const [metaTitle, setMetaTitle] = useState('')
    const [metaDescription, setMetaDescription] = useState('')
    const [metaKeywords, setMetaKeywords] = useState('')

    const [loading, setLoading] = useState(true)
    const [generatingSeo, setGeneratingSeo] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const { data } = await api.get(`/products/${id}`)
                setName(data.name || '')
                setPrice(data.price || 0)
                setOriginalPrice(data.originalPrice || 0)
                setCategory(data.category || '')
                setQuantity(Number(data.countInStock || 0))
                setImage(data.images && data.images.length > 0 ? data.images[0] : '')
                setMetal(data.metal || '')
                setGemstone(data.gemstone || '')
                setHallmark(data.hallmark || '')
                setDescription(data.description || '')
                setMetaTitle(data.metaTitle || '')
                setMetaDescription(data.metaDescription || '')
                setMetaKeywords(data.metaKeywords || '')
                setLoading(false)
            } catch (err) {
                setError(err?.response?.data?.message || err.message)
                setLoading(false)
            }
        }
        fetchProduct()
    }, [id])

    const submitHandler = async (e) => {
        e.preventDefault()
        try {
            await api.put(`/products/${id}`, {
                name,
                price,
                originalPrice,
                category,
                countInStock: quantity,
                images: image ? [image] : [],
                metal,
                gemstone,
                hallmark,
                description,
                metaTitle,
                metaDescription,
                metaKeywords
            })
            alert('Product Updated Successfully')
            navigate('/admin/products')
        } catch (err) {
            alert(err?.response?.data?.message || err.message)
        }
    }

    const generateSEOHandler = async () => {
        try {
            setGeneratingSeo(true)
            const { data } = await productsAPI.generateSEO({
                name,
                category,
                metal,
                description
            })
            if (data.description) setDescription(data.description)
            if (data.metaTitle) setMetaTitle(data.metaTitle)
            if (data.metaDescription) setMetaDescription(data.metaDescription)
            if (data.metaKeywords) setMetaKeywords(data.metaKeywords)
            alert('AI content generated successfully! Please review before saving.')
            setGeneratingSeo(false)
        } catch (err) {
            setGeneratingSeo(false)
            alert(err?.response?.data?.message || 'Failed to generate SEO')
        }
    }

    if (loading) return <div className="loading-container">Loading Product...</div>
    if (error) return <div className="error-message">{error}</div>

    return (
        <div className="admin-product-edit">
            <Helmet>
                <title>Edit Product | Admin Dashboard</title>
            </Helmet>
            <div className="container">
                <h1>Edit Product</h1>
                <form onSubmit={submitHandler} className="edit-form">
                    <div className="form-section">
                        <h3>Basic Details</h3>
                        <div className="form-group">
                            <label>Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Price</label>
                            <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
                        </div>
                        <div className="form-group">
                            <label>Original Price</label>
                            <input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(Number(e.target.value))} required />
                        </div>
                        <div className="form-group">
                            <label>Category</label>
                            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Quantity</label>
                            <input
                                type="number"
                                min="0"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Image URL</label>
                            <input type="text" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Jewellery Specs</h3>
                        <div className="form-group">
                            <label>Metal</label>
                            <input type="text" value={metal} onChange={(e) => setMetal(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Gemstone</label>
                            <input type="text" value={gemstone} onChange={(e) => setGemstone(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Hallmark</label>
                            <input type="text" value={hallmark} onChange={(e) => setHallmark(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea rows="4" value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                    </div>

                    <div className="form-section seo-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>SEO Settings (react-helmet-async)</h3>
                            <button 
                                type="button" 
                                className="ai-btn" 
                                onClick={generateSEOHandler}
                                disabled={generatingSeo}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(45deg, #12c2e9, #c471ed, #f64f59)', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                <FaMagic /> {generatingSeo ? 'Generating...' : 'Generate with AI'}
                            </button>
                        </div>
                        <div className="form-group">
                            <label>Meta Title</label>
                            <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="Will default to Product Name if empty" />
                            <small>Optimal length: 50-60 chars</small>
                        </div>
                        <div className="form-group">
                            <label>Meta Description</label>
                            <textarea rows="3" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Will default to Product Description if empty" />
                            <small>Optimal length: 150-160 chars</small>
                        </div>
                        <div className="form-group">
                            <label>Meta Keywords</label>
                            <input type="text" value={metaKeywords} onChange={(e) => setMetaKeywords(e.target.value)} placeholder="e.g. gold ring, diamond, bridal" />
                        </div>
                    </div>

                    <button type="submit" className="save-btn">Save Product</button>
                </form>
            </div>
        </div>
    )
}

export default AdminProductEditScreen
