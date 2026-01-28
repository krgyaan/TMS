import { Test, TestingModule } from '@nestjs/testing';
import { KickOffMeetingService } from './kick-off-meeting.service';

describe('KickOffMeetingService', () => {
  let service: KickOffMeetingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KickOffMeetingService],
    }).compile();

    service = module.get<KickOffMeetingService>(KickOffMeetingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
