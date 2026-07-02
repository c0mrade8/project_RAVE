export default function JDCard({ jd }) {
  if (!jd) return null

  // FIXED: Added absolute destructured fallbacks to prevent mapping crashes on missing data
  const {
    role = 'Unknown Role',
    seniority = 'Not Specified',
    domain = 'General',
    equity_risks_in_jd = [],
    hard_skills = [],
    soft_skills = [],
    hidden_requirements = [],
    market_insight = ''
  } = jd

  const Tag = ({ text, type }) => {
    const styles = {
      skill:   'bg-accent/10 text-accent2 border-accent/20',
      trait:   'bg-green/10 text-green border-green/20',
      ctx:     'bg-amber/10 text-amber border-amber/20',
      hidden:  'bg-purple/10 text-purple border-purple/20',
      risk:    'bg-red/10 text-red border-red/20',
    }
    return (
      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${styles[type] || styles.ctx}`}>
        {text}
      </span>
    )
  }

  return (
    <div className="bg-bg2 border border-white/[0.07] rounded-xl p-5 mb-5 animate-fade-up" style={{ animationDelay: '0.05s' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-white">🔍 JD Intelligence — {role}</div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-accent/10 text-accent2 border border-accent/25">AI Parsed</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <Tag text={seniority} type="ctx" />
        <Tag text={domain} type="ctx" />
        {equity_risks_in_jd.length > 0
          ? <Tag text={`⚠ ${equity_risks_in_jd.length} equity risk${equity_risks_in_jd.length > 1 ? 's' : ''} in JD`} type="risk" />
          : <Tag text="✓ Equity-neutral language" type="trait" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[1px] text-faint mb-1.5">Hard skills</div>
          <div className="flex flex-wrap gap-1">
            {hard_skills.length > 0 
              ? hard_skills.map(s => <Tag key={s} text={s} type="skill" />)
              : <span className="text-[11px] text-faint">None listed</span>}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[1px] text-faint mb-1.5">Soft skills</div>
          <div className="flex flex-wrap gap-1">
            {soft_skills.length > 0 
              ? soft_skills.map(s => <Tag key={s} text={s} type="trait" />)
              : <span className="text-[11px] text-faint">None listed</span>}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[1px] text-faint mb-1.5">Hidden requirements (AI inferred)</div>
          <div className="flex flex-wrap gap-1">
            {hidden_requirements.length > 0 
              ? hidden_requirements.map(s => <Tag key={s} text={s} type="hidden" />)
              : <span className="text-[11px] text-faint">None inferred</span>}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[1px] text-faint mb-1.5">Equity risks in JD</div>
          <div className="flex flex-wrap gap-1">
            {equity_risks_in_jd.length > 0
              ? equity_risks_in_jd.map(s => <Tag key={s} text={s} type="risk" />)
              : <span className="text-[11px] text-faint">None detected</span>}
          </div>
        </div>
      </div>

      {market_insight && (
        <div className="mt-3 pt-3 border-t border-white/[0.07] text-[12px] text-muted leading-relaxed">
          {market_insight}
        </div>
      )}
    </div>
  )
}