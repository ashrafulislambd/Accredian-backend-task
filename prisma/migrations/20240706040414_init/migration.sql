/*
  Warnings:

  - Added the required column `courseId` to the `Referal` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Referal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "referrerName" TEXT NOT NULL,
    "refereeName" TEXT NOT NULL,
    "refereeEmail" TEXT NOT NULL,
    "message" TEXT,
    "courseId" INTEGER NOT NULL,
    CONSTRAINT "Referal_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Referal" ("id", "message", "refereeEmail", "refereeName", "referrerName") SELECT "id", "message", "refereeEmail", "refereeName", "referrerName" FROM "Referal";
DROP TABLE "Referal";
ALTER TABLE "new_Referal" RENAME TO "Referal";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
