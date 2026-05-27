import { useEffect } from 'react'
import WebApp from '@twa-dev/sdk'
import { useStore } from './store'
import LikedPage from './pages/LikedPage'
import SearchPage from './pages/SearchPage'
import Player from './components/Player'
import TabBar from './components/TabBar'

export default function App() {
  const { init, user, page } = useStore()

  useEffect(() => {
    WebApp.ready()
    WebApp.expand()
    if (WebApp.initData) {
      init(WebApp.initData)
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
