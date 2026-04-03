import { pgTable, serial, timestamp, text, integer, varchar, json } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户表
export const users = pgTable("users", {
	id: serial().notNull().primaryKey(),
	username: varchar("username", { length: 50 }).unique(), // 账号名（登录用）
	password: varchar("password", { length: 255 }), // 密码
	deviceId: varchar("device_id", { length: 255 }).unique(), // 设备ID（可选，用于未登录用户）
	phone: varchar("phone", { length: 20 }).unique(), // 手机号（可选）
	name: varchar("name", { length: 100 }).notNull(),
	avatarUrl: text("avatar_url"),
	height: integer("height"), // 身高(cm)
	weight: integer("weight"), // 体重(kg)
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 群组成员表
export const groupMembers = pgTable("group_members", {
	id: serial().notNull().primaryKey(),
	groupId: integer("group_id").notNull().references(() => groups.id),
	userId: integer("user_id").notNull().references(() => users.id),
	role: varchar("role", { length: 20 }).default("member"), // owner, admin, member
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

// 验证码表
export const verificationCodes = pgTable("verification_codes", {
	id: serial().notNull().primaryKey(),
	phone: varchar("phone", { length: 20 }).notNull(),
	code: varchar("code", { length: 6 }).notNull(), // 6位验证码
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(), // 过期时间
	used: integer("used").default(0), // 是否已使用 0-未使用 1-已使用
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

// 身体数据记录表（记录历史变化）
export const bodyRecords = pgTable("body_records", {
	id: serial().notNull().primaryKey(),
	userId: varchar("user_id", { length: 255 }).notNull(), // 设备ID
	height: integer("height"), // 身高(cm)
	weight: integer("weight"), // 体重(kg)
	recordDate: text("record_date").notNull(), // 记录日期 YYYY-MM-DD
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

// 群组表
export const groups = pgTable("groups", {
	id: serial().notNull().primaryKey(),
	code: varchar("code", { length: 20 }).notNull().unique(), // 群组邀请码
	name: varchar("name", { length: 100 }).notNull().default("运动打卡群"),
	createdBy: integer("created_by"), // 创建者用户ID
	maxMembers: integer("max_members").default(150), // 最大成员数
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

// 群组消息表
export const groupMessages = pgTable("group_messages", {
	id: serial().notNull().primaryKey(),
	groupId: integer("group_id").notNull(),
	userId: integer("user_id"), // 可为null，系统消息没有发送者
	content: text("content").notNull(),
	type: varchar("type", { length: 20 }).default("text"), // text, image, workout_record, system, daily_summary
	photoUrl: text("photo_url"), // 图片消息URL
	workoutData: json("workout_data"), // 运动记录详情 { type, duration, photoUrl, date } 或每日总结数据
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

// 运动记录表
export const workoutRecords = pgTable("workout_records", {
	id: serial().notNull().primaryKey(),
	userId: varchar("user_id", { length: 255 }).notNull(), // 设备ID
	date: text("date").notNull(), // 运动日期 YYYY-MM-DD
	duration: integer("duration").notNull(), // 运动时长（分钟）
	type: text("type").notNull(), // 运动类型
	photoUrl: text("photo_url"), // 照片URL（第一张）
	photoUrls: json("photo_urls"), // 所有照片URL数组
	calories: integer("calories"), // 消耗卡路里(kcal)
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});
