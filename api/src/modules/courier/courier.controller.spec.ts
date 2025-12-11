import { Test, TestingModule } from '@nestjs/testing';
import { CourierController } from './courier.controller';

describe('CourierController', () => {
  let controller: CourierController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourierController],
    }).compile();

    controller = module.get<CourierController>(CourierController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
