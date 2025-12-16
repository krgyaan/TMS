import { Test, TestingModule } from '@nestjs/testing';
import { ImprestAdminService } from './imprest-admin.service';

describe('ImprestAdminService', () => {
  let service: ImprestAdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImprestAdminService],
    }).compile();

    service = module.get<ImprestAdminService>(ImprestAdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
