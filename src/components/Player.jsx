import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import CoverArt from './CoverArt'
import { fetchLyrics, activeLine, translateLyrics } from '../lyrics'

function fmt(s) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

function PlayIcon({ size = 16 }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>
}
function PauseIcon({ size = 16 }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" stroke="none"><rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/></svg>
}
function PrevIcon({ size = 22 }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 5v14M19 5l-9 7 9 7z" fill="currentColor" stroke="none"/><line x1="6" y1="5" x2="6" y2="19" stroke="currentColor" strokeWidth="2"/></svg>
}
function NextIcon({ size = 22 }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 5v14M5 5l9 7-9 7z" fill="currentColor" stroke="none"/><line x1="18" y1="5" x2="18" y2="19" stroke="currentColor" strokeWidth="2"/></svg>
}
function ShuffleIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h5v5M21 4l-9 9M4 4h2.5l3 4.5M21 16v4h-5M21 20l-9-9M4 20h2.5l3-4"/></svg>
}
function RepeatIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4M3 12V8a2 2 0 0 1 2-2h16"/><path d="M7 22l-4-4 4-4M21 12v4a2 2 0 0 1-2 2H3"/></svg>
}
function HeartIcon({ filled }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20s-7-4.5-9.5-9C.7 7.5 3 4 6.5 4c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 3.5 0 5.8 3.5 4 7-2.5 4.5-9.5 9-9.5 9z"/></svg>
}
function VolumeIcon({ level }) {
  if (level === 0) return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9v6h4l5 4V5L9 9H5z"/><path d="m16 9 5 5M21 9l-5 5"/>
    </svg>
  )
  if (level < 0.5) return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9v6h4l5 4V5L9 9H5z"/><path d="M16 8a5 5 0 0 1 0 8"/>
    </svg>
  )
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9v6h4l5 4V5L9 9H5z"/><path d="M16 8a5 5 0 0 1 0 8M19.5 5a9 9 0 0 1 0 14"/>
    </svg>
  )
}

function LyricsPanel({ track, currentTime }) {
  const [open, setOpen] = useState(false)
  const [lyrics, setLyrics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [trData, setTrData] = useState(null)
  const [trLoading, setTrLoading] = useState(false)
  const [showRu, setShowRu] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!track) return
    setLyrics(null); setTrData(null); setShowRu(false); setLoading(true)
    fetchLyrics(track.title, track.artist)
      .then(l => { setLyrics(l); setLoading(false) })
      .catch(() => setLoading(false))
  }, [track?.id])

  const active = lyrics?.synced ? activeLine(lyrics.synced, currentTime) : -1

  useEffect(() => {
    if (!open || active < 0 || !scrollRef.current) return
    const el = scrollRef.current.children[active]
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [active, open])

  async function handleTranslate() {
    if (trData !== null) { setShowRu(v => !v); return }
    setTrLoading(true); setShowRu(true)
    try { setTrData(await translateLyrics(lyrics)) }
    catch { setShowRu(false) }
    setTrLoading(false)
  }

  const hasLyrics = lyrics?.synced?.length || lyrics?.plain
  const lines = hasLyrics
    ? (lyrics.synced
        ? lyrics.synced.map((l, i) => ({
            key: i, empty: !l.text, isActive: i === active,
            text: showRu && Array.isArray(trData) ? (trData[i]?.textRu || l.text) : l.text,
          }))
        : (showRu && typeof trData === 'string' ? trData : lyrics.plain)
            .split('\n').map((text, i) => ({ key: i, text, empty: !text.trim(), isActive: false }))
      )
    : []

  return (
    <div className="m-lyrics">
      <button className="m-lyrics__head" onClick={() => hasLyrics && setOpen(v => !v)}>
        <span className="m-lyrics__head-label">
          {loading ? 'Загрузка текста…' : hasLyrics ? 'Текст песни' : 'Текст не найден'}
        </span>
        {hasLyrics && (
          <span className={'m-lyrics__chev' + (open ? ' is-open' : '')}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
          </span>
        )}
      </button>

      {open && hasLyrics && (
        <>
          <div className="m-lyrics__bar">
            <button className={'m-lyrics__tr' + (showRu ? ' is-on' : '')}
                    onClick={handleTranslate} disabled={trLoading}>
              {trLoading ? '…' : showRu ? 'Оригинал' : 'Перевод на RU'}
            </button>
          </div>
          <div className="m-lyrics__scroll" ref={scrollRef}>
            {lines.map(l => l.empty
              ? <div key={l.key} className="m-lyrics__gap" />
              : <div key={l.key} className={'m-lyrics__line' + (l.isActive ? ' is-active' : '')}>{l.text}</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Cover({ track, style }) {
  if (track.thumbnail_url) {
    return <img src={track.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }} />
  }
  return <CoverArt track={track} />
}

export default function Player() {
  const [npOpen, setNpOpen] = useState(false)
  const { currentTrack, isPlaying, togglePlay, progress, duration, likedIds, toggleLike } = useStore()

  if (!currentTrack) return null

  const pct = duration ? (progress / duration) * 100 : 0
  const isLiked = likedIds.has(currentTrack.id)

  return (
    <>
      <div className="m-bar" role="region" aria-label="Сейчас играет">
        <div className="m-bar__progress">
          <div className="m-bar__progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="m-bar__cover" onClick={() => setNpOpen(true)}>
          <Cover track={currentTrack} />
        </div>
        <div className="m-bar__meta" onClick={() => setNpOpen(true)}>
          <div className="m-bar__title">{currentTrack.title}</div>
          <div className="m-bar__artist">{currentTrack.artist}</div>
        </div>
        <div className="m-bar__btns">
          <button className={'m-bar__like' + (isLiked ? ' is-liked' : '')}
                  onClick={() => toggleLike(currentTrack)} aria-label="Лайк">
            <HeartIcon filled={isLiked} />
          </button>
          <button className="m-bar__play" onClick={togglePlay}
                  aria-label={isPlaying ? 'Пауза' : 'Играть'}>
            {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
          </button>
        </div>
      </div>

      <NowPlaying open={npOpen} onClose={() => setNpOpen(false)} />
    </>
  )
}

function NowPlaying({ open, onClose }) {
  const {
    currentTrack, isPlaying, togglePlay,
    progress, duration, seek,
    playNext, playPrev,
    likedIds, toggleLike,
    shuffle, toggleShuffle,
    repeat, cycleRepeat,
    audioError,
    volume, setVolume, isMuted, toggleMute,
  } = useStore()

  const scrubRef = useRef(null)
  const dragging = useRef(false)
  const volRef = useRef(null)
  const volDragging = useRef(false)

  if (!currentTrack) return null

  const pct = duration ? (progress / duration) * 100 : 0
  const isLiked = likedIds.has(currentTrack.id)

  function volAt(clientX) {
    const rect = volRef.current?.getBoundingClientRect()
    if (!rect) return
    setVolume(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)))
  }
  function onVolPD(e) { volDragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); volAt(e.clientX) }
  function onVolPM(e) { if (volDragging.current) volAt(e.clientX) }
  function onVolPU()  { volDragging.current = false }

  function scrubAt(clientX) {
    const rect = scrubRef.current?.getBoundingClientRect()
    if (!rect || !duration) return
    seek(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration)
  }
  function onPD(e) { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); scrubAt(e.clientX) }
  function onPM(e) { if (dragging.current) scrubAt(e.clientX) }
  function onPU()  { dragging.current = false }

  return (
    <div className={'m-np' + (open ? ' is-open' : '') + (isPlaying ? ' is-playing' : '')}>
      <div className="m-np__bg" aria-hidden>
        <Cover track={currentTrack} />
      </div>
      <div className="m-np__veil" aria-hidden />

      <div className="m-np__inner">
        <header className="m-np__head">
          <button className="m-np__close" onClick={onClose} aria-label="Свернуть">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
          <div className="m-np__head-title">
            <div className="m-np__head-eyebrow">Сейчас играет</div>
            <div className="m-np__head-artist">{currentTrack.artist}</div>
          </div>
          <div style={{ width: 36 }} />
        </header>

        <div className="m-np__cover-wrap">
          <div className="m-np__cover">
            <Cover track={currentTrack} />
          </div>
        </div>

        <div className="m-np__meta">
          <div className="m-np__meta-text">
            <div className="m-np__title">{currentTrack.title}</div>
            <div className="m-np__artist">{audioError ?? currentTrack.artist}</div>
          </div>
          <button className={'m-np__like' + (isLiked ? ' is-liked' : '')}
                  onClick={() => toggleLike(currentTrack)} aria-label="Лайк">
            <HeartIcon filled={isLiked} />
          </button>
        </div>

        <div className="m-scrub">
          <div className="m-scrub__track" ref={scrubRef}
               onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU}>
            <div className="m-scrub__fill" style={{ width: `${pct}%` }}>
              <div className="m-scrub__thumb" />
            </div>
          </div>
          <div className="m-scrub__times">
            <span>{fmt(progress)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        <div className="m-np__controls">
          <button className={'m-np__cbtn m-np__cbtn--side' + (shuffle ? ' is-active' : '')}
                  onClick={() => toggleShuffle()} aria-label="Перемешать">
            <ShuffleIcon />
          </button>
          <button className="m-np__nextprev" onClick={playPrev} aria-label="Назад">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" stroke="none">
              <path d="M6 5v14M19 5l-9 7 9 7z"/>
            </svg>
          </button>
          <button className="m-np__pp" onClick={togglePlay}
                  aria-label={isPlaying ? 'Пауза' : 'Играть'}>
            {isPlaying ? <PauseIcon size={26} /> : <PlayIcon size={26} />}
          </button>
          <button className="m-np__nextprev" onClick={playNext} aria-label="Вперёд">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" stroke="none">
              <path d="M18 5v14M5 5l9 7-9 7z"/>
            </svg>
          </button>
          <button className={'m-np__cbtn m-np__cbtn--side' + (repeat !== 'off' ? ' is-active' : '')}
                  onClick={cycleRepeat} aria-label="Повтор">
            <RepeatIcon />
            {repeat === 'one' && <span className="m-np__repeat-badge">1</span>}
          </button>
        </div>

        <div className="m-volume">
          <button className="m-volume__btn" onClick={toggleMute} aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}>
            <VolumeIcon level={isMuted ? 0 : volume} />
          </button>
          <div className="m-volume__track" ref={volRef}
               onPointerDown={onVolPD} onPointerMove={onVolPM} onPointerUp={onVolPU}>
            <div className="m-volume__fill" style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}>
              <div className="m-volume__thumb" />
            </div>
          </div>
        </div>

        {currentTrack.duration_seconds && (
          <div className="m-np__chips">
            <span className="m-np__chip">{fmt(currentTrack.duration_seconds)}</span>
            {currentTrack.view_count && (
              <span className="m-np__chip">{fmtViews(currentTrack.view_count)} прослушиваний</span>
            )}
            <span className="m-np__chip">SoundCloud</span>
          </div>
        )}

        <LyricsPanel track={currentTrack} currentTime={progress} />
      </div>
    </div>
  )
}

function fmtViews(n) {
  if (!n) return ''
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1e3) return Math.round(n / 1e3) + 'K'
  return String(n)
}
