import { Injectable } from '@nestjs/common'
import { EC2Client, CreateSnapshotCommand } from '@aws-sdk/client-ec2'

@Injectable()
export class AwsEbsService {
  private client: EC2Client

  constructor() {
    const region = process.env.AWS_REGION || 'ap-northeast-2'
    this.client = new EC2Client({ region })
  }

  async createSnapshot(volumeId: string, description?: string) {
    const cmd = new CreateSnapshotCommand({
      VolumeId: volumeId,
      Description: description || `DROX snapshot for ${volumeId}`,
      TagSpecifications: [
        {
          ResourceType: 'snapshot',
          Tags: [
            { Key: 'Project', Value: 'DROX' },
            { Key: 'Purpose', Value: 'Backup' },
          ],
        },
      ],
    })
    const res = await this.client.send(cmd)
    return res
  }
}

