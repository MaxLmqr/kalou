-- Extensions requises par la recherche d'aliments (doc 08 § 5) : `pg_trgm`
-- fournit la similarité par trigrammes, `unaccent` sert au rapprochement CIQUAL.
-- Doivent précéder l'index trigramme plus bas dans ce fichier.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE TYPE "public"."confiance" AS ENUM('haute', 'moyenne', 'basse');--> statement-breakpoint
CREATE TYPE "public"."etat_entree" AS ENUM('en_attente', 'estime', 'corrige', 'manuel', 'echec');--> statement-breakpoint
CREATE TYPE "public"."phase" AS ENUM('formule', 'transition', 'calibre');--> statement-breakpoint
CREATE TYPE "public"."sexe" AS ENUM('homme', 'femme');--> statement-breakpoint
CREATE TYPE "public"."source_aliment" AS ENUM('ciqual', 'utilisateur');--> statement-breakpoint
CREATE TYPE "public"."source_entree" AS ENUM('ia_photo', 'ia_texte', 'favori', 'manuel');--> statement-breakpoint
CREATE TYPE "public"."type_item" AS ENUM('reference', 'libre', 'ia');--> statement-breakpoint
CREATE TYPE "public"."unite_base" AS ENUM('g', 'ml');--> statement-breakpoint
CREATE TYPE "public"."unite_item" AS ENUM('g', 'ml', 'unite', 'portion');--> statement-breakpoint
CREATE TABLE "activities" (
	"code" text PRIMARY KEY NOT NULL,
	"libelle" text NOT NULL,
	"met" numeric(4, 2) NOT NULL,
	"categorie" text NOT NULL,
	"icone" text,
	"actif" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"local_date" date NOT NULL,
	"activity_code" text NOT NULL,
	"duree_min" smallint NOT NULL,
	"met" numeric(4, 2) NOT NULL,
	"poids_utilise_kg" numeric(5, 2) NOT NULL,
	"kcal_net" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "food_aliases" (
	"food_id" uuid NOT NULL,
	"alias_normalise" text NOT NULL,
	CONSTRAINT "food_aliases_food_id_alias_normalise_pk" PRIMARY KEY("food_id","alias_normalise")
);
--> statement-breakpoint
CREATE TABLE "food_portions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"food_id" uuid NOT NULL,
	"libelle" text NOT NULL,
	"grammes" numeric(6, 1) NOT NULL,
	"par_defaut" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"source" "source_aliment" NOT NULL,
	"code_source" text,
	"libelle" text NOT NULL,
	"libelle_origine" text,
	"libelle_normalise" text NOT NULL,
	"kcal_100g" numeric(6, 1) NOT NULL,
	"proteines_100g" numeric(5, 1),
	"glucides_100g" numeric(5, 1),
	"lipides_100g" numeric(5, 1),
	"fibres_100g" numeric(5, 1),
	"unite_base" "unite_base" DEFAULT 'g' NOT NULL,
	"promu" boolean DEFAULT false NOT NULL,
	"usages_globaux" integer DEFAULT 0 NOT NULL,
	"reference_version" text,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "foods_proprietaire_coherent" CHECK (("foods"."user_id" is null) = ("foods"."source" = 'ciqual'))
);
--> statement-breakpoint
CREATE TABLE "user_food_usages" (
	"user_id" uuid NOT NULL,
	"food_id" uuid NOT NULL,
	"usages" integer DEFAULT 0 NOT NULL,
	"dernier_usage_at" timestamp with time zone DEFAULT now() NOT NULL,
	"derniere_quantite" numeric(7, 1),
	"derniere_unite" "unite_item",
	"dernier_portion_id" uuid,
	CONSTRAINT "user_food_usages_user_id_food_id_pk" PRIMARY KEY("user_id","food_id")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_summaries" (
	"user_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"bmr" integer NOT NULL,
	"socle" integer NOT NULL,
	"deficit_cible" integer NOT NULL,
	"apport_cible_kcal" integer NOT NULL,
	"eat_kcal" integer DEFAULT 0 NOT NULL,
	"besoin_journalier_kcal" integer NOT NULL,
	"apports_kcal" integer DEFAULT 0 NOT NULL,
	"proteines_g" numeric(5, 1),
	"proteines_partielles" boolean DEFAULT false NOT NULL,
	"plancher_proteines_g" smallint NOT NULL,
	"balance_kcal" integer DEFAULT 0 NOT NULL,
	"entrees_en_attente" smallint DEFAULT 0 NOT NULL,
	"tendance_poids_kg" numeric(5, 2),
	"phase" "phase" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_summaries_user_id_local_date_pk" PRIMARY KEY("user_id","local_date")
);
--> statement-breakpoint
CREATE TABLE "weigh_ins" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"poids_kg" numeric(5, 2) NOT NULL,
	"est_aberrante" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"rythme_kg_semaine" numeric(3, 2) NOT NULL,
	"rythme_demande" numeric(3, 2) NOT NULL,
	"poids_cible_kg" numeric(5, 2),
	"debut_le" date NOT NULL,
	"fin_le" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"sexe" "sexe",
	"date_naissance" date,
	"taille_cm" smallint,
	"timezone" text DEFAULT 'Europe/Paris' NOT NULL,
	"heure_bascule_journee" smallint DEFAULT 0 NOT NULL,
	"notifications_pesee" boolean DEFAULT true NOT NULL,
	"notifications_recap" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"local_date" date NOT NULL,
	"libelle" text NOT NULL,
	"kcal" integer,
	"proteines_g" numeric(6, 1),
	"glucides_g" numeric(6, 1),
	"lipides_g" numeric(6, 1),
	"kcal_min" integer,
	"kcal_max" integer,
	"etat" "etat_entree" NOT NULL,
	"source" "source_entree" NOT NULL,
	"edited_by_user" boolean DEFAULT false NOT NULL,
	"image_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "food_entry_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"food_entry_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"type" "type_item" NOT NULL,
	"food_id" uuid,
	"libelle" text NOT NULL,
	"quantite" numeric(7, 1),
	"unite" "unite_item",
	"portion_id" uuid,
	"kcal" integer NOT NULL,
	"proteines_g" numeric(6, 1),
	"glucides_g" numeric(6, 1),
	"lipides_g" numeric(6, 1),
	"kcal_ref_utilise" numeric(6, 1),
	"edited_by_user" boolean DEFAULT false NOT NULL,
	"confiance" "confiance"
);
--> statement-breakpoint
ALTER TABLE "activity_entries" ADD CONSTRAINT "activity_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_entries" ADD CONSTRAINT "activity_entries_activity_code_activities_code_fk" FOREIGN KEY ("activity_code") REFERENCES "public"."activities"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_aliases" ADD CONSTRAINT "food_aliases_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_portions" ADD CONSTRAINT "food_portions_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_food_usages" ADD CONSTRAINT "user_food_usages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_food_usages" ADD CONSTRAINT "user_food_usages_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_food_usages" ADD CONSTRAINT "user_food_usages_dernier_portion_id_food_portions_id_fk" FOREIGN KEY ("dernier_portion_id") REFERENCES "public"."food_portions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_summaries" ADD CONSTRAINT "daily_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weigh_ins" ADD CONSTRAINT "weigh_ins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_entry_items" ADD CONSTRAINT "food_entry_items_food_entry_id_food_entries_id_fk" FOREIGN KEY ("food_entry_id") REFERENCES "public"."food_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_entry_items" ADD CONSTRAINT "food_entry_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_entry_items" ADD CONSTRAINT "food_entry_items_portion_id_food_portions_id_fk" FOREIGN KEY ("portion_id") REFERENCES "public"."food_portions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_entries_jour_idx" ON "activity_entries" USING btree ("user_id","local_date") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "activity_entries_sync_idx" ON "activity_entries" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "food_aliases_recherche_idx" ON "food_aliases" USING btree ("alias_normalise");--> statement-breakpoint
CREATE INDEX "food_portions_food_idx" ON "food_portions" USING btree ("food_id");--> statement-breakpoint
CREATE INDEX "foods_recherche_idx" ON "foods" USING gin ("libelle_normalise" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "foods_proprietaire_idx" ON "foods" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "foods_source_code_unique" ON "foods" USING btree ("source","code_source");--> statement-breakpoint
CREATE INDEX "user_food_usages_classement_idx" ON "user_food_usages" USING btree ("user_id","usages");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "weigh_ins_jour_unique" ON "weigh_ins" USING btree ("user_id","local_date") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "weigh_ins_tendance_idx" ON "weigh_ins" USING btree ("user_id","local_date") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "weigh_ins_sync_idx" ON "weigh_ins" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "goals_actif_unique" ON "goals" USING btree ("user_id") WHERE fin_le is null;--> statement-breakpoint
CREATE INDEX "food_entries_jour_idx" ON "food_entries" USING btree ("user_id","local_date") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "food_entries_sync_idx" ON "food_entries" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "food_entry_items_parent_idx" ON "food_entry_items" USING btree ("food_entry_id","position");