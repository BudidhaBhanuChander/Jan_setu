import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const grievanceAPI = {
  submit: (data) => api.post('/grievances/', data).then(r => r.data),
  list: (params) => api.get('/grievances/', { params }).then(r => r.data),
  search: (params) => api.get('/grievances/search', { params }).then(r => r.data),
  get: (id) => api.get(`/grievances/${id}`).then(r => r.data),
  updateStatus: (id, data) => api.patch(`/grievances/${id}/status`, data).then(r => r.data),
  submitFeedback: (id, score, comment) =>
    api.post(`/grievances/${id}/feedback`, { csat_score: score, comment }).then(r => r.data),
  getSLA: (id) => api.get(`/grievances/${id}/sla`).then(r => r.data),
  runSLACheck: () => api.post('/grievances/sla/check-all').then(r => r.data),
}

export const analyticsAPI = {
  overview: () => api.get('/analytics/overview').then(r => r.data),
  byCategory: () => api.get('/analytics/by-category').then(r => r.data),
  bySeverity: () => api.get('/analytics/by-severity').then(r => r.data),
  byStatus: () => api.get('/analytics/by-status').then(r => r.data),
  byWard: () => api.get('/analytics/by-ward').then(r => r.data),
  byDepartment: () => api.get('/analytics/by-department').then(r => r.data),
  officerPerformance: () => api.get('/analytics/officer-performance').then(r => r.data),
  publicStats: () => api.get('/analytics/public-stats').then(r => r.data),
  trend: (days) => api.get('/analytics/trend', { params: { days } }).then(r => r.data),
  agentLogs: (params) => api.get('/analytics/agent-logs', { params }).then(r => r.data),
  // Absolute URL so the browser can open/download the CSV directly.
  exportCsvUrl: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return `/api/analytics/export.csv${qs ? `?${qs}` : ''}`
  },
}

export const officerAPI = {
  list: (params) => api.get('/officers/', { params }).then(r => r.data),
}

export const departmentAPI = {
  list: () => api.get('/departments/').then(r => r.data),
}

export const adminAPI = {
  config: () => api.get('/admin/config').then(r => r.data),
  reset: () => api.post('/admin/reset').then(r => r.data),
  runSLANow: () => api.post('/admin/sla/run-now').then(r => r.data),
}
