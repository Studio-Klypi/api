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
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AdminGuard } from '../common/guards/admin.guard';

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
  @UseGuards(new AdminGuard())
  create(@Body() payload: CreateProjectDto) {
    return this.projectService.create(payload);
  }

  @Put(':id')
  @UseGuards(new AdminGuard())
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateProjectDto,
  ) {
    return this.projectService.update(id, payload);
  }

  @Patch(':id/publish')
  @UseGuards(new AdminGuard())
  publish(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.update(id, { status: 'published' });
  }

  @Patch(':id/unpublish')
  @UseGuards(new AdminGuard())
  unpublish(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.update(id, { status: 'draft' });
  }

  @Patch(':id/visibility')
  @UseGuards(new AdminGuard())
  updateVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateProjectDto,
  ) {
    return this.projectService.update(id, { visibility: payload.visibility });
  }

  @Delete(':id/archive')
  @UseGuards(new AdminGuard())
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.update(id, {
      status: 'archived',
      archivedAt: new Date(),
    });
  }

  @Patch(':id/restore')
  @UseGuards(new AdminGuard())
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.update(id, {
      status: 'draft',
      archivedAt: null,
    });
  }

  @Delete(':id')
  @UseGuards(new AdminGuard())
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.delete(id);
  }
}
