export async function fetchLyrics(title, artist) {
  try {
    const q = new URLSearchParams({ track_name: title, artist_name: artist })
    const res = await fetch(`https://lrclib.net/api/search?${q}`)
    if (!res.ok) return null
    const list = await res.json()
    if (!list.length) return null
    const best = list.find(r => r.syncedLyrics) || list.find(r => r.plainLyrics) || null
    if (!best) return null
    return {
      plain: best.plainLyrics || '',
      synced: best.syncedLyrics ? parseLRC(best.syncedLyrics) : null,
    }
  } catch { return null }
}

export function parseLRC(lrc) {
  const lines = []
  for (const raw of lrc.split('\n')) {
    const m = raw.match(/^\[(\d{1,2}):(\d{2}(?:\.\d+)?)\]\s*(.*)$/)
    if (!m) continue
    lines.push({ time: parseInt(m[1]) * 60 + parseFloat(m[2]), text: m[3] })
  }
  return lines
}

export function activeLine(synced, t) {
  if (!synced?.length) return 0
  let i = 0
  while (i + 1 < synced.length && synced[i + 1].time <= t) i++
  return i
}

export async function translateText(text) {
  if (!text?.trim()) return ''
  if (text.length > 4000) {
    const mid = text.lastIndexOf('\n', 2000)
    const sp = mid > 0 ? mid : 2000
    const [a, b] = await Promise.all([translateText(text.slice(0, sp)), translateText(text.slice(sp))])
    return a + '\n' + b
  }
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ru&dt=t&q=${encodeURIComponent(text)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Ошибка перевода')
  const d = await res.json()
  return d[0].map(c => c[0]).join('')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

export async function translateLyrics(lyrics) {
  if (!lyrics) return null
  const { plain, synced } = lyrics
  if (synced) {
    const nonEmpty = synced.filter(l => l.text.trim())
    if (!nonEmpty.length) return synced.map(l => ({ ...l, textRu: '' }))
    const joined = nonEmpty.map(l => l.text).join('\n')
    const tr = await translateText(joined)
    const parts = tr.split('\n')
    let idx = 0
    return synced.map(l => ({ ...l, textRu: l.text.trim() ? (parts[idx++]?.trim() || '') : '' }))
  }
  return await translateText(plain)
}
