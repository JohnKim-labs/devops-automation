/**
 * Mock API responses for testing
 */

export const mockJobs = [
  {
    id: '1',
    resourceType: 'EBS',
    resourceId: 'vol-123456',
    schedule: '0 2 * * *',
    enabled: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    resourceType: 'RDS',
    resourceId: 'db-instance-1',
    schedule: '0 3 * * *',
    enabled: false,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

export const mockRuns = [
  {
    id: 'run-1',
    jobId: '1',
    status: 'success',
    startedAt: '2024-01-01T02:00:00Z',
    endedAt: '2024-01-01T02:05:00Z',
    error: null,
    metrics: {
      snapshotId: 'snap-123',
      status: 'completed',
    },
  },
  {
    id: 'run-2',
    jobId: '1',
    status: 'failed',
    startedAt: '2024-01-02T02:00:00Z',
    endedAt: '2024-01-02T02:01:00Z',
    error: 'Volume not found',
    metrics: null,
  },
];

export const mockIntegrityResults = [
  {
    id: 'check-1',
    jobRunId: 'run-1',
    passed: true,
    details: {
      snapshotId: 'snap-123',
      status: 'completed',
    },
    checkedAt: '2024-01-01T03:00:00Z',
  },
];

export const mockFetch = (url, options) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (url.includes('/api/jobs')) {
        if (options?.method === 'POST') {
          resolve({
            ok: true,
            json: async () => ({ id: '3', ...JSON.parse(options.body) }),
          });
        } else {
          resolve({
            ok: true,
            json: async () => mockJobs,
          });
        }
      } else if (url.includes('/api/runs')) {
        resolve({
          ok: true,
          json: async () => mockRuns,
        });
      } else if (url.includes('/api/integrity/results')) {
        resolve({
          ok: true,
          json: async () => mockIntegrityResults,
        });
      } else {
        resolve({
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        });
      }
    }, 100);
  });
};
