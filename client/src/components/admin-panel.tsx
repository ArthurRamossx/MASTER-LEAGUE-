import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Gamepad, Plus, List, ChartLine, Download, Trash, Check, X, FileText, FileImage } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Game, Bet } from "@shared/schema";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminPanel() {
  const [gameName, setGameName] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeOdd, setHomeOdd] = useState("");
  const [awayOdd, setAwayOdd] = useState("");
  const [drawOdd, setDrawOdd] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: games = [], isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const { data: bets = [], isLoading: betsLoading } = useQuery<Bet[]>({
    queryKey: ["/api/bets"],
  });

  const addGameMutation = useMutation({
    mutationFn: async (gameData: { name: string; homeTeam: string; awayTeam: string; homeOdd: number; awayOdd: number; drawOdd: number }) => {
      const res = await apiRequest("POST", "/api/games", gameData);
      return res.json();
    },
    onSuccess: (newGame) => {
      toast({
        title: "Jogo adicionado com sucesso!",
        description: `Jogo "${newGame.name}" foi adicionado com as odds.`,
      });
      setGameName("");
      setHomeTeam("");
      setAwayTeam("");
      setHomeOdd("");
      setAwayOdd("");
      setDrawOdd("");
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

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR'
    }).format(numAmount);
  };

  const handleAddGame = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gameName.trim() || !homeTeam.trim() || !awayTeam.trim() || !homeOdd || !awayOdd || !drawOdd) {
      toast({
        title: "Preencha todos os campos!",
        variant: "destructive",
      });
      return;
    }

    const home = parseFloat(homeOdd);
    const away = parseFloat(awayOdd);
    const draw = parseFloat(drawOdd);
    
    if (isNaN(home) || home <= 0 || isNaN(away) || away <= 0 || isNaN(draw) || draw <= 0) {
      toast({
        title: "Odds inválidas",
        description: "Todas as odds devem ser números maiores que 0.",
        variant: "destructive",
      });
      return;
    }

    addGameMutation.mutate({
      name: gameName.trim(),
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      homeOdd: home,
      awayOdd: away,
      drawOdd: draw,
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

  const getBetTypeLabel = (type: string) => {
    switch (type) {
      case "home": return "Casa";
      case "away": return "Fora";
      case "draw": return "Empate";
      default: return type;
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

    let csv = "Jogador,Jogo,Tipo de Aposta,Valor (EUR),Odd,Possível Ganho (EUR),Status,Data/Hora\n";
    bets.forEach(bet => {
      const timestamp = new Date(bet.createdAt).toLocaleString('pt-BR');
      const betType = getBetTypeLabel(bet.betType);
      csv += `"${bet.playerName}","${bet.gameName}","${betType}",${bet.amount},${bet.odd},${bet.possibleWin},"${bet.status}","${timestamp}"\n`;
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

  const exportPDF = () => {
    if (bets.length === 0) {
      toast({
        title: "Nenhuma aposta para exportar!",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString('pt-BR');
    
    // Título
    doc.setFontSize(18);
    doc.text('Master League - Relatório de Apostas', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Data: ${currentDate}`, 105, 30, { align: 'center' });
    
    // Preparar dados da tabela
    const tableData = bets.map(bet => [
      bet.playerName,
      bet.gameName,
      getBetTypeLabel(bet.betType),
      formatCurrency(bet.amount),
      bet.odd.toString(),
      formatCurrency(bet.possibleWin),
      bet.status,
      new Date(bet.createdAt).toLocaleString('pt-BR')
    ]);

    // Adicionar tabela
    autoTable(doc, {
      head: [['Jogador', 'Jogo', 'Tipo', 'Valor', 'Odd', 'Poss. Ganho', 'Status', 'Data/Hora']],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [34, 41, 84],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    doc.save(`relatorio_apostas_masterleague_${new Date().toISOString().split('T')[0]}.pdf`);

    toast({
      title: "Relatório PDF exportado com sucesso!",
    });
  };

  const exportWORD = () => {
    if (bets.length === 0) {
      toast({
        title: "Nenhuma aposta para exportar!",
        variant: "destructive",
      });
      return;
    }

    const currentDate = new Date().toLocaleDateString('pt-BR');
    
    // Criar HTML para o documento
    let htmlContent = `
      <!DOCTYPE html>
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Relatório Master League</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>90</w:Zoom>
            <w:DoNotPromptForConvert/>
            <w:DoNotShowRevisions/>
            <w:DoNotPrintBodyInNewDocument/>
            <w:DoNotShowMarkupInNewDocument/>
            <w:DoNotShowComments/>
            <w:DoNotShowInsertionsAndDeletions/>
            <w:DoNotShowPropertyChanges/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { text-align: center; color: #222954; margin-bottom: 10px; }
          .date { text-align: center; margin-bottom: 30px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #222954; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f5f5f5; }
          .currency { text-align: right; }
          .center { text-align: center; }
        </style>
      </head>
      <body>
        <h1>Master League - Relatório de Apostas</h1>
        <p class="date">Data: ${currentDate}</p>
        <table>
          <thead>
            <tr>
              <th>Jogador</th>
              <th>Jogo</th>
              <th>Tipo de Aposta</th>
              <th>Valor</th>
              <th>Odd</th>
              <th>Possível Ganho</th>
              <th>Status</th>
              <th>Data/Hora</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    bets.forEach(bet => {
      const timestamp = new Date(bet.createdAt).toLocaleString('pt-BR');
      const betType = getBetTypeLabel(bet.betType);
      htmlContent += `
        <tr>
          <td>${bet.playerName}</td>
          <td>${bet.gameName}</td>
          <td class="center">${betType}</td>
          <td class="currency">${formatCurrency(bet.amount)}</td>
          <td class="center">${bet.odd}</td>
          <td class="currency">${formatCurrency(bet.possibleWin)}</td>
          <td class="center">${bet.status}</td>
          <td class="center">${timestamp}</td>
        </tr>
      `;
    });
    
    htmlContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Criar blob e download como .doc (Word pode abrir)
    const blob = new Blob([htmlContent], { 
      type: 'application/msword;charset=utf-8' 
    });
    
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_apostas_masterleague_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Relatório WORD exportado com sucesso!",
      description: "O arquivo pode ser aberto no Microsoft Word ou LibreOffice.",
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
            
            <form onSubmit={handleAddGame} className="space-y-4 mb-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="game-name" className="block text-sm font-medium text-foreground mb-2">
                    Nome do Jogo
                  </Label>
                  <Input
                    id="game-name"
                    type="text"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="Ex: Clássico da Capital"
                    data-testid="input-game-name"
                  />
                </div>
                <div>
                  <Label htmlFor="home-team" className="block text-sm font-medium text-foreground mb-2">
                    Time da Casa
                  </Label>
                  <Input
                    id="home-team"
                    type="text"
                    value={homeTeam}
                    onChange={(e) => setHomeTeam(e.target.value)}
                    placeholder="Ex: São Paulo"
                    data-testid="input-home-team"
                  />
                </div>
                <div>
                  <Label htmlFor="away-team" className="block text-sm font-medium text-foreground mb-2">
                    Time de Fora
                  </Label>
                  <Input
                    id="away-team"
                    type="text"
                    value={awayTeam}
                    onChange={(e) => setAwayTeam(e.target.value)}
                    placeholder="Ex: Palmeiras"
                    data-testid="input-away-team"
                  />
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="home-odd" className="block text-sm font-medium text-foreground mb-2">
                    Odd Casa
                  </Label>
                  <Input
                    id="home-odd"
                    type="number"
                    step="0.01"
                    value={homeOdd}
                    onChange={(e) => setHomeOdd(e.target.value)}
                    placeholder="Ex: 2.50"
                    data-testid="input-home-odd"
                  />
                </div>
                <div>
                  <Label htmlFor="away-odd" className="block text-sm font-medium text-foreground mb-2">
                    Odd Fora
                  </Label>
                  <Input
                    id="away-odd"
                    type="number"
                    step="0.01"
                    value={awayOdd}
                    onChange={(e) => setAwayOdd(e.target.value)}
                    placeholder="Ex: 3.00"
                    data-testid="input-away-odd"
                  />
                </div>
                <div>
                  <Label htmlFor="draw-odd" className="block text-sm font-medium text-foreground mb-2">
                    Odd Empate
                  </Label>
                  <Input
                    id="draw-odd"
                    type="number"
                    step="0.01"
                    value={drawOdd}
                    onChange={(e) => setDrawOdd(e.target.value)}
                    placeholder="Ex: 3.20"
                    data-testid="input-draw-odd"
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
                      <TableHead className="text-primary-foreground font-semibold">Times</TableHead>
                      <TableHead className="text-center text-primary-foreground font-semibold">Casa</TableHead>
                      <TableHead className="text-center text-primary-foreground font-semibold">Empate</TableHead>
                      <TableHead className="text-center text-primary-foreground font-semibold">Fora</TableHead>
                      <TableHead className="text-center text-primary-foreground font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gamesLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Carregando jogos...
                        </TableCell>
                      </TableRow>
                    ) : games.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                          <TableCell className="text-foreground">
                            <div className="text-sm">
                              <div><strong>{game.homeTeam}</strong> vs <strong>{game.awayTeam}</strong></div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="bg-success/10 text-success px-2 py-1 rounded text-sm font-semibold">
                              {game.homeOdd}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="bg-warning/10 text-warning-foreground px-2 py-1 rounded text-sm font-semibold">
                              {game.drawOdd}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="bg-destructive/10 text-destructive px-2 py-1 rounded text-sm font-semibold">
                              {game.awayOdd}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    disabled={bets.length === 0}
                    data-testid="button-export-dropdown"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Relatório
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportPDF} data-testid="export-pdf">
                    <FileImage className="w-4 h-4 mr-2" />
                    Exportar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportWORD} data-testid="export-word">
                    <FileText className="w-4 h-4 mr-2" />
                    Exportar WORD
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportCSV} data-testid="export-csv">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="data-table overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-primary-foreground bg-primary hover:bg-primary">
                    <TableHead className="text-primary-foreground font-semibold">Jogador</TableHead>
                    <TableHead className="text-primary-foreground font-semibold">Jogo</TableHead>
                    <TableHead className="text-center text-primary-foreground font-semibold">Aposta</TableHead>
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
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Carregando apostas...
                      </TableCell>
                    </TableRow>
                  ) : bets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center">
                          <ChartLine className="w-8 h-8 mb-2" />
                          Nenhuma aposta registrada ainda
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    bets.map((bet) => {
                      const getBetTypeLabel = (type: string) => {
                        switch (type) {
                          case "home": return "Casa";
                          case "away": return "Fora";
                          case "draw": return "Empate";
                          default: return type;
                        }
                      };

                      const getBetTypeColor = (type: string) => {
                        switch (type) {
                          case "home": return "bg-success/10 text-success";
                          case "away": return "bg-destructive/10 text-destructive";
                          case "draw": return "bg-warning/10 text-warning-foreground";
                          default: return "bg-muted text-muted-foreground";
                        }
                      };

                      return (
                        <TableRow key={bet.id}>
                          <TableCell className="font-medium text-foreground">{bet.playerName}</TableCell>
                          <TableCell className="text-foreground">{bet.gameName}</TableCell>
                          <TableCell className="text-center">
                            <span className={`px-2 py-1 rounded text-sm font-semibold ${getBetTypeColor(bet.betType)}`}>
                              {getBetTypeLabel(bet.betType)}
                            </span>
                          </TableCell>
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
                      );
                    })
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
