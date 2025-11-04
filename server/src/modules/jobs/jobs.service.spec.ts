import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../../lib/prisma.service';
import { EBSService } from '../../lib/aws/ebs.service';
import { RDSService } from '../../lib/aws/rds.service';
import { S3Service } from '../../lib/aws/s3.service';
import { LocalBackupService } from '../../lib/local-backup.service';
import { CloudWatchService } from '../../lib/cloudwatch.service';
import { SlackService } from '../../lib/slack.service';
import { NotionService } from '../../lib/notion.service';

describe('JobsService', () => {
  let service: JobsService;
  let prismaService: PrismaService;
  let ebsService: EBSService;
  let rdsService: RDSService;
  let s3Service: S3Service;
  let localBackupService: LocalBackupService;

  const mockPrismaService = {
    backupJob: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    jobRun: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockEBSService = {
    createSnapshot: jest.fn(),
  };

  const mockRDSService = {
    createSnapshot: jest.fn(),
  };

  const mockS3Service = {
    syncBucket: jest.fn(),
  };

  const mockLocalBackupService = {
    backupDirectory: jest.fn(),
  };

  const mockCloudWatchService = {
    putBackupMetrics: jest.fn(),
  };

  const mockSlackService = {
    notifyBackupSuccess: jest.fn(),
    notifyBackupFailure: jest.fn(),
  };

  const mockNotionService = {
    logJobRun: jest.fn(),
    isConfigured: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EBSService, useValue: mockEBSService },
        { provide: RDSService, useValue: mockRDSService },
        { provide: S3Service, useValue: mockS3Service },
        { provide: LocalBackupService, useValue: mockLocalBackupService },
        { provide: CloudWatchService, useValue: mockCloudWatchService },
        { provide: SlackService, useValue: mockSlackService },
        { provide: NotionService, useValue: mockNotionService },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    prismaService = module.get<PrismaService>(PrismaService);
    ebsService = module.get<EBSService>(EBSService);
    rdsService = module.get<RDSService>(RDSService);
    s3Service = module.get<S3Service>(S3Service);
    localBackupService = module.get<LocalBackupService>(LocalBackupService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllJobs', () => {
    it('should return all backup jobs', async () => {
      const mockJobs = [
        {
          id: '1',
          resourceType: 'EBS',
          resourceId: 'vol-123',
          schedule: '0 2 * * *',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.backupJob.findMany.mockResolvedValue(mockJobs);

      const result = await service.getAllJobs();

      expect(result).toEqual(mockJobs);
      expect(mockPrismaService.backupJob.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createJob', () => {
    it('should create a new EBS backup job', async () => {
      const dto = {
        resourceType: 'EBS' as const,
        resourceId: 'vol-123',
        schedule: '0 2 * * *',
        enabled: true,
      };

      const mockCreatedJob = {
        id: '1',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.backupJob.create.mockResolvedValue(mockCreatedJob);

      const result = await service.createJob(dto);

      expect(result).toEqual(mockCreatedJob);
      expect(mockPrismaService.backupJob.create).toHaveBeenCalledWith({
        data: dto,
      });
    });
  });

  describe('executeJob', () => {
    it('should execute an EBS backup job successfully', async () => {
      const mockJob = {
        id: 'job-1',
        resourceType: 'EBS',
        resourceId: 'vol-123',
        schedule: '0 2 * * *',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockJobRun = {
        id: 'run-1',
        jobId: 'job-1',
        status: 'running',
        startedAt: new Date(),
        endedAt: null,
        error: null,
        metrics: null,
      };

      const mockSnapshotResult = {
        snapshotId: 'snap-123',
        status: 'pending',
      };

      mockPrismaService.backupJob.findUnique.mockResolvedValue(mockJob);
      mockPrismaService.jobRun.create.mockResolvedValue(mockJobRun);
      mockEBSService.createSnapshot.mockResolvedValue(mockSnapshotResult);
      mockPrismaService.jobRun.update.mockResolvedValue({
        ...mockJobRun,
        status: 'success',
        endedAt: new Date(),
        metrics: mockSnapshotResult,
      });

      const result = await service.executeJob('job-1');

      expect(result.status).toBe('success');
      expect(mockEBSService.createSnapshot).toHaveBeenCalledWith('vol-123');
      expect(mockCloudWatchService.putBackupMetrics).toHaveBeenCalled();
      expect(mockNotionService.logJobRun).toHaveBeenCalled();
    });

    it('should handle RDS backup job', async () => {
      const mockJob = {
        id: 'job-2',
        resourceType: 'RDS',
        resourceId: 'db-instance-1',
        schedule: '0 3 * * *',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockJobRun = {
        id: 'run-2',
        jobId: 'job-2',
        status: 'running',
        startedAt: new Date(),
        endedAt: null,
        error: null,
        metrics: null,
      };

      const mockSnapshotResult = {
        snapshotId: 'rds-snap-123',
        status: 'creating',
      };

      mockPrismaService.backupJob.findUnique.mockResolvedValue(mockJob);
      mockPrismaService.jobRun.create.mockResolvedValue(mockJobRun);
      mockRDSService.createSnapshot.mockResolvedValue(mockSnapshotResult);
      mockPrismaService.jobRun.update.mockResolvedValue({
        ...mockJobRun,
        status: 'success',
        endedAt: new Date(),
        metrics: mockSnapshotResult,
      });

      const result = await service.executeJob('job-2');

      expect(result.status).toBe('success');
      expect(mockRDSService.createSnapshot).toHaveBeenCalledWith('db-instance-1');
    });

    it('should handle backup failure', async () => {
      const mockJob = {
        id: 'job-3',
        resourceType: 'EBS',
        resourceId: 'vol-invalid',
        schedule: '0 2 * * *',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockJobRun = {
        id: 'run-3',
        jobId: 'job-3',
        status: 'running',
        startedAt: new Date(),
        endedAt: null,
        error: null,
        metrics: null,
      };

      const error = new Error('Volume not found');

      mockPrismaService.backupJob.findUnique.mockResolvedValue(mockJob);
      mockPrismaService.jobRun.create.mockResolvedValue(mockJobRun);
      mockEBSService.createSnapshot.mockRejectedValue(error);
      mockPrismaService.jobRun.update.mockResolvedValue({
        ...mockJobRun,
        status: 'failed',
        endedAt: new Date(),
        error: error.message,
      });

      const result = await service.executeJob('job-3');

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Volume not found');
      expect(mockSlackService.notifyBackupFailure).toHaveBeenCalled();
    });

    it('should throw error if job not found', async () => {
      mockPrismaService.backupJob.findUnique.mockResolvedValue(null);

      await expect(service.executeJob('non-existent')).rejects.toThrow(
        'Job not found'
      );
    });
  });

  describe('deleteJob', () => {
    it('should delete a backup job', async () => {
      const mockJob = {
        id: '1',
        resourceType: 'EBS',
        resourceId: 'vol-123',
        schedule: '0 2 * * *',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.backupJob.delete.mockResolvedValue(mockJob);

      const result = await service.deleteJob('1');

      expect(result).toEqual(mockJob);
      expect(mockPrismaService.backupJob.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });
});
