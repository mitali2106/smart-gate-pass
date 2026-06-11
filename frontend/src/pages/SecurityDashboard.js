import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { Html5QrcodeScanner } from 'html5-qrcode'
import FaceScanner from '../components/FaceScanner'

const SecurityDashboard = () => {
  const { user, logout } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('scanner')

  const [step, setStep] = useState('face')
  const [scannedWorkerId, setScannedWorkerId] = useState(null)
  const [scannedWorkerName, setScannedWorkerName] = useState(null)
  const [qrPayload, setQrPayload] = useState('')
  const [qrScanned, setQrScanned] = useState(false)
  const [entryResult, setEntryResult] = useState(null)
  const [entryError, setEntryError] = useState(null)
  const [entryLoading, setEntryLoading] = useState(false)
  const [workers, setWorkers] = useState([])

  const scannerRef = useRef(null)

  useEffect(() => {
    fetchAllWorkers()
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear()
      }
    }
  }, [])

  useEffect(() => {
    if (step === 'qr' && !qrScanned) {
      setTimeout(() => {
        if (document.getElementById('qr-reader-security')) {
          scannerRef.current = new Html5QrcodeScanner(
            'qr-reader-security',
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
          )
          scannerRef.current.render(
            (decodedText) => {
              setQrPayload(decodedText)
              setQrScanned(true)
              scannerRef.current.clear()
            },
            (error) => {}
          )
        }
      }, 500)
    }
  }, [step, qrScanned])

  const fetchAllWorkers = async () => {
    try {
      const res = await api.get('/workers/all')
      setWorkers(res.data.workers)
    } catch (err) {}
  }

  const handleFaceScanResult = (result) => {
    if (!result.pass) {
      setEntryError(result.reason || 'Face scan failed')
      return
    }
    const matchResult = result.confidence
    if (!matchResult || !matchResult.matched) {
      setEntryError('Face not recognized. Worker not found.')
      return
    }
    const worker = workers.find(w => w._id === matchResult.workerId)
    setScannedWorkerId(matchResult.workerId)
    setScannedWorkerName(worker?.name || 'Unknown Worker')
    setStep('qr')
    setEntryError(null)
  }

  const handleRecordEntry = async () => {
    if (!scannedWorkerId || !qrPayload) {
      setEntryError('Both face scan and QR scan are required')
      return
    }
    setEntryLoading(true)
    setEntryResult(null)
    setEntryError(null)
    try {
      const res = await api.post('/security/entry', {
        workerId: scannedWorkerId,
        qrPayload
      })
      setEntryResult(res.data)
    } catch (err) {
      setEntryError(err.response?.data?.error || 'Entry recording failed')
    } finally {
      setEntryLoading(false)
    }
  }

  const resetScanner = () => {
    setStep('face')
    setScannedWorkerId(null)
    setScannedWorkerName(null)
    setQrPayload('')
    setQrScanned(false)
    setEntryResult(null)
    setEntryError(null)
  }

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
          <div style={{ maxWidth: '520px' }}>
            <h5 className="mb-3">Record Entry / Exit</h5>

            <div className="d-flex mb-4 gap-2">
              <div className={`badge p-2 ${step === 'face' ? 'bg-primary' : 'bg-success'}`}>
                Step 1: Face Scan
              </div>
              <div className={`badge p-2 ${step === 'qr' ? 'bg-primary' : step === 'done' ? 'bg-success' : 'bg-secondary'}`}>
                Step 2: QR Scan
              </div>
            </div>

            {entryError && <div className="alert alert-danger">{entryError}</div>}
            {entryResult && (
              <div className="alert alert-success">
                <strong>{entryResult.message}</strong>
                {entryResult.workingHours && (
                  <p className="mb-0">Working Hours: {entryResult.workingHours}</p>
                )}
                <button className="btn btn-sm btn-outline-success mt-2" onClick={resetScanner}>
                  Next Worker
                </button>
              </div>
            )}

            {!entryResult && (
              <>
                {step === 'face' && (
                  <div>
                    <p className="text-muted">Step 1: Scan worker's face to identify them</p>
                    <FaceScanner
                      storedWorkers={workers}
                      onScanResult={handleFaceScanResult}
                    />
                  </div>
                )}

                {step === 'qr' && (
                  <div>
                    <div className="alert alert-success mb-3">
                      ✅ Worker identified: <strong>{scannedWorkerName}</strong>
                    </div>
                    <p className="text-muted">Step 2: Scan worker's QR gate pass</p>
                    {!qrScanned ? (
                      <div id="qr-reader-security" style={{ width: '100%' }} />
                    ) : (
                      <div className="alert alert-success d-flex justify-content-between align-items-center">
                        <span>✅ QR Code scanned successfully</span>
                        <button className="btn btn-sm btn-outline-success"
                          onClick={() => { setQrPayload(''); setQrScanned(false) }}>
                          Rescan
                        </button>
                      </div>
                    )}

                    {qrScanned && (
                      <button
                        className="btn btn-danger w-100 mt-3"
                        onClick={handleRecordEntry}
                        disabled={entryLoading}>
                        {entryLoading ? (
                          <span className="spinner-border spinner-border-sm me-2" />
                        ) : null}
                        Record Entry / Exit
                      </button>
                    )}

                    <button className="btn btn-outline-secondary w-100 mt-2" onClick={resetScanner}>
                      Start Over
                    </button>
                  </div>
                )}
              </>
            )}
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
                      <tr>
                        <th>Worker</th>
                        <th>Entry Time</th>
                        <th>Exit Time</th>
                        <th>Status</th>
                      </tr>
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
                        <tr>
                          <td colSpan="4" className="text-center text-muted">No activity today</td>
                        </tr>
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