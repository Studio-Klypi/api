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
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  recoverList() {
    return this.projectService.findAll();
  }

  @Get(':slug')
  recoverOne(@Param('slug') slug: string) {
    return this.projectService.findOne(slug);
  }

  @Post()
  create(@Body() payload: CreateProjectDto) {
    return this.projectService.create(payload);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateProjectDto,
  ) {
    return this.projectService.update(id, payload);
  }

  @Patch(':id/publish')
  publish(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.update(id, { status: 'published' });
  }

  @Patch(':id/unpublish')
  unpublish(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.update(id, { status: 'draft' });
  }

  @Patch(':id/visibility')
  updateVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateProjectDto,
  ) {
    return this.projectService.update(id, { visibility: payload.visibility });
  }

  @Delete(':id/archive')
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.update(id, {
      status: 'archived',
      archivedAt: new Date(),
    });
  }

  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.update(id, {
      status: 'draft',
      archivedAt: null,
    });
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.delete(id);
  }
}
