import { useMemo, ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import {
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CheckCircle2, 
  AlertCircle,
  Target,
  Fuel,
  Car,
  ChevronRight,
  Info,
  Share2,
  Sparkles,
  PlusCircle,
  X
} from 'lucide-react';
import { cn, parseEntryDate } from '../lib/utils';
import { Entry, FixedCost, MaintenanceInterval } from '../types';
import { getCategoryStyle } from '../lib/category-styles';

interface DashboardProps {
  totals: {
    earnings: number;
    expenses: number;
    totalFixedCosts: number;
    balance: number;
    progress: number;
    balanceToPay: number;
    dailyExpenses: number;
    todayEarnings: number;
    todayExpenses: number;
    paidFixedCostsDetails: { item: string; valor: number; data: string }[];
    paidFixedCostsSum: number;
    unpaidFixedCosts: string[];
  };
  fixedCosts: FixedCost[];
  nextOilChange: number | null;
  currentKm: number;
  targetKm: number;
  maintenanceIntervals: MaintenanceInterval[];
  entries: Entry[];
  categories: { id: string; nome: string }[];
  onViewMaintenance: () => void;
  onOpenAIStudio: () => void;
  isAdmin?: boolean;
  uniqueVisitors?: number;
  email?: string;
}

export default function Dashboard({ 
  totals, 
  fixedCosts, 
  nextOilChange, 
  currentKm, 
  targetKm,
  maintenanceIntervals,
  entries,
  categories,
  onViewMaintenance,
  onOpenAIStudio,
  isAdmin,
  uniqueVisitors,
  email
}: DashboardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showBurdenDetails, setShowBurdenDetails] = useState(false);
  const [modalType, setModalType] = useState<'ganhos' | 'despesas' | null>(null);
  const [taxResult, setTaxResult] = useState<string | null>(null);
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const currentMonthAlt = format(new Date(), 'yyyy/MM');
  const isNewUser = fixedCosts.length === 0 && entries.length === 0;
  
  const detailsList = useMemo(() => {
    if (!modalType) return [];
    const filtered = entries.filter(e => {
        const isCurrentMonth = e.data.startsWith(currentMonthAlt) || e.data.startsWith(currentMonthStr);
        return isCurrentMonth && 
        (modalType === 'ganhos' ? e.tipo === 'Ganhos' : e.tipo === 'Despesa');
    });
    
    const grouped = filtered.reduce((acc, curr) => {
        const cat = categories.find(c => c.id === curr.categoriaId)?.nome || 'Outros';
        acc[cat] = (acc[cat] || 0) + curr.valor;
        return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [entries, modalType, currentMonthAlt, categories]);
  
  const dailyWorkBurden = useMemo(() => {
    // Already filtered by current month in App.tsx totals calculation, but Dashboard gets ALL entries
    // Need to filter locally here to only count days in the current month
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    
    const currentMonthEntries = entries.filter(e => {
        const date = parseEntryDate(e.data);
        return isWithinInterval(date, { start, end });
    });

    const workedDays = new Set(
      currentMonthEntries.filter(e => e.tipo === 'Ganhos').map(e => e.data)
    ).size;
    if (workedDays === 0) return null;

    // Custo Médio = (Custos Fixos Pendentes + Despesas de Rua) / dias trabalhados
    const totalFixed = totals.totalFixedCosts || 0;
    const paidFixed = totals.paidFixedCostsSum || 0;
    const expenses = totals.expenses || 0;
    
    const remainingFixedCosts = Math.max(0, totalFixed - paidFixed);
    const totalObligations = remainingFixedCosts + expenses;
    
    return {
      burden: workedDays > 0 ? totalObligations / workedDays : 0,
      days: workedDays
    };
  }, [entries, fixedCosts]);

  const activeFixedCosts = useMemo(() => {
    return fixedCosts.filter(fc => {
      const start = fc.dataInicio || '0000-00';
      const end = fc.dataFim || '9999-12';
      return currentMonthStr >= start && currentMonthStr <= end;
    });
  }, [fixedCosts, currentMonthStr]);

  const statusMessage = useMemo(() => {
    if (totals.progress >= 100) {
      return { 
        text: "Lucro real liberado!", 
        icon: <CheckCircle2 className="text-emerald-500" /> 
      };
    }
    
    if (totals.unpaidFixedCosts && totals.unpaidFixedCosts.length > 0) {
      return {
        text: `Pendentes: ${totals.unpaidFixedCosts.join(', ')}`,
        icon: <AlertCircle className="text-amber-500" />
      };
    }
    
    return { 
      text: "Pagando despesas de rua...", 
      icon: <AlertCircle className="text-amber-500" /> 
    };
  }, [totals.progress, totals.unpaidFixedCosts]);

  const oilStatus = useMemo(() => {
    if (!nextOilChange) return null;
    const remaining = nextOilChange - currentKm;
    const percent = Math.max(0, Math.min(100, (remaining / 10000) * 100));
    return { remaining, percent };
  }, [nextOilChange, currentKm]);

  const kmProgress = useMemo(() => {
    if (!targetKm || targetKm <= 0) return null;
    const percent = Math.min(100, (currentKm / targetKm) * 100);
    return { percent };
  }, [currentKm, targetKm]);

  const maintenanceStatus = useMemo(() => {
    return maintenanceIntervals.map(interval => {
      // Find the last entry for this maintenance item
      const lastEntry = entries.find(e => {
        const cat = categories.find(c => c.id === e.categoriaId);
        const name = cat?.nome.toLowerCase() || '';
        const itemName = interval.item.toLowerCase();
        
        // Match by category name or if the item is "Troca de Óleo" match "Troca de oleo"
        if (itemName.includes('óleo') || itemName.includes('oleo')) {
          return (name === 'troca de oleo' || name === 'troca de óleo') && e.km;
        }
        
        return name.includes(itemName) && e.km;
      });

      if (!lastEntry || !lastEntry.km) return { ...interval, remaining: null, percent: 0 };

      const nextChange = lastEntry.km + interval.intervaloKm;
      const remaining = nextChange - currentKm;
      const percent = Math.max(0, Math.min(100, (remaining / interval.intervaloKm) * 100));
      
      return { ...interval, remaining, percent, lastKm: lastEntry.km };
    });
  }, [maintenanceIntervals, entries, categories, currentKm]);

  const maintenanceSummary = useMemo(() => {
    const critical = maintenanceStatus.filter(item => item.remaining !== null && item.remaining < 500).length;
    const warning = maintenanceStatus.filter(item => item.remaining !== null && item.remaining >= 500 && item.remaining < 1500).length;
    return { critical, warning };
  }, [maintenanceStatus]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const dailyGoalData = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysElapsed = now.getDate();
    
    // Daily Fixed Cost (Amortized)
    const dailyFixed = totals.totalFixedCosts / daysInMonth;
    
    // Use today's actual expenses instead of average
    const todayExpenses = totals.todayExpenses;
    
    // Total Daily Cost + 10% Profit
    const target = (dailyFixed + todayExpenses) * 1.1;
    
    const remainingToday = Math.max(0, target - totals.todayEarnings);
    const percentToday = (totals.todayEarnings / target) * 100;
    const todayProfit = totals.todayEarnings - totals.todayExpenses;
    
    return { target, remainingToday, percentToday, dailyFixed, todayExpenses, todayProfit };
  }, [totals.totalFixedCosts, totals.todayExpenses, totals.todayEarnings]);

  const handleShare = async () => {
    const shareData = {
      title: 'LucroNoVolante',
      text: 'Estou usando o LucroNoVolante para gerir meus ganhos como motorista. Recomendo!',
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        alert('Link copiado para a área de transferência!');
      }
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card for New Users */}
      {isNewUser && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-3xl shadow-xl shadow-blue-900/40 border border-blue-400/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Sparkles className="text-white size-7" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Bem-vindo ao LucroNoVolante!</h2>
              <p className="text-blue-100 text-sm opacity-90">Vamos configurar seu painel para começar a lucrar mais.</p>
            </div>
          </div>
          <div className="space-y-3 mb-6 text-sm text-blue-50">
            <p className="flex items-center gap-2"><PlusCircle size={16} /> 1. Configure seus <span className="font-bold underline">Custos Fixos</span> no menu de configurações.</p>
            <p className="flex items-center gap-2"><PlusCircle size={16} /> 2. Faça seus primeiros <span className="font-bold underline">lançamentos de ganhos e gastos</span>.</p>
          </div>
        </div>
      )}
      
      {/* Share App & Marketing Buttons */}
      <div className={cn("grid gap-3", isAdmin ? "grid-cols-2" : "grid-cols-1")}>
        <button 
          onClick={handleShare}
          className="py-4 bg-white text-[#0047AB] rounded-3xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-black/20 active:scale-95 transition-all"
        >
          <Share2 size={18} className="text-blue-600" />
          Indicar App
        </button>
        {isAdmin && (
          <button 
            onClick={onOpenAIStudio}
            className="py-4 bg-blue-600 text-white rounded-3xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-900/40 active:scale-95 transition-all"
          >
            <Sparkles size={18} className="text-blue-200" />
            Criar Propaganda
          </button>
        )}
      </div>


      {/* Daily Goal Card (Prominent) */}
      <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Target size={120} className="text-white" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white rounded-2xl shadow-lg shadow-blue-900/20">
                <Target className="text-blue-600 size-5" />
              </div>
              <div>
                <h3 className="font-black text-white text-lg tracking-tight">Meta Diária</h3>
                <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.15em] opacity-80">Custo Fixo + Gastos + 10% Lucro</p>
              </div>
            </div>
            <div className="text-right">
              <span className={cn(
                "text-xs font-black px-3 py-1 rounded-full",
                dailyGoalData.percentToday >= 100 ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"
              )}>
                {dailyGoalData.percentToday.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.15em] mb-1 opacity-70">Ganhos de Hoje</p>
              <p className="text-2xl font-black text-white tracking-tighter">
                {formatCurrency(totals.todayEarnings)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.15em] mb-1 opacity-70">Meta Sugerida</p>
              <p className="text-2xl font-black text-blue-300 tracking-tighter">
                {formatCurrency(dailyGoalData.target)}
              </p>
            </div>
          </div>

          <div className="mb-6 p-4 bg-white/5 rounded-3xl border border-white/10 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.15em] mb-0.5">Lucro do Dia</p>
              <p className="text-2xl font-black text-emerald-400 tracking-tighter leading-none">
                {formatCurrency(dailyGoalData.todayProfit)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.15em] mb-0.5 opacity-70">Gasto Real</p>
              <p className="text-lg font-black text-white leading-none">
                {formatCurrency(totals.todayExpenses)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, dailyGoalData.percentToday)}%` }}
                className={cn(
                  "h-full rounded-full shadow-sm transition-all duration-1000",
                  dailyGoalData.percentToday >= 100 ? "bg-emerald-400" : "bg-blue-400"
                )}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-blue-100">
                {dailyGoalData.remainingToday > 0 
                  ? `Faltam ${formatCurrency(dailyGoalData.remainingToday)} para bater a meta`
                  : "🎉 Meta diária atingida! Tudo agora é lucro real!"}
              </p>
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <div className="size-1.5 rounded-full bg-blue-300/50" />
                  <span className="text-[8px] font-bold text-blue-200 uppercase">Fixo: {formatCurrency(dailyGoalData.dailyFixed)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="size-1.5 rounded-full bg-blue-300/50" />
                  <span className="text-[8px] font-bold text-blue-200 uppercase">Gasto Hoje: {formatCurrency(dailyGoalData.todayExpenses)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white/10 backdrop-blur-md p-5 rounded-3xl shadow-xl border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-blue-500/20 rounded-2xl">
            <Target className="text-blue-600 size-5" />
          </div>
          <h3 className="font-bold text-white">Status do Objetivo</h3>
        </div>
        
        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
          {statusMessage.icon}
          <span className="font-bold text-white tracking-tight">{statusMessage.text}</span>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-xs font-bold text-blue-200 uppercase tracking-wider">
            <span>Progresso da Quitação</span>
            <span>{formatCurrency(totals.earnings)} / {formatCurrency(totals.totalFixedCosts + totals.dailyExpenses)} ({totals.progress.toFixed(1)}%)</span>
          </div>
          <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${totals.progress}%` }}
              className={cn(
                "h-full rounded-full shadow-sm",
                totals.progress < 100 ? "bg-blue-400" : "bg-emerald-400"
              )}
            />
          </div>
        </div>
      </div>

      {/* Maintenance Summary Card */}
      <div 
        onClick={onViewMaintenance}
        className="bg-white/10 backdrop-blur-md p-5 rounded-3xl shadow-xl border border-white/10 cursor-pointer hover:border-white/20 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-2xl">
              <Fuel className="text-blue-600 size-5" />
            </div>
            <h3 className="font-bold text-white">Manutenção e Revisão</h3>
          </div>
          <ChevronRight size={20} className="text-white/30" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={cn(
            "p-4 rounded-2xl border flex flex-col gap-1",
            maintenanceSummary.critical > 0 ? "bg-rose-500/20 border-rose-500/30" : "bg-white/5 border-white/5"
          )}>
            <span className={cn(
              "text-2xl font-black",
              maintenanceSummary.critical > 0 ? "text-rose-400" : "text-white/30"
            )}>
              {maintenanceSummary.critical}
            </span>
            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Críticos</span>
          </div>
          <div className={cn(
            "p-4 rounded-2xl border flex flex-col gap-1",
            maintenanceSummary.warning > 0 ? "bg-amber-500/20 border-amber-500/30" : "bg-white/5 border-white/5"
          )}>
            <span className={cn(
              "text-2xl font-black",
              maintenanceSummary.warning > 0 ? "text-amber-400" : "text-white/30"
            )}>
              {maintenanceSummary.warning}
            </span>
            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Atenção</span>
          </div>
        </div>

        <p className="text-[10px] text-blue-200 mt-4 font-medium flex items-center gap-1">
          <Info size={12} /> Clique para ver o detalhamento completo de todos OS itens.
        </p>
      </div>

      {/* Mileage Goal Status */}
      {targetKm > 0 && (
        <div className="bg-white/10 backdrop-blur-md p-5 rounded-3xl shadow-xl border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-transparent rounded-2xl">
                <img 
                  src="https://i.postimg.cc/XY3C4qHn/Designer.jpg" 
                  alt="Logo" 
                  className="size-6 rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="font-bold text-white">Meta de Kilometragem</h3>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-blue-300 uppercase bg-blue-500/20 px-2 py-1 rounded-lg">
                {kmProgress?.percent.toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.15em] mb-1 opacity-70">Progresso</p>
              <p className="text-2xl font-black text-white tracking-tight">
                {currentKm} <span className="text-sm text-blue-300 font-black">/ {targetKm} km</span>
              </p>
            </div>
          </div>

          <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${kmProgress?.percent}%` }}
              className="h-full rounded-full shadow-sm bg-blue-400"
            />
          </div>
          <p className="text-[10px] text-blue-200 mt-2 font-medium">
            {currentKm >= targetKm 
              ? "🎉 Meta de kilometragem atingida!" 
              : `Faltam ${targetKm - currentKm} km para atingir sua meta mensal.`}
          </p>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          title="Ganhos Brutos" 
          value={formatCurrency(totals.earnings)} 
          icon={<TrendingUp className="text-emerald-400" />}
          color="emerald"
          onClick={() => setModalType('ganhos')}
        />
        <StatCard 
          title="Despesas Rua" 
          value={formatCurrency(totals.expenses)} 
          icon={<TrendingDown className="text-rose-400" />}
          color="rose"
          onClick={() => setModalType('despesas')}
        />
      </div>

      {/* Saldo a Pagar Card */}
      <div className="bg-white/10 backdrop-blur-md p-5 rounded-3xl shadow-xl border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-xl">
              <TrendingDown className="text-rose-400 size-5" />
            </div>
            <h3 className="font-bold text-white">Total de Gastos do Mês</h3>
          </div>
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
             <Info className={cn("text-white/50 size-5", showDetails && "text-white")} />
          </button>
          <span className="text-lg font-black text-rose-400">{formatCurrency(totals.balanceToPay)}</span>
        </div>
        
        {showDetails && totals.paidFixedCostsDetails && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-blue-200">
                <span>Total Custos Fixos:</span>
                <span>{formatCurrency(totals.totalFixedCosts)}</span>
              </div>
              <div className="flex justify-between text-xs text-blue-200">
                <span>Despesas Rua:</span>
                <span>{formatCurrency(totals.dailyExpenses)}</span>
              </div>
            </div>
            {totals.paidFixedCostsDetails.length > 0 && (
              <div>
                <p className="text-[10px] text-blue-200 font-black uppercase mb-2">Custos Fixos Pagos</p>
                <div className="space-y-1">
                  {totals.paidFixedCostsDetails.map((pf, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-emerald-400 font-medium">
                      <span>{pf.item} ({pf.data.replace(/\//g, '-')})</span>
                      <span>{formatCurrency(pf.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {dailyWorkBurden !== null && (
        <div 
          className="bg-white/10 backdrop-blur-md p-5 rounded-3xl shadow-xl border border-white/10 cursor-pointer"
          onClick={() => setShowBurdenDetails(!showBurdenDetails)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <Target className="text-emerald-400 size-5" />
              </div>
              <h3 className="font-bold text-white">Custo Médio p/ Dia</h3>
            </div>
            <span className="text-lg font-black text-emerald-400">{formatCurrency(dailyWorkBurden.burden)}</span>
          </div>
          <p className="text-[10px] text-blue-200 font-medium leading-tight mb-2">
            Foram {dailyWorkBurden.days} dias trabalhados esse mês.
          </p>
          
          {showBurdenDetails && (
            <div className="mt-3 p-3 bg-white/5 rounded-xl text-[10px] text-blue-100 font-mono">
              <p>Detalhes do cálculo:</p>
              <p>Custos Fixos Pendentes: {formatCurrency(Math.max(0, (totals.totalFixedCosts || 0) - (totals.paidFixedCostsSum || 0)))}</p>
              <p>+ Despesas de Rua: {formatCurrency(totals.expenses || 0)}</p>
              <p>-------------------------</p>
              <p>= Total: {formatCurrency((Math.max(0, (totals.totalFixedCosts || 0) - (totals.paidFixedCostsSum || 0))) + (totals.expenses || 0))}</p>
              <p>÷ {dailyWorkBurden.days} dias</p>
            </div>
          )}

          <p className="text-[10px] text-blue-200 font-medium leading-tight opacity-70 italic mt-2">
            Clique para ver detalhes do cálculo.
          </p>
        </div>
      )}

      {/* Fixed Costs Summary */}
      <div className="bg-white/10 backdrop-blur-md p-5 rounded-3xl shadow-xl border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/5 rounded-xl">
            <Wallet className="text-blue-300 size-5" />
          </div>
          <h3 className="font-bold text-white">Custos Fixos do Mês</h3>
        </div>
        
        <div className="space-y-3">
          {activeFixedCosts.length > 0 ? (
            activeFixedCosts.map(cost => {
              const style = getCategoryStyle(cost.item);
              return (
                <div key={cost.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn("p-1.5 rounded-lg", "bg-white/5", "text-white")}>
                      {style.icon}
                    </span>
                    <span className="text-blue-100 font-medium">{cost.item}</span>
                  </div>
                  <span className="font-bold text-white">{formatCurrency(cost.valorMensal)}</span>
                </div>
              );
            })
          ) : (
            <div className="bg-white/5 p-4 rounded-2xl border border-dashed border-white/10 text-center space-y-2">
              <p className="text-xs font-bold text-blue-200">Nenhum custo fixo cadastrado</p>
              <p className="text-[10px] text-blue-300 leading-tight">
                Cadastre seu Aluguel, Seguro e MEI para que possamos calcular seu lucro real.
              </p>
            </div>
          )}
          <div className="pt-3 border-t border-white/10 flex justify-between items-center">
            <span className="font-bold text-blue-100">Total Fixo</span>
            <span className="font-black text-white">{formatCurrency(totals.totalFixedCosts)}</span>
          </div>
        </div>
      </div>

      {/* IRPF 2026 Card */}
      <div className="bg-indigo-600 p-6 rounded-3xl shadow-2xl text-white cursor-pointer mb-6" onClick={() => setShowBurdenDetails(!showBurdenDetails)}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-lg">Carnê-Leão (IRPF 2026)</h3>
          <Info className={cn("text-white/50 size-5", showBurdenDetails && "text-white")} />
        </div>
        
        <div className="text-sm font-medium opacity-90 mb-4">
          {(() => {
            const base = totals.earnings * 0.6;
            const { tax, bracket } = base > 9000 ? { tax: 800, bracket: "27,5%" } 
                                : base > 7200 ? { tax: 330, bracket: "22,5%" } 
                                : base > 6000 ? { tax: 150, bracket: "15%" } 
                                : base > 5400 ? { tax: 60, bracket: "7,5%" } 
                                : { tax: 0, bracket: "0%" };
            return base > 5000 
              ? <span className="text-rose-200 font-bold">⚠️ Atenção: Alíquota {bracket} | Est. {formatCurrency(tax)}</span>
              : <span className="text-emerald-200 font-bold block">😊 Isento este mês. <span className="text-white/80 font-normal block text-[10px]">Aconselhável declarar rendimento.</span></span>;
          })()}
        </div>

        <div className="text-3xl font-black tracking-tighter">
          {formatCurrency(totals.earnings * 0.6)}
        </div>
        <p className="text-xs opacity-70 font-medium">Base Tributável (60% dos ganhos)</p>

        {showBurdenDetails && (
          <div className="mt-4 pt-4 border-t border-white/20 space-y-2 text-white text-xs">
            <div className="flex justify-between">
              <span>Ganhos Totais:</span>
              <span className="font-bold">{formatCurrency(totals.earnings)}</span>
            </div>
            {totals.earnings * 0.6 > 5000 && (
              <div className="mt-2 p-2 bg-rose-700/50 rounded-lg">
                <p className="font-bold">Ação próxima:</p>
                <p>Acesse o e-CAC e lance R$ {formatCurrency(totals.earnings * 0.6)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Net Profit Card */}
      <div className={cn(
        "p-6 rounded-3xl shadow-2xl text-white transition-colors duration-500",
        totals.balance >= 0 ? "bg-emerald-600 shadow-emerald-900/20" : "bg-rose-600 shadow-rose-900/20"
      )}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Lucro Real Estimado</p>
            <h2 className="text-4xl font-black tracking-tighter">
              {formatCurrency(totals.balance)}
            </h2>
          </div>
          <div className="text-right bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/20">
            <p className="text-[9px] font-black uppercase tracking-wider opacity-90 mb-1">Meta Diária Sugerida</p>
            <p className="text-xl font-black">{formatCurrency(dailyGoalData.target)}</p>
            <p className="text-[8px] font-bold opacity-70 mt-1">Custo + 10% Lucro</p>
          </div>
        </div>
        <p className="text-[10px] font-medium opacity-70 leading-tight">
          * Valor calculado subtraindo despesas de rua e custos fixos totais dos ganhos brutos. 
          A meta diária considera seus custos fixos mensais, média de gastos diários e margem de 10%.
        </p>
        <div className="mt-4 border-t border-white/10 pt-4 text-[10px] text-white/50">
          Cálculo tributário disponível abaixo.
        </div>
      </div>

      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setModalType(null)} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              className="relative bg-white w-full max-w-md max-h-[80vh] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl",
                    modalType === 'ganhos' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {modalType === 'ganhos' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                  <h2 className="font-bold text-slate-800 text-lg tracking-tight">
                    {modalType === 'ganhos' ? 'Ganhos Brutos do Mês' : 'Despesas de Rua do Mês'}
                  </h2>
                </div>
                <button 
                  onClick={() => setModalType(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto space-y-3 bg-white">
                {detailsList.length > 0 ? (
                  <div className="space-y-3">
                    {detailsList.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-2xl border border-slate-100 bg-slate-50/50">
                        <span className="font-bold text-slate-700">{item.name}</span>
                        <span className={cn(
                          "font-black text-lg",
                          modalType === 'ganhos' ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Total Parcial</span>
                      <span className={cn(
                        "font-black text-xl",
                        modalType === 'ganhos' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {formatCurrency(detailsList.reduce((acc, item) => acc + item.total, 0))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p className="font-bold">Nenhum registro encontrado</p>
                    <p className="text-sm">Os lançamentos deste mês aparecerão aqui.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon, color, onClick }: { title: string, value: string, icon: ReactNode, color: 'emerald' | 'rose', onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white/10 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-white/10 flex flex-col justify-center",
        onClick && "cursor-pointer hover:bg-white/20 active:scale-95 transition-all"
      )}
    >
      <div className={cn(
        "p-2 rounded-xl w-fit mb-3",
        color === 'emerald' ? "bg-emerald-500/20" : "bg-rose-500/20"
      )}>
        {icon}
      </div>
      <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-lg font-black text-white tracking-tight">{value}</p>
    </div>
  );
}

