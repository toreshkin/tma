import { useState } from 'react'
import { useStore } from '../store'
import TrackItem from '../components/TrackItem'

export default function SearchPage() {
  const [input, setInput] = useState('')
  const { search, searchResults, isSearching, searchQuery } = useStore()

  function handleSubmit(e) {
    e.preventDefault()
    search(input)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Поиск</h1>
      </div>

      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-bar">
          <input
            className="search-bar__input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Артист или название…"
          />
          <button className="search-bar__submit" type="submit">Найти</button>
        </div>
      </form>

      {isSearching && <div className="loading-row">Ищу…</div>}

      {!isSearching && searchResults.length > 0 && (
        <div className="track-list">
          {searchResults.map(track => (
            <TrackItem key={track.id} track={track} showLike playlist={searchResults} />
          ))}
        </div>
      )}

      {!isSearching && searchQuery && searchResults.length === 0 && (
        <div className="empty">
          <div className="empty__icon">🔍</div>
          <p>Ничего не нашлось</p>
        </div>
      )}
    </div>
  )
}
