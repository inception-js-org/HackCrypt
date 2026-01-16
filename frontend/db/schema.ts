import {
  pgTable,
  uuid,
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
  "FACULTY_PENDING",
  "ADMIN",
]);

// export const sessionStatusEnum = pgEnum("session_status", [
//   "ACTIVE",
//   "CLOSED",
// ]);

// export const attendanceStatusEnum = pgEnum("attendance_status", [
//   "PRESENT",
//   "REJECTED",
//   "FLAGGED",
// ]);

// export const anomalySeverityEnum = pgEnum("anomaly_severity", [
//   "LOW",
//   "MEDIUM",
//   "HIGH",
// ]);

/* ---------- USERS (AUTH ANCHOR) ---------- */

// db/schema.ts
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

// /* ---------- FACULTY ---------- */

// export const faculty = pgTable("faculty", {
//   id: uuid("id").defaultRandom().primaryKey(),
//   userId: uuid("user_id")
//     .references(() => users.id)
//     .notNull(),
//   department: text("department"),
//   designation: text("designation"),
// });

// /* ---------- CLASSROOMS / COURSES ---------- */

// export const classrooms = pgTable("classrooms", {
//   id: uuid("id").defaultRandom().primaryKey(),
//   courseCode: text("course_code").notNull(),
//   courseName: text("course_name").notNull(),
//   type: text("type"), // LECTURE | LAB
// });

// /* ---------- CLASS SESSIONS ---------- */

// export const sessions = pgTable("sessions", {
//   id: uuid("id").defaultRandom().primaryKey(),
//   classroomId: uuid("classroom_id")
//     .references(() => classrooms.id)
//     .notNull(),
//   facultyId: uuid("faculty_id")
//     .references(() => faculty.id)
//     .notNull(),
//   startTime: timestamp("start_time").notNull(),
//   endTime: timestamp("end_time"),
//   status: sessionStatusEnum("status").default("ACTIVE"),
// });

// /* ---------- ID CARD PROFILES ---------- */

// export const idCards = pgTable("id_cards", {
//   id: uuid("id").defaultRandom().primaryKey(),
//   studentId: uuid("student_id")
//     .references(() => students.id)
//     .notNull(),
//   extractedName: text("extracted_name"),
//   extractedRoll: text("extracted_roll"),
//   faceImagePath: text("face_image_path"),
//   validationScore: integer("validation_score"),
//   verified: boolean("verified").default(false),
// });

// /* ---------- FINGERPRINTS (SIMULATED) ---------- */

// export const fingerprints = pgTable("fingerprints", {
//   id: uuid("id").defaultRandom().primaryKey(),
//   studentId: uuid("student_id")
//     .references(() => students.id)
//     .notNull(),
//   fingerprintVector: jsonb("fingerprint_vector").notNull(),
// });

// /* ---------- ATTENDANCE ---------- */

// export const attendanceRecords = pgTable("attendance_records", {
//   id: uuid("id").defaultRandom().primaryKey(),
//   sessionId: uuid("session_id")
//     .references(() => sessions.id)
//     .notNull(),
//   studentId: uuid("student_id")
//     .references(() => students.id)
//     .notNull(),
//   status: attendanceStatusEnum("status").notNull(),
//   confidenceScore: integer("confidence_score"),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// /* ---------- ANOMALY / PROXY LOGS ---------- */

// export const anomalyLogs = pgTable("anomaly_logs", {
//   id: uuid("id").defaultRandom().primaryKey(),
//   userId: uuid("user_id")
//     .references(() => users.id)
//     .notNull(),
//   sessionId: uuid("session_id")
//     .references(() => sessions.id),
//   reason: text("reason").notNull(),
//   severity: anomalySeverityEnum("severity").default("LOW"),
//   createdAt: timestamp("created_at").defaultNow(),
// });
