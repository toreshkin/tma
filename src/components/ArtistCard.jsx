import { useStore } from '../store'
import CoverArt from './CoverArt'

function fmt(s) {
  if (!s || isNaN(s)) return ''
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}
function fmtNum(n) {
  if (!n) return null
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1e3) return Math.round(n / 1e3) + 'K'
  return String(n)
}

function WaveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c1.5-3 3-4.5 4.5-4.5S9 9 10.5 9s3-3 4.5-3S18 9 19.5 9 21 7.5 22 7.5"/>
      <path d="M2 17c1.5-1.5 3-2.5 4.5-2.5S9 16 10.5 16s3-2 4.5-2 3 2.5 4.5 2.5S21 15 22 15"/>
    </svg>
  )
}
function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.5-9.5-9C.7 7.5 3 4 6.5 4c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 3.5 0 5.8 3.5 4 7-2.5 4.5-9.5 9-9.5 9z"/>
    </svg>
  )
}

export default function ArtistCard() {
  const {
    artistCardOpen, artistCard, artistCardLoading,
    closeArtistCard, startArtistWave,
    play, toggleLike, likedIds, currentTrack, isPlaying,
  } = useStore()

  return (
    <div className={`m-artist-sheet${artistCardOpen ? ' is-open' : ''}`}>
      <div className="m-artist-sheet__backdrop" onClick={closeArtistCard} />
      <div className="m-artist-sheet__panel">
        <div className="m-artist-sheet__handle-bar" />

        {artistCardLoading && (
          <div className="m-artist-sheet__loading">
            <div className="loading__spinner" style={{ width: 28, height: 28 }} />
          </div>
        )}

        {artistCard && !artistCardLoading && (
          <>
            <header className="m-artist-sheet__header">
              <div className="m-artist-sheet__avatar">
                {artistCard.avatar_url
                  ? <img src={artistCard.avatar_url} alt="" />
                  : <div className="m-artist-sheet__avatar-fallback">{artistCard.username[0]}</div>}
              </div>
              <div className="m-artist-sheet__info">
                <div className="m-artist-sheet__name">{artistCard.username}</div>
                <div className="m-artist-sheet__stats">
                  {fmtNum(artistCard.followers_count) && (
                    <span>{fmtNum(artistCard.followers_count)} подписчиков</span>
                  )}
                  {fmtNum(artistCard.track_count) && (
                    <span>{fmtNum(artistCard.track_count)} треков</span>
                  )}
                </div>
              </div>
            </header>

            <div className="m-artist-sheet__actions">
              <button className="m-artist-wave-btn" onClick={() => startArtistWave(artistCard)}>
                <WaveIcon />
                <span>Волна по {artistCard.username}</span>
              </button>
            </div>

            <div className="m-artist-sheet__tracks">
              {artistCard.tracks.map(track => {
                const isActive = currentTrack?.id === track.id
                const isLiked = likedIds.has(track.id)
                return (
                  <div
                    key={track.id}
                    className={`m-track${isActive ? ' is-current' : ''}`}
                    onClick={() => play(track, artistCard.tracks)}
                  >
                    <div className="m-track__cover">
                      {track.thumbnail_url
                        ? <img src={track.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                        <span className="m-track__sub-mono">{fmt(track.duration_seconds)}</span>
                      </div>
                    </div>
                    <button
                      className={`m-track__like${isLiked ? ' is-liked' : ''}`}
                      onClick={e => { e.stopPropagation(); toggleLike(track) }}
                      aria-label="Лайк"
                    >
                      <HeartIcon filled={isLiked} />
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
