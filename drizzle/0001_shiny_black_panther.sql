CREATE TABLE "designs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(256) NOT NULL,
	"originalImageUrl" varchar(512) NOT NULL,
	"generatedImageUrl" varchar(512) NOT NULL,
	"roomType" varchar(100) NOT NULL,
	"designType" varchar(100) NOT NULL,
	"additionalRequirements" text,
	"createdAt" timestamp DEFAULT now()
);
