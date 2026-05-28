import { useState, useRef } from 'react'
import { useStore } from '../store'
import CoverArt from './CoverArt'

function fmt(s) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export default function Player() {
  const [open, setOpen] = useState(false)
  const { currentTrack, isPlaying, togglePlay, progress, duration, audioError } = useStore()

  if (!currentTrack) return null

  const pct = duration ? (progress / duration) * 100 : 0

  function handleMiniSeek(e) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    if (duration) useStore.getState().seek(ratio * duration)
  }

  return (
    <>
      <div className="player" onClick={() => setOpen(true)}>
        <div className="player__seekbar" onClick={handleMiniSeek} onTouchEnd={handleMiniSeek}>
          <div className="player__seekbar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="player__body">
          <div className="player__cover">
            {currentTrack.thumbnail_url
              ? <img src={currentTrack.thumbnail_url} alt="" />
              : <CoverArt track={currentTrack} />}
          </div>
          <div className="player__meta">
            <div className="player__title">{currentTrack.title}</div>
            <div className="player__artist">{audioError ?? currentTrack.artist}</div>
          </div>
          <div className="player__controls">
            <button className="player__btn" onClick={e => { e.stopPropagation(); useStore.getState().playPrev() }}>
              <PrevIcon size={20} />
            </button>
            <button className="player__btn player__btn--main" onClick={e => { e.stopPropagation(); togglePlay() }}>
              {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
            </button>
            <button className="player__btn" onClick={e => { e.stopPropagation(); useStore.getState().playNext() }}>
              <NextIcon size={20} />
            </button>
          </div>
        </div>
      </div>

      {open && <FullPlayer onClose={() => setOpen(false)} />}
    </>
  )
}

function FullPlayer({ onClose }) {
  const {
    currentTrack, isPlaying, togglePlay,
    progress, duration, audioError,
    playNext, playPrev, seek,
    isMuted, toggleMute, queue, queueIndex,
    toggleLike, likedIds,
  } = useStore()

  const scrubRef = useRef(null)
  const dragging = useRef(false)

  const pct = duration ? (progress / duration) * 100 : 0
  const isLiked = likedIds.has(currentTrack.id)

  function scrubAt(clientX) {
    const rect = scrubRef.current?.getBoundingClientRect()
    if (!rect || !duration) return
    seek(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration)
  }
  function onPD(e) { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); scrubAt(e.clientX) }
  function onPM(e) { if (dragging.current) scrubAt(e.clientX) }
  function onPU() { dragging.current = false }

  return (
    <div className="fp">
      {currentTrack.thumbnail_url && (
        <div className="fp__bg" aria-hidden>
          <img src={currentTrack.thumbnail_url} alt="" />
        </div>
      )}
      <div className="fp__veil" aria-hidden />

      <div className="fp__header">
        <button className="fp__close" onClick={onClose}><ChevronDown /></button>
        <span className="fp__label">Сейчас играет</span>
        <div style={{ width: 40 }} />
      </div>

      <div className="fp__body">
        <div className="fp__cover">
          {currentTrack.thumbnail_url
            ? <img src={currentTrack.thumbnail_url} alt="" />
            : <CoverArt track={currentTrack} />}
        </div>

        <div className="fp__info">
          <div className="fp__title">{currentTrack.title}</div>
          <div className="fp__artist">{audioError ?? currentTrack.artist}</div>
        </div>

        <div className="fp__scrubber-wrap">
          <div className="fp__scrubber" ref={scrubRef}
            onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU}>
            <div className="fp__scrubber-fill" style={{ width: `${pct}%` }}>
              <div className="fp__scrubber-thumb" />
            </div>
          </div>
          <div className="fp__times">
            <span>{fmt(progress)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        <div className="fp__controls">
          <button className={'fp__btn' + (isLiked ? ' fp__btn--liked' : '')} onClick={() => toggleLike(currentTrack)}>
            <HeartIcon filled={isLiked} />
          </button>
          <button className="fp__btn" onClick={playPrev} disabled={queueIndex <= 0 && progress <= 3}>
            <PrevIcon size={26} />
          </button>
          <button className="fp__btn fp__btn--main" onClick={togglePlay}>
            {isPlaying ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
          </button>
          <button className="fp__btn" onClick={playNext} disabled={queueIndex >= queue.length - 1}>
            <NextIcon size={26} />
          </button>
          <button className="fp__btn" onClick={toggleMute}>
            {isMuted ? <MuteIcon /> : <SoundIcon />}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChevronDown() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
}
function HeartIcon({ filled }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
}
function PlayIcon({ size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
}
function PauseIcon({ size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
}
function PrevIcon({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
}
function NextIcon({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.9V8.1L8.5 12zM16 6h2v12h-2z"/></svg>
}
function SoundIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
}
function MuteIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>
}
