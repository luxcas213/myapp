-- CreateEnum
CREATE TYPE "ConfirmMode" AS ENUM ('SLIDER', 'FORM');

-- AlterEnum (map old LOGGED rows to COMPOUND explicitly, don't rely on a bare cast)
CREATE TYPE "TrackingType_new" AS ENUM ('SIMPLE', 'COMPOUND');
ALTER TABLE "Task" ALTER COLUMN "trackingType" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "trackingType" TYPE "TrackingType_new" USING (
  CASE "trackingType"::text
    WHEN 'LOGGED' THEN 'COMPOUND'
    ELSE "trackingType"::text
  END::"TrackingType_new"
);
ALTER TYPE "TrackingType" RENAME TO "TrackingType_old";
ALTER TYPE "TrackingType_new" RENAME TO "TrackingType";
DROP TYPE "TrackingType_old";
ALTER TABLE "Task" ALTER COLUMN "trackingType" SET DEFAULT 'SIMPLE';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "confirmMode" "ConfirmMode",
ADD COLUMN     "dueHasTime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "formSchema" JSONB,
ADD COLUMN     "message" TEXT;

-- Existing COMPOUND (formerly LOGGED) tasks default to the slider confirm
-- mode — the old model had no field-builder concept, so there's nothing to
-- map into formSchema.
UPDATE "Task" SET "confirmMode" = 'SLIDER' WHERE "trackingType" = 'COMPOUND';

-- AlterTable
ALTER TABLE "TaskNotification" DROP COLUMN "sendAt",
ADD COLUMN     "daysBefore" INTEGER;

-- AlterTable
ALTER TABLE "TaskCompletion" DROP COLUMN "note",
DROP COLUMN "value",
ADD COLUMN     "data" JSONB;
