import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'

import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import ContractorDashboard from './pages/ContractorDashboard'
import GateOfficerDashboard from './pages/GateOfficerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import SecurityDashboard from './pages/SecurityDashboard'
import NotFound from './pages/NotFound'
import Forbidden from './pages/Forbidden'

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/403" element={<Forbidden />} />

            <Route path="/contractor" element={
              <ProtectedRoute allowedRoles={['contractor']}>
                <ContractorDashboard />
              </ProtectedRoute>
            } />

            <Route path="/officer" element={
              <ProtectedRoute allowedRoles={['gate_officer']}>
                <GateOfficerDashboard />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/security" element={
              <ProtectedRoute allowedRoles={['security']}>
                <SecurityDashboard />
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App