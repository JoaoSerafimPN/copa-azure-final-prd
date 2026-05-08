// Pricing de ingressos baseado em (fase do torneio + capacidade do estádio).
// Preços em USD seguindo a tabela oficial FIFA 2026 publicada em 2025.
// Distribuição de capacidade por setor segue o padrão de estádios mundiais:
//   VIP/Premium  ~7%
//   Categoria 1 ~30%
//   Categoria 2 ~63%

export interface Sector {
  id: string;
  name: string;
  price: number;
  capacity: number;
  description: string;
}

// Preços oficiais FIFA 2026 (USD) por fase × categoria
const PRICES_BY_STAGE: Record<string, { vip: number; cat1: number; cat2: number }> = {
  'Fase de Grupos':  { vip: 1210, cat1: 560,  cat2: 300  },
  group:             { vip: 1210, cat1: 560,  cat2: 300  },
  round_of_32:       { vip: 1490, cat1: 890,  cat2: 480  },
  round_of_16:       { vip: 1775, cat1: 1090, cat2: 600  },
  quarter_final:     { vip: 1985, cat1: 1250, cat2: 930  },
  semi_final:        { vip: 2735, cat1: 1675, cat2: 1180 },
  third_place:       { vip: 1465, cat1: 935,  cat2: 660  },
  final:             { vip: 6730, cat1: 4210, cat2: 2030 },
};

// Capacidade ratio padrão de estádio mundial (FIFA / NFL)
const SECTOR_RATIOS = {
  vip: 0.07,
  cat1: 0.30,
  // cat2 = resto (~63%)
};

const SECTOR_DESCRIPTIONS = {
  vip:  'Suítes premium com vista privilegiada, lounge exclusivo, alimentação inclusa e acesso a áreas restritas.',
  cat1: 'Assentos nas áreas centrais e cobertas do estádio, excelente visibilidade do gramado.',
  cat2: 'Assentos nas áreas superiores e laterais — ótimo custo-benefício, ambiente vibrante de torcida.',
};

// Capacidade por estádio (cache local para o helper de listagem;
// evita ida à API só para mostrar "a partir de $X")
const STADIUM_CAPACITY_FALLBACK: Record<number, number> = {
  1:  82500,  // MetLife
  2:  80000,  // AT&T
  3:  70240,  // SoFi
  4:  90000,  // Rose Bowl (legacy)
  5:  68740,  // Lumen
  6:  87523,  // Azteca
  7:  53500,  // BBVA
  8:  54500,  // BC Place
  9:  45736,  // BMO
  10: 71000,  // Mercedes-Benz
  11: 65878,  // Gillette
  12: 65326,  // Hard Rock
  13: 69796,  // Lincoln
  14: 72220,  // NRG
  15: 76416,  // Arrowhead
  16: 68500,  // Levi's
  17: 49850,  // Akron
};

function splitCapacity(stadiumCapacity: number) {
  const vip = Math.round(stadiumCapacity * SECTOR_RATIOS.vip);
  const cat1 = Math.round(stadiumCapacity * SECTOR_RATIOS.cat1);
  const cat2 = stadiumCapacity - vip - cat1;
  return { vip, cat1, cat2 };
}

/**
 * Setores + preços de UM jogo específico baseado em fase + capacidade.
 * Use isto na MatchDetail e em qualquer lugar que precise do preço real.
 */
export function getSectorsByMatch(
  stage: string,
  stadiumCapacity: number
): Sector[] {
  const prices = PRICES_BY_STAGE[stage] || PRICES_BY_STAGE['Fase de Grupos'];
  const caps = splitCapacity(stadiumCapacity || 70000);

  return [
    { id: 'vip',  name: 'VIP Premium',  price: prices.vip,  capacity: caps.vip,  description: SECTOR_DESCRIPTIONS.vip },
    { id: 'cat1', name: 'Categoria 1',  price: prices.cat1, capacity: caps.cat1, description: SECTOR_DESCRIPTIONS.cat1 },
    { id: 'cat2', name: 'Categoria 2',  price: prices.cat2, capacity: caps.cat2, description: SECTOR_DESCRIPTIONS.cat2 },
  ];
}

/**
 * Setores genéricos do estádio (Fase de Grupos como default).
 * Use isto em StadiumDetail quando não há contexto de fase.
 */
export function getSectorsByStadiumId(stadiumId: number): Sector[] {
  const cap = STADIUM_CAPACITY_FALLBACK[stadiumId] || 70000;
  return getSectorsByMatch('Fase de Grupos', cap);
}

/**
 * Preço inicial (mais barato) que o usuário verá em listagens.
 * Cat2 da Fase de Grupos = $300 — o piso oficial FIFA 2026 (não-residente).
 */
export function getStadiumStartingPrice(_stadiumId: number): number {
  return PRICES_BY_STAGE['Fase de Grupos'].cat2;
}
