CREATE TYPE "public"."credit_transaction_type" AS ENUM('grant', 'generation', 'refund', 'purchase', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."generation_provider" AS ENUM('replicate-sdxl', 'replicate-ideogram');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."generation_type" AS ENUM('initial', 'refinement');--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(256) NOT NULL,
	"type" "credit_transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"balanceAfter" integer,
	"generationId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(256) NOT NULL,
	"parentDesignId" integer,
	"designId" integer,
	"status" "generation_status" DEFAULT 'pending' NOT NULL,
	"generationType" "generation_type" NOT NULL,
	"provider" "generation_provider" NOT NULL,
	"roomType" varchar(100),
	"designStyle" varchar(100),
	"instruction" text,
	"errorMessage" text,
	"latencyMs" integer,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_generationId_generations_id_fk" FOREIGN KEY ("generationId") REFERENCES "public"."generations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_parentDesignId_designs_id_fk" FOREIGN KEY ("parentDesignId") REFERENCES "public"."designs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_designId_designs_id_fk" FOREIGN KEY ("designId") REFERENCES "public"."designs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_transactions_userId_idx" ON "credit_transactions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "generations_userId_idx" ON "generations" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "generations_designId_idx" ON "generations" USING btree ("designId");--> statement-breakpoint
CREATE INDEX "generations_status_idx" ON "generations" USING btree ("status");