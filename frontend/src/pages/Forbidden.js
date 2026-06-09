import React from 'react'
import { useNavigate } from 'react-router-dom'

const Forbidden = () => {
  const navigate = useNavigate()
  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="text-center">
        <h1 className="display-1 text-danger">403</h1>
        <h4>Access Forbidden</h4>
        <p className="text-muted">You do not have permission to access this page.</p>
        <button className="btn btn-primary" onClick={() => navigate('/login')}>
          Go to Login
        </button>
      </div>
    </div>
  )
}

export default Forbidden