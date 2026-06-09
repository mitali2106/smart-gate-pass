import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const SecurityDashboard = () => {
  const { user, logout } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [entryLoading, setEntryLoading] = useState(false)
  const [entryResult, setEntryResult] = useState(null)
  const [entryError, setEntryError] = useState(null)
  const [workerId, setWorkerId] = useState('')
  const [qrPayload, setQrPayload] = useState('')
  const [activeTab, setActiveTab] = useState('scanner')

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const res = await api.get('/security/dashboard')
      setDashboard(res.data)
    } catch (err) {
      alert('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleEntry = async () => {
    if (!workerId || !qrPayload) {
      setEntryError('Both Worker ID and QR Payload are required')
      return
    }
    setEntryLoading(true)
    setEntryResult(null)
    setEntryError(null)
    try {
      const res = await api.post('/security/entry', { workerId, qrPayload })
      setEntryResult(res.data)
      setWorkerId('')
      setQrPayload('')
    } catch (err) {
      setEntryError(err.response?.data?.error || 'Entry recording failed')
    } finally {
      setEntryLoading(false)
    }
  }

  return (
    <div>
      <nav className="navbar navbar-dark bg-danger px-4">
        <span className="navbar-brand fw-bold">Smart Gate Pass</span>
        <div className="d-flex align-items-center gap-3">
          <span className="text-white">👤 {user?.name}</span>
          <span className="badge bg-light text-danger">Security</span>
          <button className="btn btn-outline-light btn-sm" onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="container mt-4">
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'scanner' ? 'active' : ''}`}
              onClick={() => setActiveTab('scanner')}>Entry/Exit Scanner</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}>Live Dashboard</button>
          </li>
        </ul>

        {activeTab === 'scanner' && (
          <div style={{ maxWidth: '500px' }}>
            <h5 className="mb-3">Record Entry / Exit</h5>
            {entryError && <div className="alert alert-danger">{entryError}</div>}
            {entryResult && (
              <div className="alert alert-success">
                <strong>{entryResult.message}</strong>
                {entryResult.workingHours && <p className="mb-0">Working Hours: {entryResult.workingHours}</p>}
              </div>
            )}
            <div className="mb-3">
              <label className="form-label">Worker ID (from face scan)</label>
              <input type="text" className="form-control"
                placeholder="Enter worker MongoDB ID"
                value={workerId}
                onChange={e => setWorkerId(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label">QR Code Payload</label>
              <textarea className="form-control" rows="3"
                placeholder="Paste QR JWT payload here"
                value={qrPayload}
                onChange={e => setQrPayload(e.target.value)} />
            </div>
            <button className="btn btn-danger w-100" onClick={handleEntry} disabled={entryLoading}>
              {entryLoading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
              Record Entry / Exit
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5>Live Dashboard</h5>
              <button className="btn btn-outline-danger" onClick={fetchDashboard} disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-2" /> : '🔄 '}
                Refresh
              </button>
            </div>

            {!dashboard && !loading && (
              <div className="alert alert-info">Click Refresh to load current data</div>
            )}

            {dashboard && (
              <>
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card text-center p-3 border-primary">
                      <h2 className="text-primary">{dashboard.totalApproved}</h2>
                      <p className="mb-0">Total Approved</p>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card text-center p-3 border-success">
                      <h2 className="text-success">{dashboard.inside}</h2>
                      <p className="mb-0">Inside Now</p>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card text-center p-3 border-warning">
                      <h2 className="text-warning">{dashboard.enteredToday}</h2>
                      <p className="mb-0">Entered Today</p>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card text-center p-3 border-secondary">
                      <h2 className="text-secondary">{dashboard.exited}</h2>
                      <p className="mb-0">Exited</p>
                    </div>
                  </div>
                </div>

                <h6>Recent Activity</h6>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover">
                    <thead className="table-dark">
                      <tr><th>Worker</th><th>Entry Time</th><th>Exit Time</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {dashboard.recentActivity.map(a => (
                        <tr key={a._id}>
                          <td>{a.workerId?.name || 'Unknown'}</td>
                          <td>{a.entryTime ? new Date(a.entryTime).toLocaleTimeString() : '-'}</td>
                          <td>{a.exitTime ? new Date(a.exitTime).toLocaleTimeString() : '-'}</td>
                          <td>
                            <span className={`badge ${a.status === 'Inside' ? 'bg-success' : 'bg-secondary'}`}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {dashboard.recentActivity.length === 0 && (
                        <tr><td colSpan="4" className="text-center text-muted">No activity today</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SecurityDashboard