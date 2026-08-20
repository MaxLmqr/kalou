DROP INDEX "foods_recherche_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "foods_source_code_unique" ON "foods" USING btree ("source","code_source");--> statement-breakpoint
CREATE INDEX "foods_recherche_idx" ON "foods" USING gin ("libelle_normalise" gin_trgm_ops);