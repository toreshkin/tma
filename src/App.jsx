import { useEffect, useState } from 'react'
import { useStore } from './store'
import LikedPage from './pages/LikedPage'
import SearchPage from './pages/SearchPage'
import HomePage from './pages/HomePage'
import Player from './components/Player'
import TabBar from './components/TabBar'
import ArtistCard from './components/ArtistCard'

const tg = window.Telegram?.WebApp

function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none" aria-hidden>
      <path d="M9 17.5V6.2l11-2v11.3"/>
      <circle cx="7" cy="17.5" r="2.5"/>
      <circle cx="18" cy="15.5" r="2.5"/>
    </svg>
  )
}

function AppHeader() {
  const { page, setPage } = useStore()
  const isHome = page === 'home'
  const title = page === 'search' ? 'Поиск' : page === 'liked' ? 'Любимые' : null

  return (
    <header className={'m-header' + (isHome ? '' : ' m-header--sub')}>
      {isHome ? (
        <div className="m-header__brand">
          <span className="m-header__mark"><NoteIcon /></span>
          <span className="m-header__word">Nota</span>
          <span className="m-header__dot" />
        </div>
      ) : (
        <button className="m-icon-btn" onClick={() => setPage('home')} aria-label="Назад">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
      )}

      {title ? <div className="m-header__title">{title}</div> : <div style={{ flex: 1 }} />}

      <div className="m-header__actions">
        {isHome && (
          <button className="m-icon-btn" onClick={() => setPage('search')} aria-label="Поиск">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                 strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
            </svg>
          </button>
        )}
        {!isHome && <div style={{ width: 36 }} />}
      </div>
    </header>
  )
}

export default function App() {
  const { init, user, page, currentTrack } = useStore()
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    tg?.ready()
    tg?.expand()
    const initData = tg?.initData
    if (initData) {
      init(initData).catch(e => setAuthError(e?.message ?? 'Ошибка авторизации'))
    } else {
      setAuthError('Открой приложение через Telegram')
    }
  }, [])

  if (!user) {
    return (
      <div className="loading">
        {authError
          ? <p style={{ color: 'var(--fg-3)', textAlign: 'center', padding: '0 24px' }}>{authError}</p>
          : <>
              <div className="loading__spinner" />
              <p>Подключаемся…</p>
            </>
        }
      </div>
    )
  }

  return (
    <div className="m-shell">
      <AppHeader />
      <main className={'m-main' + (!currentTrack ? ' m-main--no-bar' : '')}>
        {page === 'home'   && <HomePage />}
        {page === 'search' && <SearchPage />}
        {page === 'liked'  && <LikedPage />}
      </main>
      <Player />
      <TabBar />
      <ArtistCard />
    </div>
  )
}
