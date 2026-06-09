import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const ContractorDashboard = () => {
  const { user, logout } = useAuth()
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('workers')

  const [newWorker, setNewWorker] = useState({
    name: '', department: '', idProofNumber: '',
    idProofExpiry: '', photo: '', faceEncoding: []
  })
  const [addError, setAddError] = useState(null)
  const [addLoading, setAddLoading] = useState(false)
  const [addSuccess, setAddSuccess] = useState(null)

  const [submissions, setSubmissions] = useState([])
  const [selectedWorkers, setSelectedWorkers] = useState([])
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  useEffect(() => {
    fetchWorkers()
    fetchSubmissions()
  }, [])

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/workers')
      setWorkers(res.data.workers)
    } catch (err) {
      setError('Failed to load workers')
    } finally {
      setLoading(false)
    }
  }

  const fetchSubmissions = async () => {
    try {
      const res = await api.get('/submissions')
      setSubmissions(res.data.submissions)
    } catch (err) {}
  }

  const generateMockEncoding = () => {
    return Array.from({ length: 128 }, () => Math.random())
  }

  const handleAddWorker = async (e) => {
    e.preventDefault()
    setAddLoading(true)
    setAddError(null)
    setAddSuccess(null)
    try {
      const faceEncoding = generateMockEncoding()
      await api.post('/workers', { ...newWorker, faceEncoding })
      setAddSuccess('Worker registered successfully')
      setNewWorker({ name: '', department: '', idProofNumber: '', idProofExpiry: '', photo: '' })
      fetchWorkers()
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to add worker')
    } finally {
      setAddLoading(false)
    }
  }

  const handleSubmitList = async () => {
    if (selectedWorkers.length === 0) {
      setSubmitError('Please select at least one worker')
      return
    }
    setSubmitLoading(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    try {
      await api.post('/submissions', { workerIds: selectedWorkers })
      setSubmitSuccess('Daily list submitted successfully')
      setSelectedWorkers([])
      fetchSubmissions()
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit list')
    } finally {
      setSubmitLoading(false)
    }
  }

  const toggleWorkerSelection = (workerId) => {
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    )
  }

  const handleDeleteWorker = async (workerId) => {
    if (!window.confirm('Are you sure you want to delete this worker?')) return
    try {
      await api.delete(`/workers/${workerId}`)
      fetchWorkers()
    } catch (err) {
      alert('Failed to delete worker')
    }
  }

  return (
    <div>
      <nav className="navbar navbar-dark bg-primary px-4">
        <span className="navbar-brand fw-bold">Smart Gate Pass</span>
        <div className="d-flex align-items-center gap-3">
          <span className="text-white">👤 {user?.name}</span>
          <span className="badge bg-light text-primary">Contractor</span>
          <button className="btn btn-outline-light btn-sm" onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="container mt-4">
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'workers' ? 'active' : ''}`}
              onClick={() => setActiveTab('workers')}>Workers</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'add' ? 'active' : ''}`}
              onClick={() => setActiveTab('add')}>Add Worker</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'submit' ? 'active' : ''}`}
              onClick={() => setActiveTab('submit')}>Daily Submission</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}>Submission History</button>
          </li>
        </ul>

        {activeTab === 'workers' && (
          <div>
            <h5 className="mb-3">My Workers ({workers.length})</h5>
            {loading && <div className="spinner-border text-primary" />}
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Worker ID</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>ID Expiry</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map(w => (
                    <tr key={w._id}>
                      <td>{w.workerId}</td>
                      <td>{w.name}</td>
                      <td>{w.department}</td>
                      <td>{new Date(w.idProofExpiry).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${w.status === 'Active' ? 'bg-success' :
                          w.status === 'Suspended' ? 'bg-warning' : 'bg-danger'}`}>
                          {w.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteWorker(w._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {workers.length === 0 && !loading && (
                    <tr><td colSpan="6" className="text-center text-muted">No workers registered yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div style={{ maxWidth: '500px' }}>
            <h5 className="mb-3">Register New Worker</h5>
            {addError && <div className="alert alert-danger">{addError}</div>}
            {addSuccess && <div className="alert alert-success">{addSuccess}</div>}
            <form onSubmit={handleAddWorker}>
              <div className="mb-3">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control"
                  value={newWorker.name}
                  onChange={e => setNewWorker({ ...newWorker, name: e.target.value })}
                  required />
              </div>
              <div className="mb-3">
                <label className="form-label">Department</label>
                <input type="text" className="form-control"
                  value={newWorker.department}
                  onChange={e => setNewWorker({ ...newWorker, department: e.target.value })}
                  required />
              </div>
              <div className="mb-3">
                <label className="form-label">ID Proof Number</label>
                <input type="text" className="form-control"
                  value={newWorker.idProofNumber}
                  onChange={e => setNewWorker({ ...newWorker, idProofNumber: e.target.value })}
                  required />
              </div>
              <div className="mb-3">
                <label className="form-label">ID Proof Expiry</label>
                <input type="date" className="form-control"
                  value={newWorker.idProofExpiry}
                  onChange={e => setNewWorker({ ...newWorker, idProofExpiry: e.target.value })}
                  required />
              </div>
              <div className="mb-3">
                <label className="form-label">Photo URL</label>
                <input type="text" className="form-control"
                  placeholder="Enter photo URL or base64"
                  value={newWorker.photo}
                  onChange={e => setNewWorker({ ...newWorker, photo: e.target.value })}
                  required />
              </div>
              <button type="submit" className="btn btn-primary w-100" disabled={addLoading}>
                {addLoading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                {addLoading ? 'Registering...' : 'Register Worker'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'submit' && (
          <div>
            <h5 className="mb-3">Submit Daily Worker List</h5>
            <p className="text-muted">Select workers coming today (deadline: 6 AM)</p>
            {submitError && <div className="alert alert-danger">{submitError}</div>}
            {submitSuccess && <div className="alert alert-success">{submitSuccess}</div>}
            <div className="table-responsive mb-3">
              <table className="table table-bordered">
                <thead className="table-dark">
                  <tr>
                    <th>Select</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.filter(w => w.status === 'Active').map(w => (
                    <tr key={w._id}>
                      <td>
                        <input type="checkbox"
                          checked={selectedWorkers.includes(w._id)}
                          onChange={() => toggleWorkerSelection(w._id)} />
                      </td>
                      <td>{w.name}</td>
                      <td>{w.department}</td>
                      <td><span className="badge bg-success">{w.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-primary" onClick={handleSubmitList} disabled={submitLoading}>
              {submitLoading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
              Submit List ({selectedWorkers.length} selected)
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h5 className="mb-3">Submission History</h5>
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Date</th>
                    <th>Workers Count</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map(s => (
                    <tr key={s._id}>
                      <td>{new Date(s.date).toLocaleDateString()}</td>
                      <td>{s.workers.length}</td>
                      <td>{s.version}</td>
                      <td>
                        <span className={`badge ${s.status === 'Approved' ? 'bg-success' :
                          s.status === 'Recalled' ? 'bg-danger' : 'bg-warning'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td>{new Date(s.submittedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {submissions.length === 0 && (
                    <tr><td colSpan="5" className="text-center text-muted">No submissions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ContractorDashboard