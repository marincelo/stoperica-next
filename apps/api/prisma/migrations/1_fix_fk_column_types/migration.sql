-- DropForeignKey
ALTER TABLE "advertables" DROP CONSTRAINT "fk_rails_9c496d578b";

-- DropForeignKey
ALTER TABLE "club_league_points" DROP CONSTRAINT "fk_rails_12a4f2b0cc";

-- DropForeignKey
ALTER TABLE "race_admins" DROP CONSTRAINT "fk_rails_c887177279";

-- DropForeignKey
ALTER TABLE "race_admins" DROP CONSTRAINT "fk_rails_d4fa5a42bd";

-- AlterTable
ALTER TABLE "advertables" ALTER COLUMN "race_id" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "club_league_points" ALTER COLUMN "club_id" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "race_admins" ALTER COLUMN "racer_id" SET DATA TYPE INTEGER,
ALTER COLUMN "race_id" SET DATA TYPE INTEGER;

-- AddForeignKey
ALTER TABLE "advertables" ADD CONSTRAINT "fk_rails_9c496d578b" FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "club_league_points" ADD CONSTRAINT "fk_rails_12a4f2b0cc" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "race_admins" ADD CONSTRAINT "fk_rails_c887177279" FOREIGN KEY ("racer_id") REFERENCES "racers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "race_admins" ADD CONSTRAINT "fk_rails_d4fa5a42bd" FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
