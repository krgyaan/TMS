import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeImprestController } from './employee-imprest.controller';

describe('EmployeeImprestController', () => {
  let controller: EmployeeImprestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeImprestController],
    }).compile();

    controller = module.get<EmployeeImprestController>(EmployeeImprestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
