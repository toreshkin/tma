import { useStore } from '../store'

export default function TrackItem({ track, showLike = true }) {
  const { play, currentTrack, isPlaying, toggleLike, likedIds } = useStore()
  const isActive = currentTrack?.id === track.id
  const isLiked = likedIds.has(track.id)

  return (
    <div className={'track-item' + (isActive ? ' active' : '')} onClick={() => play(track)}>
      <div className="track-item__cover">
        {track.thumbnail_url
          ? <img src={track.thumbnail_url} alt="" />
          : <div className="track-item__cover-fallback">{track.artist?.[0]}</div>}
        {isActive && isPlaying && <div className="track-item__playing" />}
      </div>
      <div className="track-item__meta">
        <div className="track-item__title">{track.title}</div>
        <div className="track-item__artist">{track.artist}</div>
      </div>
      {showLike && (
        <button
          className={'track-item__like' + (isLiked ? ' liked' : '')}
          onClick={(e) => { e.stopPropagation(); toggleLike(track) }}
        >
          <HeartIcon filled={isLiked} />
        </button>
      )}
    </div>
  )
}

function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}
