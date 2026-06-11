import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import FaceScanner from '../components/FaceScanner'
import { QRCodeSVG } from 'qrcode.react'

const GateOfficerDashboard = () => {
  const { user, logout } = useAuth()
  const [pending, setPending] = useState([])
  const [scanResult, setScanResult] = useState(null)
  const [activeTab, setActiveTab] = useState('scan')
  const [workers, setWorkers] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [generatedPass, setGeneratedPass] = useState(null)

  useEffect(() => {
    fetchPending()
    fetchAllWorkers()
  }, [])

  const fetchPending = async () => {
    try {
      const res = await api.get('/verify/pending')
      setPending(res.data.pending)
    } catch (err) {}
  }

  const fetchAllWorkers = async () => {
    try {
      const res = await api.get('/workers/all')
      setWorkers(res.data.workers)
    } catch (err) {}
  }

  const handleScanResult = async (result) => {
    if (!result.pass) {
      setScanResult({ error: result.reason })
      return
    }

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
        livenessPass: result.livenessPass
      })
      setScanResult({ ...res.data, confidence: matchResult.confidence })
      if (res.data.gatePass) {
        setGeneratedPass(res.data.gatePass)
      }
      fetchPending()
    } catch (err) {
      setScanResult({ error: err.response?.data?.error || 'Scan submission failed' })
    } finally {
      setSubmitting(false)
    }
  }

  const downloadQR = () => {
    const svg = document.querySelector('#gate-pass-qr svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 200
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 200, 200)
      ctx.drawImage(img, 0, 0, 200, 200)
      const a = document.createElement('a')
      a.download = `GatePass-${generatedPass.passNumber}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
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
            <p className="text-muted small">
              {workers.length} workers loaded for matching
            </p>
            <FaceScanner
              storedWorkers={workers}
              onScanResult={handleScanResult}
            />
            {submitting && (
              <div className="mt-2 text-center">
                <span className="spinner-border spinner-border-sm me-2" />
                Processing scan...
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

            {generatedPass && (
              <div className="card mt-3 p-3 border-success">
                <h6 className="text-success">✅ Gate Pass Generated</h6>
                <p className="mb-1"><strong>Pass Number:</strong> {generatedPass.passNumber}</p>
                <p className="mb-2"><strong>Valid for:</strong> Today only</p>
                <div id="gate-pass-qr" className="d-flex justify-content-center mt-2">
                  <QRCodeSVG value={generatedPass.qrPayload} size={150} />
                </div>
                <p className="text-muted small text-center mt-2">
                  Worker can show this QR at the security gate
                </p>
                <button
                  className="btn btn-success w-100 mt-2"
                  onClick={downloadQR}>
                  ⬇ Download Gate Pass QR
                </button>
                <button
                  className="btn btn-outline-success btn-sm mt-2 w-100"
                  onClick={() => {
                    setScanResult(null)
                    setGeneratedPass(null)
                  }}>
                  Scan Next Worker
                </button>
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