import axios from 'axios'

const BASE = '/';
const api = axios.create({ baseURL: BASE, timeout: 60000 })

// 1. Fire off the job description to get a Celery task_id
export async function rankCandidates({ jobDescription, weights, equity }) {
  const { data } = await api.post('/api/rank', {
    job_description: jobDescription,
    weights,
    equity_guardrails: equity,
  })
  return data // Returns { task_id, status, message }
}

// FIXED: Added missing tracking handshake function to poll background execution frames
export async function getTaskStatus(taskId) {
  const { data } = await api.get(`/api/status/${taskId}`)
  return data // Returns { state, data: { candidates, equity_dashboard, jd_intelligence }, status }
}

// 2. Real-time candidate conversational assistant context route
export async function chatAboutCandidate({ candidateId, question, jobDescription, history }) {
  const { data } = await api.post('/api/chat', {
    candidate_id: candidateId,
    question,
    job_description: jobDescription,
    conversation_history: history,
  })
  return data // Returns ChatResponse
}

// 3. Health check baseline verification endpoint
export async function healthCheck() {
  const { data } = await api.get('/health')
  return data
}