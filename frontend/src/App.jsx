import { useState } from 'react'
import './App.css'

function App() {
  const [result, setResult] = useState('')

  const testApi = async () => {
    try {
      const res = await fetch('/api/health')

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const text = await res.text()
      setResult(`성공: ${text}`)
    } catch (err) {
      setResult(`실패: ${err.message}`)
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Private LB Test</h1>

      <button onClick={testApi}>
        WAS 통신 테스트
      </button>

      <p>{result}</p>
    </div>
  )
}

export default App