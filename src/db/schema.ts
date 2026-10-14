import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const waitlist = pgTable('waitlist', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const scripts = pgTable('scripts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  episodeTag: text('episode_tag'),
  category: text('category').notNull().default('draft'),
  content: text('content').notNull(),
  pacingWpm: integer('pacing_wpm').notNull().default(140),
  wordCount: integer('word_count').notNull().default(0),
  estimatedReadTime: text('estimated_read_time').notNull().default('1m 00s'),
  updatedAt: text('updated_at').notNull().default('Just now'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const licenses = pgTable('licenses', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  isPro: boolean('is_pro').notNull().default(false),
  licenseKey: text('license_key'),
  tier: text('tier').notNull().default('Free Tier'),
  activatedAt: timestamp('activated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  scripts: many(scripts),
  license: one(licenses, {
    fields: [users.uid],
    references: [licenses.userId],
  }),
}));

export const scriptsRelations = relations(scripts, ({ one }) => ({
  user: one(users, {
    fields: [scripts.userId],
    references: [users.uid],
  }),
}));

export const licensesRelations = relations(licenses, ({ one }) => ({
  user: one(users, {
    fields: [licenses.userId],
    references: [users.uid],
  }),
}));
