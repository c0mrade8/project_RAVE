import { useStore } from '../store/useStore'

const STEPS = [
  'Parsing job description intent with Gemini AI',
  'Computing 5-signal scores for all candidates',
  'Running per-group adverse impact analysis',
  'Detecting monoculture risk patterns',
  'Generating equitable shortlist + AI insights',
]

export default function LoadingOverlay() {
  // FIXED: Tied component straight to background pipeline status states
  const { taskState, taskMessage } = useStore()
  
  const isProcessing = taskState === 'PROCESSING'
  if (!isProcessing) return null

  return (
    <div className="fixed inset-0 bg-bg/85 backdrop-blur-sm flex items-center justify-center z-40 text-white">
      <div className="bg-bg2 border border-white/10 rounded-xl p-8 max-w-sm w-[90%] text-center shadow-2xl">
        <div className="text-4xl mb-4">🧠</div>
        <div className="text-base font-bold mb-2">AI Recruiter + Equity Audit</div>
        
        {/* Dynamic active step feedback slot from FastAPI */}
        <div className="text-xs font-semibold px-2 py-1.5 rounded bg-accent/10 text-accent2 border border-accent/20 mb-4 animate-pulse">
          {taskMessage || 'Initializing orchestration pipeline...'}
        </div>

        <div className="text-xs text-muted mb-6 leading-relaxed">
          Running multi-signal ranking with real-time equity monitoring across all candidates.
        </div>
        
        <div className="flex flex-col gap-2.5 text-left mb-5">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs text-muted"
              style={{ animation: `fadeUp 0.4s ease ${i * 0.15}s both` }}>
              <div className="w-4 h-4 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full bg-accent2 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              </div>
              {step}
            </div>
          ))}
        </div>
        
        <div className="h-1 bg-bg4 rounded overflow-hidden">
          <div className="h-full bg-accent rounded" style={{ animation: 'progress 12s ease-in-out forwards' }} />
        </div>
        <style>{`
          @keyframes progress { from { width: 0% } to { width: 98% } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        `}</style>
      </div>
    </div>
  )
}