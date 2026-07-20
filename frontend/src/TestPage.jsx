import { useState } from 'react'
import './TestPage.css'

function TestPage() {
  const [result, setResult] = useState('')

  const testApi = async (type) => {
    const endpoint = {
      was: '/api/health',
      mysql: '/api/test/mysql',
      redis: '/api/test/redis',
    }[type]

    setResult(`${type.toUpperCase()} 테스트 중...`)

    try {
      const response = await fetch(endpoint)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      setResult(
        `${type.toUpperCase()} 성공\n${JSON.stringify(data, null, 2)}`,
      )
    } catch (error) {
      setResult(`${type.toUpperCase()} 실패: ${error.message}`)
    }
  }

  return (
    <main className="test-page">
      <section className="test-card">
        <header className="test-header">
          <h1>통신 테스트</h1>
          <p>WAS, MySQL, Redis 연결 상태를 확인합니다.</p>
        </header>

        <div className="test-button-group">
          <button
            className="test-button"
            type="button"
            onClick={() => testApi('was')}
          >
            WAS 통신 테스트
          </button>

          <button
            className="test-button"
            type="button"
            onClick={() => testApi('mysql')}
          >
            MySQL 통신 테스트
          </button>

          <button
            className="test-button"
            type="button"
            onClick={() => testApi('redis')}
          >
            Redis 통신 테스트
          </button>
        </div>

        <pre className="test-result">
          {result || '테스트 버튼을 눌러주세요.'}
        </pre>
      </section>
    </main>
  )
}

export default TestPage