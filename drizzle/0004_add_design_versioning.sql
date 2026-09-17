ALTER TABLE "designs" ADD COLUMN "parentDesignId" integer;--> statement-breakpoint
ALTER TABLE "designs" ADD CONSTRAINT "designs_parentDesignId_designs_id_fk" FOREIGN KEY ("parentDesignId") REFERENCES "public"."designs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "designs_parentDesignId_idx" ON "designs" USING btree ("parentDesignId");