import { useState, ChangeEvent, useRef, useEffect } from 'react';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Calendar,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Database,
  X,
  Car,
  Settings,
  Share2,
  Copy,
  ExternalLink,
  Users,
  Mail,
  Lightbulb,
  Send,
  Trash,
  Sparkles,
  ChevronRight,
  Coins
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, addMonths } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn, truncateLargeFields } from '../lib/utils';
import { FixedCost, Category, Entry, EntryType, AppSheetMapping, MaintenanceInterval, AppConfig, GlobalStats } from '../types';
import { getCategoryStyle } from '../lib/category-styles';
import { fetchAppSheetData, mapAppSheetToEntry, addRowsToAppSheet, mapEntryToAppSheet } from '../services/appsheetService';
import { getGlobalStats, getAllUsers, updateUserTrial } from '../services/statsService';
import AIVideoStudio from './AIVideoStudio';
import MarketingFlyer from './MarketingFlyer';
import { addBacklogItem, getBacklogItems, deleteBacklogItem, toggleBacklogItemStatus } from '../services/backlogService';
import { BacklogItem } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

import PWAInstallButton from './PWAInstallButton';
import { PolicyModal } from './PolicyModal';

interface SettingsViewProps {
  fixedCosts: FixedCost[];
  onUpdateFixedCosts: (costs: FixedCost[]) => void;
  earningCategories: Category[];
  onUpdateEarningCategories: (categories: Category[]) => void;
  refundCategories: Category[];
  onUpdateRefundCategories: (categories: Category[]) => void;
  entries: Entry[];
  onUpdateEntries: (entries: Entry[]) => void;
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
  appSheetMapping?: AppSheetMapping;
  onUpdateAppSheetMapping: (mapping: AppSheetMapping) => void;
  targetKm: number;
  onUpdateTargetKm: (km: number) => void;
  currentKm: number;
  onUpdateCurrentKm: (km: number) => void;
  lastRecordedKm: number;
  maintenanceIntervals: MaintenanceInterval[];
  onUpdateMaintenanceIntervals: (intervals: MaintenanceInterval[]) => void;
  isAdmin?: boolean;
  appConfig?: AppConfig;
  onUpdateAppConfig?: (config: AppConfig) => void;
  isAIVideoStudioOpen: boolean;
  setIsAIVideoStudioOpen: (open: boolean) => void;
}

export default function SettingsView({ 
  fixedCosts, 
  onUpdateFixedCosts, 
  earningCategories, 
  onUpdateEarningCategories,
  refundCategories,
  onUpdateRefundCategories,
  entries,
  onUpdateEntries,
  categories,
  onUpdateCategories,
  appSheetMapping,
  onUpdateAppSheetMapping,
  targetKm,
  onUpdateTargetKm,
  currentKm,
  onUpdateCurrentKm,
  lastRecordedKm,
  maintenanceIntervals,
  onUpdateMaintenanceIntervals,
  isAdmin,
  appConfig,
  onUpdateAppConfig,
  isAIVideoStudioOpen,
  setIsAIVideoStudioOpen
}: SettingsViewProps) {
  const [activeSection, setActiveSection] = useState<'fixed' | 'expenses' | 'earnings' | 'data' | 'general' | 'share' | 'admin'>('general');
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<Entry[] | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [modalType, setModalType] = useState<'terms' | 'privacy' | null>(null);
  const [isSyncingAppSheet, setIsSyncingAppSheet] = useState(false);
  const [isPushingToAppSheet, setIsPushingToAppSheet] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [isFlyerOpen, setIsFlyerOpen] = useState(false);
  const [appSheetColumns, setAppSheetColumns] = useState<string[]>([]);
  const [isFetchingColumns, setIsFetchingColumns] = useState(false);
  const [localMapping, setLocalMapping] = useState<Partial<AppSheetMapping>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exportType, setExportType] = useState<'all' | 'Ganhos' | 'Despesa'>('all');
  const [exportCategoryId, setExportCategoryId] = useState<string>('all');

  const currentMapping: AppSheetMapping = {
    data: localMapping.data ?? appSheetMapping?.data ?? '',
    tipo: localMapping.tipo ?? appSheetMapping?.tipo ?? '',
    valor: localMapping.valor ?? appSheetMapping?.valor ?? '',
    categoria: localMapping.categoria ?? appSheetMapping?.categoria ?? '',
    km: localMapping.km ?? appSheetMapping?.km ?? '',
    obs: localMapping.obs ?? appSheetMapping?.obs ?? '',
    posto: localMapping.posto ?? appSheetMapping?.posto ?? '',
    combustivel: localMapping.combustivel ?? appSheetMapping?.combustivel ?? '',
    quantidade: localMapping.quantidade ?? appSheetMapping?.quantidade ?? '',
    valorUnitario: localMapping.valorUnitario ?? appSheetMapping?.valorUnitario ?? ''
  };

  const handleFetchColumns = async () => {
    setIsFetchingColumns(true);
    try {
      const rows = await fetchAppSheetData();
      if (rows.length > 0) {
        setAppSheetColumns(Object.keys(rows[0]));
        setIsMappingOpen(true);
      } else {
        setImportStatus({ success: false, message: 'Nenhum dado encontrado para extrair colunas.' });
      }
    } catch (error) {
      setImportStatus({ success: false, message: error instanceof Error ? error.message : 'Erro ao buscar colunas.' });
    } finally {
      setIsFetchingColumns(false);
    }
  };

  const handleUpdateMapping = (field: keyof AppSheetMapping, value: string) => {
    const newMapping = {
      ...currentMapping,
      [field]: value
    };
    setLocalMapping(prev => ({ ...prev, [field]: value }));
    onUpdateAppSheetMapping(newMapping);
  };

  const isAppSheetConfigured = !!(
    (import.meta as any).env?.VITE_APPSHEET_APP_ID &&
    (import.meta as any).env?.VITE_APPSHEET_ACCESS_KEY &&
    (import.meta as any).env?.VITE_APPSHEET_TABLE_NAME
  );

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setImportStatus(null);
    try {
      await fetchAppSheetData();
      setImportStatus({ success: true, message: 'Conexão com AppSheet estabelecida com sucesso! O app está pronto para sincronizar.' });
    } catch (error) {
      setImportStatus({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Falha na conexão com AppSheet.' 
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSyncAppSheet = async () => {
    setIsSyncingAppSheet(true);
    setImportStatus(null);
    try {
      const rows = await fetchAppSheetData();
      if (rows.length === 0) {
        setImportStatus({ success: true, message: 'Nenhum dado encontrado no AppSheet.' });
        setIsSyncingAppSheet(false);
        return;
      }

      const importedEntries: Entry[] = rows.map(row => ({
        id: crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15),
        ...mapAppSheetToEntry(row, categories, earningCategories, currentMapping)
      }));

      setPendingImport(importedEntries);
      setImportStatus({ success: true, message: `Encontrados ${rows.length} registros no AppSheet.` });
    } catch (error) {
      console.error('Erro AppSheet:', error);
      setImportStatus({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro ao conectar com AppSheet.' 
      });
    } finally {
      setIsSyncingAppSheet(false);
    }
  };

  const handlePushToAppSheet = async () => {
    if (entries.length === 0) {
      setImportStatus({ success: false, message: 'Não há lançamentos para exportar.' });
      return;
    }

    setIsPushingToAppSheet(true);
    setImportStatus(null);
    try {
      const rows = entries.map(entry => 
        mapEntryToAppSheet(entry, categories, earningCategories, currentMapping)
      );

      // AppSheet API might have limits on batch size, but for now we send all
      // If there are thousands of entries, we might need to chunk this.
      await addRowsToAppSheet(rows);
      setImportStatus({ success: true, message: `${rows.length} lançamentos enviados para o AppSheet com sucesso!` });
    } catch (error) {
      console.error('Erro ao enviar para AppSheet:', error);
      setImportStatus({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro ao enviar dados para AppSheet.' 
      });
    } finally {
      setIsPushingToAppSheet(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const filteredEntriesForExport = entries.filter(entry => {
        // Filter by Type
        if (exportType !== 'all' && entry.tipo !== exportType) return false;

        // Filter by Category
        if (exportCategoryId !== 'all') {
          if (entry.tipo === 'Despesa') {
            return entry.categoriaId === exportCategoryId;
          } else if (entry.tipo === 'Ganhos') {
            const matchesPlatform = entry.ganhos && entry.ganhos[exportCategoryId] !== undefined && Number(entry.ganhos[exportCategoryId]) > 0;
            const matchesRefund = entry.reembolsos && entry.reembolsos[exportCategoryId] !== undefined && Number(entry.reembolsos[exportCategoryId]) > 0;
            const matchesFechamento = exportCategoryId === '10' && (entry.ganhos && Object.values(entry.ganhos).some(v => Number(v) > 0));

            return matchesPlatform || matchesRefund || matchesFechamento;
          }
        }
        return true;
      });

      if (filteredEntriesForExport.length === 0) {
        setImportStatus({ success: false, message: 'Nenhum lançamento encontrado para os filtros selecionados.' });
        return;
      }

      const dataToExport = filteredEntriesForExport.map(entry => {
        const category = categories.find(c => c.id === entry.categoriaId);
        
        const getEntryTitle = (e: typeof entry) => {
          if (e.tipo === 'Ganhos') {
            const hasGanhos = e.ganhos && Object.values(e.ganhos).some(v => Number(v) > 0);
            const refundItems = e.reembolsos ? Object.entries(e.reembolsos).filter(([_, val]) => Number(val) > 0) : [];
            
            if (hasGanhos) {
              return 'Fechamento do Dia';
            } else if (refundItems.length > 0) {
              if (refundItems.length === 1) {
                const catId = refundItems[0][0];
                const cat = refundCategories?.find(c => c.id === catId);
                return `Reembolso de ${cat?.nome || 'Outros'}`;
              } else {
                return 'Reembolsos';
              }
            } else {
              return 'Fechamento do Dia';
            }
          } else {
            return category?.nome || 'Outros';
          }
        };

        const base = {
          Data: entry.data,
          Criado_Em: entry.createdAt || '',
          Tipo: entry.tipo,
          Categoria: getEntryTitle(entry),
          Valor: entry.valor,
          KM: entry.km || '',
          Km_Rodado: entry.kmRodado || '',
          Combustivel: entry.combustivel || '',
          Quantidade: entry.quantidade || '',
          Valor_Unitario: entry.valorUnitario || '',
          Observacoes: entry.obs || '',
          GPS: entry.gps || (entry.location ? `${entry.location.lat}, ${entry.location.lng}` : ''),
          Endereco: entry.endereco || entry.location?.address || '',
          Link_Nota: entry.linkNota || '',
          Foto: entry.photoUrl || ''
        };

        if (entry.tipo === 'Ganhos' && entry.ganhos) {
          const platformGanhos: Record<string, number> = {};
          earningCategories.forEach(cat => {
            platformGanhos[`Ganho_${cat.nome}`] = entry.ganhos?.[cat.id] || 0;
          });
          return { ...base, ...platformGanhos };
        }

        return base;
      });

      // Excel has a limit of 32,767 characters per cell.
      // We truncate to 32,000 to be safe.
      const safeData = truncateLargeFields(dataToExport, 32000);

      const worksheet = XLSX.utils.json_to_sheet(safeData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Lancamentos");

      let filterSuffix = '';
      if (exportType !== 'all') {
        filterSuffix += `_${exportType}`;
      }
      if (exportCategoryId !== 'all') {
        const catName = categories.find(c => c.id === exportCategoryId)?.nome || 
                        earningCategories.find(c => c.id === exportCategoryId)?.nome || 
                        refundCategories?.find(c => c.id === exportCategoryId)?.nome || 
                        (exportCategoryId === '10' ? 'Fechamento' : '');
        if (catName) {
          filterSuffix += `_${catName.replace(/\s+/g, '_')}`;
        }
      }

      XLSX.writeFile(workbook, `Motorista_2026_Export${filterSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      setImportStatus({ success: false, message: 'Erro ao gerar arquivo Excel.' });
    }
  };

  const transformGoogleDriveUrl = (url: string) => {
    if (!url || typeof url !== 'string') return url;
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
      }
    }
    return url;
  };

  const handleImportExcel = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

        if (jsonData.length === 0) {
          setImportStatus({ success: false, message: 'O arquivo selecionado está vazio.' });
          return;
        }

        const importedEntries: Entry[] = jsonData.map(row => {
          let entryData = row.Data;
          let timePart = '';
          
          // Handle Excel date serial numbers or strings
          if (entryData instanceof Date) {
            // Extract local date components to avoid UTC shift
            const y = entryData.getFullYear();
            const m = String(entryData.getMonth() + 1).padStart(2, '0');
            const d = String(entryData.getDate()).padStart(2, '0');
            
            const hh = String(entryData.getHours()).padStart(2, '0');
            const mm = String(entryData.getMinutes()).padStart(2, '0');
            const ss = String(entryData.getSeconds()).padStart(2, '0');
            
            if (hh !== '00' || mm !== '00' || ss !== '00') {
              timePart = `${hh}:${mm}:${ss}`;
            }
            
            entryData = `${y}/${m}/${d}`;
          } else if (typeof entryData === 'number') {
            // Excel serial date to JS Date
            const date = new Date((entryData - 25569) * 86400 * 1000);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            const ss = String(date.getSeconds()).padStart(2, '0');
            
            if (hh !== '00' || mm !== '00' || ss !== '00') {
              timePart = `${hh}:${mm}:${ss}`;
            }
            
            entryData = `${y}/${m}/${d}`;
          } else if (typeof entryData === 'string') {
            const parsedDate = new Date(entryData);
            if (!isNaN(parsedDate.getTime())) {
              const y = parsedDate.getFullYear();
              const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
              const d = String(parsedDate.getDate()).padStart(2, '0');
              
              const hh = String(parsedDate.getHours()).padStart(2, '0');
              const mm = String(parsedDate.getMinutes()).padStart(2, '0');
              const ss = String(parsedDate.getSeconds()).padStart(2, '0');
              
              if (hh !== '00' || mm !== '00' || ss !== '00') {
                timePart = `${hh}:${mm}:${ss}`;
              }
              
              entryData = `${y}/${m}/${d}`;
            } else {
              // Try parsing DD/MM/YYYY
              const parts = entryData.split('/');
              if (parts.length === 3) {
                const d = parts[0].padStart(2, '0');
                const m = parts[1].padStart(2, '0');
                const y = parts[2].split(' ')[0]; // Handle possible time in string
                
                const timeMatch = entryData.match(/(\d{2}:\d{2}(?::\d{2})?)/);
                if (timeMatch) timePart = timeMatch[1];
                
                entryData = `${y}/${m}/${d}`;
              } else {
                entryData = format(new Date(), 'yyyy/MM/dd');
              }
            }
          } else {
            entryData = format(new Date(), 'yyyy/MM/dd');
          }

          const categoryName = row.Categoria || row.Category;
          let catId = '9'; // Default to Outros
          if (categoryName) {
            const found = categories.find(c => 
              c.nome.toLowerCase() === categoryName.toLowerCase() ||
              c.id === categoryName
            );
            if (found) catId = found.id;
          }

          let createdAt = row.Criado_Em || row.Created_At || row.createdAt;
          if (createdAt instanceof Date) {
            createdAt = format(createdAt, 'yyyy/MM/dd HH:mm:ss');
          } else if (typeof createdAt === 'number') {
            const date = new Date((createdAt - 25569) * 86400 * 1000);
            createdAt = format(date, 'yyyy/MM/dd HH:mm:ss');
          } else if (!createdAt) {
            if (timePart) {
              createdAt = `${entryData} ${timePart}`;
              if (timePart.split(':').length === 2) createdAt += ':00';
            } else {
              createdAt = format(new Date(), 'yyyy/MM/dd HH:mm:ss');
            }
          }

          const valor = Number(row.Valor || row.Value || 0);
          
          let parsedTipo: EntryType = 'Despesa';
          const rowTipo = String(row.Tipo || row.Type || '').trim().toLowerCase();
          if (rowTipo.includes('ganho') || rowTipo.includes('receita') || rowTipo.includes('reembolso') || rowTipo.includes('faturamento') || rowTipo.includes('rendimento') || rowTipo.includes('entrada')) {
            parsedTipo = 'Ganhos';
          } else if (rowTipo.includes('despesa') || rowTipo.includes('custo') || rowTipo.includes('saída') || rowTipo.includes('saida')) {
            parsedTipo = 'Despesa';
          }
          
          const entry: Entry = {
            id: crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15),
            data: entryData.includes('T') ? format(new Date(entryData), 'yyyy/MM/dd') : entryData,
            createdAt: createdAt,
            tipo: parsedTipo,
            categoriaId: catId,
            valor: isNaN(valor) ? 0 : valor,
            km: (row.KM && !isNaN(Number(row.KM))) ? Number(row.KM) : undefined,
            kmRodado: (row.Km_Rodado && !isNaN(Number(row.Km_Rodado))) ? Number(row.Km_Rodado) : undefined,
            combustivel: row.Combustivel || row.Fuel || undefined,
            quantidade: (row.Quantidade && !isNaN(Number(row.Quantidade))) ? Number(row.Quantidade) : undefined,
            valorUnitario: (row.Valor_Unitario && !isNaN(Number(row.Valor_Unitario))) ? Number(row.Valor_Unitario) : undefined,
            obs: row.Observacoes || row.Notes || row.obs || undefined,
            gps: row.GPS || (row.Latitude && row.Longitude ? `${row.Latitude}, ${row.Longitude}` : undefined),
            endereco: row.Endereco || row.Address || undefined,
            linkNota: (row.Link_Nota || row.linkNota || row.URL_Nota || row.Link) ? String(row.Link_Nota || row.linkNota || row.URL_Nota || row.Link).trim() : undefined,
            qrCodeData: (row.Link_Nota || row.linkNota || row.URL_Nota || row.Link) ? String(row.Link_Nota || row.linkNota || row.URL_Nota || row.Link).trim() : undefined,
            photoUrl: transformGoogleDriveUrl(row.Foto || row.Photo) || undefined,
          };

          if (entry.tipo === 'Ganhos') {
            entry.categoriaId = '10';
            const platformGanhos: Record<string, number> = {};
            const platformReembolsos: Record<string, number> = {};
            let hasColumnGanhosOrReembolsos = false;

            earningCategories.forEach(cat => {
              const val = row[`Ganho_${cat.nome}`] || row[`Earning_${cat.nome}`] || row[cat.nome];
              if (val !== undefined && val !== '') {
                const numVal = Number(val);
                if (!isNaN(numVal) && numVal > 0) {
                  platformGanhos[cat.id] = numVal;
                  hasColumnGanhosOrReembolsos = true;
                }
              }
            });

            if (refundCategories) {
              refundCategories.forEach(cat => {
                const val = row[`Reembolso_${cat.nome}`] || row[`Refund_${cat.nome}`] || row[cat.nome];
                if (val !== undefined && val !== '') {
                  const numVal = Number(val);
                  if (!isNaN(numVal) && numVal > 0) {
                    platformReembolsos[cat.id] = numVal;
                    hasColumnGanhosOrReembolsos = true;
                  }
                }
              });
            }

            if (!hasColumnGanhosOrReembolsos && categoryName) {
              const categoryNameLower = String(categoryName).toLowerCase();
              
              const foundRefundCat = refundCategories?.find(cat => 
                categoryNameLower.includes(cat.nome.toLowerCase()) || 
                cat.nome.toLowerCase().includes(categoryNameLower) ||
                (cat.id === 'ref_pedagio' && (categoryNameLower.includes('pedagio') || categoryNameLower.includes('pedágio'))) ||
                (cat.id === 'ref_combustivel' && categoryNameLower.includes('combustivel'))
              );

              if (foundRefundCat) {
                platformReembolsos[foundRefundCat.id] = entry.valor;
              } else {
                const foundEarningCat = earningCategories.find(cat => 
                  categoryNameLower.includes(cat.nome.toLowerCase()) ||
                  cat.nome.toLowerCase().includes(categoryNameLower)
                );

                if (foundEarningCat) {
                  platformGanhos[foundEarningCat.id] = entry.valor;
                } else if (categoryNameLower.includes('reembolso')) {
                  const refundOutros = refundCategories?.find(c => c.id === 'ref_outros') || refundCategories?.[0];
                  if (refundOutros) {
                    platformReembolsos[refundOutros.id] = entry.valor;
                  }
                } else {
                  const earningOutros = earningCategories.find(c => c.id === 'outros') || earningCategories[0];
                  if (earningOutros) {
                    platformGanhos[earningOutros.id] = entry.valor;
                  }
                }
              }
            }

            entry.ganhos = platformGanhos;
            entry.reembolsos = platformReembolsos;
          }

          return entry;
        });

        setPendingImport(importedEntries);
      } catch (error) {
        console.error('Erro ao importar:', error);
        setImportStatus({ success: false, message: 'Erro ao ler o arquivo. Verifique se é um Excel válido.' });
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = () => {
    if (pendingImport) {
      onUpdateEntries(pendingImport);
      setImportStatus({ success: true, message: `${pendingImport.length} lançamentos importados com sucesso!` });
      setPendingImport(null);
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-200">
        <h2 className="font-bold text-xl mb-1">Configurações</h2>
        <p className="text-sm opacity-80 font-medium">
          Personalize o aplicativo para sua realidade de trabalho.
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => {
            setActiveSection('general');
            setImportStatus(null);
            setPendingImport(null);
          }}
          className={cn(
            "flex-1 min-w-fit flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all whitespace-nowrap",
            activeSection === 'general' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
          )}
        >
          <Settings size={18} />
          Geral
        </button>
        {isAdmin && (
          <button
            onClick={() => {
              setActiveSection('admin');
              setImportStatus(null);
              setPendingImport(null);
            }}
            className={cn(
              "flex-1 min-w-fit flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all whitespace-nowrap",
              activeSection === 'admin' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
            )}
          >
            <Database size={18} />
            Admin
          </button>
        )}
        <button
          onClick={() => {
            setActiveSection('fixed');
            setImportStatus(null);
            setPendingImport(null);
          }}
          className={cn(
            "flex-1 min-w-fit flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all whitespace-nowrap",
            activeSection === 'fixed' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
          )}
        >
          <Wallet size={18} />
          Custos Fixos
        </button>
        <button
          onClick={() => {
            setActiveSection('expenses');
            setImportStatus(null);
            setPendingImport(null);
          }}
          className={cn(
            "flex-1 min-w-fit flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all whitespace-nowrap",
            activeSection === 'expenses' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
          )}
        >
          <TrendingDown size={18} />
          Categorias
        </button>
        <button
          onClick={() => {
            setActiveSection('earnings');
            setImportStatus(null);
            setPendingImport(null);
          }}
          className={cn(
            "flex-1 min-w-fit flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all whitespace-nowrap",
            activeSection === 'earnings' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
          )}
        >
          <TrendingUp size={18} />
          Ganhos
        </button>
        <button
          onClick={() => {
            setActiveSection('data');
            setImportStatus(null);
            setPendingImport(null);
          }}
          className={cn(
            "flex-1 min-w-fit flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all whitespace-nowrap",
            activeSection === 'data' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
          )}
        >
          <FileSpreadsheet size={18} />
          Dados
        </button>
        <button
          onClick={() => {
            setActiveSection('share');
            setImportStatus(null);
            setPendingImport(null);
          }}
          className={cn(
            "flex-1 min-w-fit flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all whitespace-nowrap",
            activeSection === 'share' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
          )}
        >
          <Share2 size={18} />
          Divulgar
        </button>
      </div>

      {activeSection === 'general' && (
        <div className="space-y-4">
          <PWAInstallButton />
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Car className="text-blue-600 size-5" />
              </div>
              <h3 className="font-bold text-slate-800">Metas de Kilometragem</h3>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 ml-1">Meta de KM Mensal</label>
              <div className="relative">
                <input 
                  type="number"
                  value={targetKm || ''}
                  onChange={(e) => onUpdateTargetKm(Number(e.target.value))}
                  placeholder="Ex: 5000"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-lg font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">km</div>
              </div>
              <p className="text-[10px] text-slate-400 ml-1 italic">
                * Defina quantos quilômetros você planeja ou precisa rodar no mês.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-500 ml-1">Quilometragem Atual do Veículo</label>
              <div className="relative">
                <input 
                  type="number"
                  value={lastRecordedKm || ''}
                  onChange={(e) => onUpdateCurrentKm?.(Number(e.target.value))}
                  placeholder="Ex: 15000"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-lg font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">km</div>
              </div>
              <p className="text-[10px] text-slate-400 ml-1 italic">
                * Este valor é atualizado automaticamente ao registrar um abastecimento ou manutenção.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <RefreshCw className="text-emerald-600 size-5" />
                </div>
                <h3 className="font-bold text-slate-800">Intervalos de Manutenção</h3>
              </div>
              
              <div className="space-y-3">
                {maintenanceIntervals.map((interval, idx) => (
                  <div key={`${interval.id}-${idx}`} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", getCategoryStyle(interval.item).bgColor, getCategoryStyle(interval.item).color)}>
                          {getCategoryStyle(interval.item).icon}
                        </div>
                        <span className="font-bold text-slate-700">{interval.item}</span>
                      </div>
                      <button 
                        onClick={() => onUpdateMaintenanceIntervals(maintenanceIntervals.filter(m => m.id !== interval.id))}
                        className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        value={interval.intervaloKm}
                        onChange={(e) => {
                          const newIntervals = maintenanceIntervals.map(m => 
                            m.id === interval.id ? { ...m, intervaloKm: Number(e.target.value) } : m
                          );
                          onUpdateMaintenanceIntervals(newIntervals);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">km</div>
                    </div>
                  </div>
                ))}

                <MaintenanceIntervalAdder 
                  onAdd={(item, km) => {
                    const newItem: MaintenanceInterval = {
                      id: crypto.randomUUID(),
                      item,
                      intervaloKm: km
                    };
                    onUpdateMaintenanceIntervals([...maintenanceIntervals, newItem]);
                  }} 
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-50 rounded-xl">
                  <Sparkles className="text-purple-600 size-5" />
                </div>
                <h3 className="font-bold text-slate-800">Inteligência Artificial (Gemini)</h3>
              </div>
              
              <div className={cn(
                "p-4 rounded-2xl border flex items-center justify-between",
                process.env.GEMINI_API_KEY ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
              )}>
                <div className="flex items-center gap-3">
                  {process.env.GEMINI_API_KEY ? (
                    <CheckCircle2 className="text-emerald-600" size={20} />
                  ) : (
                    <AlertCircle className="text-rose-600" size={20} />
                  )}
                  <div>
                    <p className={cn("text-sm font-bold", process.env.GEMINI_API_KEY ? "text-emerald-700" : "text-rose-700")}>
                      {process.env.GEMINI_API_KEY ? "IA Configurada" : "IA não configurada"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {process.env.GEMINI_API_KEY 
                        ? "Recursos de leitura automática de notas estão ativos." 
                        : "Adicione a GEMINI_API_KEY nos Secrets para ativar a leitura de notas."}
                    </p>
                  </div>
                </div>
                {!process.env.GEMINI_API_KEY && (
                  <div className="text-[10px] font-black text-rose-600 uppercase bg-white px-2 py-1 rounded-lg border border-rose-100">
                    Ação Necessária
                  </div>
                )}
              </div>
            </div>
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <Mail className="text-slate-600 size-5" />
                </div>
                <h3 className="font-bold text-slate-800">Contato / Suporte</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dúvidas, sugestões ou encontrou algum problema no aplicativo? Entre em contato conosco via e-mail.
              </p>
              <div className="flex p-4 bg-slate-50 border border-slate-100 rounded-2xl items-center justify-between">
                <span className="font-bold text-slate-700 text-sm">lucronovolanteapp@gmail.com</span>
                <a href="mailto:lucronovolanteapp@gmail.com" className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all">
                  Enviar E-mail
                </a>
              </div>
              <div className="flex gap-4 pt-2">
                <button onClick={() => setModalType('terms')} className="flex-1 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all">Termos de Uso</button>
                <button onClick={() => setModalType('privacy')} className="flex-1 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all">Privacidade</button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <RefreshCw className="text-blue-600 size-5" />
                </div>
                <h3 className="font-bold text-slate-800">Sistema e Cache</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Se as atualizações visuais (como as fontes amarelas) não estiverem aparecendo no seu celular, use o botão abaixo para limpar o cache local.
              </p>
              <button
                onClick={() => {
                  if (window.confirm('Deseja limpar o cache e recarregar o app?')) {
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then(registrations => {
                        for (let registration of registrations) {
                          registration.unregister();
                        }
                        window.location.reload();
                      });
                    } else {
                      window.location.reload();
                    }
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                <RefreshCw size={18} />
                Forçar Atualização do App
              </button>
            </div>

            
          </div>
        </div>
      )}

      {activeSection === 'fixed' && (
        <FixedCostsManager costs={fixedCosts} onUpdate={onUpdateFixedCosts} />
      )}

      {activeSection === 'expenses' && (
        <ExpenseCategoriesManager categories={categories} onUpdate={onUpdateCategories} />
      )}

      {activeSection === 'earnings' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <TrendingUp className="text-emerald-500" size={20} />
                Plataformas de Ganhos
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure as plataformas onde você realiza corridas ou entregas.
              </p>
            </div>
            <EarningCategoriesManager categories={earningCategories} onUpdate={onUpdateEarningCategories} />
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Coins className="text-blue-500" size={20} />
                Tipos de Reembolso / Ressarcimento
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Defina tipos de reembolso para acompanhar de forma integrada aos seus ganhos.
              </p>
            </div>
            <RefundCategoriesManager categories={refundCategories} onUpdate={onUpdateRefundCategories} />
          </div>
        </div>
      )}
      
      {activeSection === 'share' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Share2 className="text-blue-600 size-5" />
              </div>
              <h3 className="font-bold text-slate-800">Divulgar LucroNoVolante</h3>
            </div>

            <p className="text-sm text-slate-500 leading-relaxed">
              Compartilhe o seu link oficial com outros motoristas e ajude-os a profissionalizar a gestão financeira nas ruas.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seu Link de Divulgação</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value="https://lucronovolante.app.br"
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 focus:outline-none"
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("https://lucronovolante.app.br");
                    setImportStatus({ success: true, message: 'Link copiado para a área de transferência!' });
                  }}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95"
                  title="Copiar Link"
                >
                  <Copy size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => window.open('https://wa.me/?text=Olha+esse+app+que+estou+usando+para+controlar+meus+ganhos+na+Uber+e+99:+https://lucronovolante.app.br', '_blank')}
                className="flex items-center justify-center gap-2 p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-bold text-sm hover:bg-emerald-100 transition-all"
              >
                <ExternalLink size={18} />
                WhatsApp
              </button>
              <button 
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'LucroNoVolante',
                      text: 'Controle seus ganhos e despesas de motorista de app com o LucroNoVolante!',
                      url: 'https://lucronovolante.app.br'
                    });
                  } else {
                    setImportStatus({ success: false, message: 'Seu navegador não suporta compartilhamento nativo. Copie o link acima.' });
                  }
                }}
                className="flex items-center justify-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-2xl font-bold text-sm hover:bg-blue-100 transition-all"
              >
                <Share2 size={18} />
                Outros ✨
              </button>
            </div>

            <button 
              onClick={() => setIsFlyerOpen(true)}
              className="w-full mt-3 flex items-center justify-center gap-2 p-4 bg-indigo-50 text-indigo-700 rounded-2xl font-bold text-sm hover:bg-indigo-100 transition-all border border-indigo-100"
            >
              Imprimir Panfleto / Flyer
            </button>

            <div className="pt-6 border-t border-slate-100 space-y-6">
              <div>
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-500" />
                  Kit de Divulgação (Copie e Cole)
                </h4>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Sugestão para Stories/Status</p>
                    <p className="text-xs text-slate-600 italic">
                      "Cansado de não saber quanto realmente sobra no final do dia? 🚗💨 Comecei a usar o LucroNoVolante e agora vejo meu lucro real descontando combustível e manutenção. Teste grátis por 30 dias: [LINK]"
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Sugestão para Grupos de WhatsApp</p>
                    <p className="text-xs text-slate-600 italic">
                      "Fala pessoal! Achei uma ferramenta top pra gente que é motorista. Dá pra controlar meta diária, km e ver o lucro de verdade. O nome é LucroNoVolante. Segue o link pra quem quiser testar: [LINK]"
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Settings size={18} className="text-blue-500" />
                  Dicas de Ouro
                </h4>
                <ul className="space-y-3">
                  <li className="flex gap-3 text-xs text-slate-600 leading-relaxed">
                    <div className="size-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                    Use um encurtador como <strong>Bitly</strong> para deixar o link mais amigável.
                  </li>
                  <li className="flex gap-3 text-xs text-slate-600 leading-relaxed">
                    <div className="size-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                    Poste o link na sua <strong>Bio do Instagram</strong>.
                  </li>
                  <li className="flex gap-3 text-xs text-slate-600 leading-relaxed">
                    <div className="size-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                    Sempre que bater sua meta, tire um print e poste com o link.
                  </li>
                </ul>

                <button
                  onClick={() => setIsAIVideoStudioOpen(true)}
                  className="w-full py-5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white rounded-[24px] font-bold shadow-xl shadow-blue-200 flex items-center justify-center gap-4 hover:scale-[1.02] transition-all active:scale-95 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="p-3 bg-white/20 rounded-2xl group-hover:rotate-12 transition-transform">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-black">AI Video Studio</p>
                    <p className="text-[11px] opacity-90 font-bold uppercase tracking-wider">Crie roteiros e cópias com IA</p>
                  </div>
                  <ChevronRight size={20} className="ml-auto opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'data' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            {importStatus && (
              <div className={cn(
                "p-4 rounded-2xl flex items-center gap-3 border",
                importStatus.success ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"
              )}>
                {importStatus.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <p className="text-sm font-bold">{importStatus.message}</p>
              </div>
            )}

            {pendingImport ? (
              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 space-y-4">
                <div className="flex items-center gap-3 text-blue-700">
                  <FileSpreadsheet size={24} />
                  <div>
                    <h3 className="font-bold">Confirmar Importação</h3>
                    <p className="text-xs opacity-80">Encontramos {pendingImport.length} lançamentos no arquivo.</p>
                  </div>
                </div>
                <p className="text-xs text-blue-600 font-medium">
                  Atenção: Ao confirmar, todos os seus dados atuais serão substituídos pelos dados deste arquivo.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmImport}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                  >
                    Confirmar e Importar
                  </button>
                  <button
                    onClick={() => setPendingImport(null)}
                    className="px-4 bg-white text-slate-600 border border-slate-200 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Database size={20} className="text-blue-600" />
                      Sincronizar AppSheet
                    </h3>
                    {isAppSheetConfigured ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase border border-emerald-100">
                        <CheckCircle2 size={10} />
                        Configurado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase border border-amber-100">
                        <AlertCircle size={10} />
                        Pendente
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    Importe dados diretamente da sua tabela do AppSheet. Configure as chaves de acesso nas configurações do app.
                  </p>
                  
                  <button
                    onClick={() => setIsAIVideoStudioOpen(true)}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 flex items-center justify-center gap-3 hover:scale-[1.02] transition-all active:scale-95 group mb-2"
                  >
                    <div className="p-2 bg-white/20 rounded-xl group-hover:rotate-12 transition-transform">
                      <Sparkles size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm">AI Video Studio</p>
                      <p className="text-[10px] opacity-80 font-medium">Crie roteiros e cópias com IA</p>
                    </div>
                  </button>

                  {!isAppSheetConfigured && (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 mb-2">
                      <AlertCircle className="text-amber-500 shrink-0" size={18} />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-amber-800">Configuração Incompleta</p>
                        <p className="text-[10px] text-amber-700 leading-relaxed">
                          Vá em <strong>Settings (engrenagem)</strong> e adicione as chaves 
                          VITE_APPSHEET_APP_ID, VITE_APPSHEET_ACCESS_KEY e VITE_APPSHEET_TABLE_NAME.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleSyncAppSheet}
                      disabled={isSyncingAppSheet || isPushingToAppSheet || !isAppSheetConfigured}
                      className={cn(
                        "flex-1 py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all",
                        (isSyncingAppSheet || isPushingToAppSheet || !isAppSheetConfigured)
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                          : "bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700"
                      )}
                      title="Importar do AppSheet"
                    >
                      <RefreshCw size={20} className={cn(isSyncingAppSheet && "animate-spin")} />
                      {isSyncingAppSheet ? 'Importando...' : 'Importar'}
                    </button>

                    <button
                      onClick={handlePushToAppSheet}
                      disabled={isSyncingAppSheet || isPushingToAppSheet || !isAppSheetConfigured}
                      className={cn(
                        "flex-1 py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all",
                        (isSyncingAppSheet || isPushingToAppSheet || !isAppSheetConfigured)
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                          : "bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700"
                      )}
                      title="Enviar para o AppSheet"
                    >
                      <Upload size={20} className={cn(isPushingToAppSheet && "animate-spin")} />
                      {isPushingToAppSheet ? 'Enviando...' : 'Exportar'}
                    </button>
                    
                    <button
                      onClick={handleTestConnection}
                      disabled={isTestingConnection || !isAppSheetConfigured}
                      className={cn(
                        "px-4 py-4 rounded-2xl font-bold border-2 transition-all flex items-center justify-center gap-2",
                        (isTestingConnection || !isAppSheetConfigured)
                          ? "border-slate-100 text-slate-300 cursor-not-allowed"
                          : "border-blue-100 text-blue-600 hover:bg-blue-50"
                      )}
                    >
                      {isTestingConnection ? <RefreshCw size={18} className="animate-spin" /> : <Database size={18} />}
                    </button>
                  </div>

                  <button
                    onClick={handleFetchColumns}
                    disabled={isFetchingColumns || !isAppSheetConfigured}
                    className="w-full py-3 rounded-xl font-bold text-sm text-blue-600 border border-blue-100 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isFetchingColumns ? <RefreshCw size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                    Configurar Mapeamento de Colunas
                  </button>

                  {isMappingOpen && appSheetColumns.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Mapeamento de Colunas</h4>
                        <button onClick={() => setIsMappingOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <MappingField 
                          label="Data" 
                          value={currentMapping.data} 
                          options={appSheetColumns} 
                          onChange={(v) => handleUpdateMapping('data', v)} 
                        />
                        <MappingField 
                          label="Valor Total" 
                          value={currentMapping.valor} 
                          options={appSheetColumns} 
                          onChange={(v) => handleUpdateMapping('valor', v)} 
                        />
                        <MappingField 
                          label="Tipo (Ganhos/Despesa)" 
                          value={currentMapping.tipo} 
                          options={appSheetColumns} 
                          onChange={(v) => handleUpdateMapping('tipo', v)} 
                        />
                        <MappingField 
                          label="Categoria" 
                          value={currentMapping.categoria} 
                          options={appSheetColumns} 
                          onChange={(v) => handleUpdateMapping('categoria', v)} 
                        />
                        <MappingField 
                          label="KM Atual" 
                          value={currentMapping.km} 
                          options={appSheetColumns} 
                          onChange={(v) => handleUpdateMapping('km', v)} 
                        />
                        <MappingField 
                          label="Observações" 
                          value={currentMapping.obs} 
                          options={appSheetColumns} 
                          onChange={(v) => handleUpdateMapping('obs', v)} 
                        />
                        <MappingField 
                          label="Posto/Local" 
                          value={currentMapping.posto} 
                          options={appSheetColumns} 
                          onChange={(v) => handleUpdateMapping('posto', v)} 
                        />
                        <MappingField 
                          label="Combustível" 
                          value={currentMapping.combustivel} 
                          options={appSheetColumns} 
                          onChange={(v) => handleUpdateMapping('combustivel', v)} 
                        />
                      </div>
                      
                      <p className="text-[10px] text-slate-400 italic">
                        * O app tentará mapear automaticamente se o campo for deixado em branco.
                      </p>
                    </motion.div>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-2">
                    <h3 className="font-bold text-blue-800 flex items-center gap-2">
                      <RefreshCw size={20} className="animate-spin-slow" />
                      Recuperar Dados de Outro App
                    </h3>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Se você criou uma cópia (Remix) do app, seus dados antigos estão no projeto anterior. 
                      Para trazê-los para cá:
                    </p>
                    <ol className="text-[10px] text-blue-600 space-y-1 list-decimal ml-4 font-medium">
                      <li>Abra o seu aplicativo antigo.</li>
                      <li>Vá em <b>Custos &gt; Dados</b> e clique em <b>Exportar Agora</b>.</li>
                      <li>Volte para este aplicativo (o novo).</li>
                      <li>Clique em <b>Selecionar Arquivo e Importar</b> abaixo e escolha o arquivo que você baixou.</li>
                    </ol>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-2">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Download size={20} className="text-blue-600" />
                    Exportar para Excel
                  </h3>
                  <p className="text-sm text-slate-500">
                    Baixe todos ou parte dos seus lançamentos em um arquivo .xlsx para backup ou análise detalhada.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 pb-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Filtrar por Tipo</label>
                      <select 
                        value={exportType}
                        onChange={(e) => {
                          setExportType(e.target.value as any);
                          setExportCategoryId('all');
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none cursor-pointer"
                      >
                        <option value="all">Todos os tipos</option>
                        <option value="Ganhos">Ganhos (Faturamento)</option>
                        <option value="Despesa">Despesas (Custos)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Filtrar por Categoria</label>
                      <select 
                        value={exportCategoryId}
                        onChange={(e) => setExportCategoryId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none cursor-pointer"
                      >
                        <option value="all">Todas as categorias</option>
                        
                        {(exportType === 'all' || exportType === 'Despesa') && (
                          <optgroup label="Despesas">
                            {categories.map((cat, idx) => (
                              <option key={`exp-exp-${cat.id}-${idx}`} value={cat.id}>{cat.nome}</option>
                            ))}
                          </optgroup>
                        )}

                        {(exportType === 'all' || exportType === 'Ganhos') && (
                          <>
                            <optgroup label="Fechamentos">
                              <option value="10">Fechamento do Dia</option>
                            </optgroup>
                            
                            {earningCategories && earningCategories.length > 0 && (
                              <optgroup label="Plataformas / Ganhos">
                                {earningCategories.map((cat, idx) => (
                                  <option key={`exp-earn-${cat.id}-${idx}`} value={cat.id}>{cat.nome}</option>
                                ))}
                              </optgroup>
                            )}
                            
                            {refundCategories && refundCategories.length > 0 && (
                              <optgroup label="Reembolsos">
                                {refundCategories.map((cat, idx) => (
                                  <option key={`exp-ref-${cat.id}-${idx}`} value={cat.id}>{cat.nome}</option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleExportExcel}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
                  >
                    Exportar Agora
                  </button>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-2">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Upload size={20} className="text-emerald-600" />
                    Importar de Excel
                  </h3>
                  <p className="text-sm text-slate-500">
                    Importe lançamentos de um arquivo Excel. O arquivo deve seguir o formato da exportação.
                  </p>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx, .xls"
                    onChange={handleImportExcel}
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"
                  >
                    <Upload size={20} />
                    Selecionar Arquivo e Importar
                  </button>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-2">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Trash2 size={20} className="text-rose-600" />
                    Limpar Todos os Dados
                  </h3>
                  <p className="text-sm text-slate-500">
                    Apague permanentemente todos os seus lançamentos e histórico. Esta ação não pode ser desfeita.
                  </p>
                  
                  {isConfirmingClear ? (
                    <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 space-y-3">
                      <p className="text-xs font-bold text-rose-700 text-center">
                        TEM CERTEZA? Isso apagará todos os seus registros!
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onUpdateEntries([]);
                            setIsConfirmingClear(false);
                            setImportStatus({ success: true, message: 'Todos os dados foram apagados.' });
                          }}
                          className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all"
                        >
                          Sim, Apagar Tudo
                        </button>
                        <button
                          onClick={() => setIsConfirmingClear(false)}
                          className="px-4 bg-white text-slate-600 border border-slate-200 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsConfirmingClear(true)}
                      className="w-full bg-white text-rose-600 border-2 border-rose-100 py-4 rounded-2xl font-bold hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={20} />
                      Apagar Todos os Registros
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeSection === 'admin' && isAdmin && (
        <AdminPanel 
          appConfig={appConfig} 
          onUpdateAppConfig={onUpdateAppConfig} 
        />
      )}

      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
        <AlertCircle className="text-amber-500 shrink-0" size={20} />
        <p className="text-xs text-amber-700 font-medium leading-relaxed">
          As alterações feitas aqui são aplicadas imediatamente aos cálculos de lucro e formulários de lançamento.
        </p>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isFlyerOpen && <MarketingFlyer onClose={() => setIsFlyerOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

function FixedCostsManager({ costs, onUpdate }: { costs: FixedCost[], onUpdate: (costs: FixedCost[]) => void }) {
  const [newItem, setNewItem] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDay, setNewDay] = useState('10');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState('2');
  const [startNextMonth, setStartNextMonth] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDay, setEditDay] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const currentMonthStr = format(new Date(), 'yyyy-MM');

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed || !newValue) return;
    
    let baseDate = new Date();
    if (startNextMonth) {
      baseDate = addMonths(baseDate, 1);
    }
    const startMonthStr = format(baseDate, 'yyyy-MM');
    
    let endMonthStr: string | undefined = undefined;
    if (isInstallment) {
      const count = Number(installmentsCount);
      if (count > 0) {
        endMonthStr = format(addMonths(baseDate, count - 1), 'yyyy-MM');
      }
    }

    const newCost: FixedCost = {
      id: crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15),
      item: trimmed,
      valorMensal: Number(newValue),
      diaVencimento: Number(newDay),
      dataInicio: startMonthStr,
      dataFim: endMonthStr
    };
    onUpdate([...costs, newCost]);
    setNewItem('');
    setNewValue('');
    setIsInstallment(false);
    setInstallmentsCount('2');
    setStartNextMonth(false);
  };

  const handleDelete = (id: string) => {
    onUpdate(costs.filter(c => c.id !== id));
  };

  const handleReajuste = (id: string) => {
    const cost = costs.find(c => c.id === id);
    if (!cost || !editValue) return;

    const newValueNum = Number(editValue);
    const newDayNum = Number(editDay || cost.diaVencimento);

    // 1. Set dataFim for the old cost (previous month)
    const prevMonth = new Date();
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = format(prevMonth, 'yyyy-MM');

    const updatedCosts = costs.map(c => {
      if (c.id === id) {
        return { ...c, dataFim: prevMonthStr };
      }
      return c;
    });

    // 2. Create new cost starting this month
    const newCost: FixedCost = {
      id: crypto.randomUUID(),
      item: cost.item,
      valorMensal: newValueNum,
      diaVencimento: newDayNum,
      dataInicio: currentMonthStr
    };

    onUpdate([...updatedCosts, newCost]);
    setEditingId(null);
    setEditValue('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const activeCosts = costs.filter(c => !c.dataFim || c.dataFim >= currentMonthStr);
  const historicalCosts = costs.filter(c => c.dataFim && c.dataFim < currentMonthStr);

  const displayCosts = showHistory ? costs : activeCosts;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
          {showHistory ? 'Todos os Custos (Histórico)' : 'Custos Atuais'}
        </h3>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
        >
          {showHistory ? 'Ver apenas atuais' : 'Ver histórico'}
        </button>
      </div>

      <div className="space-y-3">
        {displayCosts.map((cost, idx) => {
          const style = getCategoryStyle(cost.item);
          const isHistorical = cost.dataFim && cost.dataFim < currentMonthStr;
          const isEditing = editingId === cost.id;

          return (
            <div key={`${cost.id}-${idx}`} className={cn(
              "bg-white p-4 rounded-2xl shadow-sm border transition-all",
              isHistorical ? "opacity-60 border-slate-100 bg-slate-50/50" : "border-slate-100",
              isEditing && "ring-2 ring-blue-500/20 border-blue-200"
            )}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-xl", style.bgColor, style.color)}>
                    {style.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{cost.item}</h4>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <Calendar size={12} />
                      Vence dia {cost.diaVencimento}
                      {cost.dataInicio && <span> • Desde {cost.dataInicio}</span>}
                      {cost.dataFim && <span className="text-rose-400"> • Até {cost.dataFim}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isHistorical && !isEditing && (
                    <button 
                      onClick={() => {
                        setEditingId(cost.id);
                        setEditValue(cost.valorMensal.toString());
                        setEditDay(cost.diaVencimento.toString());
                      }}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                      title="Reajustar valor"
                    >
                      <RefreshCw size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(cost.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {isEditing ? (
                <div className="bg-blue-50/50 p-3 rounded-xl space-y-3 border border-blue-100 animate-in fade-in slide-in-from-top-2">
                  <p className="text-[10px] font-bold text-blue-600 uppercase">Novo Reajuste (A partir deste mês)</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="Novo Valor"
                      className="flex-1 bg-white border border-blue-200 rounded-lg p-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <input
                      type="number"
                      value={editDay}
                      onChange={(e) => setEditDay(e.target.value)}
                      placeholder="Dia"
                      className="w-16 bg-white border border-blue-200 rounded-lg p-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleReajuste(cost.id)}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all"
                    >
                      Confirmar Reajuste
                    </button>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="px-3 bg-white text-slate-500 border border-slate-200 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <span className="text-xs font-bold text-slate-400 uppercase">Valor Mensal</span>
                  <span className={cn(
                    "font-black",
                    isHistorical ? "text-slate-400" : "text-slate-900"
                  )}>
                    {formatCurrency(cost.valorMensal)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-slate-100 p-5 rounded-3xl space-y-4 border-2 border-dashed border-slate-200">
        <h3 className="font-bold text-slate-600 text-sm flex items-center gap-2">
          <Plus size={18} />
          Adicionar Novo Custo
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Ex: Aluguel do Carro"
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Valor Mensal/Parcela (R$)"
              className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            <input
              type="number"
              value={newDay}
              onChange={(e) => setNewDay(e.target.value)}
              placeholder="Dia"
              className="w-20 bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          
          <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={startNextMonth}
                onChange={(e) => setStartNextMonth(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-600">Começa a cobrar apenas no próximo mês?</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isInstallment}
                onChange={(e) => setIsInstallment(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-600">É uma compra parcelada?</span>
            </label>
            
            {isInstallment && (
              <div className="flex items-center gap-2 mt-1 animate-in fade-in zoom-in-95">
                <span className="text-xs font-semibold text-slate-500">Em quantas vezes?</span>
                <input
                  type="number"
                  min="2"
                  max="48"
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(e.target.value)}
                  className="w-16 bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[10px] text-slate-400">meses</span>
              </div>
            )}
          </div>

          <button
            onClick={handleAdd}
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-900 transition-all active:scale-[0.98]"
          >
            Adicionar Item
          </button>
        </div>
      </div>
    </div>
  );
}

function EarningCategoriesManager({ categories, onUpdate }: { categories: Category[], onUpdate: (categories: Category[]) => void }) {
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const newCat: Category = {
      id: crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15),
      nome: trimmed
    };
    onUpdate([...categories, newCat]);
    setNewName('');
  };

  const handleDelete = (id: string) => {
    onUpdate(categories.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {categories.map((cat, idx) => {
          const style = getCategoryStyle(cat.nome);
          return (
            <div key={`${cat.id}-${idx}`} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl", style.bgColor, style.color)}>
                  {style.icon}
                </div>
                <h4 className="font-bold text-slate-800">{cat.nome}</h4>
              </div>
              <button 
                onClick={() => handleDelete(cat.id)}
                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-100 p-5 rounded-3xl space-y-4 border-2 border-dashed border-slate-200">
        <h3 className="font-bold text-slate-600 text-sm flex items-center gap-2">
          <Plus size={18} />
          Adicionar Nova Plataforma
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex: InDrive"
            className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <button
            onClick={handleAdd}
            className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-900 transition-all active:scale-[0.98]"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

function RefundCategoriesManager({ categories, onUpdate }: { categories: Category[], onUpdate: (categories: Category[]) => void }) {
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const newCat: Category = {
      id: crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15),
      nome: trimmed
    };
    onUpdate([...categories, newCat]);
    setNewName('');
  };

  const handleDelete = (id: string) => {
    onUpdate(categories.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {categories.map((cat, idx) => {
          const style = getCategoryStyle(cat.nome);
          return (
            <div key={`${cat.id}-${idx}`} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl", style.bgColor, style.color)}>
                  {style.icon}
                </div>
                <h4 className="font-bold text-slate-800">{cat.nome}</h4>
              </div>
              <button 
                onClick={() => handleDelete(cat.id)}
                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-100 p-5 rounded-3xl space-y-4 border-2 border-dashed border-slate-200">
        <h3 className="font-bold text-slate-600 text-sm flex items-center gap-2">
          <Plus size={18} />
          Adicionar Novo Tipo de Reembolso
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex: Pedágio, Combustível, Alimentação..."
            className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <button
            onClick={handleAdd}
            className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-900 transition-all active:scale-[0.98]"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpenseCategoriesManager({ categories, onUpdate }: { categories: Category[], onUpdate: (categories: Category[]) => void }) {
  const [newName, setNewName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState<string>('');

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const newCat: Category = {
      id: crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15),
      nome: trimmed,
      parentId: parentCategoryId || undefined
    };
    onUpdate([...categories, newCat]);
    setNewName('');
    setParentCategoryId('');
  };

  const handleDelete = (id: string) => {
    // Don't allow deleting Fechamento do Dia
    if (id === '10') return;
    // Also delete children if any
    onUpdate(categories.filter(c => c.id !== id && c.parentId !== id));
  };

  const parentCategories = categories.filter(c => !c.parentId && c.id !== '10');

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {categories.filter(c => !c.parentId).map((cat, idx) => {
          const style = getCategoryStyle(cat.nome);
          const isSystem = cat.id === '10'; // Fechamento do Dia
          const children = categories.filter(c => c.parentId === cat.id);

          return (
            <div key={`${cat.id}-${idx}`} className="space-y-2">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-xl", style.bgColor, style.color)}>
                    {style.icon}
                  </div>
                  <h4 className="font-bold text-slate-800">{cat.nome}</h4>
                </div>
                {!isSystem && (
                  <button 
                    onClick={() => handleDelete(cat.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              
              {children.length > 0 && (
                <div className="ml-8 space-y-2 border-l-2 border-slate-100 pl-4">
                  {children.map((child, idx) => {
                    const childStyle = getCategoryStyle(child.nome);
                    return (
                      <div key={`${child.id}-${idx}`} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1.5 rounded-lg", childStyle.bgColor, childStyle.color)}>
                            {childStyle.icon}
                          </div>
                          <span className="text-sm font-bold text-slate-600">{child.nome}</span>
                        </div>
                        <button 
                          onClick={() => handleDelete(child.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-slate-100 p-5 rounded-3xl space-y-4 border-2 border-dashed border-slate-200">
        <h3 className="font-bold text-slate-600 text-sm flex items-center gap-2">
          <Plus size={18} />
          Adicionar Nova Categoria de Despesa
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex: Multas, Internet..."
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Vincular a uma Categoria Pai (Opcional)</label>
            <select
              value={parentCategoryId}
              onChange={(e) => setParentCategoryId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
            >
              <option key="empty-parent" value="">Nenhuma (Categoria Principal)</option>
              {parentCategories.map((cat, idx) => (
                <option key={`${cat.id}-${idx}`} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAdd}
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-900 transition-all active:scale-[0.98]"
          >
            Adicionar Categoria
          </button>
        </div>
      </div>
    </div>
  );
}

function MappingField({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{label}</label>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
      >
        <option key="auto-opt" value="">Automático (Heurística)</option>
        {options.map((opt, idx) => (
          <option key={`${opt}-${idx}`} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function MaintenanceIntervalAdder({ onAdd }: { onAdd: (item: string, km: number) => void }) {
  const [item, setItem] = useState('');
  const [km, setKm] = useState('');

  const handleAdd = () => {
    const trimmed = item.trim();
    if (!trimmed || !km) return;
    onAdd(trimmed, Number(km));
    setItem('');
    setKm('');
  };

  return (
    <div className="bg-emerald-50/50 p-4 rounded-2xl border-2 border-dashed border-emerald-100 space-y-3">
      <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
        <Plus size={12} />
        Novo Item de Revisão
      </h4>
      <div className="space-y-2">
        <input 
          type="text"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          placeholder="Ex: Correia Dentada"
          className="w-full bg-white border border-emerald-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <div className="flex gap-2">
          <input 
            type="number"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            placeholder="KM (Ex: 50000)"
            className="flex-1 bg-white border border-emerald-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <button 
            onClick={handleAdd}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

function BacklogPanel() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [newIdea, setNewIdea] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = async () => {
    const data = await getBacklogItems();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdea.trim() || submitting) return;

    setSubmitting(true);
    try {
      await addBacklogItem(newIdea.trim());
      setNewIdea('');
      await fetchItems();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar ideia. Verifique sua conexão ou permissões.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBacklogItem(id);
      await fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggle = async (id: string, currentStatus: 'pending' | 'completed') => {
    try {
      await toggleBacklogItemStatus(id, currentStatus);
      await fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-amber-50 rounded-xl">
          <Lightbulb className="text-amber-600 size-5" />
        </div>
        <h3 className="font-bold text-slate-800">Backlog de Ideias</h3>
      </div>

      <form onSubmit={handleAddIdea} className="flex gap-2">
        <input 
          type="text"
          value={newIdea}
          onChange={(e) => setNewIdea(e.target.value)}
          placeholder="Tive uma ideia para o app..."
          className="flex-1 bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        />
        <button 
          type="submit"
          disabled={submitting || !newIdea.trim()}
          className="p-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all active:scale-95 disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </form>

      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-xs text-slate-400 py-4">Carregando ideias...</p>
        ) : items.length > 0 ? (
          items.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
              <button 
                onClick={() => handleToggle(item.id, item.status)}
                className={cn(
                  "mt-0.5 size-5 rounded-full border-2 transition-all flex items-center justify-center",
                  item.status === 'completed' ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                )}
              >
                {item.status === 'completed' && <CheckCircle2 size={12} className="text-white" />}
              </button>
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-medium text-slate-700 leading-tight",
                  item.status === 'completed' && "line-through text-slate-400"
                )}>
                  {item.text}
                </p>
                <p className="text-[9px] text-slate-400 mt-1 font-bold">
                  {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
              <button 
                onClick={() => handleDelete(item.id)}
                className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash size={16} />
              </button>
            </div>
          ))
        ) : (
          <p className="text-center text-xs text-slate-400 py-4 italic">Nenhuma ideia anotada ainda.</p>
        )}
      </div>
    </div>
  );
}

function MarketingPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateTrial = async (userId: string, extensionDays: number) => {
    setLoading(true);
    // Para estender +30 dias: data atual
    // Para suprimir: data antiga (-31 dias)
    const newDate = new Date();
    if (extensionDays < 0) {
      newDate.setDate(newDate.getDate() - 31);
    } else {
      // Começa novo trial a partir de hoje
      newDate.setDate(newDate.getDate());
    }
    
    await updateUserTrial(userId, newDate.toISOString());
    await fetchUsers();
  };

  if (loading) return <div className="text-center p-4 text-slate-400 text-xs">Carregando lista de usuários...</div>;

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-50 rounded-xl">
            <Users className="text-rose-600 size-5" />
          </div>
          <h3 className="font-bold text-slate-800">Usuários Únicos (Marketing)</h3>
        </div>
        <div className="bg-rose-50 px-3 py-1 rounded-full">
          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
            Top {users.length} Recentes
          </span>
        </div>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
              <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acessos</th>
              <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acesso (Trial)</th>
              <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Último Acesso</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => {
              const trialStart = u.trialStartDate ? new Date(u.trialStartDate).getTime() : 0;
              const isExpired = trialStart ? (new Date().getTime() - trialStart) > (30 * 24 * 60 * 60 * 1000) : false;
              
              return (
              <tr key={`${u.id}-${idx}`} className="border-b border-slate-50 last:border-0">
                <td className="py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700">{u.displayName || 'Usuário'}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Mail size={10} />
                      {u.email || 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="py-4 text-center">
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                    {u.visitCount || 0}
                  </span>
                </td>
                <td className="py-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-black px-2 py-1 rounded-lg uppercase",
                      isExpired ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {isExpired ? 'Expirado' : 'Ativo'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateTrial(u.id, 30)}
                        className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 transition-colors"
                        title="Renovar +30 dias a partir de hoje"
                      >
                         +30d
                      </button>
                      <button
                         onClick={() => handleUpdateTrial(u.id, -1)}
                         className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors"
                         title="Bloquear/Expirar Imediatamente"
                      >
                         X
                      </button>
                    </div>
                  </div>
                </td>
                <td className="py-4 text-right">
                  <span className="text-[10px] font-bold text-slate-500">
                    {u.lastSeen ? format(new Date(u.lastSeen), 'dd/MM HH:mm') : 'N/A'}
                  </span>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      
      {users.length === 0 && (
        <p className="text-center text-xs text-slate-400 py-4 italic">Nenhum usuário encontrado.</p>
      )}
    </div>
  );
}

function AdminPanel({ appConfig, onUpdateAppConfig }: { appConfig?: AppConfig, onUpdateAppConfig?: (config: AppConfig) => void }) {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [confirmBeta, setConfirmBeta] = useState(false);
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  const [localConfig, setLocalConfig] = useState<AppConfig>({
    publishedVersion: appConfig?.publishedVersion || '1.0.0',
    betaVersion: appConfig?.betaVersion || '1.0.0',
    maintenanceMode: appConfig?.maintenanceMode || false,
    announcement: appConfig?.announcement || ''
  });

  useEffect(() => {
    if (appConfig) {
      setLocalConfig(appConfig);
    }
  }, [appConfig]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [globalData, allUsers] = await Promise.all([
          getGlobalStats(),
          getAllUsers()
        ]);
        
        setStats(globalData);
        
        // Count users active in the last 48h
        const fortyEightHoursAgo = new Date();
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
        
        const activeCount = allUsers.filter(user => {
          if (!user.lastSeen) return false;
          const lastSeenDate = new Date(user.lastSeen);
          return lastSeenDate >= fortyEightHoursAgo;
        }).length;
        
        setActiveUsersCount(activeCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleSaveConfig = () => {
    onUpdateAppConfig?.(localConfig);
  };

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Carregando painel admin...</div>;
  if (error) return <div className="p-8 text-center text-rose-500 font-bold">{error}</div>;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      {/* Versioning & Maintenance */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-xl">
              <Settings className="text-purple-600 size-5" />
            </div>
            <h3 className="font-bold text-slate-800">Controle de Versão e Staging (v2)</h3>
          </div>
          <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest">Admin Active</span>
        </div>

        <div className="space-y-3 pb-4 border-b border-slate-100">
          {!confirmBeta ? (
            <button
              onClick={() => setConfirmBeta(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200"
            >
              <TrendingUp size={18} />
              Publicar Beta para Produção
            </button>
          ) : (
             <div className="bg-purple-50 p-4 rounded-xl space-y-3">
               <p className="text-sm font-bold text-center text-purple-900">Tem certeza que deseja publicar o Beta para todos?</p>
               <div className="flex gap-2">
                  <button onClick={() => setConfirmBeta(false)} className="flex-1 py-3 bg-white text-slate-600 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-colors">Cancelar</button>
                  <button onClick={() => {
                    onUpdateAppConfig?.({ 
                      ...localConfig, 
                      publishedVersion: localConfig.betaVersion 
                    });
                    setConfirmBeta(false);
                  }} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-sm">Confirmar</button>
               </div>
             </div>
          )}

          {!confirmUpdate ? (
            <button
              onClick={() => setConfirmUpdate(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <RefreshCw size={18} />
              Aplicar Atualização de Versão
            </button>
          ) : (
            <div className="bg-blue-50 p-4 rounded-xl space-y-3 border border-blue-100">
               <p className="text-sm font-bold text-center text-blue-900">Tem certeza? Isso forçará o recarregamento do app em todos os dispositivos.</p>
               <div className="flex gap-2">
                  <button onClick={() => setConfirmUpdate(false)} className="flex-1 py-3 bg-white text-slate-600 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-colors">Cancelar</button>
                  <button onClick={() => {
                    const current = localConfig.publishedVersion || '1.1.3';
                    const parts = current.split('.');
                    let nextVersion = '';
                    if (parts.length === 3) {
                      parts[2] = (parseInt(parts[2]) + 1).toString();
                      nextVersion = parts.join('.');
                    } else {
                      nextVersion = current + '.1';
                    }
                    
                    onUpdateAppConfig?.({ 
                      ...localConfig, 
                      publishedVersion: nextVersion,
                      betaVersion: nextVersion
                    });

                    // Forçar recarregamento local também
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then(registrations => {
                        for (let registration of registrations) {
                          registration.unregister();
                        }
                        window.location.reload();
                      });
                    } else {
                      window.location.reload();
                    }
                  }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm">Confirmar</button>
               </div>
             </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Versão Publicada</label>
            <input 
              type="text"
              value={localConfig.publishedVersion}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, publishedVersion: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Versão Beta (Admin)</label>
            <input 
              type="text"
              value={localConfig.betaVersion}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, betaVersion: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-amber-600 size-5" />
            <div>
              <p className="text-sm font-bold text-amber-900">Modo Manutenção</p>
              <p className="text-[10px] text-amber-700">Bloqueia o acesso para usuários comuns.</p>
            </div>
          </div>
          <button 
            onClick={() => setLocalConfig(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
            className={cn(
              "w-12 h-6 rounded-full transition-all relative",
              localConfig.maintenanceMode ? "bg-amber-600" : "bg-slate-300"
            )}
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
              localConfig.maintenanceMode ? "right-1" : "left-1"
            )} />
          </button>
        </div>

        <button 
          onClick={handleSaveConfig}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
        >
          Salvar Configurações Globais
        </button>
      </div>

      {/* Stats */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <TrendingUp className="text-blue-600 size-5" />
            </div>
            <h3 className="font-bold text-slate-800">Estatísticas Globais</h3>
          </div>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
            title="Debug Info"
          >
            <Database size={18} />
          </button>
        </div>

        {showDebug && (
          <div className="bg-slate-900 text-slate-300 p-4 rounded-2xl font-mono text-[10px] space-y-2 overflow-x-auto">
            <p className="text-blue-400 font-bold uppercase tracking-widest border-b border-slate-800 pb-1 mb-2">Informações de Diagnóstico</p>
            <div className="flex justify-between">
              <span>Project ID:</span>
              <span className="text-emerald-400">{firebaseConfig.projectId}</span>
            </div>
            <div className="flex justify-between">
              <span>Database ID:</span>
              <span className="text-emerald-400">{firebaseConfig.firestoreDatabaseId}</span>
            </div>
            <div className="flex justify-between">
              <span>Auth Domain:</span>
              <span className="text-emerald-400">{firebaseConfig.authDomain}</span>
            </div>
            <p className="text-slate-500 mt-2 italic">* Se você criou um Remix, estas informações serão diferentes do app original.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Acessos</p>
            <p className="text-2xl font-black text-blue-600">{stats?.totalVisits || 0}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ativos (48h)</p>
            <p className="text-2xl font-black text-emerald-600">{activeUsersCount}</p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Atualização</p>
          <p className="text-xs font-bold text-slate-600">
            {stats?.lastUpdate ? format(new Date(stats.lastUpdate), 'dd/MM/yyyy HH:mm:ss') : 'N/A'}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 italic">
            * Estas estatísticas excluem o administrador leandrosolon@gmail.com.
          </p>
        </div>
      </div>

      <MarketingPanel />

      <BacklogPanel />
      
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <ExternalLink size={18} className="text-blue-600" />
          Google Analytics
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Para métricas mais detalhadas (origem do tráfego, tempo de permanência, dispositivos), acesse o painel do Google Analytics.
        </p>
        <button 
          onClick={() => window.open('https://analytics.google.com/', '_blank')}
          className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
        >
          Abrir Google Analytics
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
}
