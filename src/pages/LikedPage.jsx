import { useStore } from '../store'
import TrackItem from '../components/TrackItem'

function pluralize(n, [one, few, many]) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

function fmt(s) {
  if (!s || isNaN(s)) return ''
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

function HeartFilledIcon() {
  return (
    <svg viewBox="0 0 24 24" width="62" height="62" fill="currentColor"
         stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.5-9.5-9C.7 7.5 3 4 6.5 4c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 3.5 0 5.8 3.5 4 7-2.5 4.5-9.5 9-9.5 9z"/>
    </svg>
  )
}
function PlayIcon() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>
}
function ShuffleIcon() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h5v5M21 4l-9 9M4 4h2.5l3 4.5M21 16v4h-5M21 20l-9-9M4 20h2.5l3-4"/></svg>
}
function SearchIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
}

export default function LikedPage() {
  const { likedTracks, play, setPage } = useStore()

  if (likedTracks.length === 0) {
    return (
      <div className="m-empty">
        <div className="m-empty__icon"><HeartFilledIcon /></div>
        <h2 className="m-empty__title">Лайков пока нет</h2>
        <p className="m-empty__sub">
          Найди трек и поставь сердечко — он появится здесь и всегда будет под рукой.
        </p>
        <button className="m-liked-cta" style={{ marginTop: 12 }}
                onClick={() => setPage('search')}>
          <SearchIcon /> Найти первый трек
        </button>
      </div>
    )
  }

  const totalSec = likedTracks.reduce((a, t) => a + (t.duration_seconds || 0), 0)
  const totalMin = Math.round(totalSec / 60)

  return (
    <>
      <div className="m-liked-hero">
        <div className="m-liked-hero__cover">
          <HeartFilledIcon />
        </div>
        <div>
          <div className="m-liked-hero__eyebrow">Плейлист · Личное</div>
          <h1 className="m-liked-hero__title">Любимые</h1>
        </div>
        <div className="m-liked-hero__stat">
          <strong>{likedTracks.length}</strong> {pluralize(likedTracks.length, ['трек', 'трека', 'треков'])}
          {totalMin > 0 && <> · <strong>{totalMin}</strong> {pluralize(totalMin, ['минута', 'минуты', 'минут'])}</>}
        </div>
        <div className="m-liked-actions">
          <button className="m-liked-cta"
                  onClick={() => play(likedTracks[0], likedTracks)}>
            <PlayIcon /> Играть всё
          </button>
          <button className="m-liked-cta m-liked-cta--ghost"
                  onClick={() => {
                    useStore.setState({ shuffle: true })
                    const pick = likedTracks[Math.floor(Math.random() * likedTracks.length)]
                    play(pick, likedTracks)
                  }}>
            <ShuffleIcon /> Микс
          </button>
        </div>
      </div>

      <div className="m-list">
        {likedTracks.map(t => (
          <TrackItem key={t.id} track={t} playlist={likedTracks} />
        ))}
      </div>
    </>
  )
}
