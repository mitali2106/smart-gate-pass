import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const AdminDashboard = () => {
  const { user, logout } = useAuth()
  const [dashboard, setDashboard] = useState({
    pendingLists: [], approvedLists: [], needsReview: [], approvedPasses: []
  })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [overrideWorker, setOverrideWorker] = useState(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [activeTab, setActiveTab] = useState('pending')

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

  const handleApproveList = async (listId) => {
    setMessage(null)
    setError(null)
    try {
      const res = await api.post('/admin/approve-list', { listId })
      setMessage(res.data.message)
      fetchDashboard()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve list')
    }
  }

  const handleOverride = async () => {
    if (!overrideReason.trim()) {
      alert('Please provide a justification')
      return
    }
    try {
      const res = await api.post('/admin/override-worker', {
        workerId: overrideWorker,
        overrideReason
      })
      setMessage(res.data.message)
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
            <button className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}>
              Pending Lists
              {dashboard.pendingLists.length > 0 && (
                <span className="badge bg-warning text-dark ms-2">{dashboard.pendingLists.length}</span>
              )}
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'approved' ? 'active' : ''}`}
              onClick={() => setActiveTab('approved')}>Approved Lists</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'review' ? 'active' : ''}`}
              onClick={() => setActiveTab('review')}>
              Needs Review
              {dashboard.needsReview.length > 0 && (
                <span className="badge bg-danger ms-2">{dashboard.needsReview.length}</span>
              )}
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'passes' ? 'active' : ''}`}
              onClick={() => setActiveTab('passes')}>Gate Passes</button>
          </li>
        </ul>

        {loading && <div className="spinner-border text-primary" />}
        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {activeTab === 'pending' && (
          <div>
            <h5 className="mb-3">Pending Submissions — Waiting for Approval</h5>
            {dashboard.pendingLists.length === 0 ? (
              <div className="alert alert-info">No pending submissions for today</div>
            ) : (
              dashboard.pendingLists.map(list => (
                <div key={list._id} className="card mb-3 p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1">{list.contractorId?.name || 'Unknown Contractor'}</h6>
                      <p className="mb-1 text-muted">Workers: {list.workers.length}</p>
                      <p className="mb-0 text-muted small">
                        Submitted: {new Date(list.submittedAt).toLocaleTimeString()}
                      </p>
                      <div className="mt-2">
                        {list.workers.map(w => (
                          <span key={w._id} className="badge bg-secondary me-1">{w.name}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      className="btn btn-success"
                      onClick={() => handleApproveList(list._id)}>
                      Approve List
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'approved' && (
          <div>
            <h5 className="mb-3">Approved Lists Today</h5>
            {dashboard.approvedLists.length === 0 ? (
              <div className="alert alert-info">No approved lists yet</div>
            ) : (
              dashboard.approvedLists.map(list => (
                <div key={list._id} className="card mb-3 p-3 border-success">
                  <h6>{list.contractorId?.name || 'Unknown Contractor'}</h6>
                  <p className="text-muted mb-2">Workers: {list.workers.length}</p>
                  <div>
                    {list.workers.map(w => (
                      <span key={w._id} className="badge bg-success me-1">{w.name}</span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'review' && (
          <div>
            <h5 className="mb-3">Needs Review — Face Scan Failed</h5>
            {dashboard.needsReview.length === 0 ? (
              <div className="alert alert-info">No workers in review queue</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="table-warning">
                    <tr>
                      <th>Worker</th>
                      <th>Confidence</th>
                      <th>Failure Reason</th>
                      <th>Override</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.needsReview.map(r => (
                      <tr key={r._id}>
                        <td>{r.workerId?.name || 'Unknown'}</td>
                        <td>{r.confidence}%</td>
                        <td>
                          <span className="badge bg-warning text-dark">{r.failureCode}</span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => setOverrideWorker(r.workerId?._id)}>
                            Override
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'passes' && (
          <div>
            <h5 className="mb-3">Gate Passes Generated Today</h5>
            {dashboard.approvedPasses.length === 0 ? (
              <div className="alert alert-info">No gate passes generated yet</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Pass Number</th>
                      <th>Worker</th>
                      <th>Status</th>
                      <th>Entry Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.approvedPasses.map(p => (
                      <tr key={p._id}>
                        <td>{p.passNumber}</td>
                        <td>{p.workerId?.name || 'Unknown'}</td>
                        <td><span className="badge bg-success">{p.status}</span></td>
                        <td>{p.entryUsed ? '✅ Used' : '⏳ Not used'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {overrideWorker && (
          <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Override Worker</h5>
                  <button className="btn-close" onClick={() => setOverrideWorker(null)} />
                </div>
                <div className="modal-body">
                  <p>Provide written justification for this override:</p>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                    placeholder="Reason for override..."
                  />
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setOverrideWorker(null)}>
                    Cancel
                  </button>
                  <button className="btn btn-warning" onClick={handleOverride}>
                    Confirm Override
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard