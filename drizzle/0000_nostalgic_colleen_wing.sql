CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"imageUrl" varchar(512) NOT NULL,
	"credits" integer DEFAULT 3
);
