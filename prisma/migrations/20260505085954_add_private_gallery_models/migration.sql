-- CreateEnum
CREATE TYPE "GalleryStatus" AS ENUM ('draft', 'selection', 'retouching', 'delivered', 'closed');

-- CreateEnum
CREATE TYPE "ShootingType" AS ENUM ('studio', 'outside', 'event');

-- CreateTable
CREATE TABLE "galleries" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "GalleryStatus" NOT NULL DEFAULT 'draft',
    "clientName" TEXT NOT NULL,
    "photoQuota" INTEGER NOT NULL DEFAULT 0,
    "shootingDate" TIMESTAMP(3) NOT NULL,
    "shootingCity" TEXT,
    "shootingType" "ShootingType" NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "galleries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pictures" (
    "id" SERIAL NOT NULL,
    "galleryId" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "thumbnailKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "selected" BOOLEAN NOT NULL,
    "selectedAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pictures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retouches" (
    "id" SERIAL NOT NULL,
    "pictureId" INTEGER NOT NULL,
    "galleryId" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "thumbnailKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retouches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "galleries_key_key" ON "galleries"("key");

-- CreateIndex
CREATE UNIQUE INDEX "galleries_id_slug_key" ON "galleries"("id", "slug");

-- AddForeignKey
ALTER TABLE "pictures" ADD CONSTRAINT "pictures_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retouches" ADD CONSTRAINT "retouches_pictureId_fkey" FOREIGN KEY ("pictureId") REFERENCES "pictures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retouches" ADD CONSTRAINT "retouches_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
