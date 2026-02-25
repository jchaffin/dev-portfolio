-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];
