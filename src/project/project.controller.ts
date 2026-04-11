import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Res,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { compileSort } from '../lib/sort';
import { HasRoleGuard } from '../common/guards/has-role.guard';
import { sendJsonDownload } from '../lib/json-download';
import { GetUser } from '../common/decorators/get-user.decorator';
import { type Nullable } from '../types/primitives';
import { UserEntity } from '../authentication/user/entities/user.entity';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  recoverList(
    @GetUser() me: Nullable<UserEntity>,
    @Query('sort') sort?: string,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.projectService.findAll(
      compileSort(sort ?? ''),
      search,
      page,
      offset,
      !!me,
    );
  }

  @Get(':slug')
  recoverOne(@Param('slug') slug: string, @GetUser() me: UserEntity) {
    return this.projectService.findOne(slug, !!me);
  }

  @Post()
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  create(@Body() payload: CreateProjectDto) {
    return this.projectService.create(payload);
  }

  @Put(':id')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateProjectDto,
  ) {
    return this.projectService.update(id, payload);
  }

  @Patch(':id/publish')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  publish(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.update(id, { status: 'published' });
  }

  @Patch(':id/unpublish')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  unpublish(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.update(id, { status: 'draft' });
  }

  @Patch(':id/visibility')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  updateVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateProjectDto,
  ) {
    return this.projectService.update(id, { visibility: payload.visibility });
  }

  @Delete(':id/archive')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.update(id, {
      status: 'archived',
      archivedAt: new Date(),
    });
  }

  @Patch(':id/restore')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.update(id, {
      status: 'draft',
      archivedAt: null,
    });
  }

  @Delete(':id')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.delete(id);
  }

  @Patch(':id/update-banner')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  @UseInterceptors(FileInterceptor('file'))
  async updateBanner(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowed.includes(file.mimetype))
      throw new BadRequestException('File must be an image (jpeg, png, webp, avif)');

    return this.projectService.updateBanner(id, file);
  }

  @Get(':id/banner')
  async getBanner(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const origin = req.headers.origin || req.headers.referer || '';
    const allowed =
      !origin ||
      /^https?:\/\/localhost(:\d+)?(\/|$)/.test(origin) ||
      /^https?:\/\/([a-z0-9-]+\.)*studio-klypi\.com(\/|$)/.test(origin);

    if (!allowed) throw new ForbiddenException('Origin not allowed');

    const { stream, mimetype } = await this.projectService.getBanner(id);
    res.setHeader('Content-Type', mimetype);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    stream.pipe(res);
  }

  @Get(':id/export')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  async export(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const project = await this.projectService.findOneById(id);
    sendJsonDownload(res, project, project.slug);
  }
}
