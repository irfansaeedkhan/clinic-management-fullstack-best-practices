ALTER TYPE "public"."clinic_user_status" RENAME TO "staff_status";
--> statement-breakpoint
ALTER TYPE "public"."clinic_user_role_enum" RENAME TO "staff_role_enum";
--> statement-breakpoint
ALTER TABLE "public"."clinic_user" RENAME TO "staff";
--> statement-breakpoint
ALTER TABLE "public"."clinic_user_role" RENAME TO "staff_role";
--> statement-breakpoint
ALTER TABLE "public"."staff_role" RENAME COLUMN "clinic_user_id" TO "staff_id";
--> statement-breakpoint
ALTER INDEX "clinic_user_user_id_clinic_id_unique" RENAME TO "staff_user_id_clinic_id_unique";
--> statement-breakpoint
ALTER INDEX "clinic_user_role_clinic_user_id_role_unique" RENAME TO "staff_role_staff_id_role_unique";
--> statement-breakpoint
ALTER TABLE "staff" RENAME CONSTRAINT "clinic_user_user_id_user_id_fk" TO "staff_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "staff" RENAME CONSTRAINT "clinic_user_clinic_id_clinic_id_fk" TO "staff_clinic_id_clinic_id_fk";
--> statement-breakpoint
ALTER TABLE "staff_role" RENAME CONSTRAINT "clinic_user_role_clinic_user_id_clinic_user_id_fk" TO "staff_role_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER SEQUENCE "clinic_user_id_seq" RENAME TO "staff_id_seq";
--> statement-breakpoint
ALTER SEQUENCE "clinic_user_role_id_seq" RENAME TO "staff_role_id_seq";
