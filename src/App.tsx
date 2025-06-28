import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Messages from './pages/Messages'
import Quotes from './pages/Quotes'
import Calendar from './pages/Calendar'
import Invoices from './pages/Invoices'
import Settings from './pages/Settings'
import TechSheets from './pages/TechSheets'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/tech-sheets" element={<TechSheets />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default App