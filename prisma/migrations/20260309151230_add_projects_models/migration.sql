-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "ProjectVisibility" AS ENUM ('public', 'private');

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "banner" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
    "visibility" "ProjectVisibility" NOT NULL DEFAULT 'private',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_id_slug_key" ON "projects"("id", "slug");
