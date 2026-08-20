DROP INDEX "foods_recherche_idx";--> statement-breakpoint
CREATE INDEX "foods_recherche_idx" ON "foods" USING gin ("libelle_normalise" gin_trgm_ops);