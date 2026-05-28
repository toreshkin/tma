import { create } from 'zustand'
import { api, setToken, BASE } from './api'

export const useStore = create((set, get) => ({
  // auth
  user: null,
  token: null,

  // player
  currentTrack: null,
  isPlaying: false,
  audio: null,
  progress: 0,
  duration: 0,
  audioError: null,
  queue: [],
  queueIndex: -1,
  volume: 1.0,
  isMuted: false,

  // data
  likedTracks: [],
  likedIds: new Set(),

  // ui
  page: 'liked',
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
    const { audio: prev, queue: curQueue, volume, isMuted } = get()
    if (prev) { prev.pause(); prev.src = '' }

    const q = newQueue ?? (curQueue.length ? curQueue : [track])
    const idx = q.findIndex(t => t.id === track.id)

    const a = new Audio(`${BASE}/tracks/proxy/${track.id}`)
    a.volume = isMuted ? 0 : volume
    a.ontimeupdate = () => set({ progress: a.currentTime, duration: a.duration || 0 })
    a.onended = () => {
      const { queue, queueIndex } = get()
      const next = queueIndex + 1
      if (next < queue.length) {
        get().play(queue[next])
      } else {
        set({ isPlaying: false })
      }
    }
    a.onerror = () => set({ isPlaying: false, audioError: `Ошибка ${a.error?.code}` })
    set({
      currentTrack: track, isPlaying: false, progress: 0, duration: 0,
      audio: a, audioError: null, queue: q, queueIndex: idx < 0 ? 0 : idx,
    })

    a.play()
      .then(() => set({ isPlaying: true }))
      .catch(e => set({ isPlaying: false, audioError: e.message || 'Воспроизведение заблокировано' }))
  },

  togglePlay: () => {
    const { audio, isPlaying } = get()
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      set({ isPlaying: false })
    } else {
      audio.play()
        .then(() => set({ isPlaying: true }))
        .catch(e => set({ audioError: e.message || 'Воспроизведение заблокировано' }))
    }
  },

  playNext: () => {
    const { queue, queueIndex } = get()
    const next = queueIndex + 1
    if (next < queue.length) get().play(queue[next])
  },

  playPrev: () => {
    const { progress, queue, queueIndex, audio } = get()
    if (progress > 3) {
      if (audio) { audio.currentTime = 0 }
      set({ progress: 0 })
      return
    }
    const prev = Math.max(0, queueIndex - 1)
    if (queue[prev]) get().play(queue[prev])
  },

  seek: (time) => {
    const { audio } = get()
    if (audio) { audio.currentTime = time; set({ progress: time }) }
  },

  toggleMute: () => {
    const { audio, isMuted, volume } = get()
    const next = !isMuted
    if (audio) audio.volume = next ? 0 : volume
    set({ isMuted: next })
  },

  setPage: (page) => set({ page }),
}))
