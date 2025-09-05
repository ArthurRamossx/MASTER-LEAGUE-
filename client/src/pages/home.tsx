import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLogin from "@/components/admin-login";
import AdminPanel from "@/components/admin-panel";
import PlayerBetting from "@/components/player-betting";
import type { Game } from "@shared/schema";
import { Volleyball, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);

  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const handleAdminLogin = () => {
    setIsAdmin(true);
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
  };

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      {/* Header */}
      <header className="bg-primary border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                <Volleyball className="text-accent-foreground text-lg" />
              </div>
              <div>
                <h1 className="text-primary-foreground text-lg font-semibold">Master League</h1>
                <p className="text-primary-foreground/70 text-sm">eFootball 2026 Apostas</p>
              </div>
            </div>
            {isAdmin && (
              <div>
                <Button
                  variant="destructive"
                  onClick={handleAdminLogout}
                  className="flex items-center space-x-2"
                  data-testid="button-admin-logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair do Admin</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAdmin ? (
          <div className="space-y-8">
            <AdminLogin onLogin={handleAdminLogin} />
            <PlayerBetting games={games} />
          </div>
        ) : (
          <AdminPanel />
        )}
      </main>
    </div>
  );
}
