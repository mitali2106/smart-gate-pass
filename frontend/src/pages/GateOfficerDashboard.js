import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import FaceScanner from '../components/FaceScanner'

const GateOfficerDashboard = () => {
  const { user, logout } = useAuth()
  const [pending, setPending] = useState([])
  const [scanResult, setScanResult] = useState(null)
  const [activeTab, setActiveTab] = useState('scan')
  const [workers, setWorkers] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchPending()
    fetchWorkers()
  }, [])

  const fetchPending = async () => {
    try {
      const res = await api.get('/verify/pending')
      setPending(res.data.pending)
    } catch (err) {}
  }

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/workers')
      setWorkers(res.data.workers)
    } catch (err) {}
  }

  const handleScanResult = async (result) => {
    if (!result.pass) {
      setScanResult({ error: result.reason })
      return
    }

    const { confidence, livenessPass } = result
    const matchResult = result.confidence

    if (!matchResult || !matchResult.matched) {
      setScanResult({
        verificationStatus: 'NeedsReview',
        confidence: matchResult?.confidence || 0,
        failureCode: 'FACE_MISMATCH'
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post('/verify/scan', {
        workerId: matchResult.workerId,
        confidence: matchResult.confidence,
        livenessPass
      })
      setScanResult({ ...res.data, confidence: matchResult.confidence })
      fetchPending()
    } catch (err) {
      setScanResult({ error: err.response?.data?.error || 'Scan submission failed' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <nav className="navbar navbar-dark bg-success px-4">
        <span className="navbar-brand fw-bold">Smart Gate Pass</span>
        <div className="d-flex align-items-center gap-3">
          <span className="text-white">👤 {user?.name}</span>
          <span className="badge bg-light text-success">Gate Officer</span>
          <button className="btn btn-outline-light btn-sm" onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="container mt-4">
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'scan' ? 'active' : ''}`}
              onClick={() => setActiveTab('scan')}>Face Scan</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}>
              Manual Verify ({pending.length})
            </button>
          </li>
        </ul>

        {activeTab === 'scan' && (
          <div style={{ maxWidth: '520px' }}>
            <h5 className="mb-3">Face Recognition Scanner</h5>
            <FaceScanner
              storedWorkers={workers}
              onScanResult={handleScanResult}
            />
            {submitting && (
              <div className="mt-2 text-center">
                <span className="spinner-border spinner-border-sm me-2" />
                Submitting scan result...
              </div>
            )}
            {scanResult && (
              <div className={`alert mt-3 ${scanResult.error ? 'alert-danger' :
                scanResult.verificationStatus === 'Matched' ? 'alert-success' :
                scanResult.verificationStatus === 'NeedsReview' ? 'alert-warning' :
                'alert-danger'}`}>
                {scanResult.error ? (
                  <p className="mb-0">{scanResult.error}</p>
                ) : (
                  <>
                    <strong>Status: {scanResult.verificationStatus}</strong>
                    <p className="mb-0">Confidence: {scanResult.confidence}%</p>
                    {scanResult.failureCode && (
                      <p className="mb-0">Reason: {scanResult.failureCode}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div>
            <h5 className="mb-3">Manual Verify Queue</h5>
            {pending.length === 0 ? (
              <div className="alert alert-info">No workers in manual verify queue</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead className="table-dark">
                    <tr>
                      <th>Worker</th>
                      <th>Confidence</th>
                      <th>Failure Reason</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map(p => (
                      <tr key={p._id}>
                        <td>{p.workerId?.name || 'Unknown'}</td>
                        <td>{p.confidence}%</td>
                        <td>
                          <span className="badge bg-warning text-dark">
                            {p.failureCode}
                          </span>
                        </td>
                        <td>{new Date(p.createdAt).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default GateOfficerDashboard