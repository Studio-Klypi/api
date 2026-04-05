import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { DatabaseService } from '../common/database/database.service';
import { ProjectEntity } from './entities/project.entity';
import { Prisma, ProjectStatus, ProjectVisibility } from '@prisma/client';

@Injectable()
export class ProjectService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(
    sort: Prisma.ProjectOrderByWithRelationInput[],
    search?: string,
    page: number = 1,
    offset: number = 20,
    admin?: boolean,
  ) {
    let where = {};
    if (!admin)
      where = {
        ...where,
        status: ProjectStatus.published,
        visibility: ProjectVisibility.public,
      };
    if (search && search.length > 0)
      where = {
        ...where,
        OR: [
          { slug: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      };

    const total = await this.db.project.count({ where });
    const projects = await this.db.project.findMany({
      where,
      orderBy: sort,
      skip: (page - 1) * offset,
      take: offset,
    });

    return {
      data: projects.map((project) => new ProjectEntity(project)),
      meta: {
        total,
        count: projects.length,
      },
    };
  }
  async findOne(_slug: string) {
    const [id, ...slug] = _slug.split('-');
    try {
      const project = await this.db.project.findUniqueOrThrow({
        where: {
          id: +id,
          slug: slug.join('-'),
        },
      });
      return new ProjectEntity(project);
    } catch {
      throw new NotFoundException();
    }
  }
  async findOneById(id: number) {
    try {
      return await this.db.project.findUniqueOrThrow({
        where: {
          id,
        },
      });
    } catch {
      throw new NotFoundException();
    }
  }

  async create(payload: CreateProjectDto) {
    const slug = payload.title.toLowerCase().replace(/ /g, '-');
    const project = await this.db.project.create({
      data: {
        slug,
        ...payload,
      },
    });
    return new ProjectEntity(project);
  }
  async update(id: number, payload: UpdateProjectDto) {
    if (!(await this.exists(id))) throw new NotFoundException();

    const project = await this.db.project.update({
      where: {
        id,
      },
      data: payload,
    });
    return new ProjectEntity(project);
  }
  async delete(id: number) {
    if (!(await this.exists(id))) throw new NotFoundException();

    const project = await this.db.project.findUnique({
      where: {
        id,
      },
    });
    await this.db.project.delete({
      where: {
        id,
      },
    });
    return new ProjectEntity(project!);
  }

  private async exists(id: number): Promise<boolean> {
    const project = await this.db.project.findUnique({
      where: { id },
      select: { id: true },
    });

    return !!project;
  }
}
