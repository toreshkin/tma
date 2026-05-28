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

  // data
  likedTracks: [],
  likedIds: new Set(),

  // ui
  page: 'liked',   // 'liked' | 'search'
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
      const ids = new Set(next.map(t => t.id))
      set({ likedTracks: next, likedIds: ids })
    } else {
      await api.addLiked(track)
      const next = [track, ...likedTracks]
      const ids = new Set(next.map(t => t.id))
      set({ likedTracks: next, likedIds: ids })
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

  play: (track) => {
    const { audio: prev } = get()
    if (prev) { prev.pause(); prev.src = '' }

    const a = new Audio(`${BASE}/tracks/proxy/${track.id}`)
    a.ontimeupdate = () => set({ progress: a.currentTime, duration: a.duration || 0 })
    a.onended = () => set({ isPlaying: false })
    set({ currentTrack: track, isPlaying: false, progress: 0, duration: 0, audio: a })

    a.play()
      .then(() => set({ isPlaying: true }))
      .catch(e => console.error('Stream failed', e))
  },

  togglePlay: () => {
    const { audio, isPlaying } = get()
    if (!audio) return
    isPlaying ? audio.pause() : audio.play()
    set({ isPlaying: !isPlaying })
  },

  setPage: (page) => set({ page }),
}))
