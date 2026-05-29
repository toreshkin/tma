import { useStore } from '../store'
import CoverArt from './CoverArt'

function fmt(s) {
  if (!s || isNaN(s)) return ''
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18"
         fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.5-9.5-9C.7 7.5 3 4 6.5 4c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 3.5 0 5.8 3.5 4 7-2.5 4.5-9.5 9-9.5 9z"/>
    </svg>
  )
}

export default function TrackItem({ track, showLike = true, playlist = null }) {
  const { play, currentTrack, isPlaying, toggleLike, likedIds, openArtistCard } = useStore()
  const isActive = currentTrack?.id === track.id
  const isLiked = likedIds.has(track.id)

  return (
    <div className={'m-track' + (isActive ? ' is-current' : '')}
         onClick={() => play(track, playlist)}>
      <div className="m-track__cover">
        {track.thumbnail_url
          ? <img src={track.thumbnail_url} alt=""
                 style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <CoverArt track={track} />}
        {isActive && isPlaying && (
          <div className="m-track__cover-eq">
            <div className="eq"><span /><span /><span /></div>
          </div>
        )}
      </div>
      <div className="m-track__meta">
        <div className="m-track__title">{track.title}</div>
        <div className="m-track__sub">
          <span className="m-track__artist-link" onClick={e => { e.stopPropagation(); openArtistCard(track.artist) }}>{track.artist}</span>
          {track.duration_seconds ? (
            <>
              <span className="m-track__sub-dot" />
              <span className="m-track__sub-mono">{fmt(track.duration_seconds)}</span>
            </>
          ) : null}
        </div>
      </div>
      {showLike && (
        <button className={'m-track__like' + (isLiked ? ' is-liked' : '')}
                onClick={e => { e.stopPropagation(); toggleLike(track) }}
                aria-label="Лайк">
          <HeartIcon filled={isLiked} />
        </button>
      )}
    </div>
  )
}
