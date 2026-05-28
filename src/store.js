import { create } from 'zustand'
import { api, setToken, BASE } from './api'

const _a = new Audio()

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
  shuffle: false,
  repeat: 'off', // 'off' | 'all' | 'one'

  // data
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
    try {
      const data = await api.search(q)
      set({ searchResults: data.tracks ?? [] })
    } catch {}
    set({ isSearching: false })
  },

  play: (track, newQueue = null) => {
    const { queue: curQueue, isMuted, recentTracks } = get()

    _a.pause()
    _a.src = `${BASE}/tracks/proxy/${track.id}`
    _a.volume = isMuted ? 0 : 1

    const q = newQueue ?? (curQueue.length ? curQueue : [track])
    const idx = q.findIndex(t => t.id === track.id)

    _a.ontimeupdate = () => set({ progress: _a.currentTime, duration: _a.duration || 0 })
    _a.onended = () => {
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
      if (queue[nextIdx]) get().play(queue[nextIdx], queue)
    }
    _a.onerror = () => set({ isPlaying: false, audioError: `Ошибка ${_a.error?.code}` })

    // track recent plays
    const filtered = recentTracks.filter(t => t.id !== track.id)
    const nextRecent = [track, ...filtered].slice(0, 10)

    set({
      currentTrack: track, isPlaying: false, progress: 0, duration: 0,
      audioError: null, queue: q, queueIndex: idx < 0 ? 0 : idx,
      recentTracks: nextRecent,
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
        set({ isPlaying: true })
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
      })
      .catch(e => set({ isPlaying: false, audioError: e.message || 'Воспроизведение заблокировано' }))
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
    const { queue, queueIndex, shuffle, repeat } = get()
    if (!queue.length) return
    let nextIdx
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length)
    } else {
      nextIdx = queueIndex + 1
      if (nextIdx >= queue.length) {
        if (repeat === 'all') nextIdx = 0
        else { set({ isPlaying: false }); return }
      }
    }
    if (queue[nextIdx]) get().play(queue[nextIdx], queue)
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

  toggleMute: () => {
    const { isMuted } = get()
    _a.volume = isMuted ? 1 : 0
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
}))
