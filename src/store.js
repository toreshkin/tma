import { create } from 'zustand'
import { api, setToken, BASE } from './api'

const _a = new Audio()
let _playId = 0

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

  // data
  searchHistory: JSON.parse(localStorage.getItem('nota:searchHistory') || '[]'),
  likedTracks: [],
  likedIds: new Set(),
  recentTracks: [],

  // ui
  page: 'home',
  searchResults: [],
  searchQuery: '',
  isSearching: false,

  init: async (initData) => {
    const { access_token, user } = await api.authTelegram(initData)
    setToken(access_token)
    set({ user, token: access_token })
    const data = await api.getLiked()
    const tracks = data.tracks ?? []
    set({ likedTracks: tracks, likedIds: new Set(tracks.map(t => t.id)) })
  },

  toggleLike: async (track) => {
    const { likedIds, likedTracks } = get()
    if (likedIds.has(track.id)) {
      await api.removeLiked(track.id)
      const next = likedTracks.filter(t => t.id !== track.id)
      set({ likedTracks: next, likedIds: new Set(next.map(t => t.id)) })
    } else {
      await api.addLiked(track)
      const next = [track, ...likedTracks]
      set({ likedTracks: next, likedIds: new Set(next.map(t => t.id)) })
    }
  },

  search: async (q) => {
    if (!q.trim()) return
    set({ isSearching: true, searchQuery: q })
    const prev = get().searchHistory
    const next = [q, ...prev.filter(h => h !== q)].slice(0, 6)
    localStorage.setItem('nota:searchHistory', JSON.stringify(next))
    set({ searchHistory: next })
    try {
      const data = await api.search(q)
      set({ searchResults: data.tracks ?? [] })
    } catch {}
    set({ isSearching: false })
  },

  play: (track, newQueue = null, _fromWave = false) => {
    const { queue: curQueue, isMuted, volume, recentTracks } = get()
    const myId = ++_playId

    _a.pause()
    _a.src = `${BASE}/tracks/proxy/${track.id}`
    _a.volume = isMuted ? 0 : volume

    const q = newQueue ?? (curQueue.length ? curQueue : [track])
    const idx = q.findIndex(t => t.id === track.id)

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
        nextIdx = Math.floor(Math.random() * queue.length)
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
      // code 4 = MEDIA_ELEMENT_ERROR (track gone / 404) — remove and skip
      if (code === 4 || code === 2) {
        const { currentTrack: ct, likedIds, likedTracks, recentTracks } = get()
        if (ct) {
          const tid = ct.id
          const nextLiked = likedTracks.filter(t => t.id !== tid)
          const nextIds = new Set([...likedIds].filter(id => id !== tid))
          const nextRecent = recentTracks.filter(t => t.id !== tid)
          set({ likedTracks: nextLiked, likedIds: nextIds, recentTracks: nextRecent })
          if (likedIds.has(tid)) api.removeLiked(tid).catch(() => {})
        }
        get().playNext()
      } else {
        set({ isPlaying: false, audioError: `Ошибка ${code}` })
      }
    }

    // track recent plays
    const filtered = recentTracks.filter(t => t.id !== track.id)
    const nextRecent = [track, ...filtered].slice(0, 10)

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
      try { navigator.mediaSession.setActionHandler('seekbackward', null) } catch {}
      try { navigator.mediaSession.setActionHandler('seekforward', null) } catch {}
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
      nextIdx = Math.floor(Math.random() * queue.length)
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
    if (queue[prev]) get().play(queue[prev], queue)
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

  startWave: async () => {
    const { likedTracks, recentTracks, play } = get()
    const pool = likedTracks.length ? likedTracks : recentTracks
    if (!pool.length) { get().setPage('search'); return }

    const seed = pool[Math.floor(Math.random() * pool.length)]
    try {
      const data = await api.getRelated(seed.id)
      const tracks = data.tracks ?? []
      if (!tracks.length) throw new Error('empty')
      const seen = new Set([seed.id, ...tracks.map(t => t.id)])
      set({ isWaveMode: true, _waveSeenIds: seen })
      play(tracks[0], tracks, true)
    } catch {
      set({ isWaveMode: false })
      const shuffled = [...pool].sort(() => Math.random() - 0.5)
      play(shuffled[0], shuffled)
    }
  },

  _refillWave: async () => {
    const { queue, isWaveMode, _waveSeenIds } = get()
    if (!isWaveMode || !queue.length) return
    const lastTrack = queue[queue.length - 1]
    try {
      const data = await api.getRelated(lastTrack.id)
      const fresh = (data.tracks ?? []).filter(t => !_waveSeenIds.has(t.id))
      if (!fresh.length) return
      const nextSeen = new Set([..._waveSeenIds, ...fresh.map(t => t.id)])
      set(s => ({ queue: [...s.queue, ...fresh], _waveSeenIds: nextSeen }))
    } catch {}
  },
}))
