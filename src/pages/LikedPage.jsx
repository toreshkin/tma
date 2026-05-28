import { useStore } from '../store'
import TrackItem from '../components/TrackItem'

export default function LikedPage() {
  const { likedTracks, user } = useStore()

  return (
    <div className="page">
      <div className="liked-hero">
        <div className="liked-hero__art">
          <HeartIcon />
        </div>
        <div>
          <h1 className="page-title">Любимые</h1>
          <div className="page-sub">{user?.first_name} · {likedTracks.length} треков</div>
        </div>
      </div>

      {likedTracks.length === 0 ? (
        <div className="empty">
          <div className="empty__icon">♡</div>
          <p>Лайкни треки — они появятся здесь</p>
        </div>
      ) : (
        <div className="track-list">
          {likedTracks.map(track => (
            <TrackItem key={track.id} track={track} playlist={likedTracks} />
          ))}
        </div>
      )}
    </div>
  )
}

function HeartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  )
}
