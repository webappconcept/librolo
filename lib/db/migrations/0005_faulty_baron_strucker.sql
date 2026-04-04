CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"ip" varchar(45) NOT NULL,
	"attempted_at" timestamp DEFAULT now() NOT NULL,
	"success" boolean DEFAULT false NOT NULL
);
