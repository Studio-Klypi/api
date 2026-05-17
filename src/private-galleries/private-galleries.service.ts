import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname, basename } from 'path';
import sharp from 'sharp';
import archiver = require('archiver');
import { CreatePrivateGalleryDto } from './dto/create-private-gallery.dto';
import { UpdatePrivateGalleryDto } from './dto/update-private-gallery.dto';
import { DatabaseService } from '../common/database/database.service';
import { StorageService } from '../common/storage/storage.service';
import { generateSlug } from '../lib/slug';
import { Gallery, GalleryStatus, Prisma } from '@prisma/client';
import { Listed, Nullable } from '../types/primitives';
import { MailerService } from '@nestjs-modules/mailer';
import { UserEntity } from '../authentication/user/entities/user.entity';
import { formatDate } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SelectPictureDto } from './dto/select-picture.dto';
import { DownloadZipItemDto } from './dto/download-zip.dto';

@Injectable()
export class PrivateGalleriesService {
  static VALIDITY = 2_592_000_000 as const; // expires in 30d (by default)

  constructor(
    private readonly db: DatabaseService,
    private readonly mailer: MailerService,
    private readonly storage: StorageService,
  ) {}

  private get activeStatuses() {
    return [
      GalleryStatus.selection,
      GalleryStatus.delivered,
      GalleryStatus.retouching,
    ] as Listed<GalleryStatus>;
  }

  private isActive(gallery: Gallery) {
    return this.activeStatuses.includes(gallery.status);
  }

  async findAll(
    sort?: Prisma.GalleryOrderByWithRelationInput[],
    search?: string,
    page: number = 1,
    offset: number = 20,
  ) {
    let where = {};

    if (search && search.length > 0)
      where = {
        ...where,
        OR: [
          { slug: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      };

    const total = await this.db.gallery.count({ where });
    const galleries = await this.db.gallery.findMany({
      where,
      orderBy: sort,
      skip: (page - 1) * offset,
      take: offset,
    });

    return {
      data: galleries,
      meta: {
        total,
        count: galleries.length,
      },
    };
  }

  async findOne(admin: boolean, slug: string, key?: string) {
    if (!admin && !key?.length)
      throw new BadRequestException('Gallery key is missing to get access.');

    const [slugId, ...slugParts] = slug.split('-');

    try {
      return await this.db.gallery.findUniqueOrThrow({
        where: {
          id: Number(slugId),
          slug: slugParts.join('-'),
          ...(!admin
            ? {
                status: {
                  in: [
                    GalleryStatus.selection,
                    GalleryStatus.retouching,
                    GalleryStatus.delivered,
                  ],
                },
                OR: [
                  {
                    expiresAt: null,
                  },
                  {
                    expiresAt: {
                      gt: new Date(),
                    },
                  },
                ],
              }
            : {}),
        },
        include: {
          pictures: {
            include: {
              retouches: true,
            },
          },
        },
      });
    } catch {
      throw new NotFoundException('Gallery not accessible or not found.');
    }
  }

  async create(payload: CreatePrivateGalleryDto) {
    const slug = generateSlug(payload.title);
    return this.db.gallery.create({
      data: {
        slug,
        ...payload,
      },
    });
  }

  async getPicture(
    slug: string,
    pictureId: number,
    admin: boolean,
    key?: string,
  ) {
    const gallery = await this.findOne(admin, slug, key);

    const picture = await this.db.picture.findUnique({
      where: { id: pictureId, galleryId: gallery.id },
      select: { storageKey: true },
    });
    if (!picture) throw new NotFoundException('Picture not found');

    return this.storage.stream(picture.storageKey);
  }

  private async convertForStorage(
    file: Express.Multer.File,
  ): Promise<{ buffer: Buffer; mimetype: string; ext: string }> {
    if (file.mimetype === 'image/gif')
      return { buffer: file.buffer, mimetype: 'image/gif', ext: '.gif' };

    if (['image/png', 'image/webp', 'image/avif'].includes(file.mimetype)) {
      const buffer = await sharp(file.buffer).webp({ quality: 90 }).toBuffer();
      return { buffer, mimetype: 'image/webp', ext: '.webp' };
    }

    const buffer = await sharp(file.buffer).jpeg({ quality: 90 }).toBuffer();
    return { buffer, mimetype: 'image/jpeg', ext: '.jpg' };
  }

  async getRetouch(
    slug: string,
    pictureId: number,
    retouchId: number,
    admin: boolean,
    key?: string,
  ) {
    const gallery = await this.findOne(admin, slug, key);

    const retouch = await this.db.retouch.findUnique({
      where: { id: retouchId, pictureId, galleryId: gallery.id },
      select: { storageKey: true },
    });
    if (!retouch) throw new NotFoundException('Retouch not found');

    return this.storage.stream(retouch.storageKey);
  }

  async uploadPictures(galleryId: number, files: Express.Multer.File[]) {
    const gallery = await this.db.gallery.findUnique({
      where: { id: galleryId },
      select: { id: true },
    });
    if (!gallery) throw new NotFoundException('Gallery not found');

    const currentCount = await this.db.picture.count({ where: { galleryId } });

    return Promise.all(
      files.map(async (file, index) => {
        const { buffer, mimetype, ext } = await this.convertForStorage(file);
        const storageKey = await this.storage.save(
          `galleries/${galleryId}/pictures`,
          `${randomUUID()}${ext}`,
          buffer,
          mimetype,
        );

        return this.db.picture.create({
          data: {
            galleryId,
            storageKey,
            thumbnailKey: storageKey,
            filename: file.originalname,
            size: buffer.length,
            order: currentCount + index,
            selected: false,
          },
          include: {
            retouches: true,
          },
        });
      }),
    );
  }

  async uploadRetouch(
    galleryId: number,
    pictureId: number,
    file: Express.Multer.File,
  ) {
    const { buffer, mimetype, ext } = await this.convertForStorage(file);
    const storageKey = await this.storage.save(
      `galleries/${galleryId}/retouches`,
      `${randomUUID()}${ext}`,
      buffer,
      mimetype,
    );

    return this.db.$transaction(async (tx) => {
      const picture = await tx.picture.update({
        where: { id: pictureId, galleryId },
        data: { retouchCount: { increment: 1 } },
        select: { retouchCount: true },
      });

      return tx.retouch.create({
        data: {
          pictureId,
          galleryId,
          storageKey,
          thumbnailKey: storageKey,
          version: picture.retouchCount,
        },
      });
    });
  }

  async update(
    user: Nullable<UserEntity>,
    id: number,
    payload: UpdatePrivateGalleryDto,
  ) {
    const oldGallery = await this.db.gallery.findUnique({
      where: {
        id,
      },
    });
    if (!oldGallery) throw new NotFoundException('Gallery not found.');

    const newGallery = await this.db.gallery.update({
      where: {
        id,
      },
      data: {
        ...payload,
        ...(payload.title
          ? {
              slug: generateSlug(payload.title),
            }
          : {}),
      },
      include: {
        pictures: {
          include: {
            retouches: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (oldGallery?.slug !== newGallery.slug && this.isActive(newGallery))
      await this.mailer.sendMail({
        to: newGallery.clientEmails,
        bcc: user?.email ?? process.env.MAILER_REPLY_TO!,
        subject: 'Le nom de votre galerie a changé !',
        template: 'gallery-slug-changed',
        context: {
          clientName: newGallery.clientName,
          galleryTitle: oldGallery?.title ?? newGallery.title,
          galleryUrl: process.env
            .PRIVATE_GALLERY_URL_TEMPLATE!.replace(
              '{id}',
              newGallery.id.toString(),
            )
            .replace('{slug}', newGallery.slug)
            .replace('{key}', newGallery.key),
          expiresAt: newGallery.expiresAt
            ? formatDate(newGallery.expiresAt, 'eeee d MMMM yyyy à HH:mm', {
                locale: fr,
              })
            : null,
        },
      });

    return newGallery;
  }

  async deleteRetouch(galleryId: number, pictureId: number, retouchId: number) {
    const retouch = await this.db.retouch.findUnique({
      where: { id: retouchId, pictureId, galleryId },
      select: { storageKey: true },
    });
    if (!retouch) throw new NotFoundException('Retouch not found');

    await this.db.retouch.delete({ where: { id: retouchId } });
    await this.storage.delete(retouch.storageKey);
  }

  async deleteGallery(galleryId: number) {
    const pictures = await this.db.picture.findMany({
      where: { galleryId },
      select: { storageKey: true, retouches: { select: { storageKey: true } } },
    });

    const gallery = await this.db.gallery.findUnique({
      where: {
        id: galleryId,
      },
    });
    await this.db.gallery.delete({ where: { id: galleryId } });

    const keys = pictures.flatMap((p) => [
      p.storageKey,
      ...p.retouches.map((r) => r.storageKey),
    ]);
    await Promise.all(keys.map((key) => this.storage.delete(key)));

    return gallery;
  }

  async bulkDelete(galleryId: number, pictureIds: Listed<number>) {
    const pictures = await this.db.picture.findMany({
      where: { galleryId, id: { in: pictureIds } },
      select: { storageKey: true, retouches: { select: { storageKey: true } } },
    });

    await this.db.picture.deleteMany({
      where: { galleryId, id: { in: pictureIds } },
    });

    const keys = pictures.flatMap((p) => [
      p.storageKey,
      ...p.retouches.map((r) => r.storageKey),
    ]);
    await Promise.all(keys.map((key) => this.storage.delete(key)));
  }

  async sendByEmail(user: Nullable<UserEntity>, id: number) {
    try {
      const gallery = await this.db.gallery.findUniqueOrThrow({
        where: {
          id,
        },
      });

      await this.mailer.sendMail({
        to: gallery.clientEmails,
        subject: `Votre galerie photo « ${gallery.title} » est disponible`,
        bcc: user?.email ?? process.env.MAILER_REPLY_TO,
        template: 'gallery-shared',
        context: {
          clientName: gallery.clientName,
          galleryTitle: gallery.title,
          galleryUrl:
            process.env.PRIVATE_GALLERY_URL_TEMPLATE?.replace(
              '{id}',
              gallery.id.toString(),
            )
              .replace('{slug}', gallery.slug)
              .replace('{key}', gallery.key) ?? '',
          expiresAt: gallery.expiresAt
            ? formatDate(gallery.expiresAt, 'eeee d MMMM yyyy à HH:mm', {
                locale: fr,
              })
            : null,
        },
      });
    } catch (e) {
      const error = (e as Prisma.PrismaClientKnownRequestError).code;

      switch (error) {
        case 'P2025':
          throw new NotFoundException('Gallery not found');
        default:
          throw new InternalServerErrorException('Unable to send emails.');
      }
    }
  }

  async downloadPicture(
    gallerySlug: string,
    galleryKey: string,
    pictureId: number,
    admin: boolean,
  ) {
    const [id, ...slug] = gallerySlug.split('-');

    try {
      const gallery = await this.db.gallery.findUniqueOrThrow({
        where: {
          id: Number(id),
          key: galleryKey,
          slug: slug.join('-'),
          ...(!admin
            ? {
                status: 'delivered',
                expiresAt: {
                  gt: new Date(),
                },
              }
            : {}),
        },
      });
      if (!admin && !gallery.canDownloadRaws)
        throw new ForbiddenException(
          'Downloading raws is not enabled for this gallery.',
        );

      const picture = await this.db.picture.findUniqueOrThrow({
        where: {
          id: pictureId,
          galleryId: gallery.id,
        },
        include: {
          retouches: {
            orderBy: {
              version: 'desc',
            },
            take: 1,
          },
        },
      });

      const target =
        !admin && picture.retouches.length === 1
          ? picture.retouches[0]
          : picture;

      const ext = extname(target.storageKey);
      const stem = basename(picture.filename, extname(picture.filename));

      if (!admin)
        await this.db.picture.update({
          where: {
            id: picture.id,
          },
          data: {
            downloadedAt: new Date(),
          },
        });

      return {
        stream: await this.storage.stream(target.storageKey),
        filename: `${stem}${ext}`,
        mimetype: this.mimetypeFromKey(target.storageKey),
      };
    } catch (e) {
      if (e instanceof ForbiddenException || e instanceof NotFoundException)
        throw e;
      const error = e as Prisma.PrismaClientKnownRequestError;
      if (error.code === 'P2025')
        throw new NotFoundException('Gallery or picture not found.');
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  private mimetypeFromKey(key: string): string {
    const map: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };
    return map[extname(key)] ?? 'application/octet-stream';
  }

  async downloadRetouch(
    gallerySlug: string,
    galleryKey: string,
    pictureId: number,
    retouchId: number,
    admin: boolean,
  ) {
    const [id, ...slug] = gallerySlug.split('-');

    try {
      const gallery = await this.db.gallery.findUniqueOrThrow({
        where: {
          id: Number(id),
          key: galleryKey,
          slug: slug.join('-'),
          ...(!admin
            ? {
                status: 'delivered',
                expiresAt: {
                  gt: new Date(),
                },
              }
            : {}),
        },
      });
      const picture = await this.db.picture.findUniqueOrThrow({
        where: {
          id: pictureId,
          galleryId: gallery.id,
        },
        include: {
          retouches: {
            orderBy: {
              version: 'desc',
            },
          },
        },
      });
      const retouch = await this.db.retouch.findUniqueOrThrow({
        where: {
          id: retouchId,
          galleryId: gallery.id,
          pictureId: picture.id,
        },
      });

      const ext = extname(retouch.storageKey);
      const stem = basename(picture.filename, extname(picture.filename));

      return {
        stream: await this.storage.stream(retouch.storageKey),
        filename: `${stem}-retouch-v${retouch.version}${ext}`,
        mimetype: this.mimetypeFromKey(retouch.storageKey),
      };
    } catch (e) {
      console.error(e);

      if (e instanceof ForbiddenException || e instanceof NotFoundException)
        throw e;

      const error = e as Prisma.PrismaClientKnownRequestError;
      switch (error.code) {
        case 'P2025':
          throw new NotFoundException('Gallery, picture or retouch not found');
        default:
          throw new InternalServerErrorException('Something went wrong');
      }
    }
  }

  async downloadZip(
    gallerySlug: string,
    galleryKey: string,
    items: DownloadZipItemDto[],
    admin: boolean,
  ) {
    const [id, ...slugParts] = gallerySlug.split('-');

    let gallery: Awaited<ReturnType<typeof this.db.gallery.findUniqueOrThrow>>;
    try {
      gallery = await this.db.gallery.findUniqueOrThrow({
        where: {
          id: Number(id),
          key: galleryKey,
          slug: slugParts.join('-'),
          ...(!admin
            ? {
                status: 'delivered',
                expiresAt: { gt: new Date() },
              }
            : {}),
        },
      });
    } catch {
      throw new NotFoundException('Gallery not found or not accessible.');
    }

    const hasOriginals = items.some((i) => i.type === 'original');
    if (hasOriginals && !admin && !gallery.canDownloadRaws)
      throw new ForbiddenException(
        'Downloading originals is not enabled for this gallery.',
      );

    const pictureIds = [...new Set(items.map((i) => i.id))];
    const pictures = await this.db.picture.findMany({
      where: { id: { in: pictureIds }, galleryId: gallery.id },
      include: {
        retouches: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    const pictureMap = new Map(pictures.map((p) => [p.id, p]));

    for (const item of items) {
      const picture = pictureMap.get(item.id);
      if (!picture)
        throw new NotFoundException(`Picture ${item.id} not found.`);
      if (item.type === 'retouch' && !picture.retouches.length)
        throw new BadRequestException(
          `Picture ${item.id} has no retouch available.`,
        );
    }

    const archive = archiver('zip', { zlib: { level: 6 } });

    for (const item of items) {
      const picture = pictureMap.get(item.id)!;
      const stem = basename(picture.filename, extname(picture.filename));

      if (item.type === 'original') {
        const ext = extname(picture.storageKey);
        const stream = await this.storage.stream(picture.storageKey);
        archive.append(stream, { name: `${stem}${ext}` });
      } else {
        const retouch = picture.retouches[0];
        const ext = extname(retouch.storageKey);
        const stream = await this.storage.stream(retouch.storageKey);
        archive.append(stream, { name: `${stem}-retouch-v${retouch.version}${ext}` });
      }
    }

    archive.finalize();
    return archive;
  }

  async bulkSelect(
    id: number,
    slug: string,
    key: string,
    body: SelectPictureDto,
  ) {
    try {
      const gallery = await this.db.gallery.findUniqueOrThrow({
        where: {
          id,
          slug,
          key,
          status: GalleryStatus.selection,
        },
      });
      const newGallery = await this.db.gallery.update({
        where: {
          id,
          slug,
          key,
        },
        data: {
          ...(body.ids.length === gallery.photoQuota
            ? { status: GalleryStatus.retouching }
            : {}),
          pictures: {
            updateMany: [
              {
                where: {
                  id: {
                    in: body.ids,
                  },
                },
                data: {
                  selected: true,
                  selectedAt: new Date(),
                },
              },
              {
                where: {
                  id: {
                    notIn: body.ids,
                  },
                },
                data: {
                  selected: false,
                  selectedAt: null,
                },
              },
            ],
          },
        },
        include: {
          pictures: {
            include: {
              retouches: {
                orderBy: {
                  version: 'desc',
                },
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      if (newGallery.status === GalleryStatus.retouching)
        await this.mailer.sendMail({
          to: newGallery.clientEmails,
          subject: 'Merci pour votre sélection !',
          template: 'gallery-retouching',
          context: {
            clientName: newGallery.clientName,
            galleryTitle: newGallery.title,
            galleryUrl: process.env
              .PRIVATE_GALLERY_URL_TEMPLATE!.replace(
                '{id}',
                newGallery.id.toString(),
              )
              .replace('{slug}', newGallery.slug)
              .replace('{key}', newGallery.key),
          },
        });

      return newGallery;
    } catch (e) {
      const error = e as Prisma.PrismaClientKnownRequestError;
      switch (error.code) {
        case 'P2025':
          throw new NotFoundException('Gallery or picture not found');
        default:
          throw new InternalServerErrorException('Something went wrong');
      }
    }
  }

  async open(id: number) {
    try {
      const gallery = await this.db.gallery.update({
        where: {
          id,
          status: {
            in: [GalleryStatus.draft, GalleryStatus.closed],
          },
        },
        data: {
          status: GalleryStatus.selection,
          expiresAt: null,
        },
      });

      await this.mailer.sendMail({
        to: gallery.clientEmails,
        subject: 'Votre galerie photo est disponible !',
        template: 'gallery-opened',
        context: {
          clientName: gallery.clientName,
          galleryTitle: gallery.title,
          galleryUrl: process.env
            .PRIVATE_GALLERY_URL_TEMPLATE!.replace(
              '{id}',
              gallery.id.toString(),
            )
            .replace('{slug}', gallery.slug)
            .replace('{key}', gallery.key),
        },
      });

      return gallery;
    } catch (e) {
      const error = e as Prisma.PrismaClientKnownRequestError;
      switch (error.code) {
        case 'P2025':
          throw new NotFoundException('Gallery not found');
        default:
          throw new InternalServerErrorException('Something went wrong');
      }
    }
  }
  async close(id: number) {
    try {
      const gallery = await this.db.gallery.update({
        where: {
          id,
          status: {
            notIn: [GalleryStatus.closed],
          },
          OR: [
            {
              expiresAt: null,
            },
            {
              expiresAt: {
                gt: new Date(),
              },
            },
          ],
        },
        data: {
          status: GalleryStatus.closed,
        },
      });

      await this.mailer.sendMail({
        to: gallery.clientEmails,
        subject: 'Votre galerie photo est fermée !',
        template: 'gallery-closed',
        context: {
          clientName: gallery.clientName,
          galleryTitle: gallery.title,
        },
      });

      return gallery;
    } catch (e) {
      const error = e as Prisma.PrismaClientKnownRequestError;
      switch (error.code) {
        case 'P2025':
          throw new NotFoundException('Gallery not found');
        default:
          throw new InternalServerErrorException('Something went wrong');
      }
    }
  }
  async deliver(id: number) {
    try {
      const gallery = await this.db.gallery.update({
        where: {
          id,
          status: GalleryStatus.retouching,
        },
        data: {
          status: GalleryStatus.delivered,
          expiresAt: new Date(Date.now() + PrivateGalleriesService.VALIDITY),
        },
      });

      await this.mailer.sendMail({
        to: gallery.clientEmails,
        subject: 'Vos retouches photo ont été livrées !',
        template: 'gallery-delivered',
        context: {
          clientName: gallery.clientName,
          galleryTitle: gallery.title,
          expiresAt: formatDate(
            gallery.expiresAt!,
            'eeee dd MMMM yyyy à HH:mm',
            { locale: fr },
          ),
          galleryUrl: process.env
            .PRIVATE_GALLERY_URL_TEMPLATE!.replace(
              '{id}',
              gallery.id.toString(),
            )
            .replace('{slug}', gallery.slug)
            .replace('{key}', gallery.key),
        },
      });

      return gallery;
    } catch (e) {
      const error = e as Prisma.PrismaClientKnownRequestError;
      switch (error.code) {
        case 'P2025':
          throw new NotFoundException('Gallery not found');
        default:
          throw new InternalServerErrorException('Something went wrong');
      }
    }
  }
}
