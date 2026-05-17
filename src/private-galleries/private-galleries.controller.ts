import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
  Put,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Res,
  Delete,
  HttpCode,
  Patch,
} from '@nestjs/common';
import type { Response } from 'express';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { PrivateGalleriesService } from './private-galleries.service';
import { HasRoleGuard } from '../common/guards/has-role.guard';
import { AdminOrAuthGuard } from '../common/guards/admin-or-auth.guard';
import { CreatePrivateGalleryDto } from './dto/create-private-gallery.dto';
import { compileSort } from '../lib/sort';
import { UpdatePrivateGalleryDto } from './dto/update-private-gallery.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { IsAdmin } from '../common/decorators/is-admin.decorator';
import type { Nullable } from '../types/primitives';
import { UserEntity } from '../authentication/user/entities/user.entity';
import { DeletePicturesDto } from './dto/delete-pictures.dto';
import { PublicOrHasRoleGuard } from '../common/guards/public-or-has-role.guard';
import { SelectPictureDto } from './dto/select-picture.dto';
import { DownloadZipDto } from './dto/download-zip.dto';

@Controller('private-galleries')
export class PrivateGalleriesController {
  constructor(private readonly service: PrivateGalleriesService) {}

  @Get()
  @UseGuards(AdminOrAuthGuard)
  findAll(
    @Query('sort') sort?: string,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.service.findAll(compileSort(sort ?? ''), search, page, offset);
  }

  @Get(':slug/pictures/:pictureId/retouches/:retouchId/download')
  @UseGuards(PublicOrHasRoleGuard('superadmin', 'admin'))
  async downloadRetouch(
    @Param('slug') slug: string,
    @Param('pictureId', ParseIntPipe) pictureId: number,
    @Param('retouchId', ParseIntPipe) retouchId: number,
    @GetUser() user: Nullable<UserEntity>,
    @IsAdmin() isAdmin: boolean,
    @Query('key') key: string,
    @Res() res: Response,
  ) {
    const { stream, filename, mimetype } = await this.service.downloadRetouch(
      slug,
      key,
      pictureId,
      retouchId,
      !!user || isAdmin,
    );
    res.setHeader('Content-Type', mimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    stream.pipe(res);
  }

  @Get(':slug/pictures/:pictureId/retouches/:retouchId')
  async getRetouch(
    @Param('slug') slug: string,
    @Param('pictureId', ParseIntPipe) pictureId: number,
    @Param('retouchId', ParseIntPipe) retouchId: number,
    @GetUser() user: Nullable<UserEntity>,
    @Query('key') key: string,
    @Res() res: Response,
  ) {
    const stream = await this.service.getRetouch(
      slug,
      pictureId,
      retouchId,
      !!user,
      key,
    );
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    stream.pipe(res);
  }

  @Get(':slug/pictures/:pictureId/download')
  @UseGuards(PublicOrHasRoleGuard('superadmin', 'admin'))
  async downloadPicture(
    @Param('slug') slug: string,
    @Param('pictureId', ParseIntPipe) pictureId: number,
    @GetUser() user: Nullable<UserEntity>,
    @IsAdmin() isAdmin: boolean,
    @Query('key') key: string,
    @Res() res: Response,
  ) {
    const { stream, filename, mimetype } = await this.service.downloadPicture(
      slug,
      key,
      pictureId,
      !!user || isAdmin,
    );
    res.setHeader('Content-Type', mimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    stream.pipe(res);
  }

  @Get(':slug/pictures/:pictureId')
  async getPicture(
    @Param('slug') slug: string,
    @Param('pictureId', ParseIntPipe) pictureId: number,
    @GetUser() user: Nullable<UserEntity>,
    @Query('key') key: string,
    @Res() res: Response,
  ) {
    const stream = await this.service.getPicture(slug, pictureId, !!user, key);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    stream.pipe(res);
  }

  @Get(':slug')
  findOne(
    @GetUser() user: Nullable<UserEntity>,
    @Param('slug') slug: string,
    @Query('key') key?: string,
  ) {
    return this.service.findOne(!!user, slug, key);
  }

  @Post()
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  create(@Body() body: CreatePrivateGalleryDto) {
    return this.service.create(body);
  }

  @Post(':id/upload/pictures')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  @UseInterceptors(FilesInterceptor('files'))
  uploadPictures(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files?.length) throw new BadRequestException('No files provided');

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif',
    ];
    const invalid = files.filter((f) => !allowed.includes(f.mimetype));
    if (invalid.length)
      throw new BadRequestException(
        'All files must be images (jpeg, png, webp, avif, gif)',
      );

    return this.service.uploadPictures(id, files);
  }

  @Post(':id/upload/:pictureId/retouch')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  @UseInterceptors(FileInterceptor('file'))
  uploadRetouch(
    @Param('id', ParseIntPipe) id: number,
    @Param('pictureId', ParseIntPipe) pictureId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif',
    ];
    if (!allowed.includes(file.mimetype))
      throw new BadRequestException(
        'File must be an image (jpeg, png, webp, avif, gif)',
      );

    return this.service.uploadRetouch(id, pictureId, file);
  }

  @Post(':id/send')
  @HttpCode(202)
  @UseGuards(AdminOrAuthGuard)
  send(
    @GetUser() user: Nullable<UserEntity>,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.sendByEmail(user, id);
  }

  @Put(':id/save')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  save(
    @GetUser() user: Nullable<UserEntity>,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePrivateGalleryDto,
  ) {
    return this.service.update(user, id, body);
  }

  @Delete(':id')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  async deleteGallery(@Param('id', ParseIntPipe) id: number) {
    return await this.service.deleteGallery(id);
  }

  @Delete(':id/pictures/:pictureId/retouches/:retouchId')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  async deleteRetouch(
    @Param('id', ParseIntPipe) galleryId: number,
    @Param('pictureId', ParseIntPipe) pictureId: number,
    @Param('retouchId', ParseIntPipe) retouchId: number,
  ) {
    await this.service.deleteRetouch(galleryId, pictureId, retouchId);
  }

  @Delete(':id/pictures/delete')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  async deletePictures(
    @Param('id', ParseIntPipe) galleryId: number,
    @Body() body: DeletePicturesDto,
  ) {
    await this.service.bulkDelete(galleryId, body.ids);
    return;
  }

  @Post(':slug/pictures/download-zip')
  @UseGuards(PublicOrHasRoleGuard('superadmin', 'admin'))
  async downloadZip(
    @Param('slug') slug: string,
    @GetUser() user: Nullable<UserEntity>,
    @IsAdmin() isAdmin: boolean,
    @Query('key') key: string,
    @Body() body: DownloadZipDto,
    @Res() res: Response,
  ) {
    const archive = await this.service.downloadZip(
      slug,
      key,
      body.pictures,
      !!user || isAdmin,
    );
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="photos.zip"');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    archive.pipe(res);
  }

  @Patch(`:slug/pictures/select`)
  async bulkSelectPictures(
    @Query('key') key: string,
    @Param('slug') slug: string,
    @Body() body: SelectPictureDto,
  ) {
    if (!key) throw new BadRequestException('Gallery key is missing!');

    const [id, ...rest] = slug.split('-');
    return this.service.bulkSelect(Number(id), rest.join('-'), key, body);
  }

  @Patch(`:id/open`)
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  async open(@Param('id', ParseIntPipe) id: number) {
    return this.service.open(id);
  }

  @Patch(`:id/close`)
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  async close(@Param('id', ParseIntPipe) id: number) {
    return this.service.close(id);
  }

  @Patch(`:id/deliver`)
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  async deliver(@Param('id', ParseIntPipe) id: number) {
    return this.service.deliver(id);
  }
}
