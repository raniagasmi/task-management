import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AiService } from './ai.service';
import { JobOffer } from './schemas/job-offer.schema';
import { RecruitmentService } from './recruitment.service';

describe('RecruitmentService', () => {
  let service: RecruitmentService;

  const aiServiceMock = {
    generateText: jest.fn(),
  };

  const jobOfferModelMock = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruitmentService,
        {
          provide: AiService,
          useValue: aiServiceMock,
        },
        {
          provide: getModelToken(JobOffer.name),
          useValue: jobOfferModelMock,
        },
      ],
    }).compile();

    service = module.get<RecruitmentService>(RecruitmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});