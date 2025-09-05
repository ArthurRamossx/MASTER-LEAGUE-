import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  homeOdd: real("home_odd").notNull(),
  awayOdd: real("away_odd").notNull(),
  drawOdd: real("draw_odd").notNull(),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bets = pgTable("bets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerName: text("player_name").notNull(),
  gameId: varchar("game_id").references(() => games.id).notNull(),
  gameName: text("game_name").notNull(),
  betType: text("bet_type").notNull(), // "home", "away", "draw"
  amount: real("amount").notNull(),
  odd: real("odd").notNull(),
  possibleWin: real("possible_win").notNull(),
  status: text("status").notNull().default("Pendente"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGameSchema = createInsertSchema(games).pick({
  name: true,
  homeTeam: true,
  awayTeam: true,
  homeOdd: true,
  awayOdd: true,
  drawOdd: true,
});

export const insertBetSchema = createInsertSchema(bets).pick({
  playerName: true,
  gameId: true,
  gameName: true,
  betType: true,
  amount: true,
  odd: true,
  possibleWin: true,
});

export const updateBetStatusSchema = z.object({
  status: z.enum(["Pendente", "Ganhou", "Perdeu"]),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

export type InsertBet = z.infer<typeof insertBetSchema>;
export type Bet = typeof bets.$inferSelect;

export type UpdateBetStatus = z.infer<typeof updateBetStatusSchema>;
