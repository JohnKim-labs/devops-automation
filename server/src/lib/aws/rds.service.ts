import { Injectable } from '@nestjs/common'
import { RDSClient, CreateDBSnapshotCommand, DescribeDBSnapshotsCommand } from '@aws-sdk/client-rds'

@Injectable()
export class AwsRdsService {
  private client: RDSClient

  constructor() {
    const region = process.env.AWS_REGION || 'ap-northeast-2'
    this.client = new RDSClient({ region })
  }

  /**
   * RDS 데이터베이스 인스턴스의 스냅샷을 생성합니다.
   * @param dbInstanceIdentifier RDS 인스턴스 ID (예: 'youhak-production')
   * @param snapshotIdentifier 생성할 스냅샷 ID (미제공 시 자동 생성)
   * @returns 생성된 스냅샷 정보
   */
  async createSnapshot(dbInstanceIdentifier: string, snapshotIdentifier?: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const snapshotId = snapshotIdentifier || `drox-${dbInstanceIdentifier}-${timestamp}`

    const cmd = new CreateDBSnapshotCommand({
      DBInstanceIdentifier: dbInstanceIdentifier,
      DBSnapshotIdentifier: snapshotId,
      Tags: [
        { Key: 'Project', Value: 'DROX' },
        { Key: 'Purpose', Value: 'Backup' },
        { Key: 'CreatedBy', Value: 'DevOpsAutomation' },
      ],
    })

    const res = await this.client.send(cmd)
    return {
      snapshotId: res.DBSnapshot?.DBSnapshotIdentifier,
      status: res.DBSnapshot?.Status,
      instanceId: res.DBSnapshot?.DBInstanceIdentifier,
      engine: res.DBSnapshot?.Engine,
      allocatedStorage: res.DBSnapshot?.AllocatedStorage,
      snapshotCreateTime: res.DBSnapshot?.SnapshotCreateTime,
    }
  }

  /**
   * 특정 스냅샷의 상태를 확인합니다.
   * @param snapshotIdentifier 스냅샷 ID
   * @returns 스냅샷 상태 정보
   */
  async getSnapshotStatus(snapshotIdentifier: string) {
    const cmd = new DescribeDBSnapshotsCommand({
      DBSnapshotIdentifier: snapshotIdentifier,
    })

    const res = await this.client.send(cmd)
    const snapshot = res.DBSnapshots?.[0]

    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotIdentifier}`)
    }

    return {
      snapshotId: snapshot.DBSnapshotIdentifier,
      status: snapshot.Status, // available, creating, etc.
      percentProgress: snapshot.PercentProgress,
      snapshotCreateTime: snapshot.SnapshotCreateTime,
      encrypted: snapshot.Encrypted,
    }
  }
}
