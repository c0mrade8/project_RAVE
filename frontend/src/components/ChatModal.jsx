import { useState } from 'react'
import { useStore } from '../store/useStore'
import { chatAboutCandidate } from '../api/client'

const QUICK_QS = [
  'What are the top 3 interview questions?',
  'What are the key hiring risks?',
  'What is their retention risk?',
  'Could this candidate be a systemic rejection risk in ATS?',
  'How diverse are their signal sources?',
  'Compare to industry benchmarks for this role.',
]

export default function ChatModal() {
  const { chatCandidate, closeChatModal, chatHistory, appendChat, chatLoading, setChatLoading, jobDescription } = useStore()
  const [input, setInput] = useState('')

  if (!chatCandidate) return null

  // FIXED: Adjusted to pull the accurate primary backend identifier key path smoothly
  const targetId = chatCandidate.candidate_id || chatCandidate.id

  async function send(q) {
    const question = q || input.trim()
    if (!question || chatLoading) return
    setInput('')
    appendChat({ role: 'user', content: question })
    setChatLoading(true)
    try {
      const res = await chatAboutCandidate({
        candidateId: targetId,
        question,
        jobDescription,
        history: chatHistory,
      })
      appendChat({ role: 'assistant', content: res.answer, sources: res.sources_cited })
    } catch (e) {
      appendChat({ role: 'assistant', content: 'AI service temporarily unavailable. Please try again.', sources: [] })
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 text-white"
      onClick={e => e.target === e.currentTarget && closeChatModal()}>
      <div className="bg-bg2 border border-white/10 rounded-xl p-6 max-w-lg w-[92%] max-h-[80vh] overflow-y-auto shadow-2xl">

        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-bold">Ask AI about {chatCandidate.name}</div>
            <div className="text-xs text-muted mt-0.5">{chatCandidate.current_title} @ {chatCandidate.current_company}</div>
          </div>
          <button onClick={closeChatModal} className="text-muted hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Chat history */}
        <div className="flex flex-col gap-2.5 mb-4">
          {chatHistory.length === 0 && (
            <div className="bg-bg3 border border-white/[0.07] rounded-lg p-3">
              <div className="text-[9px] font-bold text-accent2 mb-1.5 tracking-wider">REDROB AI</div>
              <p className="text-[13px] text-muted leading-relaxed">
                I've analyzed {chatCandidate.name}'s full profile across all 5 signal dimensions,
                including equity flags and monoculture risk. Ask me anything — interview strategy,
                retention risk, ATS risk, or how they compare.
              </p>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`rounded-lg p-3 text-[13px] leading-relaxed
              ${msg.role === 'user'
                ? 'bg-accent/10 border border-accent/15 text-white'
                : 'bg-bg3 border border-white/[0.07] text-muted'}`}>
              {msg.role === 'assistant' && (
                <div className="text-[9px] font-bold text-accent2 mb-1.5 tracking-wider">REDROB AI</div>
              )}
              <p>{msg.content}</p>
              {msg.sources?.length > 0 && (
                <div className="text-[10px] text-faint mt-1.5">📄 {msg.sources.join(', ')}</div>
              )}
            </div>
          ))}
          {chatLoading && (
            <div className="bg-bg3 border border-white/[0.07] rounded-lg p-3">
              <div className="text-[9px] font-bold text-accent2 mb-1.5 tracking-wider">REDROB AI</div>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent2 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 bg-bg3 border border-white/[0.07] rounded-lg text-sm text-white px-3 py-2 outline-none focus:border-accent transition-colors placeholder-faint"
            placeholder="Ask anything about this candidate..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            disabled={chatLoading}
          />
          <button onClick={() => send()} disabled={chatLoading || !input.trim()}
            className="bg-accent hover:bg-accent2 disabled:opacity-40 text-white text-sm font-semibold px-4 rounded-lg transition-colors">
            Ask →
          </button>
        </div>

        {/* Quick questions */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_QS.map(q => (
            <button key={q} onClick={() => send(q)} disabled={chatLoading}
              className="text-[11px] px-2.5 py-1 rounded-full bg-bg3 border border-white/[0.07] text-muted hover:border-accent hover:text-accent2 hover:bg-accent/10 transition-all disabled:opacity-40">
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}