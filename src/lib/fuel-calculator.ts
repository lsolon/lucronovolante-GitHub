import { Entry, Category } from '../types';
import { parseEntryDate } from './utils';

export interface EmptyTankCycle {
  hasCycle: boolean;
  isFirstEmptyTank: boolean;
  previousEmptyTank?: Entry;
  kmRodados: number;
  startKm: number;
  endKm: number;
  combustivelConsumido: number;
  valorConsumido: number;
  mediaConsumo: number;
  custoPorKm: number;
  combustivel: string;
  startDate: string;
  endDate: string;
  diasCiclo: number;
  intermediateRefuelingsCount: number;
  unit: string;
}

export function isFuelCategory(category?: Category, categoriaId?: string, categories: Category[] = []): boolean {
  if (category) {
    const nome = category.nome.toLowerCase().trim();
    return nome === 'abastecimento' || nome === 'combustível' || nome === 'combustivel';
  }
  if (categoriaId) {
    const cat = categories.find(c => c.id === categoriaId);
    if (cat) return isFuelCategory(cat);
    // Standard default ID for Abastecimento is '1'
    return categoriaId === '1';
  }
  return false;
}

/**
 * Filtra e ordena todos os lançamentos de abastecimento cronologicamente
 */
export function getSortedFuelEntries(entries: Entry[], categories: Category[] = []): Entry[] {
  return entries
    .filter(e => {
      const isFuel = isFuelCategory(undefined, e.categoriaId, categories) || e.combustivel || e.quantidade || e.tanqueVazio;
      return isFuel && e.km && e.km > 0;
    })
    .sort((a, b) => {
      const dateA = a.data.replace(/-/g, '/') + ' ' + (a.createdAt?.split(' ')[1] || '00:00:00');
      const dateB = b.data.replace(/-/g, '/') + ' ' + (b.createdAt?.split(' ')[1] || '00:00:00');
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.km || 0) - (b.km || 0);
    });
}

/**
 * Calcula o ciclo de consumo e quilometragem entre um tanque vazio e outro.
 */
export function calculateEmptyTankCycle(
  current: {
    id?: string;
    data: string;
    createdAt?: string;
    km?: number;
    quantidade?: number;
    valor?: number;
    combustivel?: string;
    tanqueVazio?: boolean;
    categoriaId?: string;
  },
  allEntries: Entry[],
  categories: Category[] = []
): EmptyTankCycle {
  const emptyResult: EmptyTankCycle = {
    hasCycle: false,
    isFirstEmptyTank: !!current.tanqueVazio,
    kmRodados: 0,
    startKm: 0,
    endKm: current.km || 0,
    combustivelConsumido: 0,
    valorConsumido: 0,
    mediaConsumo: 0,
    custoPorKm: 0,
    combustivel: current.combustivel || 'Combustível',
    startDate: current.data,
    endDate: current.data,
    diasCiclo: 0,
    intermediateRefuelingsCount: 0,
    unit: current.combustivel?.toLowerCase().includes('gnv') ? 'm³' : 'L'
  };

  if (!current.km || current.km <= 0) {
    return emptyResult;
  }

  const sortedFuelEntries = getSortedFuelEntries(allEntries, categories);

  // Considera apenas lançamentos cronologicamente anteriores ao lançamento atual
  const currentDateStr = current.data.replace(/-/g, '/') + ' ' + (current.createdAt?.split(' ')[1] || '23:59:59');
  
  const previousEntries = sortedFuelEntries.filter(e => {
    if (current.id && e.id === current.id) return false;
    const eDateStr = e.data.replace(/-/g, '/') + ' ' + (e.createdAt?.split(' ')[1] || '00:00:00');
    if (eDateStr !== currentDateStr) {
      return eDateStr < currentDateStr;
    }
    return (e.km || 0) < (current.km || 0);
  });

  if (previousEntries.length === 0) {
    return { ...emptyResult, isFirstEmptyTank: true };
  }

  // Encontra o último abastecimento que foi marcado com tanqueVazio = true
  const prevEmptyTankIndex = previousEntries.map(e => e.tanqueVazio).lastIndexOf(true);

  if (prevEmptyTankIndex === -1) {
    // Não houve nenhum abastecimento com tanque vazio antes deste
    return { ...emptyResult, isFirstEmptyTank: true };
  }

  const prevEmptyTank = previousEntries[prevEmptyTankIndex];
  const startKm = prevEmptyTank.km || 0;
  const endKm = current.km || 0;
  const kmRodados = endKm - startKm;

  if (kmRodados <= 0) {
    return { ...emptyResult, isFirstEmptyTank: false };
  }

  // Abastecimentos que compuseram o ciclo (do prevEmptyTank até antes do atual)
  const cycleEntries = previousEntries.slice(prevEmptyTankIndex);

  let combustivelConsumido = 0;
  let valorConsumido = 0;
  let intermediateCount = 0;

  cycleEntries.forEach((entry, idx) => {
    if (idx > 0) intermediateCount++;
    combustivelConsumido += entry.quantidade || 0;
    valorConsumido += entry.valor || 0;
  });

  const combustivel = prevEmptyTank.combustivel || current.combustivel || 'Combustível';
  const unit = combustivel.toLowerCase().includes('gnv') ? 'm³' : 'L';

  const mediaConsumo = combustivelConsumido > 0 ? kmRodados / combustivelConsumido : 0;
  const custoPorKm = kmRodados > 0 ? valorConsumido / kmRodados : 0;

  const startDateParsed = parseEntryDate(prevEmptyTank.data);
  const endDateParsed = parseEntryDate(current.data);
  const diffTime = Math.abs(endDateParsed.getTime() - startDateParsed.getTime());
  const diasCiclo = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));

  return {
    hasCycle: true,
    isFirstEmptyTank: false,
    previousEmptyTank: prevEmptyTank,
    kmRodados,
    startKm,
    endKm,
    combustivelConsumido,
    valorConsumido,
    mediaConsumo,
    custoPorKm,
    combustivel,
    startDate: prevEmptyTank.data,
    endDate: current.data,
    diasCiclo,
    intermediateRefuelingsCount: intermediateCount,
    unit
  };
}

/**
 * Obtém todos os ciclos de tanque vazio concluídos no histórico
 */
export function getAllEmptyTankCycles(entries: Entry[], categories: Category[] = []): {
  cycles: (EmptyTankCycle & { entryId: string })[];
  totalKmRodados: number;
  totalCombustivelConsumido: number;
  totalValorConsumido: number;
  mediaGeralConsumo: number;
  custoMedioPorKm: number;
  mediasPorCombustivel: Record<string, { media: number; totalKm: number; totalLitros: number; custoKm: number }>;
} {
  const sortedFuelEntries = getSortedFuelEntries(entries, categories);
  const cycles: (EmptyTankCycle & { entryId: string })[] = [];

  sortedFuelEntries.forEach(entry => {
    if (entry.tanqueVazio) {
      const cycle = calculateEmptyTankCycle(entry, entries, categories);
      if (cycle.hasCycle) {
        cycles.push({
          ...cycle,
          entryId: entry.id
        });
      }
    }
  });

  let totalKmRodados = 0;
  let totalCombustivelConsumido = 0;
  let totalValorConsumido = 0;
  const mediasPorCombustivel: Record<string, { media: number; totalKm: number; totalLitros: number; custoKm: number; totalValor: number }> = {};

  cycles.forEach(c => {
    totalKmRodados += c.kmRodados;
    totalCombustivelConsumido += c.combustivelConsumido;
    totalValorConsumido += c.valorConsumido;

    const fuelKey = c.combustivel || 'Outro';
    if (!mediasPorCombustivel[fuelKey]) {
      mediasPorCombustivel[fuelKey] = { media: 0, totalKm: 0, totalLitros: 0, custoKm: 0, totalValor: 0 };
    }
    mediasPorCombustivel[fuelKey].totalKm += c.kmRodados;
    mediasPorCombustivel[fuelKey].totalLitros += c.combustivelConsumido;
    mediasPorCombustivel[fuelKey].totalValor += c.valorConsumido;
  });

  Object.keys(mediasPorCombustivel).forEach(key => {
    const item = mediasPorCombustivel[key];
    item.media = item.totalLitros > 0 ? item.totalKm / item.totalLitros : 0;
    item.custoKm = item.totalKm > 0 ? item.totalValor / item.totalKm : 0;
  });

  const mediaGeralConsumo = totalCombustivelConsumido > 0 ? totalKmRodados / totalCombustivelConsumido : 0;
  const custoMedioPorKm = totalKmRodados > 0 ? totalValorConsumido / totalKmRodados : 0;

  return {
    cycles,
    totalKmRodados,
    totalCombustivelConsumido,
    totalValorConsumido,
    mediaGeralConsumo,
    custoMedioPorKm,
    mediasPorCombustivel
  };
}
