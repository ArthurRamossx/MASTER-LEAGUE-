import { type User, type InsertUser, type Game, type InsertGame, type Bet, type InsertBet } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Games
  getAllGames(): Promise<Game[]>;
  getActiveGames(): Promise<Game[]>;
  getGame(id: string): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  deleteGame(id: string): Promise<boolean>;
  
  // Bets
  getAllBets(): Promise<Bet[]>;
  getBet(id: string): Promise<Bet | undefined>;
  createBet(bet: InsertBet): Promise<Bet>;
  updateBetStatus(id: string, status: string): Promise<Bet | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private games: Map<string, Game>;
  private bets: Map<string, Bet>;

  constructor() {
    this.users = new Map();
    this.games = new Map();
    this.bets = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllGames(): Promise<Game[]> {
    return Array.from(this.games.values());
  }

  async getActiveGames(): Promise<Game[]> {
    return Array.from(this.games.values()).filter(game => game.isActive === 1);
  }

  async getGame(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = randomUUID();
    const game: Game = {
      ...insertGame,
      id,
      isActive: 1,
      createdAt: new Date(),
    };
    this.games.set(id, game);
    return game;
  }

  async deleteGame(id: string): Promise<boolean> {
    return this.games.delete(id);
  }

  async getAllBets(): Promise<Bet[]> {
    return Array.from(this.bets.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getBet(id: string): Promise<Bet | undefined> {
    return this.bets.get(id);
  }

  async createBet(insertBet: InsertBet): Promise<Bet> {
    const id = randomUUID();
    const bet: Bet = {
      ...insertBet,
      id,
      status: "Pendente",
      createdAt: new Date(),
    };
    this.bets.set(id, bet);
    return bet;
  }

  async updateBetStatus(id: string, status: string): Promise<Bet | undefined> {
    const bet = this.bets.get(id);
    if (bet) {
      bet.status = status;
      this.bets.set(id, bet);
      return bet;
    }
    return undefined;
  }
}

export const storage = new MemStorage();
