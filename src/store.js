import { create } from 'zustand'
import { api, setToken, BASE } from './api'

const _a = new Audio()
let _playId = 0

// shuffle без мгновенного повтора текущего трека
function pickShuffleIndex(len, current) {
  if (len <= 1) return 0
  let i
  do { i = Math.floor(Math.random() * len) } while (i === current)
  return i
}

function loadRecent() {
  try { return JSON.parse(localStorage.getItem('nota:recent') || '[]') } catch { return [] }
}

// ── Волна: память между сессиями + якоря из лайков ──────────
const WAVE_HEARD_KEY = 'nota:waveHeard'

function loadWaveHeard() {
  try { return JSON.parse(localStorage.getItem(WAVE_HEARD_KEY) || '[]') } catch { return [] }
}

function rememberWaveHeard(id) {
  const heard = loadWaveHeard().filter(h => h !== id)
  heard.push(id)
  localStorage.setItem(WAVE_HEARD_KEY, JSON.stringify(heard.slice(-300)))
}

// Вставляет знакомый лайкнутый трек каждые ~7 позиций, чтобы волна
// не ощущалась полностью чужой
function injectAnchors(tracks, likedTracks, usedIds) {
  if (likedTracks.length < 5) return tracks
  const pool = likedTracks.filter(t => !usedIds.has(t.id))
  if (!pool.length) return tracks
  const out = []
  for (let i = 0; i < tracks.length; i++) {
    out.push(tracks[i])
    if ((i + 1) % 6 === 0 && pool.length) {
      const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
      usedIds.add(pick.id)
      out.push(pick)
    }
  }
  return out
}

export const useStore = create((set, get) => ({
  // auth
  user: null,
  token: null,

  // player
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  audioError: null,
  queue: [],
  queueIndex: -1,
  isMuted: false,
  volume: parseFloat(localStorage.getItem('nota:volume') ?? '1'),
  shuffle: false,
  repeat: 'off', // 'off' | 'all' | 'one'
  isWaveMode: false,
  _waveSeenIds: new Set(),
  _waveGoodSeed: null,      // последний хорошо прослушанный трек волны
  _wavePenalized: new Set(), // артисты, скипнутые в этой сессии

  // data
  searchHistory: JSON.parse(localStorage.getItem('nota:searchHistory') || '[]'),
  likedTracks: [],
  likedIds: new Set(),
  recentTracks: loadRecent(),

  // ui
  page: 'home',
  searchResults: [],
  searchQuery: '',
  isSearching: false,
  searchError: null,
  artistCardOpen: false,
  artistCardLoading: false,
  artistCard: null,

  init: async (initData) => {
    const { access_token, user } = await api.authTelegram(initData)
    setToken(access_token)
    set({ user, token: access_token })
    const data = await api.getLiked()
    const tracks = data.tracks ?? []
    set({ likedTracks: tracks, likedIds: new Set(tracks.map(t => t.id)) })
  },

  // PWA вне Telegram: восстановление сессии из localStorage.
  // Возвращает false, если сессии нет или токен протух (401).
  restoreSession: async () => {
    let saved = null
    try { saved = JSON.parse(localStorage.getItem('nota:auth') || 'null') } catch { /* битый JSON */ }
    if (!saved?.token || !saved?.user) return false
    setToken(saved.token)
    set({ user: saved.user, token: saved.token })
    try {
      const data = await api.getLiked()
      const tracks = data.tracks ?? []
      set({ likedTracks: tracks, likedIds: new Set(tracks.map(t => t.id)) })
    } catch (e) {
      // сетевая ошибка — оставляем сессию, токен мог быть валиден
      if (e instanceof TypeError) return true
      localStorage.removeItem('nota:auth')
      setToken(null)
      set({ user: null, token: null })
      return false
    }
    return true
  },

  // PWA вне Telegram: вход через Telegram Login Widget в попапе.
  // Результат приходит либо postMessage'ем из попапа, либо поллингом
  // /auth/poll/{nonce} (iOS standalone теряет window.opener).
  loginWithWidget: () => new Promise((resolve, reject) => {
    const nonce = crypto.randomUUID()
    const backendOrigin = new URL(BASE).origin
    const popup = window.open(
      `${BASE}/auth/login?nonce=${nonce}`,
      'nota-login',
      'width=420,height=560',
    )
    let done = false

    const finish = async ({ token, user }) => {
      if (done) return
      done = true
      cleanup()
      setToken(token)
      localStorage.setItem('nota:auth', JSON.stringify({ token, user }))
      set({ user, token })
      try {
        const data = await api.getLiked()
        const tracks = data.tracks ?? []
        set({ likedTracks: tracks, likedIds: new Set(tracks.map(t => t.id)) })
      } catch { /* лайки подтянутся позже */ }
      resolve()
    }

    const onMsg = (e) => {
      if (e.origin !== backendOrigin) return
      const r = e.data?.tgAuthResult
      if (r?.token) finish({ token: r.token, user: r.user })
    }
    window.addEventListener('message', onMsg)

    const iv = setInterval(async () => {
      try {
        const r = await api.pollAuth(nonce)
        if (r?.status === 'ok') finish({ token: r.token, user: r.user })
      } catch { /* поллим дальше */ }
    }, 2000)

    const to = setTimeout(() => {
      if (done) return
      done = true
      cleanup()
      reject(new Error('Время входа истекло, попробуй ещё раз'))
    }, 180000)

    // Пользователь закрыл попап, не залогинившись: даём поллингу ещё чуть-чуть
    // (успешный попап закрывается сам), потом возвращаем кнопку
    const closeWatch = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(closeWatch)
        setTimeout(() => {
          if (done) return
          done = true
          cleanup()
          reject(new Error('Окно входа было закрыто'))
        }, 6000)
      }
    }, 1000)

    function cleanup() {
      window.removeEventListener('message', onMsg)
      clearInterval(iv)
      clearTimeout(to)
      clearInterval(closeWatch)
      try { popup?.close() } catch { /* popup мог закрыться сам */ }
    }
  }),

  // Оптимистично: сердечко реагирует сразу, при сбое сети откатываем
  toggleLike: async (track) => {
    const { likedIds, likedTracks } = get()
    const wasLiked = likedIds.has(track.id)
    const next = wasLiked
      ? likedTracks.filter(t => t.id !== track.id)
      : [track, ...likedTracks]
    set({ likedTracks: next, likedIds: new Set(next.map(t => t.id)) })
    try {
      if (wasLiked) await api.removeLiked(track.id)
      else await api.addLiked(track)
    } catch {
      const cur = get().likedTracks
      const rolled = wasLiked
        ? [track, ...cur.filter(t => t.id !== track.id)]
        : cur.filter(t => t.id !== track.id)
      set({ likedTracks: rolled, likedIds: new Set(rolled.map(t => t.id)) })
    }
  },

  // Трек подтверждённо удалён с SoundCloud — выкидываем отовсюду
  _removeGoneTrack: (trackId) => {
    const { likedTracks, likedIds, recentTracks } = get()
    const nextLiked = likedTracks.filter(t => t.id !== trackId)
    const nextRecent = recentTracks.filter(t => t.id !== trackId)
    localStorage.setItem('nota:recent', JSON.stringify(nextRecent))
    set({
      likedTracks: nextLiked,
      likedIds: new Set(nextLiked.map(t => t.id)),
      recentTracks: nextRecent,
    })
    if (likedIds.has(trackId)) api.removeLiked(trackId).catch(() => {})
  },

  search: async (q) => {
    if (!q.trim()) return
    set({ isSearching: true, searchQuery: q, searchError: null })
    const prev = get().searchHistory
    const next = [q, ...prev.filter(h => h !== q)].slice(0, 6)
    localStorage.setItem('nota:searchHistory', JSON.stringify(next))
    set({ searchHistory: next })
    try {
      const data = await api.search(q)
      set({ searchResults: data.tracks ?? [], searchError: null })
    } catch (e) {
      // TypeError = fetch не дошёл (нет сети / бэкенд на Render ещё просыпается)
      const msg = e instanceof TypeError
        ? 'Не удалось связаться с сервером — он мог уснуть. Подожди полминуты и попробуй ещё раз.'
        : (e.message || 'Ошибка поиска, попробуй ещё раз')
      set({ searchResults: [], searchError: msg })
    }
    set({ isSearching: false })
  },

  play: (track, newQueue = null, _fromWave = false) => {
    const { queue: curQueue, isMuted, volume, recentTracks } = get()
    const myId = ++_playId

    // обратная связь волны: как слушали предыдущий трек
    const prev = get()
    if (prev.isWaveMode && prev.currentTrack && prev.currentTrack.id !== track.id) {
      const ratio = prev.duration > 0 ? prev.progress / prev.duration : 0
      if (ratio >= 0.8) {
        set({ _waveGoodSeed: prev.currentTrack.id })
      } else if (prev.progress < 20 && ratio < 0.3 && !prev.likedIds.has(prev.currentTrack.id)) {
        const penalized = new Set(prev._wavePenalized)
        penalized.add(prev.currentTrack.artist)
        set({ _wavePenalized: penalized })
      }
    }

    _a.pause()
    // токен в query: тег <audio> не умеет слать Authorization-заголовок
    _a.src = `${BASE}/tracks/proxy/${track.id}?t=${encodeURIComponent(get().token || '')}`
    _a.volume = isMuted ? 0 : volume

    let q = newQueue ?? (curQueue.length ? curQueue : [track])
    let idx = q.findIndex(t => t.id === track.id)

    // в волне выкидываем из хвоста очереди треки скипнутых артистов
    if (_fromWave && get()._wavePenalized.size) {
      const pen = get()._wavePenalized
      q = q.filter((t, i) => i <= idx || t.id === track.id || !pen.has(t.artist))
      idx = q.findIndex(t => t.id === track.id)
    }
    if (_fromWave) rememberWaveHeard(track.id)

    _a.ontimeupdate = () => {
      if (_playId !== myId) return
      set({ progress: _a.currentTime, duration: _a.duration || 0 })
    }
    _a.onended = () => {
      if (_playId !== myId) return
      const { queue, queueIndex, shuffle, repeat } = get()
      if (repeat === 'one') {
        _a.currentTime = 0
        _a.play().then(() => set({ isPlaying: true, progress: 0 })).catch(() => {})
        return
      }
      let nextIdx
      if (shuffle) {
        nextIdx = pickShuffleIndex(queue.length, queueIndex)
      } else {
        nextIdx = queueIndex + 1
        if (nextIdx >= queue.length) {
          if (repeat === 'all') nextIdx = 0
          else {
            set({ isPlaying: false })
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none'
            return
          }
        }
      }
      if (queue[nextIdx]) get().play(queue[nextIdx], queue, get().isWaveMode)
    }
    _a.onerror = () => {
      if (_playId !== myId) return
      const code = _a.error?.code
      // code 1 = MEDIA_ERR_ABORTED — ожидаемо при быстром переключении, игнорируем
      if (code === 1) return
      // Ошибка может значить и «трек удалён» (404), и просто обрыв сети.
      // Удаляем из любимых ТОЛЬКО при подтверждённом 404, иначе один сбой
      // сети в метро стирал бы лайки навсегда.
      fetch(`${BASE}/tracks/proxy/${track.id}?t=${encodeURIComponent(get().token || '')}`, {
        headers: { Range: 'bytes=0-0' },
      })
        .then(r => {
          r.body?.cancel().catch(() => {})
          if (_playId !== myId) return
          if (r.status === 404) {
            get()._removeGoneTrack(track.id)
            get().playNext()
          } else if (r.status === 401) {
            set({ isPlaying: false, audioError: 'Сессия истекла — открой приложение заново' })
          } else {
            set({ isPlaying: false, audioError: 'Сбой воспроизведения — нажми ▶ ещё раз' })
          }
        })
        .catch(() => {
          if (_playId !== myId) return
          set({ isPlaying: false, audioError: 'Нет соединения — проверь сеть' })
        })
    }

    // track recent plays (персистим — карусель «Недавнее» переживает перезапуск)
    const filtered = recentTracks.filter(t => t.id !== track.id)
    const nextRecent = [track, ...filtered].slice(0, 10)
    try { localStorage.setItem('nota:recent', JSON.stringify(nextRecent)) } catch { /* квота */ }

    set({
      currentTrack: track, isPlaying: false, progress: 0, duration: 0,
      audioError: null, queue: q, queueIndex: idx < 0 ? 0 : idx,
      recentTracks: nextRecent,
      isWaveMode: _fromWave ? get().isWaveMode : false,
    })

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        artwork: track.thumbnail_url
          ? [{ src: track.thumbnail_url, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      })
      navigator.mediaSession.setActionHandler('play', () => {
        _a.play().then(() => { set({ isPlaying: true }); navigator.mediaSession.playbackState = 'playing' })
      })
      navigator.mediaSession.setActionHandler('pause', () => {
        _a.pause(); set({ isPlaying: false }); navigator.mediaSession.playbackState = 'paused'
      })
      navigator.mediaSession.setActionHandler('previoustrack', () => get().playPrev())
      navigator.mediaSession.setActionHandler('nexttrack', () => get().playNext())
      try { navigator.mediaSession.setActionHandler('seekbackward', null) } catch { /* не поддерживается */ }
      try { navigator.mediaSession.setActionHandler('seekforward', null) } catch { /* не поддерживается */ }
    }

    _a.play()
      .then(() => {
        if (_playId !== myId) return
        set({ isPlaying: true })
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
      })
      .catch(e => {
        if (_playId !== myId) return
        // AbortError — нормально при быстром переключении, не показываем ошибку
        if (e?.name === 'AbortError') return
        set({ isPlaying: false, audioError: e.message || 'Воспроизведение заблокировано' })
      })
  },

  togglePlay: () => {
    const { isPlaying, currentTrack } = get()
    if (!currentTrack) return
    if (isPlaying) {
      _a.pause()
      set({ isPlaying: false })
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
    } else {
      _a.play()
        .then(() => {
          set({ isPlaying: true })
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
        })
        .catch(e => set({ audioError: e.message || 'Воспроизведение заблокировано' }))
    }
  },

  playNext: () => {
    const { queue, queueIndex, shuffle, repeat, isWaveMode } = get()
    if (!queue.length) return
    let nextIdx
    if (shuffle) {
      nextIdx = pickShuffleIndex(queue.length, queueIndex)
    } else {
      nextIdx = queueIndex + 1
      if (nextIdx >= queue.length) {
        if (repeat === 'all') nextIdx = 0
        else if (isWaveMode) {
          // очередь кончилась в режиме волны — дозагружаем и ждём
          get()._refillWave()
          return
        } else {
          set({ isPlaying: false })
          return
        }
      }
    }
    if (isWaveMode && nextIdx >= queue.length - 2) get()._refillWave()
    if (queue[nextIdx]) get().play(queue[nextIdx], queue, isWaveMode)
  },

  playPrev: () => {
    const { progress, queue, queueIndex } = get()
    if (progress > 3) {
      _a.currentTime = 0
      set({ progress: 0 })
      return
    }
    const prev = Math.max(0, queueIndex - 1)
    // передаём флаг волны, иначе «назад» молча выключал волну
    if (queue[prev]) get().play(queue[prev], queue, get().isWaveMode)
  },

  seek: (time) => {
    _a.currentTime = time
    set({ progress: time })
  },

  setVolume: (v) => {
    _a.volume = v
    localStorage.setItem('nota:volume', String(v))
    set({ volume: v, isMuted: v === 0 })
  },

  toggleMute: () => {
    const { isMuted, volume } = get()
    _a.volume = isMuted ? volume : 0
    set({ isMuted: !isMuted })
  },

  toggleShuffle: (force) => {
    const { shuffle } = get()
    set({ shuffle: force !== undefined ? !!force : !shuffle })
  },

  cycleRepeat: () => {
    const { repeat } = get()
    set({ repeat: repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off' })
  },

  setPage: (page) => set({ page }),

  openArtistCard: async (artistName) => {
    set({ artistCardOpen: true, artistCardLoading: true, artistCard: null })
    try {
      const card = await api.getArtistCard(artistName)
      set({ artistCard: card, artistCardLoading: false })
    } catch {
      set({ artistCardOpen: false, artistCardLoading: false })
    }
  },

  closeArtistCard: () => set({ artistCardOpen: false, artistCard: null, artistCardLoading: false }),

  startArtistWave: async (artistCard) => {
    const tracks = artistCard.tracks
    if (!tracks.length) return
    set({ artistCardOpen: false, artistCard: null })
    // 2–3 сида из топа артиста, чтобы волна держалась его звучания
    const top = tracks.slice(0, Math.min(8, tracks.length))
    const seeds = [...top].sort(() => Math.random() - 0.5).slice(0, 3).map(t => t.id)
    try {
      const data = await api.getWave(seeds, loadWaveHeard())
      const related = data.tracks ?? []
      if (!related.length) throw new Error('empty')
      const seen = new Set([...seeds, ...related.map(t => t.id)])
      set({ isWaveMode: true, _waveSeenIds: seen, _waveGoodSeed: null, _wavePenalized: new Set() })
      get().play(related[0], related, true)
    } catch {
      set({ isWaveMode: false })
      const shuffled = [...tracks].sort(() => Math.random() - 0.5)
      get().play(shuffled[0], shuffled)
    }
  },

  startWave: async () => {
    const { likedTracks, recentTracks, likedIds, play } = get()
    const pool = likedTracks.length ? likedTracks : recentTracks
    if (!pool.length) { get().setPage('search'); return }

    // мульти-сид: 2 свежих лайка + последний прослушанный + случайный из пула
    const seeds = []
    if (likedTracks[0]) seeds.push(likedTracks[0].id)
    if (likedTracks[1]) seeds.push(likedTracks[1].id)
    if (recentTracks[0]) seeds.push(recentTracks[0].id)
    seeds.push(pool[Math.floor(Math.random() * pool.length)].id)

    const exclude = [...new Set([...loadWaveHeard(), ...likedIds])]
    try {
      const data = await api.getWave([...new Set(seeds)], exclude)
      let tracks = data.tracks ?? []
      if (!tracks.length) throw new Error('empty')
      const seen = new Set([...seeds, ...tracks.map(t => t.id)])
      tracks = injectAnchors(tracks, likedTracks, seen)
      set({ isWaveMode: true, _waveSeenIds: seen, _waveGoodSeed: null, _wavePenalized: new Set() })
      play(tracks[0], tracks, true)
    } catch {
      set({ isWaveMode: false })
      const shuffled = [...pool].sort(() => Math.random() - 0.5)
      play(shuffled[0], shuffled)
    }
  },

  _refillWave: async () => {
    const { queue, isWaveMode, _waveSeenIds, _waveGoodSeed, likedTracks, likedIds } = get()
    if (!isWaveMode || !queue.length) return
    // дозагрузка идёт от последнего ХОРОШО прослушанного трека (анти-дрейф),
    // плюс хвост очереди и случайный лайк для разнообразия
    const seeds = []
    if (_waveGoodSeed) seeds.push(_waveGoodSeed)
    seeds.push(queue[queue.length - 1].id)
    if (likedTracks.length) seeds.push(likedTracks[Math.floor(Math.random() * likedTracks.length)].id)

    const exclude = [...new Set([..._waveSeenIds, ...loadWaveHeard(), ...likedIds])]
    try {
      const data = await api.getWave([...new Set(seeds)], exclude, 20)
      const pen = get()._wavePenalized
      const fresh = (data.tracks ?? []).filter(t => !_waveSeenIds.has(t.id) && !pen.has(t.artist))
      if (!fresh.length) return
      const nextSeen = new Set([..._waveSeenIds, ...fresh.map(t => t.id)])
      set(s => ({ queue: [...s.queue, ...fresh], _waveSeenIds: nextSeen }))
    } catch { /* следующий playNext попробует снова */ }
  },
}))
