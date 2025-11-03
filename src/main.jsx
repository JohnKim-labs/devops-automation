import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppLayout from './shell/AppLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import JobsPage from './pages/JobsPage.jsx'
import './index.css'

const queryClient = new QueryClient()

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}> 
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)

