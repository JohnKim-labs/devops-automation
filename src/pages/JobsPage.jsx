import React from 'react'
import PropTypes from 'prop-types'
import { useJobsQuery, useCreateJobMutation } from '../data/useJobsQuery.js'
import Button from '../components/ui/button.jsx'

function JobsPage() {
  const { data = [], isLoading, isError } = useJobsQuery()
  const createJob = useCreateJobMutation()

  return (
    <section aria-labelledby="jobs-heading">
      <h2 id="jobs-heading" className="sr-only">잡 관리</h2>

      <div className="flex items-center gap-3 mb-4">
        <Button
          aria-label="예시 잡 생성"
          onClick={() => {
            createJob.mutate({
              resourceType: 'EBS',
              resourceId: 'vol-EXAMPLE',
              schedule: '0 2 * * *',
              status: 'active',
            })
          }}
        >
          예시 잡 생성
        </Button>
      </div>

      {isLoading ? (
        <div role="status">로딩 중…</div>
      ) : isError ? (
        <div role="alert" className="text-red-600">로드 실패</div>
      ) : data.length === 0 ? (
        <div className="rounded-lg border p-4 bg-white text-sm text-muted-foreground">등록된 잡이 없습니다.</div>
      ) : (
        <ul className="space-y-2">
          {data.map((job) => (
            <li key={job.id} className="rounded-lg border p-4 bg-white">
              <div className="text-sm text-muted-foreground">{job.resourceType} • {job.resourceId}</div>
              <div className="mt-1 text-base font-semibold">{job.schedule}</div>
              <div className="mt-1 text-xs">상태: {job.status}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default JobsPage

