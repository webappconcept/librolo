ALTER TABLE "users" ADD COLUMN "stripe_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_subscription_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_product_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan_name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_status" varchar(50);