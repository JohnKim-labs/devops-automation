import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './apiClient.js'

export function useJobsQuery() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.get('/jobs'),
    staleTime: 10_000,
  })
}

export function useCreateJobMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/jobs', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })
}

export function useUpdateJobMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/jobs/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })
}

