ALTER TABLE "daily_summaries" RENAME COLUMN "budget_kcal" TO "apport_cible_kcal";--> statement-breakpoint
ALTER TABLE "daily_summaries" RENAME COLUMN "depense_kcal" TO "besoin_journalier_kcal";--> statement-breakpoint
ALTER TABLE "daily_summaries" ADD COLUMN "proteines_g" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "daily_summaries" ADD COLUMN "proteines_partielles" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_summaries" ADD COLUMN "plancher_proteines_g" smallint NOT NULL;