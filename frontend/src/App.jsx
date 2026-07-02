import { useState } from 'react'
import { useStore } from './store/useStore'
import LeftPanel from './components/LeftPanel'
import JDCard from './components/JDCard'
import EquityDashboard from './components/EquityDashboard'
import CandidateCard from './components/CandidateCard'
import ChatModal from './components/ChatModal'
import LoadingOverlay from './components/LoadingOverlay'

const SORT_OPTS = [
  { key: 'score',      label: 'By score' },
  { key: 'behavioral', label: 'Behavioral' },
  { key: 'trajectory', label: 'Trajectory' },
  { key: 'equity',     label: 'Equity flags' },
]

export default function App() {
  const { 
    taskState, 
    candidates, 
    equityDashboard, 
    jdIntelligence, 
    error
  } = useStore()

  const [sortBy, setSortBy] = useState('score')
  //temporary debug logging for backend payloads
  if (candidates && candidates.length > 0) {
    console.log('--- RAW BACKEND CANDIDATE OBJECT DEEP-DIVE ---', candidates[0]);
    console.log('--- RAW EQUITY DASHBOARD PAYLOAD ---', equityDashboard);
  }

  // Client-side quick sort evaluator to ensure UI buttons react instantly
  const getSortedCandidates = () => {
    if (!candidates || !Array.isArray(candidates)) return []
    const list = [...candidates]
    if (sortBy === 'score') {
      return list.sort((a, b) => ((b.signal_scores?.final_score || b.final_score || 0) - (a.signal_scores?.final_score || a.final_score || 0)))
    } else if (sortBy === 'behavioral') {
      return list.sort((a, b) => ((b.signal_scores?.behavioral_signals || 0) - (a.signal_scores?.behavioral_signals || 0)))
    } else if (sortBy === 'trajectory') {
      return list.sort((a, b) => ((b.signal_scores?.career_trajectory || 0) - (a.signal_scores?.career_trajectory || 0)))
    } else if (sortBy === 'equity') {
      return list.sort((a, b) => (b.adverse_impact_flag === a.adverse_impact_flag ? 0 : a.adverse_impact_flag ? -1 : 1))
    }
    return list
  }

  const sortedCandidates = getSortedCandidates()
  const hasResults = taskState === 'SUCCESS' && sortedCandidates.length > 0

  return (
    <div className="flex flex-col min-h-screen bg-bg text-white">
      {/* TOPBAR */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 border-b border-white/[0.07] bg-bg backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center text-sm">🎯</div>
          <span className="font-bold text-base text-white">Red<span className="text-accent2">Rob</span></span>
          <span className="text-faint text-xs ml-1">/ Equitable Discovery</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-accent/10 text-accent2 border border-accent/20">
            ✦ Anti-monoculture
          </span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green/10 text-green border border-green/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green/80 animate-pulse" />
            Gemini AI Live
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <aside className="w-[360px] flex-shrink-0 border-r border-white/[0.07] h-[calc(100vh-54px)] sticky top-[54px] overflow-y-auto bg-bg2">
          <LeftPanel />
        </aside>

        {/* MAIN DISPLAY REGION */}
        <main className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>

          {/* Hero State (Show only when no interaction has occurred yet) */}
          {taskState === 'IDLE' && !error && (
            <div className="flex flex-col items-center justify-center min-h-[65vh] text-center gap-4">
              <div className="w-16 h-16 bg-bg3 border border-white/10 rounded-2xl flex items-center justify-center text-3xl">⚖️</div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Equitable Candidate Discovery</h1>
              <p className="text-muted text-sm max-w-md leading-relaxed">
                The world's first anti-monoculture AI recruiter. Ranks candidates while actively monitoring for
                racial adverse impact, systemic rejection, and signal homogeneity.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {['Adverse impact detection','Monoculture risk score','Systemic rejection guard','5-signal diversity'].map((f, i) => (
                  <span key={f} className="flex items-center gap-1.5 text-xs text-muted bg-bg3 border border-white/[0.07] px-3 py-1.5 rounded-full">
                    <span style={{ color: ['#22c98a','#6c63ff','#f5a623','#00d4c8'][i] }}>●</span>{f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 text-sm text-red-400">
              ⚠ {error}
            </div>
          )}

          {/* Dynamic Pipeline Results Rendering */}
          {hasResults && (
            <>
              {/* Equity Dashboard */}
              <EquityDashboard dashboard={equityDashboard} />

              {/* JD Intelligence */}
              <JDCard jd={jdIntelligence} />

              {/* Results Control Header */}
              <div className="flex items-start justify-between mb-4 gap-3 mt-6">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Ranked Shortlist — {sortedCandidates.length} Candidates
                  </h2>
                  <div className="text-[11px] text-faint mt-1">
                    5-signal weighted ranking · equity-audited pipeline active
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {SORT_OPTS.map(opt => (
                    <button key={opt.key} onClick={() => setSortBy(opt.key)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-all whitespace-nowrap
                        ${sortBy === opt.key
                          ? 'bg-accent/10 border-accent text-accent2'
                          : 'bg-bg3 border-white/[0.07] text-muted hover:border-white/20'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Candidate Shortlist Iteration Mapping */}
              <div className="flex flex-col gap-3">
                {sortedCandidates.map((c, i) => (
                  <CandidateCard
                    key={c.candidate_id || c.id || i}
                    candidate={c}
                    rank={i + 1}
                    animDelay={`${i * 0.04}s`}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Global Modals & Layers */}
      <LoadingOverlay />
      <ChatModal />
    </div>
  )
}