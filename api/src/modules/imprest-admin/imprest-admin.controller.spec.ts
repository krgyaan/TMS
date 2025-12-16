import { Test, TestingModule } from '@nestjs/testing';
import { ImprestAdminController } from './imprest-admin.controller';

describe('ImprestAdminController', () => {
  let controller: ImprestAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImprestAdminController],
    }).compile();

    controller = module.get<ImprestAdminController>(ImprestAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
