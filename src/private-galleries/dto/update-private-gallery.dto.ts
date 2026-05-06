import { PartialType } from '@nestjs/mapped-types';
import { CreatePrivateGalleryDto } from './create-private-gallery.dto';

export class UpdatePrivateGalleryDto extends PartialType(CreatePrivateGalleryDto) {}
