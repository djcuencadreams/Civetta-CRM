import React from 'react'
import { Route } from "wouter"
import DashboardPage from "@/pages/dashboard"

// Simplify the App component to minimal functionality
function App() {
  return (
    <div className="min-h-screen bg-background">
      <main className="p-8">
        <DashboardPage />
      </main>
    </div>
  )
}

export default App