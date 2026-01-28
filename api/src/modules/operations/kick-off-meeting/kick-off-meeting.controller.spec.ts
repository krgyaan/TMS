import { Test, TestingModule } from '@nestjs/testing';
import { KickOffMeetingController } from './kick-off-meeting.controller';

describe('KickOffMeetingController', () => {
  let controller: KickOffMeetingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KickOffMeetingController],
    }).compile();

    controller = module.get<KickOffMeetingController>(KickOffMeetingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
