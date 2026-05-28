import { useState } from 'react'
import { useStore } from '../store'
import TrackItem from '../components/TrackItem'

const QUICK_CHIPS = ['Saluki', 'Скриптонит', 'MACAN', 'Miyagi', 'The Weeknd', 'Travis Scott', 'Imagine Dragons']

function pluralize(n, [one, few, many]) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

function SearchBarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
    </svg>
  )
}
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
    </svg>
  )
}

export default function SearchPage() {
  const [input, setInput] = useState('')
  const { search, searchResults, isSearching, searchQuery, searchHistory } = useStore()

  function handleSubmit(e) {
    e.preventDefault()
    if (input.trim()) search(input.trim())
  }

  function handleChip(chip) {
    setInput(chip)
    search(chip)
  }

  return (
    <>
      <div style={{ padding: '12px 18px 0' }}>
        <form className="m-search" onSubmit={handleSubmit}>
          <SearchBarIcon />
          <input className="m-search__input"
                 value={input}
                 onChange={e => setInput(e.target.value)}
                 placeholder="Найди свой трек…"
                 inputMode="search"
                 enterKeyHint="search" />
          {input ? (
            <button type="button" className="m-search__clear"
                    onClick={() => setInput('')} aria-label="Очистить">
              <XIcon />
            </button>
          ) : null}
          <button type="submit" className="m-search__submit">Найти</button>
        </form>
      </div>

      {!input && searchHistory.length > 0 && (
        <div className="m-history">
          <div className="m-history__label">Недавнее</div>
          <div className="m-chips">
            {searchHistory.map(h => (
              <button key={h} className="m-chip m-chip--history" onClick={() => handleChip(h)}>
                <ClockIcon /> {h}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="m-chips">
        {QUICK_CHIPS.map(c => (
          <button key={c} className="m-chip" onClick={() => handleChip(c)}>{c}</button>
        ))}
      </div>

      <div className="m-results-meta">
        {isSearching
          ? 'Ищу на SoundCloud…'
          : searchQuery
            ? <>{searchResults.length} {pluralize(searchResults.length, ['результат', 'результата', 'результатов'])} для «<em>{searchQuery}</em>»</>
            : 'Введи название трека или артиста'}
      </div>

      <div className="m-list">
        {isSearching
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          : searchResults.map(track => (
              <TrackItem key={track.id} track={track} showLike playlist={searchResults} />
            ))}
        {!isSearching && searchQuery && searchResults.length === 0 && (
          <div className="m-empty" style={{ minHeight: 'auto', padding: '30px 24px' }}>
            <div className="m-empty__icon" style={{ width: 64, height: 64 }}>
              <SearchBarIcon />
            </div>
            <div className="m-empty__title">Не нашлось</div>
            <div className="m-empty__sub">Попробуй другой запрос или выбери подсказку выше.</div>
          </div>
        )}
      </div>
    </>
  )
}

function SkeletonRow() {
  return (
    <div className="m-skel-row">
      <div className="skel" style={{ height: 48, width: 48, borderRadius: 8 }} />
      <div style={{ flex: 1 }}>
        <div className="skel" style={{ height: 12, width: '62%', marginBottom: 6, borderRadius: 4 }} />
        <div className="skel" style={{ height: 10, width: '40%', borderRadius: 4 }} />
      </div>
      <div className="skel" style={{ height: 18, width: 18, borderRadius: '50%' }} />
    </div>
  )
}
