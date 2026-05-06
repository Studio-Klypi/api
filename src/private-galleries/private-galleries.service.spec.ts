import { Test, TestingModule } from '@nestjs/testing';
import { PrivateGalleriesService } from './private-galleries.service';

describe('PrivateGalleriesService', () => {
  let service: PrivateGalleriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrivateGalleriesService],
    }).compile();

    service = module.get<PrivateGalleriesService>(PrivateGalleriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
