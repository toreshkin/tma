export const BASE = 'https://nota-backend-o90i.onrender.com/api'

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
    fetch(`${BASE}/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ init_data: initData }),
    }).then(async r => {
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${r.status}`) }
      return r.json()
    }),

  search: (q, limit = 20) =>
    req(`/tracks/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  getRelated: (trackId, limit = 20) =>
    req(`/tracks/related/${trackId}?limit=${limit}`),

  getArtistCard: (name, trackLimit = 20) =>
    req(`/artists/card?name=${encodeURIComponent(name)}&track_limit=${trackLimit}`),

  getStream: (videoId) =>
    Promise.resolve({ stream_url: `${BASE}/tracks/proxy/${videoId}` }),

  getLiked: () => req('/liked'),

  addLiked: (track) =>
    req('/liked', { method: 'POST', body: JSON.stringify(track) }),

  removeLiked: (videoId) =>
    req(`/liked/${videoId}`, { method: 'DELETE' }).catch(() => {}),
}
