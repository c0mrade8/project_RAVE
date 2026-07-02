import { useStore } from '../store/useStore'

const FLAG_STYLES = {
  ok:    { bg: 'bg-green/10 border-green/20', text: 'text-green',  badge: '✓ OK',    bar: '#22c98a' },
  warn:  { bg: 'bg-amber/10 border-amber/20', text: 'text-amber',  badge: '~ < 0.9', bar: '#f5a623' },
  alert: { bg: 'bg-red/10 border-red/20',     text: 'text-red',    badge: '⚠ < 0.8', bar: '#ff5c5c' },
}

const RISK_STYLES = {
  low:    { color: '#22c98a', label: '✓ Low Risk' },
  medium: { color: '#f5a623', label: '~ Medium Risk' },
  high:   { color: '#ff5c5c', label: '⚠ High Risk' },
}

export default function EquityDashboard({ dashboard }) {
  const { equity } = useStore()
  if (!dashboard) return null

  // FIXED PARAMETERS: Normalized parameters matching your exact console.log outputs
  const monocultureScore = dashboard.monoculture_risk_score ?? dashboard.overall_monoculture_risk ?? 0
  const riskLevel = dashboard.monoculture_risk_level || dashboard.overall_risk_level || 'low'
  const adverseImpactMetrics = dashboard.adverse_impact_metrics || []
  const rejectionsPrevented = dashboard.systemic_rejections_prevented ?? dashboard.systemic_rejection_count ?? 0
  
  // Variance mapping safely checks for nested configuration bounds
  const signalVariance = dashboard.signal_variance_index ?? 0.5
  const diversityDistribution = dashboard.signal_diversity_distribution || {}

  const riskStyle = RISK_STYLES[riskLevel] || RISK_STYLES.low
  const flaggedGroups = adverseImpactMetrics.filter(m => m.flag === 'alert')

  return (
    <div className="bg-bg2 border border-white/[0.07] rounded-xl p-5 mb-5 animate-fade-up text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-white">⚖️ Equity & Monoculture Audit</div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
          style={{ color: riskStyle.color, borderColor: riskStyle.color + '40', background: riskStyle.color + '15' }}>
          {riskStyle.label}
        </span>
      </div>

      {/* Adverse Impact Grid */}
      {equity.adverse_impact_monitoring && adverseImpactMetrics.length > 0 && (
        <>
          <div className="text-[10px] uppercase tracking-[1px] text-faint mb-2">
            Adverse impact ratios — EEOC 4/5ths rule (per Bommasani et al. FAccT '26)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {adverseImpactMetrics.map(m => {
              const s = FLAG_STYLES[m.flag] || FLAG_STYLES.ok
              return (
                <div key={m.group} className={`rounded-lg border p-3 relative ${s.bg}`}>
                  <span className={`absolute top-2 right-2 text-[9px] font-bold ${s.text}`}>{s.badge}</span>
                  <div className="text-[10px] text-faint uppercase tracking-wide mb-1">{m.group}</div>
                  <div className={`text-xl font-bold ${s.text}`}>{m.impact_ratio?.toFixed(2) || '0.00'}</div>
                  <div className="text-[10px] text-muted">ratio (n={m.n || 0})</div>
                  <div className="h-1 bg-bg4 rounded mt-2 overflow-hidden">
                    <div className="h-full rounded transition-all duration-700"
                      style={{ width: `${Math.min(Math.round((m.impact_ratio || 0) * 100), 100)}%`, background: s.bar }} />
                  </div>
                  {m.shortfall > 0 && (
                    <div className="text-[9px] text-red mt-1">{m.shortfall} shortfall</div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Monoculture Risk Meter */}
      {(equity.monoculture_risk_score || monocultureScore > 0) && (
        <div className="flex items-center gap-3 bg-bg3 border border-white/[0.07] rounded-lg p-3 mb-3">
          <div className="text-xl flex-shrink-0">
            {monocultureScore > 55 ? '🔴' : monocultureScore > 30 ? '🟡' : '🟢'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold mb-0.5" style={{ color: riskStyle.color }}>
              Monoculture Risk Score: {monocultureScore}/100
            </div>
            <div className="text-[11px] text-muted leading-relaxed">
              Measures correlated rejection risk across signal sources. Per Bommasani et al.: monoculture
              causes systemic rejection 2.5× above chance for the same individuals.
            </div>
            <div className="h-1 bg-bg4 rounded mt-1.5 overflow-hidden">
              <div className="h-full rounded transition-all duration-700"
                style={{ width: `${monocultureScore}%`, background: riskStyle.color }} />
            </div>
          </div>
          <div className="text-lg font-bold flex-shrink-0" style={{ color: riskStyle.color }}>
            {monocultureScore}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-bg3 border border-white/[0.07] rounded-lg p-2.5 text-center">
          <div className="text-base font-bold" style={{ color: flaggedGroups.length > 0 ? '#ff5c5c' : '#22c98a' }}>
            {flaggedGroups.length}
          </div>
          <div className="text-[10px] text-faint mt-0.5">Adverse flags</div>
        </div>
        <div className="bg-bg3 border border-white/[0.07] rounded-lg p-2.5 text-center">
          <div className="text-base font-bold text-amber">{rejectionsPrevented}</div>
          <div className="text-[10px] text-faint mt-0.5">Systemic risk flags</div>
        </div>
        <div className="bg-bg3 border border-white/[0.07] rounded-lg p-2.5 text-center">
          <div className="text-base font-bold text-accent2">
            {(signalVariance * 100).toFixed(0)}%
          </div>
          <div className="text-[10px] text-faint mt-0.5">Signal Variance Index</div>
        </div>
      </div>

      {/* Summary Description Frame Fallbacks */}
      {dashboard.equity_summary && (
        <div className="text-[11px] text-muted leading-relaxed bg-bg3 border border-white/[0.07] rounded-lg p-3">
          {dashboard.equity_summary}
        </div>
      )}
      <div className="text-[10px] text-faint mt-2 opacity-60">
        📄 Bommasani et al. · Algorithmic Monoculture In Marker Selection Audits (FAccT '26)
      </div>
    </div>
  )
}