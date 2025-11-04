import { Test, TestingModule } from '@nestjs/testing';
import { IntegrityService } from './integrity.service';
import { PrismaService } from '../../lib/prisma.service';
import { EBSService } from '../../lib/aws/ebs.service';
import { RDSService } from '../../lib/aws/rds.service';
import { S3Service } from '../../lib/aws/s3.service';
import { LocalBackupService } from '../../lib/local-backup.service';
import { CloudWatchService } from '../../lib/cloudwatch.service';

describe('IntegrityService', () => {
  let service: IntegrityService;
  let prismaService: PrismaService;
  let ebsService: EBSService;
  let rdsService: RDSService;
  let s3Service: S3Service;
  let localBackupService: LocalBackupService;

  const mockPrismaService = {
    jobRun: {
      findUnique: jest.fn(),
    },
    backupJob: {
      findUnique: jest.fn(),
    },
    integrityCheck: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockEBSService = {
    describeSnapshot: jest.fn(),
  };

  const mockRDSService = {
    describeSnapshot: jest.fn(),
  };

  const mockS3Service = {
    getObjectCount: jest.fn(),
  };

  const mockLocalBackupService = {
    verifyBackup: jest.fn(),
  };

  const mockCloudWatchService = {
    putIntegrityMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrityService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EBSService, useValue: mockEBSService },
        { provide: RDSService, useValue: mockRDSService },
        { provide: S3Service, useValue: mockS3Service },
        { provide: LocalBackupService, useValue: mockLocalBackupService },
        { provide: CloudWatchService, useValue: mockCloudWatchService },
      ],
    }).compile();

    service = module.get<IntegrityService>(IntegrityService);
    prismaService = module.get<PrismaService>(PrismaService);
    ebsService = module.get<EBSService>(EBSService);
    rdsService = module.get<RDSService>(RDSService);
    s3Service = module.get<S3Service>(S3Service);
    localBackupService = module.get<LocalBackupService>(LocalBackupService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkIntegrity', () => {
    it('should verify EBS snapshot integrity successfully', async () => {
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
        status: 'success',
        startedAt: new Date(),
        endedAt: new Date(),
        error: null,
        metrics: {
          snapshotId: 'snap-123',
          status: 'completed',
        },
        job: mockJob,
      };

      const mockSnapshotInfo = {
        snapshotId: 'snap-123',
        status: 'completed',
        progress: '100%',
        volumeSize: 100,
      };

      const mockIntegrityCheck = {
        id: 'check-1',
        jobRunId: 'run-1',
        passed: true,
        details: mockSnapshotInfo,
        checkedAt: new Date(),
      };

      mockPrismaService.jobRun.findUnique.mockResolvedValue(mockJobRun);
      mockEBSService.describeSnapshot.mockResolvedValue(mockSnapshotInfo);
      mockPrismaService.integrityCheck.create.mockResolvedValue(mockIntegrityCheck);

      const result = await service.checkIntegrity('run-1');

      expect(result.passed).toBe(true);
      expect(mockEBSService.describeSnapshot).toHaveBeenCalledWith('snap-123');
      expect(mockCloudWatchService.putIntegrityMetrics).toHaveBeenCalledWith(
        'job-1',
        'EBS',
        100
      );
    });

    it('should fail EBS integrity check if snapshot is not completed', async () => {
      const mockJob = {
        id: 'job-2',
        resourceType: 'EBS',
        resourceId: 'vol-456',
        schedule: '0 2 * * *',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockJobRun = {
        id: 'run-2',
        jobId: 'job-2',
        status: 'success',
        startedAt: new Date(),
        endedAt: new Date(),
        error: null,
        metrics: {
          snapshotId: 'snap-456',
          status: 'pending',
        },
        job: mockJob,
      };

      const mockSnapshotInfo = {
        snapshotId: 'snap-456',
        status: 'pending',
        progress: '50%',
        volumeSize: 100,
      };

      const mockIntegrityCheck = {
        id: 'check-2',
        jobRunId: 'run-2',
        passed: false,
        details: mockSnapshotInfo,
        checkedAt: new Date(),
      };

      mockPrismaService.jobRun.findUnique.mockResolvedValue(mockJobRun);
      mockEBSService.describeSnapshot.mockResolvedValue(mockSnapshotInfo);
      mockPrismaService.integrityCheck.create.mockResolvedValue(mockIntegrityCheck);

      const result = await service.checkIntegrity('run-2');

      expect(result.passed).toBe(false);
      expect(mockCloudWatchService.putIntegrityMetrics).toHaveBeenCalledWith(
        'job-2',
        'EBS',
        0
      );
    });

    it('should verify RDS snapshot integrity', async () => {
      const mockJob = {
        id: 'job-3',
        resourceType: 'RDS',
        resourceId: 'db-1',
        schedule: '0 3 * * *',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockJobRun = {
        id: 'run-3',
        jobId: 'job-3',
        status: 'success',
        startedAt: new Date(),
        endedAt: new Date(),
        error: null,
        metrics: {
          snapshotId: 'rds-snap-123',
          status: 'available',
        },
        job: mockJob,
      };

      const mockSnapshotInfo = {
        snapshotId: 'rds-snap-123',
        status: 'available',
        encrypted: true,
      };

      const mockIntegrityCheck = {
        id: 'check-3',
        jobRunId: 'run-3',
        passed: true,
        details: mockSnapshotInfo,
        checkedAt: new Date(),
      };

      mockPrismaService.jobRun.findUnique.mockResolvedValue(mockJobRun);
      mockRDSService.describeSnapshot.mockResolvedValue(mockSnapshotInfo);
      mockPrismaService.integrityCheck.create.mockResolvedValue(mockIntegrityCheck);

      const result = await service.checkIntegrity('run-3');

      expect(result.passed).toBe(true);
      expect(mockRDSService.describeSnapshot).toHaveBeenCalledWith('rds-snap-123');
    });

    it('should verify LOCAL backup integrity', async () => {
      const mockJob = {
        id: 'job-4',
        resourceType: 'LOCAL',
        resourceId: 'C:\\backup',
        schedule: '0 4 * * *',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockJobRun = {
        id: 'run-4',
        jobId: 'job-4',
        status: 'success',
        startedAt: new Date(),
        endedAt: new Date(),
        error: null,
        metrics: {
          totalFiles: 1000,
          copiedFiles: 1000,
          totalBytes: 1024000000,
          copiedBytes: 1024000000,
        },
        job: mockJob,
      };

      const mockIntegrityCheck = {
        id: 'check-4',
        jobRunId: 'run-4',
        passed: true,
        details: {
          totalFiles: 1000,
          copiedFiles: 1000,
          successRate: 100,
        },
        checkedAt: new Date(),
      };

      mockPrismaService.jobRun.findUnique.mockResolvedValue(mockJobRun);
      mockPrismaService.integrityCheck.create.mockResolvedValue(mockIntegrityCheck);

      const result = await service.checkIntegrity('run-4');

      expect(result.passed).toBe(true);
    });

    it('should fail LOCAL backup integrity if success rate is below threshold', async () => {
      const mockJob = {
        id: 'job-5',
        resourceType: 'LOCAL',
        resourceId: 'C:\\backup',
        schedule: '0 4 * * *',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockJobRun = {
        id: 'run-5',
        jobId: 'job-5',
        status: 'success',
        startedAt: new Date(),
        endedAt: new Date(),
        error: null,
        metrics: {
          totalFiles: 1000,
          copiedFiles: 800,
          totalBytes: 1024000000,
          copiedBytes: 819200000,
        },
        job: mockJob,
      };

      const mockIntegrityCheck = {
        id: 'check-5',
        jobRunId: 'run-5',
        passed: false,
        details: {
          totalFiles: 1000,
          copiedFiles: 800,
          successRate: 80,
        },
        checkedAt: new Date(),
      };

      mockPrismaService.jobRun.findUnique.mockResolvedValue(mockJobRun);
      mockPrismaService.integrityCheck.create.mockResolvedValue(mockIntegrityCheck);

      const result = await service.checkIntegrity('run-5');

      expect(result.passed).toBe(false);
    });

    it('should throw error if job run not found', async () => {
      mockPrismaService.jobRun.findUnique.mockResolvedValue(null);

      await expect(service.checkIntegrity('non-existent')).rejects.toThrow(
        'Job run not found'
      );
    });
  });

  describe('getAllResults', () => {
    it('should return all integrity check results', async () => {
      const mockResults = [
        {
          id: 'check-1',
          jobRunId: 'run-1',
          passed: true,
          details: {},
          checkedAt: new Date(),
          jobRun: {
            id: 'run-1',
            jobId: 'job-1',
            status: 'success',
            startedAt: new Date(),
            endedAt: new Date(),
            error: null,
            metrics: {},
          },
        },
      ];

      mockPrismaService.integrityCheck.findMany.mockResolvedValue(mockResults);

      const result = await service.getAllResults();

      expect(result).toEqual(mockResults);
      expect(mockPrismaService.integrityCheck.findMany).toHaveBeenCalledWith({
        include: { jobRun: true },
        orderBy: { checkedAt: 'desc' },
      });
    });
  });
});
