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
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
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
  recoverOne(@Param('slug') slug: string) {
    return this.projectService.findOne(slug);
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

  @Get(':id/export')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  async export(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const project = await this.projectService.findOneById(id);
    sendJsonDownload(res, project, project.slug);
  }
}
