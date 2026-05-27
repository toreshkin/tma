import { useEffect, useState } from 'react'
import { useStore } from './store'
import LikedPage from './pages/LikedPage'
import SearchPage from './pages/SearchPage'
import Player from './components/Player'
import TabBar from './components/TabBar'

const tg = window.Telegram?.WebApp

export default function App() {
  const { init, user, page } = useStore()
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    tg?.ready()
    tg?.expand()
    const initData = tg?.initData
    if (initData) {
      fetch('https://nota-backend-o90i.onrender.com/health')
        .then(r => r.json())
        .then(data => setAuthError(`health ok: ${JSON.stringify(data)}`))
        .catch(e => setAuthError(`health fail: ${e.message}`))
    } else {
      setAuthError(`no initData. Telegram=${!!window.Telegram}`)
    }
  }, [])

  if (!user) {
    return (
      <div className="loading">
        {authError
          ? <p style={{ color: 'var(--fg2)', textAlign: 'center', padding: '0 24px' }}>{authError}</p>
          : <>
              <div className="loading__spinner" />
              <p>Подключаемся…</p>
            </>
        }
      </div>
    )
  }

  return (
    <div className="app">
      <div className="page-content">
        {page === 'liked' ? <LikedPage /> : <SearchPage />}
      </div>
      <Player />
      <TabBar />
    </div>
  )
}
