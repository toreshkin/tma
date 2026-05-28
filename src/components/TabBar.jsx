import { useStore } from '../store'

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
    </svg>
  )
}
function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.5-9.5-9C.7 7.5 3 4 6.5 4c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 3.5 0 5.8 3.5 4 7-2.5 4.5-9.5 9-9.5 9z"/>
    </svg>
  )
}

export default function TabBar() {
  const { page, setPage, likedIds } = useStore()

  const tabs = [
    { id: 'home',   label: 'Главная', Icon: HomeIcon },
    { id: 'search', label: 'Поиск',   Icon: SearchIcon },
    { id: 'liked',  label: 'Любимые', Icon: HeartIcon, badge: likedIds.size },
  ]

  return (
    <nav className="m-tabbar" role="tablist">
      {tabs.map(({ id, label, Icon, badge }) => (
        <button key={id} role="tab"
                className={'m-tab' + (page === id ? ' is-active' : '')}
                onClick={() => setPage(id)}>
          <span className="m-tab__icon">
            <Icon />
            {badge ? <span className="m-tab__badge">{badge > 99 ? '99+' : badge}</span> : null}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
