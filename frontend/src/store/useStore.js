import { create } from 'zustand'
import { rankCandidates, getTaskStatus } from '../api/client'

export const useStore = create((set, get) => ({
  // Core Interface Parameters
  jobDescription: '',
  weights: {
    semantic_fit: 50,
    career_trajectory: 50,
    behavioral_signals: 50,
    cultural_alignment: 50,
    growth_potential: 50,
  },
  equity: {
    adverse_impact_monitoring: true,
    monoculture_risk_score: true,
    systemic_rejection_detection: true,
    signal_diversity_enforcement: true,
  },

  // Worker Handshake States
  taskState: 'IDLE', // IDLE, PROCESSING, SUCCESS, FAILURE
  taskMessage: '',
  candidates: [],
  equityDashboard: null,
  jdIntelligence: null,
  error: null,

  // Conversational Assistant Co-pilot States
  chatCandidate: null,
  chatHistory: [],
  chatLoading: false,

  // State Updaters
  setJobDescription: (jd) => set({ jobDescription: jd }),
  setWeight: (key, val) => set((state) => ({ weights: { ...state.weights, [key]: parseInt(val) || 0 } })),
  setEquity: (key, checked) => set((state) => ({ equity: { ...state.equity, [key]: checked } })),
  setExpandedId: (id) => set((state) => ({ expandedId: state.expandedId === id ? null : id })),
  
  setChatCandidate: (candidate) => set({ chatCandidate: candidate, chatHistory: [], chatLoading: false }),
  closeChatModal: () => set({ chatCandidate: null, chatHistory: [] }),
  appendChat: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
  setChatLoading: (loading) => set({ chatLoading: loading }),

  // FIXED: Gathers parameters directly from store state using get() to solve the missing payload bug
  startDiscoveryPipeline: async () => {
    const { jobDescription, weights, equity } = get()
    
    set({ taskState: 'PROCESSING', taskMessage: 'Submitting pipeline task to background worker...', error: null, candidates: [] })
    
    try {
      // Fire ranking handshake sequence
      const session = await rankCandidates({ jobDescription, weights, equity })
      
      if (session?.task_id) {
        set({ taskMessage: 'Task accepted. Initializing evaluation loops...' })
        // Step straight into recursive tracking loop
        get().pollPipelineStatus(session.task_id)
      } else {
        set({ taskState: 'FAILURE', error: 'Pipeline failed to issue a unique worker tracking identity handles.' })
      }
    } catch (e) {
      set({ 
        taskState: 'FAILURE', 
        error: e?.response?.data?.detail || e.message || 'Failed to initialize discovery pipeline.' 
      })
    }
  },

  // Recursive pipeline listener mechanism
  pollPipelineStatus: async (taskId) => {
    try {
      const update = await getTaskStatus(taskId)
      
      if (update.state === 'SUCCESS' && update.data) {
        set({
          taskState: 'SUCCESS',
          taskMessage: 'Evaluation processing finalized cleanly.',
          candidates: update.data.candidates || [],
          equityDashboard: update.data.equity_dashboard || null,
          jdIntelligence: update.data.jd_intelligence || null
        })
      } else if (update.state === 'FAILURE' || update.state === 'REVOKED') {
        set({ taskState: 'FAILURE', error: update.status || 'Background worker process crashed during data pass splits.' })
      } else {
        // Still processing! Keep polling every 1.5 seconds
        set({ taskMessage: update.status || 'Analyzing profiles across candidate pool dimensions...' })
        setTimeout(() => get().pollPipelineStatus(taskId), 1500)
      }
    } catch (e) {
      set({ taskState: 'FAILURE', error: 'Lost pipeline tracking connection handshake loop.' })
    }
  }
}))