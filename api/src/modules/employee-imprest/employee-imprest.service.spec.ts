import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeImprestService } from '@/modules/employee-imprest/employee-imprest.service';

describe('EmployeeImprestService', () => {
  let service: EmployeeImprestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmployeeImprestService],
    }).compile();

    service = module.get<EmployeeImprestService>(EmployeeImprestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
