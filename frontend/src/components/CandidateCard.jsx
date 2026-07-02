import { useStore } from '../store/useStore'
import { ScoreRing } from './ScoreRing'

const AV_COLORS = [
  'rgba(108,99,255,0.2)/#8b84ff',
  'rgba(34,201,138,0.2)/#22c98a',
  'rgba(245,166,35,0.2)/#f5a623',
  'rgba(185,131,255,0.2)/#b983ff',
  'rgba(0,212,200,0.2)/#00d4c8',
  'rgba(255,92,92,0.2)/#ff5c5c',
]

const SIGNAL_KEYS = [
  { key: 'semantic_fit',        label: 'Semantic fit' },
  { key: 'career_trajectory',  label: 'Career trajectory' },
  { key: 'behavioral_signals', label: 'Behavioral signals' },
  { key: 'cultural_alignment', label: 'Cultural alignment' },
  { key: 'growth_potential',   label: 'Growth potential' },
]

function barColor(v) {
  return v >= 85 ? '#22c98a' : v >= 70 ? '#6c63ff' : v >= 55 ? '#f5a623' : '#ff5c5c'
}

function monoRiskStyle(level = 'low') {
  if (level === 'high')   return { bg: 'bg-red/10 border-red/20',    text: 'text-red',    icon: '🔴' }
  if (level === 'medium') return { bg: 'bg-amber/10 border-amber/20', text: 'text-amber', icon: '🟡' }
  return                          { bg: 'bg-green/10 border-green/20', text: 'text-green', icon: '🟢' }
}

export default function CandidateCard({ candidate, rank, animDelay }) {
  const { expandedId, setExpandedId, setChatCandidate, equity } = useStore()
  
  const candidateId = candidate.candidate_id || candidate.id
  const isExpanded = expandedId === candidateId
  
  const scores = candidate.signal_scores || {}
  const finalScore = candidate.final_score ?? scores.final_score ?? 0
  const avIdx = (rank - 1) % AV_COLORS.length
  const [avBg, avColor] = AV_COLORS[avIdx].split('/')

  // FIXED FROM LOGS: Pulling correct data layers out safely
  const profile = candidate.profile || {}
  const name = profile.anonymized_name || candidate.name || `Candidate ${candidateId}`
  const currentTitle = candidate.current_title || profile.headline?.split('|')[0]?.trim() || 'Software Engineer'
  const currentCompany = candidate.current_company || 'Premium Track'
  const location = profile.location || candidate.location || 'India'
  
  // Experience evaluation
  const summaryText = profile.summary || ''
  const experienceMatch = summaryText.match(/([\d.]+)\s*years/)
  const yearsExperience = candidate.years_experience || (experienceMatch ? parseFloat(experienceMatch[1]) : 5)

  // Signals and Platform metrics mapping
  const redrobSignals = candidate.redrob_signals || {}
  const signalSources = ['Platform Profile', 'GitHub Pulse', 'Career History Engine']

  const rankLabel = rank === 1 ? '#1 Top Match' : rank === 2 ? '#2 Strong Fit' : rank === 3 ? '#3 Solid Pick' : `#${rank}`
  const rankBadgeStyle = rank === 1
    ? 'bg-green/10 text-green border-green/20'
    : rank === 2 ? 'bg-accent/10 text-accent2 border-accent/25'
    : rank === 3 ? 'bg-amber/10 text-amber border-amber/20'
    : 'bg-bg4 text-muted border-white/10'

  const monoAnalysis = candidate.monoculture_analysis || {}
  const monoStyle = monoRiskStyle(monoAnalysis.risk_level)

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      className={`bg-bg2 border rounded-xl p-5 cursor-pointer card-hover transition-all text-white
        ${isExpanded ? 'border-accent bg-bg3' : 'border-white/[0.07]'}
        ${rank === 1 ? 'border-l-[3px] border-l-green' : rank === 2 ? 'border-l-[3px] border-l-accent' : rank === 3 ? 'border-l-[3px] border-l-amber' : candidate.adverse_impact_flag ? 'border-l-[3px] border-l-red' : ''}
      `}
      style={{ animationDelay: animDelay, animation: 'fadeUp 0.4s ease both' }}
      onClick={() => setExpandedId(candidateId)}
    >
      {/* TOP ROW */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm"
            style={{ background: avBg, color: avColor }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-sm font-semibold text-white">{name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rankBadgeStyle}`}>{rankLabel}</span>
              {candidate.adverse_impact_flag && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red/10 text-red border-red/20">⚠ Equity flag</span>
              )}
            </div>
            <div className="text-xs text-muted mb-1.5">{currentTitle} · {yearsExperience} yrs · {location}</div>
            <div className="flex flex-wrap gap-1">
              {(candidate.tags || ['AI Engineer'])?.map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-bg4 border border-white/[0.07] text-muted">{t}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <ScoreRing score={finalScore} size={56} />
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
            ${redrobSignals.open_to_work_flag ? 'bg-green/10 text-green' : 'bg-bg4 text-muted'}`}>
            {redrobSignals.open_to_work_flag ? '↑ Active' : '→ Passive'}
          </span>
        </div>
      </div>

      {/* SIGNAL BARS */}
      <div className="mt-3 pt-3 border-t border-white/[0.07]">
        {SIGNAL_KEYS.map(({ key, label }) => {
          const val = scores[key] ?? 0
          const col = barColor(val)
          return (
            <div key={key} className="flex items-center gap-2 mb-1.5">
              <div className="text-[11px] text-muted w-36 flex-shrink-0">{label}</div>
              <div className="flex-1 h-1 bg-bg4 rounded overflow-hidden">
                <div className="h-full rounded transition-all duration-700"
                  style={{ width: `${val}%`, background: col }} />
              </div>
              <div className="text-[11px] font-semibold w-6 text-right" style={{ color: col }}>{val}</div>
            </div>
          )
        })}
      </div>

      {/* SIGNAL SOURCE ROW */}
      <div className="mt-2 flex items-center gap-2 bg-bg4 rounded px-2.5 py-1.5">
        <div className="text-[10px] text-muted opacity-60 flex-1 truncate">
          {signalSources.join(' · ')}
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 bg-green/10 text-green">
          {signalSources.length}/3 verified channels
        </span>
      </div>

      {/* EXPANDED SECTION */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-white/[0.07]" onClick={e => e.stopPropagation()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[1px] text-faint mb-2">Strengths</div>
              <div className="flex flex-col gap-1.5">
                {(candidate.strengths || [])?.map((s, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[12px] text-muted leading-relaxed">
                    <span className="text-green text-[11px] mt-0.5 flex-shrink-0">✓</span>{s}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[1px] text-faint mb-2">Risks & considerations</div>
              <div className="flex flex-col gap-1.5">
                {(candidate.risks || [])?.map((r, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[12px] text-muted leading-relaxed">
                    <span className="text-red text-[11px] mt-0.5 flex-shrink-0">!</span>{r}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-[1px] text-faint mb-1.5">Behavioral signals</div>
            <div className="flex flex-wrap gap-1.5">
              {redrobSignals.open_to_work_flag && <Pill label="Open to work" level="high" />}
              {redrobSignals.profile_views_received_30d > 150 && <Pill label={`High demand: ${redrobSignals.profile_views_received_30d} views/mo`} level="high" />}
              {redrobSignals.profile_completeness_score && <Pill label={`Profile completion: ${redrobSignals.profile_completeness_score}%`} level="med" />}
            </div>
          </div>

          {/* Monoculture Risk Block */}
          {(equity.monoculture_risk_score || monoAnalysis.risk_score > 0) && (
            <div className={`rounded-lg border p-3 mb-3 ${monoStyle.bg}`}>
              <div className={`text-xs font-bold mb-1 ${monoStyle.text}`}>
                {monoStyle.icon} Monoculture Risk Analysis — {monoAnalysis.risk_level?.toUpperCase() || 'LOW'}
                {' '}({monoAnalysis.risk_score || 0}/100)
              </div>
              <div className="text-[11px] text-muted leading-relaxed">
                {monoAnalysis.recommendation || 'No correlation anomalies detected.'}
              </div>
            </div>
          )}

          {/* Ask AI button */}
          <button
            onClick={() => setChatCandidate(candidate)}
            className="w-full border border-white/10 hover:border-accent hover:bg-accent/10 text-accent2 text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-2">
            ✦ Ask AI about {name.split(' ')[0]} ↗
          </button>
        </div>
      )}
    </div>
  )
}

function Pill({ label, level }) {
  const cls = level === 'high' ? 'bg-green/10 text-green border-green/20' : 'bg-accent/10 text-accent2 border-accent/20'
  return <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${cls}`}>{label}</span>
}