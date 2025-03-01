import React from 'react'
import { useState } from 'react'
import { TestComponent } from './TestComponent'

function App() {
  // Simple state to test useState initialization
  const [count, setCount] = useState(0)

  return (
    <div className="app-container">
      <h1 className="text-2xl font-bold m-4">CIVETTA CRM - Diagnóstico</h1>
      <p className="m-4">Esta es una versión simplificada para diagnosticar problemas de renderizado.</p>
      <button 
        className="mx-4 px-4 py-2 bg-primary text-white rounded"
        onClick={() => setCount(count + 1)}
      >
        Contador: {count}
      </button>
      <TestComponent />
    </div>
  )
}

export default App