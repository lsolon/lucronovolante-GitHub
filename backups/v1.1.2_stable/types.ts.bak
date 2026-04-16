export type EntryType = 'Ganhos' | 'Despesa';

export interface Category {
  id: string;
  nome: string;
  parentId?: string;
}

export interface FixedCost {
  id: string;
  item: string;
  valorMensal: number;
  diaVencimento: number;
  dataInicio?: string; // YYYY-MM
  dataFim?: string; // YYYY-MM
}

export interface Entry {
  id: string;
  data: string; // YYYY/MM/DD
  createdAt: string; // YYYY/MM/DD HH:mm:ss
  tipo: EntryType;
  categoriaId: string;
  valor: number;
  km?: number;
  kmRodado?: number;
  posto?: string;
  bandeiraPosto?: string;
  combustivel?: string;
  quantidade?: number;
  valorUnitario?: number;
  location?: { lat: number; lng: number; address?: string };
  gps?: string; // "lat, lng"
  endereco?: string;
  photoUrl?: string;
  qrCodeData?: string;
  linkNota?: string;
  obs?: string;
  ganhos?: Record<string, number>; // Dynamic earnings by category ID
}

export interface AppSheetMapping {
  data: string;
  tipo: string;
  valor: string;
  categoria: string;
  km: string;
  obs: string;
  posto: string;
  combustivel: string;
  quantidade: string;
  valorUnitario: string;
}

export interface MaintenanceInterval {
  id: string;
  item: string;
  intervaloKm: number;
}

export interface GlobalStats {
  totalVisits: number;
  uniqueVisitors: number;
  lastUpdate: string;
}

export interface AppConfig {
  publishedVersion: string;
  betaVersion: string;
  maintenanceMode: boolean;
  announcement?: string;
}

export interface BacklogItem {
  id: string;
  text: string;
  createdAt: string;
  status: 'pending' | 'completed';
}

export interface AppState {
  entries: Entry[];
  fixedCosts: FixedCost[];
  categories: Category[];
  earningCategories: Category[];
  currentKm: number;
  targetKm: number;
  maintenanceIntervals: MaintenanceInterval[];
  trialStartDate?: string;
  appSheetMapping?: AppSheetMapping;
  hasSeenTutorial?: boolean;
  tutorialOptOut?: boolean;
  role?: 'admin' | 'user';
  email?: string;
  displayName?: string;
  visitCount?: number;
  hasContributed?: boolean;
  lastSeen?: string;
  appConfig?: AppConfig;
}
