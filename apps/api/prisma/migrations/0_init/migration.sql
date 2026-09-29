-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."advertables" (
    "id" BIGSERIAL NOT NULL,
    "race_id" BIGINT NOT NULL,
    "advertisement_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "advertables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."advertisements" (
    "id" BIGSERIAL NOT NULL,
    "position" INTEGER,
    "image_url" VARCHAR,
    "site_url" VARCHAR,
    "expire_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "name" VARCHAR,

    CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ar_internal_metadata" (
    "key" VARCHAR NOT NULL,
    "value" VARCHAR,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "ar_internal_metadata_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" SERIAL NOT NULL,
    "race_id" INTEGER,
    "name" VARCHAR,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "category" INTEGER,
    "track_length" INTEGER,
    "track_elevation" INTEGER,
    "track_descent" INTEGER,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."club_league_points" (
    "id" BIGSERIAL NOT NULL,
    "club_id" BIGINT,
    "league_id" BIGINT,
    "points" JSONB DEFAULT '{}',
    "total" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "club_league_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clubs" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "category" INTEGER DEFAULT 0,
    "code" VARCHAR,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leagues" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "league_type" INTEGER,
    "slug" VARCHAR,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pools" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."race_admins" (
    "id" BIGSERIAL NOT NULL,
    "racer_id" BIGINT,
    "race_id" BIGINT,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "race_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."race_results" (
    "id" SERIAL NOT NULL,
    "racer_id" INTEGER,
    "race_id" INTEGER,
    "status" INTEGER,
    "lap_times" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "points" DOUBLE PRECISION,
    "category_id" INTEGER,
    "position" INTEGER,
    "start_number_id" INTEGER,
    "signal_strength" INTEGER NOT NULL DEFAULT -1000,
    "started_at" TIMESTAMP(6),
    "climbs" JSONB DEFAULT '{}',
    "finish_delta" VARCHAR DEFAULT '- -',
    "finish_time" VARCHAR DEFAULT '- -',
    "additional_points" DOUBLE PRECISION,
    "missed_control_points" INTEGER DEFAULT 0,

    CONSTRAINT "race_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."racers" (
    "id" SERIAL NOT NULL,
    "first_name" VARCHAR,
    "last_name" VARCHAR,
    "year_of_birth" INTEGER,
    "gender" INTEGER,
    "email" VARCHAR,
    "phone_number" VARCHAR,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "user_id" INTEGER,
    "club_id" INTEGER,
    "category" INTEGER,
    "address" VARCHAR,
    "zip_code" VARCHAR,
    "town" VARCHAR,
    "day_of_birth" INTEGER,
    "month_of_birth" INTEGER,
    "shirt_size" VARCHAR,
    "personal_best" VARCHAR,
    "country" VARCHAR,
    "uci_id" VARCHAR,
    "hidden" BOOLEAN DEFAULT false,
    "club_admin" BOOLEAN DEFAULT false,

    CONSTRAINT "racers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."races" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR,
    "date" TIMESTAMP(6),
    "laps" INTEGER,
    "easy_laps" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "started_at" TIMESTAMP(6),
    "ended_at" TIMESTAMP(6),
    "description_url" VARCHAR,
    "registration_threshold" TIMESTAMP(6),
    "email_body" TEXT,
    "lock_race_results" BOOLEAN,
    "send_email" BOOLEAN,
    "uci_display" BOOLEAN,
    "race_type" INTEGER DEFAULT 0,
    "pool_id" BIGINT,
    "league_id" BIGINT,
    "control_points" JSONB[],
    "picture_url" VARCHAR,
    "location_url" VARCHAR,
    "points_multiplier" DOUBLE PRECISION DEFAULT 1.0,
    "hidden" BOOLEAN DEFAULT false,
    "millis_display" BOOLEAN,
    "auth_token" VARCHAR,
    "skip_auth" BOOLEAN DEFAULT false,
    "description_text" TEXT,

    CONSTRAINT "races_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schema_migrations" (
    "version" VARCHAR NOT NULL,

    CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "public"."start_numbers" (
    "id" SERIAL NOT NULL,
    "value" VARCHAR,
    "tag_id" VARCHAR,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "race_id" INTEGER,
    "pool_id" BIGINT,
    "alternate_tag_id" VARCHAR,

    CONSTRAINT "start_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR NOT NULL DEFAULT '',
    "encrypted_password" VARCHAR NOT NULL DEFAULT '',
    "reset_password_token" VARCHAR,
    "reset_password_sent_at" TIMESTAMP(6),
    "remember_created_at" TIMESTAMP(6),
    "sign_in_count" INTEGER NOT NULL DEFAULT 0,
    "current_sign_in_at" TIMESTAMP(6),
    "last_sign_in_at" TIMESTAMP(6),
    "current_sign_in_ip" INET,
    "last_sign_in_ip" INET,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "admin" BOOLEAN,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "index_advertables_on_advertisement_id" ON "public"."advertables"("advertisement_id" ASC);

-- CreateIndex
CREATE INDEX "index_advertables_on_race_id" ON "public"."advertables"("race_id" ASC);

-- CreateIndex
CREATE INDEX "index_categories_on_race_id" ON "public"."categories"("race_id" ASC);

-- CreateIndex
CREATE INDEX "index_club_league_points_on_club_id" ON "public"."club_league_points"("club_id" ASC);

-- CreateIndex
CREATE INDEX "index_club_league_points_on_league_id" ON "public"."club_league_points"("league_id" ASC);

-- CreateIndex
CREATE INDEX "index_clubs_on_user_id" ON "public"."clubs"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "index_leagues_on_slug" ON "public"."leagues"("slug" ASC);

-- CreateIndex
CREATE INDEX "index_race_admins_on_race_id" ON "public"."race_admins"("race_id" ASC);

-- CreateIndex
CREATE INDEX "index_race_admins_on_racer_id" ON "public"."race_admins"("racer_id" ASC);

-- CreateIndex
CREATE INDEX "index_race_results_on_category_id" ON "public"."race_results"("category_id" ASC);

-- CreateIndex
CREATE INDEX "index_race_results_on_race_id" ON "public"."race_results"("race_id" ASC);

-- CreateIndex
CREATE INDEX "index_race_results_on_racer_id" ON "public"."race_results"("racer_id" ASC);

-- CreateIndex
CREATE INDEX "index_race_results_on_start_number_id" ON "public"."race_results"("start_number_id" ASC);

-- CreateIndex
CREATE INDEX "index_racers_on_club_id" ON "public"."racers"("club_id" ASC);

-- CreateIndex
CREATE INDEX "index_racers_on_user_id" ON "public"."racers"("user_id" ASC);

-- CreateIndex
CREATE INDEX "index_races_on_auth_token" ON "public"."races"("auth_token" ASC);

-- CreateIndex
CREATE INDEX "index_races_on_league_id" ON "public"."races"("league_id" ASC);

-- CreateIndex
CREATE INDEX "index_races_on_pool_id" ON "public"."races"("pool_id" ASC);

-- CreateIndex
CREATE INDEX "index_start_numbers_on_pool_id" ON "public"."start_numbers"("pool_id" ASC);

-- CreateIndex
CREATE INDEX "index_start_numbers_on_race_id" ON "public"."start_numbers"("race_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "index_users_on_email" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "index_users_on_reset_password_token" ON "public"."users"("reset_password_token" ASC);

-- AddForeignKey
ALTER TABLE "public"."advertables" ADD CONSTRAINT "fk_rails_9c496d578b" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."advertables" ADD CONSTRAINT "fk_rails_b7ef38dba4" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "fk_rails_d42a0e9457" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."club_league_points" ADD CONSTRAINT "fk_rails_12a4f2b0cc" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."club_league_points" ADD CONSTRAINT "fk_rails_825b6334d4" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."clubs" ADD CONSTRAINT "fk_rails_d3ef48169e" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."race_admins" ADD CONSTRAINT "fk_rails_c887177279" FOREIGN KEY ("racer_id") REFERENCES "public"."racers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."race_admins" ADD CONSTRAINT "fk_rails_d4fa5a42bd" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."race_results" ADD CONSTRAINT "fk_rails_693ca1332b" FOREIGN KEY ("racer_id") REFERENCES "public"."racers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."race_results" ADD CONSTRAINT "fk_rails_fcb63d883b" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."racers" ADD CONSTRAINT "fk_rails_4a0fa4680b" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."racers" ADD CONSTRAINT "fk_rails_4a17abf4e3" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."races" ADD CONSTRAINT "fk_rails_5d0eae3fad" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."races" ADD CONSTRAINT "fk_rails_609eb3d293" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."start_numbers" ADD CONSTRAINT "fk_rails_c300888542" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."start_numbers" ADD CONSTRAINT "fk_rails_c9eebed45c" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
