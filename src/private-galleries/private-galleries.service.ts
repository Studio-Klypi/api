import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { CreatePrivateGalleryDto } from './dto/create-private-gallery.dto';
import { UpdatePrivateGalleryDto } from './dto/update-private-gallery.dto';
import { DatabaseService } from '../common/database/database.service';
import { StorageService } from '../common/storage/storage.service';
import { generateSlug } from '../lib/slug';
import { GalleryStatus, Prisma } from '@prisma/client';
import { Listed, Nullable } from '../types/primitives';
import { MailerService } from '@nestjs-modules/mailer';
import { UserEntity } from '../authentication/user/entities/user.entity';
import { formatDate } from 'date-fns';
import { fr } from 'date-fns/locale';

@Injectable()
export class PrivateGalleriesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mailer: MailerService,
    private readonly storage: StorageService,
  ) {}

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

  async update(id: number, payload: UpdatePrivateGalleryDto) {
    return this.db.gallery.update({
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
    });
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
}
