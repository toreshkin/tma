import { useEffect } from 'react'
import { useStore } from './store'
import LikedPage from './pages/LikedPage'
import SearchPage from './pages/SearchPage'
import Player from './components/Player'
import TabBar from './components/TabBar'

const tg = window.Telegram?.WebApp

export default function App() {
  const { init, user, page } = useStore()

  useEffect(() => {
    tg?.ready()
    tg?.expand()
    if (tg?.initData) {
      init(tg.initData)
    }
  }, [])

  if (!user) {
    return (
      <div className="loading">
        <div className="loading__spinner" />
        <p>Подключаемся…</p>
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
