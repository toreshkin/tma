import { useStore } from '../store'

export default function TabBar() {
  const { page, setPage } = useStore()
  return (
    <nav className="tabbar">
      <button className={'tabbar__btn' + (page === 'liked' ? ' active' : '')} onClick={() => setPage('liked')}>
        <HeartIcon />
        <span>Любимые</span>
      </button>
      <button className={'tabbar__btn' + (page === 'search' ? ' active' : '')} onClick={() => setPage('search')}>
        <SearchIcon />
        <span>Поиск</span>
      </button>
    </nav>
  )
}

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )
}
