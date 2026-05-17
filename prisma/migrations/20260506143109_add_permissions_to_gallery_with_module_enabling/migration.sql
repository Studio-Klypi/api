-- AlterTable
ALTER TABLE "galleries" ADD COLUMN     "canDownloadRaws" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "chatEnabled" BOOLEAN NOT NULL DEFAULT false;
