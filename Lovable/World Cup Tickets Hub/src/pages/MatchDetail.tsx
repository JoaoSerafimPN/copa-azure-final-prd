import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, MapPin, Users, Minus, Plus, ShoppingCart, ArrowLeft, Check, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamFlag } from '@/components/TeamFlag';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { getSectorsByMatch, type Sector as StaticSector } from '@/lib/stadium-sectors';
import type { Match as MatchType } from '@/data/matches';
import type { Stadium as StadiumType, Sector } from '@/data/stadiums';
import type { Team as TeamType } from '@/data/teams';

interface ApiMatch {
  id: number;
  date: string;
  time: string;
  stage: string;
  group_name: string | null;
  home_team_id: number;
  away_team_id: number;
  stadium_id: number;
  home_score: number | null;
  away_score: number | null;
  status: string;
  home_team_name: string;
  home_team_code: string;
  home_team_flag: string;
  home_team_confederation?: string;
  away_team_name: string;
  away_team_code: string;
  away_team_flag: string;
  away_team_confederation?: string;
  stadium_name: string;
  stadium_city: string;
}

interface ApiStadium {
  id: number;
  name: string;
  city: string;
  country: string;
  capacity: number;
  image: string | null;
  description: string | null;
  inauguration_year: number | null;
  latitude: number | null;
  longitude: number | null;
}

const STAGE_LABELS: Record<string, string> = {
  'Fase de Grupos': 'Fase de Grupos',
  group: 'Fase de Grupos',
  round_of_32: '32 avos de Final',
  round_of_16: 'Oitavas de Final',
  quarter_final: 'Quartas de Final',
  semi_final: 'Semifinal',
  third_place: 'Disputa 3º Lugar',
  final: 'Final',
};

function formatDateBR(dateIso: string): string {
  if (!dateIso) return '-';
  const d = new Date(dateIso);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

const MatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toast } = useToast();

  const [selectedSector, setSelectedSector] = useState<StaticSector | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: matchData, isLoading } = useQuery({
    queryKey: ['match', id],
    queryFn: () => api.getMatch(id!),
    enabled: !!id,
  });

  const match: ApiMatch | undefined = matchData?.data?.match;

  const { data: stadiumData } = useQuery({
    queryKey: ['stadium', match?.stadium_id],
    queryFn: () => api.getStadium(String(match!.stadium_id)),
    enabled: !!match?.stadium_id,
  });

  const stadium: ApiStadium | undefined = stadiumData?.data?.stadium;
  // Preços por FASE (Final >> Quartas >> Grupos) baseados em FIFA 2026 oficial
  const sectors = match
    ? getSectorsByMatch(match.stage, stadium?.capacity || 70000)
    : [];

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl mb-4">Jogo não encontrado</h1>
          <Link to="/matches">
            <Button>Voltar para jogos</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedSector || !stadium) {
      toast({
        title: 'Selecione um setor',
        description: 'Por favor, escolha um setor antes de adicionar ao carrinho.',
        variant: 'destructive',
      });
      return;
    }

    // Adapta API → tipos esperados pelo CartContext.
    const matchForCart = {
      id: String(match.id),
      date: match.date,
      time: match.time,
      phase: match.stage,
      group: match.group_name,
      homeTeamId: String(match.home_team_id),
      awayTeamId: String(match.away_team_id),
      stadiumId: String(match.stadium_id),
    } as unknown as MatchType;

    const stadiumForCart = {
      id: String(stadium.id),
      name: stadium.name,
      city: stadium.city,
      country: stadium.country,
      capacity: stadium.capacity,
      image: stadium.image || '',
      description: stadium.description || '',
      sectors: sectors as Sector[],
    } as unknown as StadiumType;

    const homeTeam = {
      id: String(match.home_team_id),
      name: match.home_team_name,
      code: match.home_team_code,
      flag: match.home_team_flag,
      confederation: match.home_team_confederation || '',
    } as unknown as TeamType;

    const awayTeam = {
      id: String(match.away_team_id),
      name: match.away_team_name,
      code: match.away_team_code,
      flag: match.away_team_flag,
      confederation: match.away_team_confederation || '',
    } as unknown as TeamType;

    addItem({
      match: matchForCart,
      stadium: stadiumForCart,
      homeTeam,
      awayTeam,
      sector: selectedSector as Sector,
      ticketCategoryId: 0, // não-DB ticket; usamos sector estático local
      quantity,
      unitPrice: selectedSector.price,
    });

    toast({
      title: 'Adicionado ao carrinho!',
      description: `${quantity}× ${selectedSector.name} — ${match.home_team_name} vs ${match.away_team_name}`,
    });

    setSelectedSector(null);
    setQuantity(1);
  };

  const totalPrice = selectedSector ? selectedSector.price * quantity : 0;

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Match Header */}
            <div className="rounded-3xl overflow-hidden bg-card border border-border">
              <div className="relative h-48 md:h-64 bg-secondary/40">
                {stadium?.image ? (
                  <img src={stadium.image} alt={stadium.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">🏟️</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />

                <div className="absolute top-4 left-4 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {STAGE_LABELS[match.stage] || match.stage}
                  {match.group_name && ` • Grupo ${match.group_name}`}
                </div>
              </div>

              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="text-center flex-1">
                    <TeamFlag flag={match.home_team_flag} name={match.home_team_name} size="xl" className="mx-auto mb-3" />
                    <h2 className="font-display text-2xl md:text-3xl">{match.home_team_name}</h2>
                    <span className="text-muted-foreground">{match.home_team_code}</span>
                  </div>
                  <div className="px-6">
                    {match.status === 'finished' && match.home_score !== null && match.away_score !== null ? (
                      <span className="font-display text-3xl md:text-4xl gold-text">
                        {match.home_score} × {match.away_score}
                      </span>
                    ) : (
                      <span className="font-display text-3xl md:text-4xl gold-text">VS</span>
                    )}
                  </div>
                  <div className="text-center flex-1">
                    <TeamFlag flag={match.away_team_flag} name={match.away_team_name} size="xl" className="mx-auto mb-3" />
                    <h2 className="font-display text-2xl md:text-3xl">{match.away_team_name}</h2>
                    <span className="text-muted-foreground">{match.away_team_code}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Data e hora</span>
                      <span className="font-medium text-sm">
                        {formatDateBR(match.date)} · {match.time}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Estádio</span>
                      <span className="font-medium">{match.stadium_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Cidade</span>
                      <span className="font-medium">{match.stadium_city}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sectors */}
            <div>
              <h3 className="font-display text-2xl mb-6">Escolha seu Setor</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sectors.map((sector) => {
                  const isSelected = selectedSector?.id === sector.id;
                  return (
                    <button
                      key={sector.id}
                      onClick={() => setSelectedSector(sector)}
                      className={cn(
                        'relative p-6 rounded-2xl border-2 text-left transition-all duration-200',
                        isSelected
                          ? 'border-primary bg-primary/10 glow-gold'
                          : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}

                      <h4 className="font-display text-xl mb-2">{sector.name}</h4>
                      <p className="text-sm text-muted-foreground mb-4 leading-snug">{sector.description}</p>

                      <div className="flex items-end justify-between">
                        <div>
                          <span className="text-2xl font-bold text-primary">${sector.price}</span>
                          <span className="text-muted-foreground text-sm">/ingresso</span>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-success/20 text-success">
                          {sector.capacity.toLocaleString()} lugares
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Purchase Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl bg-card border border-border p-6">
              <h3 className="font-display text-xl mb-6">Resumo da Compra</h3>

              {selectedSector ? (
                <>
                  <div className="p-4 rounded-xl bg-secondary/50 mb-6">
                    <span className="text-xs text-muted-foreground">Setor selecionado</span>
                    <h4 className="font-medium">{selectedSector.name}</h4>
                    <span className="text-primary font-bold">${selectedSector.price}/un</span>
                  </div>

                  <div className="mb-6">
                    <label className="text-sm text-muted-foreground mb-2 block">Quantidade</label>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="font-display text-2xl w-12 text-center">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.min(10, quantity + 1))}
                        disabled={quantity >= 10}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <span className="text-xs text-muted-foreground mt-2 block">
                      Máximo 10 ingressos por compra
                    </span>
                  </div>

                  <div className="border-t border-border pt-6 mb-6">
                    <div className="flex justify-between items-end">
                      <span className="text-muted-foreground">Total</span>
                      <div className="text-right">
                        <span className="font-display text-3xl gold-text">
                          ${totalPrice.toLocaleString()}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {quantity} {quantity === 1 ? 'ingresso' : 'ingressos'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleAddToCart}
                    className="w-full gold-gradient hover:opacity-90 text-primary-foreground"
                    size="lg"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Adicionar ao Carrinho
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Selecione um setor para continuar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchDetail;
