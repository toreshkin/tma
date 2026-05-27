import { useStore } from '../store'

export default function Player() {
  const { currentTrack, isPlaying, togglePlay, progress, duration } = useStore()

  if (!currentTrack) return null

  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <div className="mini-player">
      <div className="mini-player__progress" style={{ width: `${pct}%` }} />
      <div className="mini-player__cover">
        {currentTrack.thumbnail_url
          ? <img src={currentTrack.thumbnail_url} alt="" />
          : <div className="mini-player__cover-fallback">{currentTrack.artist?.[0]}</div>}
      </div>
      <div className="mini-player__meta">
        <div className="mini-player__title">{currentTrack.title}</div>
        <div className="mini-player__artist">{currentTrack.artist}</div>
      </div>
      <button className="mini-player__btn" onClick={togglePlay}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
    </div>
  )
}

function PlayIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
}
function PauseIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
}
