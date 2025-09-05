import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSchema, insertBetSchema, updateBetStatusSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Admin authentication
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { password } = req.body;
      if (password === "admin123") {
        res.json({ success: true, message: "Login successful" });
      } else {
        res.status(401).json({ success: false, message: "Invalid password" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Games routes
  app.get("/api/games", async (req, res) => {
    try {
      const games = await storage.getActiveGames();
      res.json(games);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  app.post("/api/games", async (req, res) => {
    try {
      const validatedData = insertGameSchema.parse(req.body);
      const game = await storage.createGame(validatedData);
      res.json(game);
    } catch (error) {
      res.status(400).json({ message: "Invalid game data" });
    }
  });

  app.delete("/api/games/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteGame(id);
      if (success) {
        res.json({ success: true, message: "Game deleted" });
      } else {
        res.status(404).json({ message: "Game not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete game" });
    }
  });

  // Bets routes
  app.get("/api/bets", async (req, res) => {
    try {
      const bets = await storage.getAllBets();
      res.json(bets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bets" });
    }
  });

  app.post("/api/bets", async (req, res) => {
    try {
      const validatedData = insertBetSchema.parse(req.body);
      
      // Validate bet amount
      if (validatedData.amount < 500000 || validatedData.amount > 5000000) {
        return res.status(400).json({ 
          message: "Bet amount must be between €500,000 and €5,000,000" 
        });
      }

      const bet = await storage.createBet(validatedData);
      res.json(bet);
    } catch (error) {
      res.status(400).json({ message: "Invalid bet data" });
    }
  });

  app.patch("/api/bets/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = updateBetStatusSchema.parse(req.body);
      
      const updatedBet = await storage.updateBetStatus(id, status);
      if (updatedBet) {
        res.json(updatedBet);
      } else {
        res.status(404).json({ message: "Bet not found" });
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid status data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
