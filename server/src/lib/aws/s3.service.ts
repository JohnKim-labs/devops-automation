import { Injectable } from '@nestjs/common'
import { S3Client, CopyObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3'

@Injectable()
export class AwsS3Service {
  private client: S3Client

  constructor() {
    const region = process.env.AWS_REGION || 'ap-northeast-2'
    this.client = new S3Client({ region })
  }

  /**
   * S3 버킷의 특정 프리픽스를 다른 버킷/프리픽스로 동기화합니다.
   * 주의: 대용량 버킷의 경우 시간이 오래 걸릴 수 있습니다.
   * @param sourceBucket 소스 버킷 이름
   * @param sourcePrefix 소스 프리픽스 (예: 'uploads/')
   * @param targetBucket 타겟 버킷 이름
   * @param targetPrefix 타겟 프리픽스 (예: 'backups/2024-01-01/')
   * @returns 복사된 객체 정보
   */
  async syncBucket(
    sourceBucket: string,
    sourcePrefix: string = '',
    targetBucket: string,
    targetPrefix: string = ''
  ) {
    const objects = await this.listObjects(sourceBucket, sourcePrefix)
    const copiedObjects = []
    const errors = []

    for (const obj of objects) {
      try {
        const sourceKey = obj.Key!
        const targetKey = sourceKey.replace(sourcePrefix, targetPrefix)

        await this.copyObject(sourceBucket, sourceKey, targetBucket, targetKey)
        copiedObjects.push({ sourceKey, targetKey, size: obj.Size })
      } catch (err: any) {
        errors.push({ key: obj.Key, error: err?.message || String(err) })
      }
    }

    return {
      totalObjects: objects.length,
      copiedCount: copiedObjects.length,
      errorCount: errors.length,
      copiedObjects,
      errors,
    }
  }

  /**
   * S3 버킷의 객체 목록을 조회합니다.
   * @param bucket 버킷 이름
   * @param prefix 프리픽스 필터
   * @returns 객체 목록
   */
  private async listObjects(bucket: string, prefix: string = '') {
    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 1000, // 최대 1000개 (대용량 버킷은 페이지네이션 필요)
    })

    const res = await this.client.send(cmd)
    return res.Contents || []
  }

  /**
   * S3 객체를 복사합니다.
   * @param sourceBucket 소스 버킷
   * @param sourceKey 소스 키
   * @param targetBucket 타겟 버킷
   * @param targetKey 타겟 키
   */
  private async copyObject(
    sourceBucket: string,
    sourceKey: string,
    targetBucket: string,
    targetKey: string
  ) {
    const cmd = new CopyObjectCommand({
      CopySource: `${sourceBucket}/${sourceKey}`,
      Bucket: targetBucket,
      Key: targetKey,
      TaggingDirective: 'COPY',
      MetadataDirective: 'COPY',
    })

    await this.client.send(cmd)
  }

  /**
   * S3 객체의 메타데이터를 확인합니다.
   * @param bucket 버킷 이름
   * @param key 객체 키
   * @returns 객체 메타데이터
   */
  async getObjectMetadata(bucket: string, key: string) {
    const cmd = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    const res = await this.client.send(cmd)
    return {
      contentLength: res.ContentLength,
      etag: res.ETag,
      lastModified: res.LastModified,
      contentType: res.ContentType,
    }
  }
}
