import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { FaTrash, FaCheck, FaTimes } from 'react-icons/fa'
import api from '../../services/api'
import './AdminUsersScreen.css'

const AdminUsersScreen = () => {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const { data } = await api.get('/users')
            setUsers(data)
            setLoading(false)
        } catch (err) {
            setError(err?.response?.data?.message || err.message)
            setLoading(false)
        }
    }

    const deleteHandler = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await api.delete(`/users/${id}`)
                fetchUsers()
            } catch (err) {
                alert(err?.response?.data?.message || err.message)
            }
        }
    }

    if (loading) return <div className="loading-container">Loading users...</div>
    if (error) return <div className="error-message">{error}</div>

    return (
        <div className="admin-users-screen">
            <Helmet>
                <title>Manage Users | Admin Dashboard</title>
            </Helmet>
            <div className="container">
                <div className="admin-header">
                    <h1>Users</h1>
                </div>

                <div className="table-responsive">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>NAME</th>
                                <th>EMAIL</th>
                                <th>ADMIN</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user._id}>
                                    <td>{user._id.substring(0, 8)}...</td>
                                    <td>{user.name}</td>
                                    <td><a href={`mailto:${user.email}`}>{user.email}</a></td>
                                    <td>
                                        {user.isAdmin ? (
                                            <FaCheck style={{ color: 'green' }} />
                                        ) : (
                                            <FaTimes style={{ color: 'red' }} />
                                        )}
                                    </td>
                                    <td className="actions">
                                        <button className="delete-btn" onClick={() => deleteHandler(user._id)}>
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

export default AdminUsersScreen
