const BASE = 'https://nota-backend-o90i.onrender.com/api'

let _token = null
export function setToken(t) { _token = t }

async function req(path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
    ...opts.headers,
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  authTelegram: (initData) =>
    req('/auth/telegram', { method: 'POST', body: JSON.stringify({ init_data: initData }) }),

  search: (q, limit = 20) =>
    req(`/tracks/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  getStream: (videoId) =>
    req(`/tracks/stream/${videoId}`),

  getLiked: () => req('/liked'),

  addLiked: (track) =>
    req('/liked', { method: 'POST', body: JSON.stringify(track) }),

  removeLiked: (videoId) =>
    req(`/liked/${videoId}`, { method: 'DELETE' }).catch(() => {}),
}
