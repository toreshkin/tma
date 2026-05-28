import { useStore } from '../store'
import TrackItem from '../components/TrackItem'
import CoverArt from '../components/CoverArt'

const QUICK_CHIPS = ['Saluki', 'Скриптонит', 'MACAN', 'Miyagi', 'The Weeknd', 'Travis Scott', 'Imagine Dragons', 'Мот']

function pluralize(n, [one, few, many]) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

function PlayIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>
}
function ChevronRight() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
}
function SearchIcon() {
  return <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
}

export default function HomePage() {
  const { likedTracks, recentTracks, play, setPage, search, currentTrack, isPlaying, likedIds } = useStore()

  function playMyMusic() {
    const pool = likedTracks.length ? likedTracks
               : recentTracks.length ? recentTracks : null
    if (!pool) { setPage('search'); return }
    useStore.setState({ shuffle: true })
    const pick = pool[Math.floor(Math.random() * pool.length)]
    play(pick, pool)
  }

  function handleChip(chip) {
    search(chip)
    setPage('search')
  }

  return (
    <>
      <section className="m-hero">
        <div className="m-hero__eyebrow">Музыка с SoundCloud · без рекламы</div>
        <h1 className="m-hero__title">Слушай <span className="accent-word">всё</span></h1>
        <p className="m-hero__sub">Миллионы треков. Введи название — Nota найдёт за секунды.</p>
      </section>

      <div style={{ padding: '0 18px', marginBottom: 14 }}>
        <button className="m-my-cta" onClick={playMyMusic}>
          <span className="m-my-cta__icon"><PlayIcon /></span>
          <span className="m-my-cta__text">
            <span className="m-my-cta__title">Включить мою музыку</span>
            <span className="m-my-cta__sub">
              {likedTracks.length > 0
                ? <><strong>{likedTracks.length}</strong> {pluralize(likedTracks.length, ['любимый', 'любимых', 'любимых'])} · вперемешку</>
                : recentTracks.length > 0
                  ? <>Из недавнего · <strong>{recentTracks.length}</strong> {pluralize(recentTracks.length, ['трек', 'трека', 'треков'])}</>
                  : <>Подборка для тебя</>}
            </span>
          </span>
          <span className="m-my-cta__chev"><ChevronRight /></span>
        </button>
      </div>

      <div className="m-chips">
        {QUICK_CHIPS.map(c => (
          <button key={c} className="m-chip" onClick={() => handleChip(c)}>{c}</button>
        ))}
      </div>

      {recentTracks.length > 0 && (
        <>
          <div className="m-section-head">
            <h2 className="m-section-head__title">Недавнее</h2>
            <span className="m-section-head__meta">{recentTracks.length} треков</span>
          </div>
          <div className="m-carousel">
            {recentTracks.slice(0, 8).map(t => (
              <div key={t.id} className="m-card" onClick={() => play(t, recentTracks)}>
                <div className="m-card__cover">
                  {t.thumbnail_url
                    ? <img src={t.thumbnail_url} alt=""
                           style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <CoverArt track={t} />}
                  <span className="m-card__play"><PlaySmallIcon /></span>
                </div>
                <div>
                  <div className="m-card__title">{t.title}</div>
                  <div className="m-card__artist">{t.artist}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {likedTracks.length > 0 && (
        <>
          <div className="m-section-head">
            <h2 className="m-section-head__title">Любимые</h2>
            <button className="m-section-head__meta" style={{ cursor: 'pointer' }}
                    onClick={() => setPage('liked')}>
              Все →
            </button>
          </div>
          <div className="m-list">
            {likedTracks.slice(0, 5).map(t => (
              <TrackItem key={t.id} track={t} playlist={likedTracks} />
            ))}
          </div>
        </>
      )}

      {recentTracks.length === 0 && likedTracks.length === 0 && (
        <div className="m-empty" style={{ minHeight: '40vh' }}>
          <div className="m-empty__icon"><SearchIcon /></div>
          <h2 className="m-empty__title">Начни слушать</h2>
          <p className="m-empty__sub">Найди первый трек через поиск — он появится здесь.</p>
          <button className="m-liked-cta" style={{ marginTop: 8 }} onClick={() => setPage('search')}>
            Открыть поиск
          </button>
        </div>
      )}
    </>
  )
}

function PlaySmallIcon() {
  return <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>
}
