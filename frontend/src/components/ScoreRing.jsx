export function ScoreRing({ score, size = 56 }) {
  const r = size * 0.357
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 88 ? '#22c98a' : score >= 78 ? '#6c63ff' : score >= 65 ? '#f5a623' : '#ff5c5c'
  const fs = size * 0.25

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size*0.07} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={size*0.07}
          strokeLinecap="round"
          strokeDasharray={circ.toFixed(1)}
          strokeDashoffset={offset.toFixed(1)}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          className="score-arc"
        />
      </svg>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        textAlign: 'center', lineHeight: 1, pointerEvents: 'none'
      }}>
        <span style={{ fontSize: fs, fontWeight: 800, color }}>{score}</span>
        <span style={{ fontSize: fs * 0.55, color: '#555c6e', display: 'block' }}>/100</span>
      </div>
    </div>
  )
}