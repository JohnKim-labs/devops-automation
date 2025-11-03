import React from 'react'
import PropTypes from 'prop-types'
import Button from '../components/ui/button.jsx'
import { useRunsQuery, summarizeRuns } from '../data/useRunsQuery.js'

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border p-4 bg-white">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  )
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}

function DashboardPage() {
  const { data: runs = [], isLoading, isError, refetch } = useRunsQuery()

  if (isLoading) {
    return <div role="status" aria-live="polite">로딩 중…</div>
  }
  if (isError) {
    return <div role="alert" className="text-red-600">데이터 로드 실패</div>
  }

  const summary = summarizeRuns(runs)

  return (
    <section aria-labelledby="dashboard-heading">
      <h2 id="dashboard-heading" className="sr-only">대시보드</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="7일 성공률" value={`${summary.successRate}%`} />
        <StatCard label="7일 실행 건수" value={summary.runs7d} />
        <StatCard label="평균 시간" value={`${Math.round(summary.avgDurationMs / 1000)}s`} />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button aria-label="새로고침" onClick={() => refetch()}>새로고침</Button>
      </div>

      {runs.length === 0 ? (
        <div className="mt-6 rounded-lg border bg-white">
          <div className="p-4 text-sm text-muted-foreground">최근 실행 기록이 없습니다.</div>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-muted/50">
                <th className="px-4 py-2">시작</th>
                <th className="px-4 py-2">종료</th>
                <th className="px-4 py-2">상태</th>
                <th className="px-4 py-2">스냅샷ID</th>
                <th className="px-4 py-2">에러</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {runs.map((r) => {
                const metrics = r.metrics || {}
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{new Date(r.startedAt).toLocaleString()}</td>
                    <td className="px-4 py-2">{r.endedAt ? new Date(r.endedAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-2">{r.status}</td>
                    <td className="px-4 py-2">{metrics.snapshotId || '-'}</td>
                    <td className="px-4 py-2">{r.error || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default DashboardPage

