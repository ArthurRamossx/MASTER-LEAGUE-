import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Wallet, User, Volleyball, Euro, Info } from "lucide-react";
import type { Game } from "@shared/schema";

interface PlayerBettingProps {
  games: Game[];
}

export default function PlayerBetting({ games }: PlayerBettingProps) {
  const [playerName, setPlayerName] = useState("");
  const [selectedGameId, setSelectedGameId] = useState("");
  const [selectedBetType, setSelectedBetType] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const placeBetMutation = useMutation({
    mutationFn: async (betData: any) => {
      const res = await apiRequest("POST", "/api/bets", betData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Aposta realizada com sucesso!",
        description: `Aposta de ${formatCurrency(parseFloat(betAmount))} registrada para ${playerName}.`,
      });
      // Clear form
      setPlayerName("");
      setSelectedGameId("");
      setSelectedBetType("");
      setBetAmount("");
      setDisplayAmount("");
      // Invalidate bets cache
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao fazer aposta",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR'
    }).format(numAmount);
  };

  const formatBetAmount = (value: string) => {
    // Remove tudo que não é dígito
    const cleanValue = value.replace(/\D/g, '');
    
    // Se não tem valor, retorna vazio
    if (!cleanValue) return '';
    
    // Formata com pontos a cada 3 dígitos
    return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const cleanBetAmount = (value: string) => {
    // Remove pontos para obter o valor numérico
    return value.replace(/\./g, '');
  };

  const handleBetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatBetAmount(inputValue);
    const cleaned = cleanBetAmount(formatted);
    
    setDisplayAmount(formatted);
    setBetAmount(cleaned);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName.trim() || !selectedGameId || !selectedBetType || !betAmount) {
      toast({
        title: "Preencha todos os campos!",
        variant: "destructive",
      });
      return;
    }

    const amount = parseInt(betAmount, 10);
    if (isNaN(amount) || amount < 500000 || amount > 5000000) {
      toast({
        title: "Valor inválido",
        description: "A aposta deve estar entre €500.000 e €5.000.000",
        variant: "destructive",
      });
      return;
    }

    const selectedGame = games.find(g => g.id === selectedGameId);
    if (!selectedGame) {
      toast({
        title: "Jogo inválido",
        variant: "destructive",
      });
      return;
    }

    // Get the correct odd based on bet type
    let selectedOdd: number;
    switch (selectedBetType) {
      case "home":
        selectedOdd = selectedGame.homeOdd;
        break;
      case "away":
        selectedOdd = selectedGame.awayOdd;
        break;
      case "draw":
        selectedOdd = selectedGame.drawOdd;
        break;
      default:
        toast({
          title: "Tipo de aposta inválido",
          variant: "destructive",
        });
        return;
    }

    const possibleWin = amount * selectedOdd;

    placeBetMutation.mutate({
      playerName: playerName.trim(),
      gameId: selectedGameId,
      gameName: selectedGame.name,
      betType: selectedBetType,
      amount: amount.toString(),
      odd: selectedOdd,
      possibleWin: possibleWin.toString(),
    });
  };

  return (
    <div className="animate-slide-in">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg border border-border">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="text-accent text-2xl" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">Fazer Aposta</h2>
              <p className="text-muted-foreground mt-2">Escolha um jogo e faça sua aposta no eFootball 2026</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="player-name" className="block text-sm font-medium text-foreground mb-2">
                  Seu Nome
                </Label>
                <div className="relative">
                  <Input
                    id="player-name"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="pl-10"
                    placeholder="Digite seu nome completo"
                    data-testid="input-player-name"
                  />
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="game-select" className="block text-sm font-medium text-foreground mb-2">
                  Jogo Disponível
                </Label>
                <div className="relative">
                  <Select value={selectedGameId} onValueChange={(value) => {
                    setSelectedGameId(value);
                    setSelectedBetType(""); // Reset bet type when game changes
                  }}>
                    <SelectTrigger className="pl-10" data-testid="select-game">
                      <div className="flex items-center">
                        <Volleyball className="w-4 h-4 text-muted-foreground mr-2" />
                        <SelectValue placeholder="Selecione um jogo..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {games.length === 0 ? (
                        <SelectItem value="no-games" disabled>Nenhum jogo disponível</SelectItem>
                      ) : (
                        games.map((game) => (
                          <SelectItem key={game.id} value={game.id}>
                            {game.name} - {game.homeTeam} vs {game.awayTeam}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {selectedGameId && (
                <div>
                  <Label htmlFor="bet-type-select" className="block text-sm font-medium text-foreground mb-2">
                    Tipo de Aposta
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(() => {
                      const selectedGame = games.find(g => g.id === selectedGameId);
                      if (!selectedGame) return null;
                      
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedBetType("home")}
                            className={`p-3 border rounded-lg text-center transition-colors ${
                              selectedBetType === "home" 
                                ? "bg-success text-success-foreground border-success" 
                                : "border-border hover:bg-muted"
                            }`}
                            data-testid="button-bet-home"
                          >
                            <div className="font-semibold text-sm">{selectedGame.homeTeam}</div>
                            <div className="text-xs opacity-70">Casa</div>
                            <div className="font-bold text-lg">{selectedGame.homeOdd}</div>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setSelectedBetType("draw")}
                            className={`p-3 border rounded-lg text-center transition-colors ${
                              selectedBetType === "draw" 
                                ? "bg-warning text-warning-foreground border-warning" 
                                : "border-border hover:bg-muted"
                            }`}
                            data-testid="button-bet-draw"
                          >
                            <div className="font-semibold text-sm">Empate</div>
                            <div className="text-xs opacity-70">X</div>
                            <div className="font-bold text-lg">{selectedGame.drawOdd}</div>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setSelectedBetType("away")}
                            className={`p-3 border rounded-lg text-center transition-colors ${
                              selectedBetType === "away" 
                                ? "bg-destructive text-destructive-foreground border-destructive" 
                                : "border-border hover:bg-muted"
                            }`}
                            data-testid="button-bet-away"
                          >
                            <div className="font-semibold text-sm">{selectedGame.awayTeam}</div>
                            <div className="text-xs opacity-70">Fora</div>
                            <div className="font-bold text-lg">{selectedGame.awayOdd}</div>
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="bet-amount" className="block text-sm font-medium text-foreground mb-2">
                  Valor da Aposta
                </Label>
                <div className="relative">
                  <Input
                    id="bet-amount"
                    type="text"
                    value={displayAmount}
                    onChange={handleBetAmountChange}
                    className="pl-10"
                    placeholder="Min: €500.000 - Max: €5.000.000"
                    data-testid="input-bet-amount"
                  />
                  <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                </div>
                <p className="text-sm text-muted-foreground mt-2 flex items-center">
                  <Info className="w-4 h-4 mr-1" />
                  Limite: €500.000 a €5.000.000
                </p>
              </div>
              
              {/* Possible Win Preview */}
              {selectedGameId && selectedBetType && displayAmount && betAmount && !isNaN(parseFloat(betAmount)) && (
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Possível Ganho</p>
                    <p className="text-2xl font-bold text-accent">
                      {(() => {
                        const selectedGame = games.find(g => g.id === selectedGameId);
                        if (!selectedGame) return "€0,00";
                        
                        let selectedOdd: number;
                        switch (selectedBetType) {
                          case "home":
                            selectedOdd = selectedGame.homeOdd;
                            break;
                          case "away":
                            selectedOdd = selectedGame.awayOdd;
                            break;
                          case "draw":
                            selectedOdd = selectedGame.drawOdd;
                            break;
                          default:
                            return "€0,00";
                        }
                        
                        const amount = parseInt(betAmount, 10);
                        const possibleWin = amount * selectedOdd;
                        return formatCurrency(possibleWin);
                      })()}
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full py-4 text-lg font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={placeBetMutation.isPending || games.length === 0 || !selectedBetType}
                data-testid="button-place-bet"
              >
                {placeBetMutation.isPending ? "Processando..." : "Confirmar Aposta"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
