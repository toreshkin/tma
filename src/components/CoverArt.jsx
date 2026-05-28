function artistHue(str) {
  if (!str) return 200
  return [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0) % 360
}

function initials(artist) {
  if (!artist) return '?'
  const words = artist.replace(/[,&].*/, '').trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return artist.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase()
}

export default function CoverArt({ track, className = '' }) {
  if (!track) return <div className={'cover-art cover-art--v0 ' + className} />
  const mono = initials(track.artist)
  const hue = artistHue(track.artist)
  const variant = String(track.id ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 3
  const style = {
    '--cv-h1': hue,
    '--cv-h2': (hue + 50) % 360,
    '--cv-h3': (hue + 200) % 360,
  }
  return (
    <div className={`cover-art cover-art--v${variant} ${className}`} style={style}>
      <span className="cover-art__mono">{mono}</span>
    </div>
  )
}
