import { pgTable, unique, integer, text, jsonb, timestamp, boolean, serial, varchar, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const role = pgEnum("role", ['STUDENT', 'FACULTY', 'FACULTY_PENDING', 'ADMIN'])


export const faculty = pgTable("faculty", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "faculty_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	clerkUserId: text("clerk_user_id"),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	email: text().notNull(),
	phone: text().notNull(),
	department: text().notNull(),
	designation: text(),
	employeeId: text("employee_id"),
	assignedClasses: jsonb("assigned_classes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	invitationSent: boolean("invitation_sent").default(false),
}, (table) => [
	unique("faculty_clerk_user_id_unique").on(table.clerkUserId),
	unique("faculty_email_unique").on(table.email),
	unique("faculty_employee_id_unique").on(table.employeeId),
]);

export const adminUsers = pgTable("admin_users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "admin_users_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	username: text().notNull(),
	password: text().notNull(),
	email: text().default('admin@system.com').notNull(),
	role: text().default('ADMIN').notNull(),
	firstName: text("first_name").default('Admin'),
	lastName: text("last_name").default('User'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("admin_users_username_unique").on(table.username),
]);

export const users = pgTable("users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "users_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	clerkUserId: text("clerk_user_id").notNull(),
	email: text().notNull(),
	role: text().default('STUDENT').notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_clerk_user_id_unique").on(table.clerkUserId),
]);

export const students = pgTable("students", {
	id: serial().primaryKey().notNull(),
	firstName: varchar("first_name", { length: 100 }).notNull(),
	lastName: varchar("last_name", { length: 100 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 20 }).notNull(),
	class: varchar({ length: 50 }).notNull(),
	clerkUserId: varchar("clerk_user_id", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	faceId: text("face_id"),
	fingerprintId: text("fingerprint_id"),
	invitationSent: boolean("invitation_sent").default(false),
	isActive: boolean("is_active").default(false),
});
