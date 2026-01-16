import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

/* ---------- ENUMS ---------- */

export const roleEnum = pgEnum("role", [
  "STUDENT",
  "FACULTY",
  "ADMIN",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "SCHEDULED",
  "ACTIVE",
  "CLOSED",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "PRESENT",
  "FACE_ONLY",
  "FINGERPRINT_ONLY",
  "ABSENT",
]);

/* ---------- USERS ---------- */

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  role: text("role").notNull().default("STUDENT"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

/* ---------- ADMIN USERS ---------- */

export const adminUsers = pgTable("admin_users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // In production, this should be hashed
  email: text("email").notNull().default("admin@system.com"),
  role: text("role").notNull().default("ADMIN"),
  firstName: text("first_name").default("Admin"),
  lastName: text("last_name").default("User"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

/* ---------- STUDENTS ---------- */
export const students = pgTable("students", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  clerkUserId: text("clerk_user_id").unique(), // Will be set after student signs up
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  class: text("class").notNull(),
  faceId: text("face_id"), // F_<id> stored in Pinecone
  fingerprintId: text("fingerprint_id"), // FP_<id> for fingerprint system
  invitationSent: boolean("invitation_sent").default(false),
  isActive: boolean("is_active").default(false), // Becomes true after student signs up
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

/* ---------- FACULTY ---------- */

export const faculty = pgTable("faculty", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  clerkUserId: text("clerk_user_id").unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  department: text("department").notNull(),
  designation: text("designation"),
  employeeId: text("employee_id").unique(),
  assignedClasses: jsonb("assigned_classes").$type<string[]>().default([]),
  invitationSent: boolean("invitation_sent").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

/* ---------- CLASSES ---------- */
export const classes = pgTable("classes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  grade: text("grade").notNull(),
  section: text("section").notNull(),
  roomNumber: text("room_number"),
  maxCapacity: integer("max_capacity").notNull(),
  teacherId: integer("teacher_id").references(() => faculty.id),
  subjects: jsonb("subjects").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

/* ---------- SESSIONS ---------- */
export const sessions = pgTable("sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  facultyId: integer("faculty_id").references(() => faculty.id).notNull(),
  subject: text("subject").notNull(),
  scheduledStartTime: timestamp("scheduled_start_time").notNull(),
  scheduledEndTime: timestamp("scheduled_end_time").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  status: sessionStatusEnum("status").default("SCHEDULED"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

/* ---------- ATTENDANCE ---------- */
export const attendance = pgTable("attendance", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sessionId: integer("session_id").references(() => sessions.id).notNull(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  faceRecognizedAt: timestamp("face_recognized_at"),
  fingerprintVerifiedAt: timestamp("fingerprint_verified_at"),
  faceConfidence: integer("face_confidence"), // Store as percentage 0-100
  status: attendanceStatusEnum("status").default("ABSENT"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

/* ---------- AMBIGUOUS ATTENDANCE ---------- */
export const ambiguousAttendance = pgTable("ambiguous_attendance", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sessionId: integer("session_id").references(() => sessions.id).notNull(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  possibleStudentIds: jsonb("possible_student_ids").$type<number[]>().default([]),
  faceEmbedding: jsonb("face_embedding").$type<number[]>(),
  fingerprintData: text("fingerprint_data"),
  reason: text("reason").notNull(), // "duplicate_face", "duplicate_fingerprint", "low_confidence", "mismatch"
  resolved: boolean("resolved").default(false),
  resolvedStudentId: integer("resolved_student_id").references(() => students.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

