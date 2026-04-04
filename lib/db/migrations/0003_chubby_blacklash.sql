CREATE TABLE "domain_blacklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" varchar(255) NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "domain_blacklist_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "ip_blacklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" varchar(45) NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ip_blacklist_ip_unique" UNIQUE("ip")
);
