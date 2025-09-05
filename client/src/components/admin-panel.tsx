import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Gamepad, Plus, List, ChartLine, Download, Trash, Check, X } from "lucide-react";
import type { Game, Bet } from "@shared/schema";

export default function AdminPanel() {
  const [gameName, setGameName] = useState("");
  const [oddValue, setOddValue] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: games = [], isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const { data: bets = [], isLoading: betsLoading } = useQuery<Bet[]>({
    queryKey: ["/api/bets"],
  });

  const addGameMutation = useMutation({
    mutationFn: async (gameData: { name: string; odd: number }) => {
      const res = await apiRequest("POST", "/api/games", gameData);
      return res.json();
    },
    onSuccess: (newGame) => {
      toast({
        title: "Jogo adicionado com sucesso!",
        description: `Jogo "${newGame.name}" foi adicionado com odd ${newGame.odd}.`,
      });
      setGameName("");
      setOddValue("");
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
    },
    onError: () => {
      toast({
        title: "Erro ao adicionar jogo",
        description: "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const removeGameMutation = useMutation({
    mutationFn: async (gameId: string) => {
      const res = await apiRequest("DELETE", `/api/games/${gameId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Jogo removido com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
    },
    onError: () => {
      toast({
        title: "Erro ao remover jogo",
        variant: "destructive",
      });
    },
  });

  const updateBetStatusMutation = useMutation({
    mutationFn: async ({ betId, status }: { betId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/bets/${betId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status da aposta atualizado!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar status",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const handleAddGame = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gameName.trim() || !oddValue) {
      toast({
        title: "Preencha todos os campos!",
        variant: "destructive",
      });
      return;
    }

    const odd = parseFloat(oddValue);
    if (isNaN(odd) || odd <= 0) {
      toast({
        title: "Odd inválida",
        description: "A odd deve ser um número maior que 0.",
        variant: "destructive",
      });
      return;
    }

    addGameMutation.mutate({
      name: gameName.trim(),
      odd,
    });
  };

  const handleRemoveGame = (game: Game) => {
    if (confirm(`Tem certeza que deseja remover o jogo "${game.name}"?`)) {
      removeGameMutation.mutate(game.id);
    }
  };

  const handleUpdateBetStatus = (bet: Bet, status: string) => {
    if (confirm(`Confirmar que a aposta ${status.toLowerCase()}?`)) {
      updateBetStatusMutation.mutate({ betId: bet.id, status });
    }
  };

  const exportCSV = () => {
    if (bets.length === 0) {
      toast({
        title: "Nenhuma aposta para exportar!",
        variant: "destructive",
      });
      return;
    }

    let csv = "Jogador,Jogo,Valor (EUR),Odd,Possível Ganho (EUR),Status,Data/Hora\n";
    bets.forEach(bet => {
      const timestamp = new Date(bet.createdAt).toLocaleString('pt-BR');
      csv += `"${bet.playerName}","${bet.gameName}",${bet.amount},${bet.odd},${bet.possibleWin},"${bet.status}","${timestamp}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_apostas_masterleague_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Relatório CSV exportado com sucesso!",
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Pendente": return "status-pending";
      case "Ganhou": return "status-won";
      case "Perdeu": return "status-lost";
      default: return "status-pending";
    }
  };

  return (
    <div className="animate-slide-in">
      <div className="grid gap-8 lg:grid-cols-1">
        {/* Game Management */}
        <Card className="shadow-lg border border-border">
          <CardContent className="p-6">
            <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center">
              <Gamepad className="text-accent mr-3" />
              Gerenciar Jogos e Odds
            </h2>
            
            <form onSubmit={handleAddGame} className="grid gap-4 md:grid-cols-3 mb-6">
              <div>
                <Label htmlFor="game-name" className="block text-sm font-medium text-foreground mb-2">
                  Nome do Jogo
                </Label>
                <Input
                  id="game-name"
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Ex: Brasil vs Argentina"
                  data-testid="input-game-name"
                />
              </div>
              <div>
                <Label htmlFor="odd-value" className="block text-sm font-medium text-foreground mb-2">
                  Odd
                </Label>
                <Input
                  id="odd-value"
                  type="number"
                  step="0.01"
                  value={oddValue}
                  onChange={(e) => setOddValue(e.target.value)}
                  placeholder="Ex: 1.75"
                  data-testid="input-odd-value"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  disabled={addGameMutation.isPending}
                  data-testid="button-add-game"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addGameMutation.isPending ? "Adicionando..." : "Adicionar Jogo"}
                </Button>
              </div>
            </form>

            {/* Active Games Table */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <List className="text-muted-foreground mr-2" />
                Jogos Ativos
              </h3>
              <div className="data-table overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="text-primary-foreground bg-primary hover:bg-primary">
                      <TableHead className="text-primary-foreground font-semibold">Jogo</TableHead>
                      <TableHead className="text-center text-primary-foreground font-semibold">Odd</TableHead>
                      <TableHead className="text-center text-primary-foreground font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gamesLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Carregando jogos...
                        </TableCell>
                      </TableRow>
                    ) : games.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          <div className="flex flex-col items-center">
                            <List className="w-8 h-8 mb-2" />
                            Nenhum jogo cadastrado ainda
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      games.map((game) => (
                        <TableRow key={game.id}>
                          <TableCell className="font-medium text-foreground">{game.name}</TableCell>
                          <TableCell className="text-center">
                            <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-semibold">
                              {game.odd}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveGame(game)}
                              disabled={removeGameMutation.isPending}
                              data-testid={`button-remove-game-${game.id}`}
                            >
                              <Trash className="w-4 h-4 mr-1" />
                              Remover
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bets Management */}
        <Card className="shadow-lg border border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center">
                <ChartLine className="text-accent mr-3" />
                Relatório de Apostas
              </h2>
              <Button
                variant="secondary"
                onClick={exportCSV}
                disabled={bets.length === 0}
                data-testid="button-export-csv"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
            
            <div className="data-table overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-primary-foreground bg-primary hover:bg-primary">
                    <TableHead className="text-primary-foreground font-semibold">Jogador</TableHead>
                    <TableHead className="text-primary-foreground font-semibold">Jogo</TableHead>
                    <TableHead className="text-right text-primary-foreground font-semibold">Valor (€)</TableHead>
                    <TableHead className="text-center text-primary-foreground font-semibold">Odd</TableHead>
                    <TableHead className="text-right text-primary-foreground font-semibold">Possível Ganho (€)</TableHead>
                    <TableHead className="text-center text-primary-foreground font-semibold">Status</TableHead>
                    <TableHead className="text-center text-primary-foreground font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {betsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Carregando apostas...
                      </TableCell>
                    </TableRow>
                  ) : bets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center">
                          <ChartLine className="w-8 h-8 mb-2" />
                          Nenhuma aposta registrada ainda
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    bets.map((bet) => (
                      <TableRow key={bet.id}>
                        <TableCell className="font-medium text-foreground">{bet.playerName}</TableCell>
                        <TableCell className="text-foreground">{bet.gameName}</TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatCurrency(bet.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="bg-muted text-muted-foreground px-2 py-1 rounded text-sm">
                            {bet.odd}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-accent">
                          {formatCurrency(bet.possibleWin)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`status-badge ${getStatusBadgeClass(bet.status)}`}>
                            {bet.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {bet.status === 'Pendente' ? (
                            <div className="flex space-x-1 justify-center">
                              <Button
                                size="sm"
                                className="bg-success hover:bg-success/90 text-success-foreground px-2 py-1 text-xs"
                                onClick={() => handleUpdateBetStatus(bet, 'Ganhou')}
                                disabled={updateBetStatusMutation.isPending}
                                data-testid={`button-bet-won-${bet.id}`}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Ganhou
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="px-2 py-1 text-xs"
                                onClick={() => handleUpdateBetStatus(bet, 'Perdeu')}
                                disabled={updateBetStatusMutation.isPending}
                                data-testid={`button-bet-lost-${bet.id}`}
                              >
                                <X className="w-3 h-3 mr-1" />
                                Perdeu
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Finalizado</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
