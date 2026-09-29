/*
  Warnings:

  - You are about to drop the column `device_fingerprint` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `push_token` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `refresh_tokens` DROP COLUMN `device_fingerprint`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `push_token`;
