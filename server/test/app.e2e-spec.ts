import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/lib/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('/api/jobs (POST)', () => {
    it('should create a new backup job', async () => {
      const newJob = {
        resourceType: 'EBS',
        resourceId: 'vol-test-123',
        schedule: '0 2 * * *',
        enabled: true,
      };

      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .send(newJob)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.resourceType).toBe('EBS');
      expect(response.body.resourceId).toBe('vol-test-123');

      // Cleanup
      await prismaService.backupJob.delete({
        where: { id: response.body.id },
      });
    });

    it('should return 400 for invalid job data', () => {
      return request(app.getHttpServer())
        .post('/api/jobs')
        .send({
          resourceType: 'INVALID',
          resourceId: '',
        })
        .expect(400);
    });
  });

  describe('/api/jobs (GET)', () => {
    it('should return all backup jobs', async () => {
      // Create a test job
      const testJob = await prismaService.backupJob.create({
        data: {
          resourceType: 'EBS',
          resourceId: 'vol-test-456',
          schedule: '0 3 * * *',
          enabled: true,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/jobs')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Cleanup
      await prismaService.backupJob.delete({
        where: { id: testJob.id },
      });
    });
  });

  describe('/api/jobs/:id (GET)', () => {
    it('should return a specific backup job', async () => {
      // Create a test job
      const testJob = await prismaService.backupJob.create({
        data: {
          resourceType: 'RDS',
          resourceId: 'db-test-123',
          schedule: '0 4 * * *',
          enabled: true,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/jobs/${testJob.id}`)
        .expect(200);

      expect(response.body.id).toBe(testJob.id);
      expect(response.body.resourceType).toBe('RDS');

      // Cleanup
      await prismaService.backupJob.delete({
        where: { id: testJob.id },
      });
    });

    it('should return 404 for non-existent job', () => {
      return request(app.getHttpServer())
        .get('/api/jobs/non-existent-id')
        .expect(404);
    });
  });

  describe('/api/jobs/:id (PUT)', () => {
    it('should update a backup job', async () => {
      // Create a test job
      const testJob = await prismaService.backupJob.create({
        data: {
          resourceType: 'S3',
          resourceId: 'bucket-test-123',
          schedule: '0 5 * * *',
          enabled: true,
        },
      });

      const updatedData = {
        schedule: '0 6 * * *',
        enabled: false,
      };

      const response = await request(app.getHttpServer())
        .put(`/api/jobs/${testJob.id}`)
        .send(updatedData)
        .expect(200);

      expect(response.body.schedule).toBe('0 6 * * *');
      expect(response.body.enabled).toBe(false);

      // Cleanup
      await prismaService.backupJob.delete({
        where: { id: testJob.id },
      });
    });
  });

  describe('/api/jobs/:id (DELETE)', () => {
    it('should delete a backup job', async () => {
      // Create a test job
      const testJob = await prismaService.backupJob.create({
        data: {
          resourceType: 'LOCAL',
          resourceId: 'C:\\test-backup',
          schedule: '0 7 * * *',
          enabled: true,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/jobs/${testJob.id}`)
        .expect(200);

      // Verify deletion
      const deletedJob = await prismaService.backupJob.findUnique({
        where: { id: testJob.id },
      });

      expect(deletedJob).toBeNull();
    });
  });

  describe('/api/runs (GET)', () => {
    it('should return all job runs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/runs')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('/api/integrity/results (GET)', () => {
    it('should return all integrity check results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/integrity/results')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
