-- AlterTable
ALTER TABLE "racers" ADD COLUMN     "admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "index_race_results_on_racer_id_and_race_id" ON "race_results"("racer_id", "race_id");

-- AddForeignKey
ALTER TABLE "race_results" ADD CONSTRAINT "fk_race_results_category_id" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "race_results" ADD CONSTRAINT "fk_race_results_start_number_id" FOREIGN KEY ("start_number_id") REFERENCES "start_numbers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Data: move admin rights from users to their racer profiles
UPDATE "racers" SET "admin" = true WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "admin" = true);
