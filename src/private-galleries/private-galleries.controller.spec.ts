import { Test, TestingModule } from '@nestjs/testing';
import { PrivateGalleriesController } from './private-galleries.controller';
import { PrivateGalleriesService } from './private-galleries.service';

describe('PrivateGalleriesController', () => {
  let controller: PrivateGalleriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrivateGalleriesController],
      providers: [PrivateGalleriesService],
    }).compile();

    controller = module.get<PrivateGalleriesController>(
      PrivateGalleriesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
