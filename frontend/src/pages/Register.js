import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    contractorName: '',
    licenseNumber: '',
    contactPhone: ''
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/register', formData)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="card shadow p-4" style={{ width: '100%', maxWidth: '480px' }}>
        <h3 className="text-center mb-1 text-primary fw-bold">Smart Gate Pass</h3>
        <p className="text-center text-muted mb-4">Create your account</p>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              className="form-control"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-control"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-control"
              value={formData.password}
              onChange={handleChange}
              minLength={6}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Role</label>
            <select
              name="role"
              className="form-select"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="">Select your role</option>
              <option value="contractor">Contractor</option>
              <option value="gate_officer">Gate Pass Officer</option>
              <option value="admin">Admin</option>
              <option value="security">Security</option>
            </select>
          </div>

          {formData.role === 'contractor' && (
            <>
              <div className="mb-3">
                <label className="form-label">Company Name</label>
                <input
                  type="text"
                  name="contractorName"
                  className="form-control"
                  value={formData.contractorName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">License Number</label>
                <input
                  type="text"
                  name="licenseNumber"
                  className="form-control"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Contact Phone</label>
                <input
                  type="text"
                  name="contactPhone"
                  className="form-control"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2" />
            ) : null}
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="text-center mt-3 text-muted">
          Already have an account?{' '}
          <a href="/login" className="text-primary">Login</a>
        </p>
      </div>
    </div>
  )
}

export default Register