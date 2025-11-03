import React from 'react'
import PropTypes from 'prop-types'
import { Outlet, NavLink } from 'react-router-dom'
import HeaderSection from '../components/HeaderSection.jsx'

function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeaderSection title="DROX DevOps Dashboard" />
      <nav className="px-4 md:px-6 py-2 border-b">
        <ul className="flex gap-4 text-sm">
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}>
              대시보드
            </NavLink>
          </li>
          <li>
            <NavLink to="/jobs" className={({ isActive }) => isActive ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}>
              잡 관리
            </NavLink>
          </li>
        </ul>
      </nav>
      <main className="px-4 md:px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}

AppLayout.propTypes = {
  children: PropTypes.node,
}

export default AppLayout

