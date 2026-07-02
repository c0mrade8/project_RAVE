import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import mammoth from 'mammoth'

const TEMPLATES = {
  swe: `Senior Software Engineer — Distributed Systems\n\nWe're building real-time financial infrastructure. Looking for an engineer who has scaled systems to millions of TPS.\n\nRequirements:\n- 6+ years backend engineering (Go, Rust, or Java preferred)\n- Deep distributed systems: consensus algorithms, CAP tradeoffs\n- Kafka, gRPC, Kubernetes, Terraform\n- Has led engineering teams during a scaling inflection point\n\nCulture: We move fast, debate hard, ship with conviction.`,
  pm: `Senior Product Manager — Growth & Monetization\n\nSeries B, $40M ARR. Need a PM who has navigated post-PMF, pre-scale.\n\nRequirements:\n- 5+ years PM at SaaS or marketplace\n- Track record owning revenue metrics — not just shipping features\n- Data fluency: SQL, causation vs correlation\n- Shipped at least one 0-to-1 product that launched\n\nThis role has real P&L influence from day one.`,
  ds: `Senior Data Scientist — Recommendations\n\nOur recommendation engine drives 38% of conversions. We need someone to push that to 50%.\n\nRequirements:\n- PhD or 5+ years ML/DS industry experience\n- Recommender systems: collaborative filtering, two-tower models\n- Production ML: feature stores, model serving, A/B frameworks\n- Python, Spark or Ray\n- Published research or open-source is a genuine plus`,
}

const WEIGHT_LABELS = [
  { key: 'semantic_fit',        label: 'Semantic fit', sub: 'Skills + context match' },
  { key: 'career_trajectory',  label: 'Career trajectory', sub: 'Growth velocity' },
  { key: 'behavioral_signals', label: 'Behavioral signals', sub: 'Activity + engagement' },
  { key: 'cultural_alignment', label: 'Cultural alignment', sub: 'Values + pace' },
  { key: 'growth_potential',   label: 'Growth potential', sub: 'Learning velocity' },
]

const EQUITY_LABELS = [
  { key: 'adverse_impact_monitoring', label: 'Adverse impact monitor', sub: 'Flag group impact ratio < 0.8 (EEOC)' },
  { key: 'monoculture_risk_score', label: 'Monoculture risk score', sub: 'Signal homogeneity detection' },
  { key: 'systemic_rejection_detection', label: 'Systemic rejection guard', sub: 'Cross-employer rejection risk flag' },
  { key: 'signal_diversity_enforcement', label: 'Signal diversity check', sub: 'Require 3+ independent sources' },
]

export default function LeftPanel() {
  const { 
    jobDescription, 
    setJobDescription, 
    weights, 
    setWeight, 
    equity, 
    setEquity,
    taskState,
    startDiscoveryPipeline
  } = useStore()

  const [isParsing, setIsParsing] = useState(false)
  const fileInputRef = useRef(null)
  const isProcessing = taskState === 'PROCESSING'

  // NEW: Handles reading and parsing the docx file binary structure into clean text
  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setIsParsing(true)
    useStore.setState({ error: null })

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const arrayBuffer = event.target.result
        try {
          const result = await mammoth.extractRawText({ arrayBuffer })
          if (result.value.trim().length < 10) {
            throw new Error("Extracted text seems empty or corrupted.")
          }
          setJobDescription(result.value)
        } catch (parseError) {
          useStore.setState({ error: `Failed to parse DOCX contents: ${parseError.message}` })
        } finally {
          setIsParsing(false)
        }
      }
      reader.readAsArrayBuffer(file)
    } catch (err) {
      useStore.setState({ error: `File reading encountered an error.` })
      setIsParsing(false)
    }
  }

  async function handleRun() {
    if (!jobDescription.trim() || jobDescription.trim().length < 50) {
      useStore.setState({ error: 'Please enter or upload a job description (at least 50 characters)' })
      return
    }
    await startDiscoveryPipeline()
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

      {/* JD Input + Document Upload Card */}
      <div className="p-5 border-b border-white/[0.07]">
        <div className="text-[10px] font-bold tracking-[1.2px] uppercase text-faint mb-2 flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-accent inline-block" />
          Job Description Intake
        </div>

        {/* NEW: Interactive File Upload Area */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-lg p-4 mb-3 text-center cursor-pointer transition-all bg-bg3/50
            ${isParsing ? 'border-accent2 bg-accent/5 animate-pulse' : 'border-white/10 hover:border-accent hover:bg-bg3'}`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".docx" 
            className="hidden" 
          />
          <div className="text-xl mb-1">📄</div>
          <div className="text-xs font-semibold text-muted">
            {isParsing ? 'Extracting text strings...' : 'Click to upload JD (.docx)'}
          </div>
          <div className="text-[10px] text-faint mt-0.5">Will automatically unpack formatting fields</div>
        </div>

        <textarea
          rows={6}
          value={jobDescription}
          onChange={e => setJobDescription(e.target.value)}
          placeholder="Or paste job description details here directly...&#10;&#10;The AI will automatically handle extraction workflows."
          className="w-full bg-bg3 border border-white/[0.07] rounded-lg text-sm text-white px-3 py-2.5 resize-none outline-none placeholder-faint focus:border-accent transition-colors"
          style={{ fontFamily: 'inherit', lineHeight: 1.6 }}
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {Object.entries(TEMPLATES).map(([k, v]) => (
            <button key={k} onClick={() => setJobDescription(v)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-bg3 border border-white/[0.07] text-muted hover:border-accent hover:text-accent2 hover:bg-accent/10 transition-all">
              {k === 'swe' ? 'Senior SWE' : k === 'pm' ? 'Product Manager' : 'Data Scientist'}
            </button>
          ))}
        </div>
      </div>

      {/* Equity Guardrails */}
      <div className="p-5 border-b border-white/[0.07]">
        <div className="text-[10px] font-bold tracking-[1.2px] uppercase text-faint mb-3 flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-green inline-block" />
          Equity Guardrails
        </div>
        {EQUITY_LABELS.map(({ key, label, sub }) => (
          <div key={key} className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-muted">{label}</div>
              <div className="text-[10px] text-faint mt-0.5">{sub}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-3 flex-shrink-0">
              <input type="checkbox" className="sr-only" checked={equity[key]}
                onChange={e => setEquity(key, e.target.checked)} />
              <div className={`w-9 h-5 rounded-full transition-colors ${equity[key] ? 'bg-accent' : 'bg-bg5'} border border-white/10`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${equity[key] ? 'translate-x-4 bg-white' : 'bg-faint'}`} />
              </div>
            </label>
          </div>
        ))}
      </div>

      {/* Signal Weights */}
      <div className="p-5 border-b border-white/[0.07]">
        <div className="text-[10px] font-bold tracking-[1.2px] uppercase text-faint mb-3 flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-accent inline-block" />
          Signal Weights
        </div>
        {WEIGHT_LABELS.map(({ key, label, sub }) => (
          <div key={key} className="flex items-center gap-2 mb-2.5">
            <div className="w-28 flex-shrink-0">
              <div className="text-[11px] text-muted">{label}</div>
              <div className="text-[10px] text-faint">{sub}</div>
            </div>
            <input type="range" min="0" max="100" step="1" value={weights[key]}
              onChange={e => setWeight(key, e.target.value)}
              className="flex-1" />
            <div className="text-[11px] font-semibold text-accent2 w-7 text-right">{weights[key]}%</div>
          </div>
        ))}
      </div>

      {/* Pool Monitor */}
      <div className="p-5 border-b border-white/[0.07]">
        <div className="text-[10px] font-bold tracking-[1.2px] uppercase text-faint mb-3 flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-accent inline-block" />
          Candidate Pool
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            ['100k', 'Indexed'], 
            ['5', 'Signal sources'], 
            ['94%', 'Completeness']
          ].map(([n, l]) => (
            <div key={l} className="bg-bg3 border border-white/[0.07] rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-white">{n}</div>
              <div className="text-[10px] text-faint mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5">
        <button onClick={handleRun} disabled={isProcessing || isParsing}
          className="w-full py-3 bg-accent hover:bg-accent2 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5">
          {isProcessing
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Discovering...</>
            : '✦ Discover & Audit Candidates'}
        </button>
        <div className="text-center mt-2 text-[10px] text-faint">
          Gemini AI · 5-signal ranking · equity-audited
        </div>
      </div>
    </div>
  )
}