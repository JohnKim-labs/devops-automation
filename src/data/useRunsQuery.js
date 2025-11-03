import { useQuery } from '@tanstack/react-query'
import api from './apiClient.js'

export function useRunsQuery(jobId) {
  return useQuery({
    queryKey: ['job-runs', jobId || 'all'],
    queryFn: () => api.get(jobId ? `/job-runs?jobId=${encodeURIComponent(jobId)}` : '/job-runs'),
    staleTime: 10_000,
  })
}

export function summarizeRuns(runs) {
  if (!Array.isArray(runs) || runs.length === 0) return { successRate: 0, runs7d: 0, avgDurationMs: 0 }
  const now = Date.now()
  const last7d = runs.filter(r => now - new Date(r.startedAt).getTime() <= 7 * 24 * 60 * 60 * 1000)
  const success = last7d.filter(r => r.status === 'success').length
  const duration = last7d.map(r => (r.endedAt ? new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime() : 0))
  const avg = duration.length ? Math.round(duration.reduce((a, b) => a + b, 0) / duration.length) : 0
  return {
    successRate: last7d.length ? Math.round((success / last7d.length) * 100) : 0,
    runs7d: last7d.length,
    avgDurationMs: avg,
  }
}

