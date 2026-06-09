import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const AdminDashboard = () => {
  const { user, logout } = useAuth()
  const [dashboard, setDashboard] = useState({ matched: [], needsReview: [], approved: [] })
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [overrideWorker, setOverrideWorker] = useState(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard')
      setDashboard(res.data)
    } catch (err) {
      setError('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveBatch = async () => {
    const workerIds = dashboard.matched.map(r => r.workerId?._id || r.workerId)
    if (workerIds.length === 0) {
      setError('No matched workers to approve')
      return
    }
    setApproving(true)
    setMessage(null)
    setError(null)
    try {
      const res = await api.post('/admin/approve-batch', { workerIds })
      setMessage(res.data.message)
      fetchDashboard()
    } catch (err) {
      setError(err.response?.data?.error || 'Batch approval failed')
    } finally {
      setApproving(false)
    }
  }

  const handleOverride = async () => {
    if (!overrideReason.trim()) {
      alert('Please provide a justification for the override')
      return
    }
    try {
      await api.post('/admin/approve-batch', {
        workerIds: [overrideWorker],
        overrideReason
      })
      setMessage('Override approved successfully')
      setOverrideWorker(null)
      setOverrideReason('')
      fetchDashboard()
    } catch (err) {
      setError(err.response?.data?.error || 'Override failed')
    }
  }

  return (
    <div>
      <nav className="navbar navbar-dark bg-dark px-4">
        <span className="navbar-brand fw-bold">Smart Gate Pass</span>
        <div className="d-flex align-items-center gap-3">
          <span className="text-white">👤 {user?.name}</span>
          <span className="badge bg-light text-dark">Admin</span>
          <button className="btn btn-outline-light btn-sm" onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="container mt-4">
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}>Approval Dashboard</button>
          </li>
        </ul>

        {loading && <div className="spinner-border text-primary" />}
        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {activeTab === 'dashboard' && (
          <div>
            <div className="row mb-4">
              <div className="col-md-4">
                <div className="card text-center p-3 border-success">
                  <h2 className="text-success">{dashboard.matched.length}</h2>
                  <p className="mb-0">Ready to Approve</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card text-center p-3 border-warning">
                  <h2 className="text-warning">{dashboard.needsReview.length}</h2>
                  <p className="mb-0">Needs Review</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card text-center p-3 border-primary">
                  <h2 className="text-primary">{dashboard.approved.length}</h2>
                  <p className="mb-0">Already Approved</p>
                </div>
              </div>
            </div>

            {dashboard.matched.length > 0 && (
              <button className="btn btn-success mb-4" onClick={handleApproveBatch} disabled={approving}>
                {approving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Approve All Matched ({dashboard.matched.length} workers)
              </button>
            )}

            <h6>Ready to Approve</h6>
            <div className="table-responsive mb-4">
              <table className="table table-bordered table-hover">
                <thead className="table-success">
                  <tr><th>Worker</th><th>Confidence</th><th>Liveness</th></tr>
                </thead>
                <tbody>
                  {dashboard.matched.map(r => (
                    <tr key={r._id}>
                      <td>{r.workerId?.name || 'Unknown'}</td>
                      <td>{r.confidence}%</td>
                      <td>{r.livenessPass ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                  {dashboard.matched.length === 0 && (
                    <tr><td colSpan="3" className="text-center text-muted">No matched workers</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <h6>Needs Review</h6>
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead className="table-warning">
                  <tr><th>Worker</th><th>Confidence</th><th>Failure Reason</th><th>Override</th></tr>
                </thead>
                <tbody>
                  {dashboard.needsReview.map(r => (
                    <tr key={r._id}>
                      <td>{r.workerId?.name || 'Unknown'}</td>
                      <td>{r.confidence}%</td>
                      <td><span className="badge bg-warning text-dark">{r.failureCode}</span></td>
                      <td>
                        <button className="btn btn-sm btn-outline-warning"
                          onClick={() => setOverrideWorker(r.workerId?._id)}>
                          Override
                        </button>
                      </td>
                    </tr>
                  ))}
                  {dashboard.needsReview.length === 0 && (
                    <tr><td colSpan="4" className="text-center text-muted">No workers in review queue</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {overrideWorker && (
              <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title">Override Approval</h5>
                      <button className="btn-close" onClick={() => setOverrideWorker(null)} />
                    </div>
                    <div className="modal-body">
                      <p>Provide written justification for this override:</p>
                      <textarea className="form-control" rows="3"
                        value={overrideReason}
                        onChange={e => setOverrideReason(e.target.value)}
                        placeholder="Reason for override..." />
                    </div>
                    <div className="modal-footer">
                      <button className="btn btn-secondary" onClick={() => setOverrideWorker(null)}>Cancel</button>
                      <button className="btn btn-warning" onClick={handleOverride}>Confirm Override</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard