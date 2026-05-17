import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaEdit, FaSave } from 'react-icons/fa'
import { userAPI } from '../services/api'
import './ProfileScreen.css'

const ProfileScreen = () => {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    country: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await userAPI.getProfile()
        setUserData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address?.address || '',
          city: data.address?.city || '',
          zipCode: data.address?.zipCode || '',
          country: data.address?.country || ''
        })
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleChange = (e) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value
    })
  }

  const handleSave = async () => {
    try {
      await userAPI.updateProfile({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        address: {
          address: userData.address,
          city: userData.city,
          zipCode: userData.zipCode,
          country: userData.country
        }
      })
      setIsEditing(false)
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="profile-screen">
      <div className="container">
        <div className="profile-header">
          <h1>My Profile</h1>
          {!loading && (
            <button onClick={() => setIsEditing(!isEditing)} className="edit-btn">
              {isEditing ? <FaSave /> : <FaEdit />}
              {isEditing ? 'Save' : 'Edit'}
            </button>
          )}
        </div>

        <div className="profile-layout">
          <div className="profile-sidebar">
            <div className="profile-avatar">
              <FaUser />
            </div>
            <h2>{userData.name}</h2>
            <p>{userData.email}</p>
            <div className="profile-menu">
              <Link to="/profile" className="menu-item active">
                Profile
              </Link>
              <Link to="/orders" className="menu-item">
                Orders
              </Link>
              <button onClick={handleLogout} className="menu-item logout">
                Logout
              </button>
            </div>
          </div>

          <div className="profile-content">
            <div className="profile-section">
              <h3>Personal Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    <FaUser /> Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={userData.name}
                      onChange={handleChange}
                    />
                  ) : (
                    <p>{userData.name || 'Not provided'}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>
                    <FaEnvelope /> Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={userData.email}
                      onChange={handleChange}
                    />
                  ) : (
                    <p>{userData.email || 'Not provided'}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>
                    <FaPhone /> Phone
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={userData.phone}
                      onChange={handleChange}
                    />
                  ) : (
                    <p>{userData.phone || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="profile-section">
              <h3>Address Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    <FaMapMarkerAlt /> Address Line
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="address"
                      value={userData.address}
                      onChange={handleChange}
                    />
                  ) : (
                    <p>{userData.address || 'Not provided'}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>City</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="city"
                      value={userData.city}
                      onChange={handleChange}
                    />
                  ) : (
                    <p>{userData.city || 'Not provided'}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Zip Code</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="zipCode"
                      value={userData.zipCode}
                      onChange={handleChange}
                    />
                  ) : (
                    <p>{userData.zipCode || 'Not provided'}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Country</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="country"
                      value={userData.country}
                      onChange={handleChange}
                    />
                  ) : (
                    <p>{userData.country || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>



            {isEditing && (
              <div className="profile-actions">
                <button onClick={handleSave} className="save-btn">
                  Save Changes
                </button>
                <button onClick={() => setIsEditing(false)} className="cancel-btn">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileScreen

