import { useState, useEffect } from 'react'
import './App.css'

// GitHub raw URL for images
const GITHUB_IMAGES_BASE = 'https://raw.githubusercontent.com/israelvaday/tab-viewer/master/public/images'

// Available songs config - images on GitHub, data local
const SONGS = {
  'radiohead-creep': {
    dataFile: '/all_versions_data.json',
    albumImage: `${GITHUB_IMAGES_BASE}/album_cover.jpg`,
    artistImage: `${GITHUB_IMAGES_BASE}/artist_cover.jpg`
  },
  'oasis-wonderwall': {
    dataFile: '/wonderwall_data.json',
    albumImage: `${GITHUB_IMAGES_BASE}/oasis-wonderwall/album_cover.jpg`,
    artistImage: `${GITHUB_IMAGES_BASE}/oasis-wonderwall/artist_cover.jpg`
  }
}

function App() {
  const [songKey, setSongKey] = useState('oasis-wonderwall')
  const [data, setData] = useState(null)
  const [versionIdx, setVersionIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    const song = SONGS[songKey]
    fetch(song.dataFile)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load data')
        return res.json()
      })
      .then(d => {
        console.log('Data loaded:', d)
        setData(d)
        const idx = d.all_versions?.findIndex(v => v.content) 
        setVersionIdx(idx >= 0 ? idx : 0)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [songKey])

  if (loading) {
    return (
      <div className="center-screen">
        <div className="loader"></div>
        <p>Loading tabs...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="center-screen error">
        <h2>⚠️ Error</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="center-screen">
        <p>No data available</p>
      </div>
    )
  }

  const versions = data.all_versions || []
  const version = versions[versionIdx] || {}
  const chords = version.applicature || {}
  const chordList = Object.keys(chords)

  const parseContent = (content) => {
    if (!content) return []
    return content
      .replace(/\[tab\]/g, '')
      .replace(/\[\/tab\]/g, '')
      .replace(/\[ch\]([^\[]+)\[\/ch\]/g, '<span class="chord">$1</span>')
      .split('\n')
  }

  const getDifficulty = () => version.ug_difficulty || version.list_difficulty || 'N/A'
  const song = SONGS[songKey]

  return (
    <div className="app">
      {/* Header */}
      <header>
        <div className="header-main">
          <img src={song.albumImage} alt="Album" className="album-img" />
          <div>
            <h1>{data.song_name}</h1>
            <p className="artist">{data.artist_name}</p>
          </div>
        </div>
        <div className="header-controls">
          <select 
            value={songKey}
            onChange={e => setSongKey(e.target.value)}
            className="song-select"
          >
            {Object.keys(SONGS).map(key => (
              <option key={key} value={key}>{key.replace('-', ' - ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
          <select 
            value={versionIdx} 
            onChange={e => setVersionIdx(Number(e.target.value))}
            className="version-select"
          >
            {versions.map((v, i) => (
              <option key={i} value={i}>
                {v.type || 'Unknown'} v{v.version || i+1} - {v.ug_difficulty || v.list_difficulty || 'N/A'}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Info Bar */}
      <div className="info-bar">
        <span className={`badge ${getDifficulty().toLowerCase()}`}>{getDifficulty()}</span>
        <span>⭐ {(version.rating || version.list_rating || 0).toFixed(1)}</span>
        <span>Key: {version.tonality_name || 'N/A'}</span>
        {version.is_simplify_available && <span className="simplify">✨ Simplify</span>}
      </div>

      {/* Main Content */}
      <div className="main">
        {/* Chords Panel */}
        <aside className="chords-panel">
          <h3>🎸 Chords ({chordList.length})</h3>
          <div className="chord-grid">
            {chordList.length > 0 ? chordList.map(name => (
              <ChordBox key={name} name={name} data={chords[name]} />
            )) : <p className="muted">No chord diagrams</p>}
          </div>
        </aside>

        {/* Tab Content */}
        <main className="tab-content">
          {version.content ? (
            <div className="tab-text">
              {parseContent(version.content).map((line, i) => {
                if (line.match(/^\[(Intro|Verse|Chorus|Bridge|Outro|Pre-Chorus|Solo)/i)) {
                  return <div key={i} className="section">{line.replace(/[\[\]]/g, '')}</div>
                }
                return <div key={i} className="line" dangerouslySetInnerHTML={{__html: line || '&nbsp;'}} />
              })}
            </div>
          ) : (
            <div className="no-content">
              <p>📝 No tab content for this version</p>
              <p className="muted">Try selecting a different version above</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function ChordBox({ name, data }) {
  const variants = Array.isArray(data) ? data : [data]
  const [varIdx, setVarIdx] = useState(0)
  const chord = variants[varIdx] || {}
  const frets = chord.frets || []
  const fingers = chord.fingers || []

  return (
    <div className="chord-box">
      <div className="chord-header">
        <strong>{name}</strong>
        {variants.length > 1 && (
          <select value={varIdx} onChange={e => setVarIdx(Number(e.target.value))}>
            {variants.map((_, i) => <option key={i} value={i}>v{i+1}</option>)}
          </select>
        )}
      </div>
      <ChordSVG frets={frets} fingers={fingers} />
      <div className="fret-nums">{frets.map(f => f === -1 ? 'x' : f).join(' ')}</div>
    </div>
  )
}

function ChordSVG({ frets, fingers }) {
  const w = 80, h = 100
  const sx = 10, sy = 20
  const sw = 12, fh = 16
  
  const minFret = Math.min(...frets.filter(f => f > 0)) || 1
  const pos = minFret > 3 ? minFret - 1 : 0

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Position number */}
      {pos > 0 && <text x="3" y={sy + fh} fontSize="9" fill="#888">{pos+1}</text>}
      
      {/* Nut */}
      {pos === 0 && <rect x={sx} y={sy-2} width={sw*5} height={3} fill="#fff"/>}
      
      {/* Frets */}
      {[0,1,2,3,4].map(i => (
        <line key={i} x1={sx} y1={sy+i*fh} x2={sx+sw*5} y2={sy+i*fh} stroke="#444" strokeWidth={i===0?2:1}/>
      ))}
      
      {/* Strings */}
      {[0,1,2,3,4,5].map(i => (
        <line key={i} x1={sx+i*sw} y1={sy} x2={sx+i*sw} y2={sy+4*fh} stroke="#666"/>
      ))}
      
      {/* Markers */}
      {frets.map((f, i) => {
        const x = sx + i * sw
        const af = pos > 0 ? f - pos : f
        
        if (f === -1) return <text key={i} x={x} y={sy-6} fontSize="10" fill="#888" textAnchor="middle">×</text>
        if (f === 0) return <circle key={i} cx={x} cy={sy-8} r={4} fill="none" stroke="#888" strokeWidth="1.5"/>
        if (af > 0 && af <= 4) {
          const y = sy + (af - 0.5) * fh
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={6} fill="#3b82f6"/>
              {fingers[i] > 0 && <text x={x} y={y+3} fontSize="8" fill="#fff" textAnchor="middle">{fingers[i]}</text>}
            </g>
          )
        }
        return null
      })}
    </svg>
  )
}

export default App
