import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';

describe('RecruitmentController', () => {
  let app: INestApplication;
  const recruitmentService = {
    generateJobOffer: jest.fn().mockResolvedValue({
      title: 'Backend Engineer',
      description: 'Build backend services.',
      responsibilities: ['Design APIs'],
      requiredSkills: ['JavaScript'],
      niceToHave: ['TypeScript'],
      seniorityLevel: 'mid',
    }),
    chat: jest.fn().mockResolvedValue({
      sessionId: 's1',
      currentStep: 'skills',
      nextQuestion: 'What skills are required?',
      isComplete: false,
      collectedData: { title: 'Backend Engineer' },
    }),
    generateLinkedInPostFromJobOfferId: jest
      .fn()
      .mockResolvedValue('LinkedIn-ready job post text'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecruitmentController],
      providers: [
        {
          provide: RecruitmentService,
          useValue: recruitmentService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('accepts prompt and returns generated job offer', async () => {
    const response = await request(app.getHttpServer())
      .post('/recruitment/generate')
      .send({ prompt: 'test prompt' })
      .expect(201);

    expect(recruitmentService.generateJobOffer).toHaveBeenCalledWith('test prompt');
    expect(response.body).toMatchObject({
      title: 'Backend Engineer',
      seniorityLevel: 'mid',
    });
  });

  it('returns 400 when prompt is empty', async () => {
    await request(app.getHttpServer())
      .post('/recruitment/generate')
      .send({ prompt: '' })
      .expect(400);

    expect(recruitmentService.generateJobOffer).not.toHaveBeenCalled();
  });

  it('accepts chat message and returns next question', async () => {
    const response = await request(app.getHttpServer())
      .post('/recruitment/chat')
      .send({ sessionId: 'session-1', message: 'Backend Engineer' })
      .expect(201);

    expect(recruitmentService.chat).toHaveBeenCalledWith('session-1', 'Backend Engineer');
    expect(response.body).toMatchObject({
      isComplete: false,
      nextQuestion: 'What skills are required?',
    });
  });

  it('returns 400 when chat message is empty', async () => {
    await request(app.getHttpServer())
      .post('/recruitment/chat')
      .send({ sessionId: 'session-1', message: '' })
      .expect(400);

    expect(recruitmentService.chat).not.toHaveBeenCalled();
  });

  it('generates linkedin post from jobOfferId', async () => {
    const response = await request(app.getHttpServer())
      .post('/recruitment/linkedin-post')
      .send({ jobOfferId: '507f1f77bcf86cd799439011' })
      .expect(201);

    expect(recruitmentService.generateLinkedInPostFromJobOfferId).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
    );
    expect(response.text).toContain('LinkedIn-ready job post text');
  });

  it('returns 400 when linkedin-post id is invalid', async () => {
    await request(app.getHttpServer())
      .post('/recruitment/linkedin-post')
      .send({ jobOfferId: 'invalid-id' })
      .expect(400);

    expect(recruitmentService.generateLinkedInPostFromJobOfferId).not.toHaveBeenCalled();
  });
});