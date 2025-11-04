import { Injectable } from '@nestjs/common'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs/promises'

const execAsync = promisify(exec)

@Injectable()
export class LocalBackupService {
  /**
   * 로컬 디렉토리를 외장 HDD로 백업합니다 (Windows PowerShell robocopy 사용).
   * @param sourcePath 소스 디렉토리 경로 (예: 'D:/Projects/youhak')
   * @param targetPath 타겟 디렉토리 경로 (예: 'E:/Backups/youhak')
   * @param logPath 로그 파일 경로 (선택사항)
   * @returns 백업 결과
   */
  async backupDirectory(sourcePath: string, targetPath: string, logPath?: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const defaultLogPath = logPath || path.join(targetPath, `backup-log-${timestamp}.txt`)

    // robocopy 옵션:
    // /MIR: 미러링 (소스와 동일하게 동기화, 삭제된 파일도 반영)
    // /R:3: 실패 시 3회 재시도
    // /W:5: 재시도 간 5초 대기
    // /LOG: 로그 파일 생성
    // /NP: 진행률 표시 안 함 (로그 간결화)
    // /NDL: 디렉토리 목록 표시 안 함
    const command = `robocopy "${sourcePath}" "${targetPath}" /MIR /R:3 /W:5 /LOG:"${defaultLogPath}" /NP /NDL`

    try {
      const { stdout, stderr } = await execAsync(command, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB 버퍼
      })

      // robocopy 종료 코드:
      // 0-7: 성공 (0=변경없음, 1=복사됨, 2=추가파일, 4=불일치, 8=실패)
      // robocopy는 성공해도 exit code가 0이 아닐 수 있어 stderr로 판단

      const logContent = await this.readLogFile(defaultLogPath)
      const stats = this.parseRobocopyLog(logContent)

      return {
        success: true,
        logPath: defaultLogPath,
        stats,
        stdout: stdout.slice(0, 500), // 로그 일부만 저장
      }
    } catch (err: any) {
      // robocopy exit code 8 이상은 에러
      if (err?.code && err.code >= 8) {
        throw new Error(`Backup failed with exit code ${err.code}: ${err?.message || err}`)
      }

      // exit code 1-7은 성공으로 간주
      const logContent = await this.readLogFile(defaultLogPath)
      const stats = this.parseRobocopyLog(logContent)

      return {
        success: true,
        logPath: defaultLogPath,
        stats,
        stdout: err?.stdout?.slice(0, 500) || '',
      }
    }
  }

  /**
   * 로그 파일을 읽습니다.
   * @param logPath 로그 파일 경로
   * @returns 로그 내용
   */
  private async readLogFile(logPath: string): Promise<string> {
    try {
      return await fs.readFile(logPath, 'utf-8')
    } catch (err) {
      return ''
    }
  }

  /**
   * robocopy 로그를 파싱하여 통계를 추출합니다.
   * @param logContent 로그 내용
   * @returns 백업 통계
   */
  private parseRobocopyLog(logContent: string) {
    const stats = {
      totalDirs: 0,
      copiedDirs: 0,
      totalFiles: 0,
      copiedFiles: 0,
      totalBytes: 0,
      copiedBytes: 0,
    }

    // robocopy 로그에서 "Dirs :" 줄 파싱
    const dirsMatch = logContent.match(/Dirs\s*:\s*(\d+)\s+(\d+)/)
    if (dirsMatch) {
      stats.totalDirs = parseInt(dirsMatch[1], 10)
      stats.copiedDirs = parseInt(dirsMatch[2], 10)
    }

    // "Files :" 줄 파싱
    const filesMatch = logContent.match(/Files\s*:\s*(\d+)\s+(\d+)/)
    if (filesMatch) {
      stats.totalFiles = parseInt(filesMatch[1], 10)
      stats.copiedFiles = parseInt(filesMatch[2], 10)
    }

    // "Bytes :" 줄 파싱
    const bytesMatch = logContent.match(/Bytes\s*:\s*([\d.]+\s*[kmg]?)\s+([\d.]+\s*[kmg]?)/)
    if (bytesMatch) {
      stats.totalBytes = this.parseSize(bytesMatch[1])
      stats.copiedBytes = this.parseSize(bytesMatch[2])
    }

    return stats
  }

  /**
   * 크기 문자열을 바이트로 변환합니다.
   * @param sizeStr 크기 문자열 (예: "1.5 g", "250 m")
   * @returns 바이트 단위 숫자
   */
  private parseSize(sizeStr: string): number {
    const match = sizeStr.trim().match(/([\d.]+)\s*([kmg])?/i)
    if (!match) return 0

    const value = parseFloat(match[1])
    const unit = (match[2] || '').toLowerCase()

    const multipliers: Record<string, number> = {
      '': 1,
      k: 1024,
      m: 1024 * 1024,
      g: 1024 * 1024 * 1024,
    }

    return value * (multipliers[unit] || 1)
  }

  /**
   * 백업 대상 경로의 존재 여부를 확인합니다.
   * @param dirPath 디렉토리 경로
   * @returns 존재 여부
   */
  async checkPathExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath)
      return stat.isDirectory()
    } catch {
      return false
    }
  }
}
