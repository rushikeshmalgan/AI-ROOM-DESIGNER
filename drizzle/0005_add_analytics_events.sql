CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(256),
	"event" varchar(100) NOT NULL,
	"properties" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "events_event_idx" ON "events" USING btree ("event");--> statement-breakpoint
CREATE INDEX "events_userId_idx" ON "events" USING btree ("userId");