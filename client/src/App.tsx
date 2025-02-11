import React from 'react'

function App() {
  const [count, setCount] = React.useState(0)

  return (
    <div>
      <h1>Test React App</h1>
      <button onClick={() => setCount(c => c + 1)}>
        count is {count}
      </button>
    </div>
  )
}

export default App