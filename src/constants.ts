import { Category, FixedCost, MaintenanceInterval } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', nome: 'Abastecimento' },
  { id: '2', nome: 'Lavagem' },
  { id: '3', nome: 'Manutenção' },
  { id: '3_1', nome: 'Troca de pastilhas de freio', parentId: '3' },
  { id: '3_2', nome: 'Troca de Pneus', parentId: '3' },
  { id: '3_3', nome: 'Troca de Filtro de Ar', parentId: '3' },
  { id: '3_4', nome: 'Troca de Filtro de Cabine', parentId: '3' },
  { id: '3_5', nome: 'Liquido de Arrefeicimento', parentId: '3' },
  { id: '3_6', nome: 'Troca de Bateria', parentId: '3' },
  { id: '4', nome: 'Pedagio' },
  { id: '5', nome: 'Seguro Uber' },
  { id: '6', nome: 'Alimentação' },
  { id: '7', nome: 'Troca de oleo' },
  { id: '8', nome: 'Impostos' },
  { id: '11', nome: 'Estacionamento' },
  { id: '12', nome: 'Financiamento' },
  { id: '9', nome: 'Outros' },
  { id: '10', nome: 'Fechamento do Dia' },
];

export const DEFAULT_MAINTENANCE_INTERVALS: MaintenanceInterval[] = [];

export const DEFAULT_FIXED_COSTS: FixedCost[] = [];

export const DEFAULT_EARNING_CATEGORIES: Category[] = [
  { id: 'uber', nome: 'Uber' },
  { id: '99', nome: '99' },
  { id: 'outros', nome: 'Outros' },
];

export const DEFAULT_REFUND_CATEGORIES: Category[] = [
  { id: 'ref_pedagio', nome: 'Pedágio' },
  { id: 'ref_combustivel', nome: 'Combustível' },
  { id: 'ref_outros', nome: 'Outros' },
];

export const GAS_STATIONS = [
  'Ipiranga',
  'Petrobras / BR',
  'Shell',
  'Ale',
  'RodOil',
  'Outros'
];
