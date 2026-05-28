import { useStore } from '../store'
import TrackItem from '../components/TrackItem'

export default function LikedPage() {
  const { likedTracks, user } = useStore()

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Любимые</h1>
        <div className="page-sub">{user?.first_name} · {likedTracks.length} треков</div>
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
