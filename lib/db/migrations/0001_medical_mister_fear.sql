ALTER TABLE "invitations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "team_members" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "teams" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "invitations" CASCADE;--> statement-breakpoint
DROP TABLE "team_members" CASCADE;--> statement-breakpoint
DROP TABLE "teams" CASCADE;--> statement-breakpoint
ALTER TABLE "activity_logs" DROP COLUMN IF EXISTS "team_id";