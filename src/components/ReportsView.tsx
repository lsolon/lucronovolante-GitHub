import { useMemo, useState } from 'react';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subDays, 
  subWeeks, 
  subMonths, 
  isWithinInterval, 
  parseISO,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameYear,
  eachYearOfInterval,
  subYears,
  addMonths,
  addYears,
  startOfYear,
  endOfYear
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn, parseEntryDate } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  BarChart3,
  PieChart as PieChartIcon,
  X,
  ArrowLeft,
  Filter,
  LineChart as LineChartIcon,
  LayoutList,
  Layers,
  Share2
} from 'lucide-react';
import { Entry, Category } from '../types';
import { getCategoryStyle } from '../lib/category-styles';

interface ReportsViewProps {
  entries: Entry[];
  categories: Category[];
}

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function ReportsView({ entries, categories }: ReportsViewProps) {
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weeklyRange, setWeeklyRange] = useState<4 | 8 | 12 | 'month'>(4);
  const [weeklyGroupMode, setWeeklyGroupMode] = useState<'byWeek' | 'byDayOfWeek'>('byWeek');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [drillDown, setDrillDown] = useState<{
    type: 'Ganhos' | 'Despesa' | 'KM';
    periodName: string;
    entries: Entry[];
  } | null>(null);
  const [drillDownGrouped, setDrillDownGrouped] = useState(true);

  const currentInterval = useMemo(() => {
    let start: Date;
    let end: Date;

    if (period === 'daily') {
      start = startOfDay(subDays(selectedDate, 6));
      end = endOfDay(selectedDate);
    } else if (period === 'weekly') {
      if (weeklyRange === 'month') {
        start = startOfMonth(selectedDate);
        end = endOfMonth(selectedDate);
      } else {
        start = startOfWeek(subWeeks(selectedDate, (weeklyRange as number) - 1), { locale: ptBR });
        end = endOfWeek(selectedDate, { locale: ptBR });
      }
    } else if (period === 'monthly') {
      start = startOfMonth(selectedDate);
      end = endOfMonth(selectedDate);
    } else {
      start = startOfYear(selectedDate);
      end = endOfYear(selectedDate);
    }
    return { start, end };
  }, [period, selectedDate, weeklyRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const reportData = useMemo(() => {
    let data: any[] = [];

    if (period === 'daily') {
      // Last 7 days from selectedDate
      const days = eachDayOfInterval({
        start: subDays(selectedDate, 6),
        end: selectedDate
      });

      data = days.map(day => {
        const dayEntries = entries.filter(e => {
          const eDate = parseEntryDate(e.data);
          return isSameDay(eDate, day);
        });

        const earnings = dayEntries.filter(e => e.tipo === 'Ganhos').reduce((acc, e) => acc + (e.valor || 0), 0);
        const expenses = dayEntries.filter(e => e.tipo === 'Despesa').reduce((acc, e) => acc + (e.valor || 0), 0);
        
        const kms = dayEntries.filter(e => e.km).map(e => e.km as number);
        const kmPercorrido = kms.length > 1 ? Math.max(...kms) - Math.min(...kms) : 0;

        return {
          name: format(day, 'dd/MM', { locale: ptBR }),
          fullDate: format(day, "EEEE, dd 'de' MMMM", { locale: ptBR }),
          Ganhos: earnings,
          Despesas: expenses,
          Saldo: earnings - expenses,
          kmPercorrido,
          entries: dayEntries
        };
      });
    } else if (period === 'weekly') {
      // Flexible weeks range
      let start: Date;
      let end: Date = selectedDate;

      if (weeklyRange === 'month') {
        start = startOfMonth(selectedDate);
        end = endOfMonth(selectedDate);
      } else {
        start = subWeeks(selectedDate, (weeklyRange as number) - 1);
      }

      if (weeklyGroupMode === 'byDayOfWeek') {
        const periodEntries = entries.filter(e => {
          const eDate = parseEntryDate(e.data);
          return isWithinInterval(eDate, { start, end });
        });

        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        data = days.map((dayName, dayIdx) => {
          const dayEntries = periodEntries.filter(e => {
            const eDate = parseEntryDate(e.data);
            return eDate.getDay() === dayIdx;
          });

          const earnings = dayEntries.filter(e => e.tipo === 'Ganhos').reduce((acc, e) => acc + (e.valor || 0), 0);
          const expenses = dayEntries.filter(e => e.tipo === 'Despesa').reduce((acc, e) => acc + (e.valor || 0), 0);
          
          const kms = dayEntries.filter(e => e.km).map(e => e.km as number);
          const kmPercorrido = kms.length > 1 ? Math.max(...kms) - Math.min(...kms) : 0;

          return {
            name: dayName,
            fullDate: `Todos os ${dayName}s no período`,
            Ganhos: earnings,
            Despesas: expenses,
            Saldo: earnings - expenses,
            kmPercorrido,
            entries: dayEntries
          };
        });
      } else {
        const weeks = eachWeekOfInterval({ start, end }, { locale: ptBR });

        data = weeks.map((week, idx) => {
          const weekEntries = entries.filter(e => {
            const eDate = parseEntryDate(e.data);
            return isSameWeek(eDate, week, { locale: ptBR });
          });
          // ... rest of the existing week mapping logic ...
          const earnings = weekEntries.filter(e => e.tipo === 'Ganhos').reduce((acc, e) => acc + (e.valor || 0), 0);
          const expenses = weekEntries.filter(e => e.tipo === 'Despesa').reduce((acc, e) => acc + (e.valor || 0), 0);
          
          const kms = weekEntries.filter(e => e.km).map(e => e.km as number);
          const kmPercorrido = kms.length > 1 ? Math.max(...kms) - Math.min(...kms) : 0;

          return {
            name: `Sem ${idx + 1}`,
            fullDate: `Semana de ${format(startOfWeek(week, { locale: ptBR }), 'dd/MM')} a ${format(endOfWeek(week, { locale: ptBR }), 'dd/MM')}`,
            Ganhos: earnings,
            Despesas: expenses,
            Saldo: earnings - expenses,
            kmPercorrido,
            entries: weekEntries
          };
        });
      }
    } else if (period === 'monthly') {
      // Days of the selected month
      const days = eachDayOfInterval({
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate)
      });

      data = days.map(day => {
        const dayEntries = entries.filter(e => {
          const eDate = parseEntryDate(e.data);
          return isSameDay(eDate, day);
        });

        const earnings = dayEntries.filter(e => e.tipo === 'Ganhos').reduce((acc, e) => acc + (e.valor || 0), 0);
        const expenses = dayEntries.filter(e => e.tipo === 'Despesa').reduce((acc, e) => acc + (e.valor || 0), 0);
        
        const kms = dayEntries.filter(e => e.km).map(e => e.km as number);
        const kmPercorrido = kms.length > 1 ? Math.max(...kms) - Math.min(...kms) : 0;

        return {
          name: format(day, 'dd'),
          fullDate: format(day, "EEEE, dd 'de' MMMM", { locale: ptBR }),
          Ganhos: earnings,
          Despesas: expenses,
          Saldo: earnings - expenses,
          kmPercorrido,
          entries: dayEntries
        };
      });
    } else if (period === 'yearly') {
      // Months of the selected year
      const months = eachMonthOfInterval({
        start: startOfYear(selectedDate),
        end: endOfYear(selectedDate)
      });

      data = months.map(month => {
        const monthEntries = entries.filter(e => {
          const eDate = parseEntryDate(e.data);
          return isSameMonth(eDate, month);
        });

        const earnings = monthEntries.filter(e => e.tipo === 'Ganhos').reduce((acc, e) => acc + (e.valor || 0), 0);
        const expenses = monthEntries.filter(e => e.tipo === 'Despesa').reduce((acc, e) => acc + (e.valor || 0), 0);
        
        const kms = monthEntries.filter(e => e.km).map(e => e.km as number);
        const kmPercorrido = kms.length > 1 ? Math.max(...kms) - Math.min(...kms) : 0;

        return {
          name: format(month, 'MMM', { locale: ptBR }),
          fullDate: format(month, 'MMMM yyyy', { locale: ptBR }),
          Ganhos: earnings,
          Despesas: expenses,
          Saldo: earnings - expenses,
          kmPercorrido,
          entries: monthEntries
        };
      });
    }

    return data;
  }, [entries, period, selectedDate]);

  const categoryBreakdown = useMemo(() => {
    const periodEntries = entries.filter(e => {
      const eDate = parseEntryDate(e.data);
      return isWithinInterval(eDate, currentInterval);
    });

    const expensesOnly = periodEntries.filter(e => e.tipo === 'Despesa');
    const totalExpenses = expensesOnly.reduce((acc, e) => acc + (e.valor || 0), 0);

    const breakdown = categories
      .filter(c => c.nome !== 'Fechamento do Dia')
      .map(cat => {
        const amount = expensesOnly
          .filter(e => e.categoriaId === cat.id)
          .reduce((acc, e) => acc + (e.valor || 0), 0);
        
        return {
          id: cat.id,
          name: cat.nome,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
        };
      })
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return { breakdown, totalExpenses };
  }, [entries, categories, period, selectedDate]);

  const totals = useMemo(() => {
    const periodKms = entries.filter(e => {
      const eDate = parseEntryDate(e.data);
      return isWithinInterval(eDate, currentInterval) && e.km;
    }).map(e => e.km as number);

    const totalKmPercorrido = periodKms.length > 1 ? Math.max(...periodKms) - Math.min(...periodKms) : 0;

    return reportData.reduce((acc, curr) => ({
      earnings: acc.earnings + curr.Ganhos,
      expenses: acc.expenses + curr.Despesas,
      balance: acc.balance + curr.Saldo,
      kmPercorrido: totalKmPercorrido
    }), { earnings: 0, expenses: 0, balance: 0, kmPercorrido: 0 });
  }, [reportData, entries, currentInterval]);

  const COLORS = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#64748b'];

  const handleBarClick = (data: any, type: 'Ganhos' | 'Despesa') => {
    if (!data || !data.entries) return;
    
    const filteredEntries = data.entries.filter((e: Entry) => e.tipo === type);
    if (filteredEntries.length === 0) return;

    setDrillDown({
      type,
      periodName: data.fullDate,
      entries: filteredEntries
    });
  };

  const handleSummaryClick = (type: 'Ganhos' | 'Despesa' | 'KM') => {
    const periodEntries = entries.filter(e => {
      const eDate = parseEntryDate(e.data);
      return isWithinInterval(eDate, currentInterval);
    });

    let filteredEntries: Entry[] = [];
    if (type === 'KM') {
      filteredEntries = periodEntries.filter(e => e.km).sort((a, b) => (b.km || 0) - (a.km || 0));
    } else {
      filteredEntries = periodEntries.filter(e => e.tipo === type);
    }

    if (filteredEntries.length === 0) return;

    setDrillDown({
      type,
      periodName: getPeriodLabel(),
      entries: filteredEntries
    });
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const amount = direction === 'prev' ? -1 : 1;
    if (period === 'daily') setSelectedDate(subDays(selectedDate, amount * -7));
    else if (period === 'weekly') setSelectedDate(subWeeks(selectedDate, amount * -4));
    else if (period === 'monthly') setSelectedDate(addMonths(selectedDate, amount));
    else if (period === 'yearly') setSelectedDate(addYears(selectedDate, amount));
  };

  const getPeriodLabel = () => {
    if (period === 'daily') return `Semana de ${format(subDays(selectedDate, 6), 'dd/MM')} a ${format(selectedDate, 'dd/MM')}`;
    if (period === 'weekly') {
      if (weeklyRange === 'month') return `Semanas de ${format(selectedDate, 'MMMM yyyy', { locale: ptBR })}`;
      return `Últimas ${weeklyRange} semanas`;
    }
    if (period === 'monthly') return format(selectedDate, 'MMMM yyyy', { locale: ptBR });
    if (period === 'yearly') return format(selectedDate, 'yyyy');
    return '';
  };

  const handleShareReport = async () => {
    const label = getPeriodLabel();
    const text = `Meu resumo financeiro no LucroNoVolante (${label}):\n` +
                 `💰 Ganhos: ${formatCurrency(totals.earnings)}\n` +
                 `💸 Despesas: ${formatCurrency(totals.expenses)}\n` +
                 `📈 Saldo: ${formatCurrency(totals.balance)}\n` +
                 `🚗 KM Rodado: ${totals.kmPercorrido} km\n\n` +
                 `Gerencie seu lucro real também em: ${window.location.origin}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Relatório LucroNoVolante - ${label}`,
          text: text,
          url: window.location.origin
        });
      } else {
        await navigator.clipboard.writeText(text);
        alert('Resumo copiado para a área de transferência!');
      }
    } catch (err) {
      console.error('Erro ao compartilhar relatório:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-200 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-bold text-xl mb-1">Relatórios Financeiros</h2>
              <p className="text-sm opacity-80 font-medium">
                Acompanhe seu desempenho em diferentes períodos.
              </p>
            </div>
            <button 
              onClick={handleShareReport}
              className="p-3 bg-white/20 backdrop-blur-md rounded-2xl hover:bg-white/30 transition-all active:scale-95"
              title="Compartilhar Resumo"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
          <BarChart3 size={120} />
        </div>
      </div>

      {/* Period Selector */}
      <div className="space-y-3">
        <div className="flex p-1 bg-slate-100 rounded-2xl">
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                setSelectedDate(new Date());
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all text-xs",
                period === p ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
              )}
            >
              {p === 'daily' ? 'Diário' : p === 'weekly' ? 'Semanal' : p === 'monthly' ? 'Mensal' : 'Anual'}
            </button>
          ))}
        </div>

        {period === 'weekly' && (
          <div className="space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[4, 8, 12, 'month'].map((r) => (
                <button
                  key={r}
                  onClick={() => setWeeklyRange(r as any)}
                  className={cn(
                    "whitespace-nowrap px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border",
                    weeklyRange === r 
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                      : "bg-white text-slate-500 border-slate-100"
                  )}
                >
                  {r === 'month' ? 'Mês Atual' : `${r} Semanas`}
                </button>
              ))}
            </div>
            <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
              <button
                onClick={() => setWeeklyGroupMode('byWeek')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                  weeklyGroupMode === 'byWeek' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                )}
              >
                Por Semana
              </button>
              <button
                onClick={() => setWeeklyGroupMode('byDayOfWeek')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                  weeklyGroupMode === 'byDayOfWeek' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                )}
              >
                Por Dia da Semana
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <button 
          onClick={() => navigatePeriod('prev')}
          className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-blue-600" />
          <span className="font-bold text-slate-700 capitalize text-sm">{getPeriodLabel()}</span>
        </div>
        <button 
          onClick={() => navigatePeriod('next')}
          className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div 
          onClick={() => handleSummaryClick('Ganhos')}
          className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="p-1.5 bg-emerald-50 rounded-lg w-fit mb-2">
            <TrendingUp className="text-emerald-600" size={16} />
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ganhos</p>
          <p className="text-sm font-black text-emerald-600 tracking-tight">{formatCurrency(totals.earnings)}</p>
        </div>
        <div 
          onClick={() => handleSummaryClick('Despesa')}
          className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="p-1.5 bg-rose-50 rounded-lg w-fit mb-2">
            <TrendingDown className="text-rose-600" size={16} />
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Despesas</p>
          <p className="text-sm font-black text-rose-600 tracking-tight">{formatCurrency(totals.expenses)}</p>
        </div>
        <div 
          onClick={() => handleSummaryClick('KM')}
          className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="p-1.5 bg-blue-50 rounded-lg w-fit mb-2">
            <BarChart3 className="text-blue-600" size={16} />
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">KM Rodado</p>
          <p className="text-sm font-black text-blue-600 tracking-tight">{totals.kmPercorrido.toLocaleString('pt-BR')} km</p>
        </div>
      </div>

      {/* Balance Card */}
      <div className={cn(
        "p-5 rounded-3xl shadow-sm border flex justify-between items-center",
        totals.balance >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
      )}>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Saldo do Período</p>
          <p className={cn(
            "text-xl font-black tracking-tight",
            totals.balance >= 0 ? "text-emerald-700" : "text-rose-700"
          )}>
            {formatCurrency(totals.balance)}
          </p>
        </div>
        <div className={cn(
          "p-3 rounded-2xl",
          totals.balance >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
        )}>
          <BarChart3 size={24} />
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-600" />
            Comparativo
          </h3>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setChartType('bar')}
              className={cn("p-1.5 rounded-lg transition-all", chartType === 'bar' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}
            >
              <BarChart3 size={14} />
            </button>
            <button 
              onClick={() => setChartType('line')}
              className={cn("p-1.5 rounded-lg transition-all", chartType === 'line' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}
            >
              <LineChartIcon size={14} />
            </button>
            <button 
              onClick={() => setChartType('area')}
              className={cn("p-1.5 rounded-lg transition-all", chartType === 'area' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}
            >
              <Layers size={14} />
            </button>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={reportData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                  labelStyle={{ fontWeight: 800, marginBottom: '4px', color: '#1e293b' }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 700 }}
                />
                <Bar 
                  dataKey="Ganhos" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]} 
                  barSize={period === 'daily' || period === 'monthly' ? 8 : 24}
                  onClick={(data) => handleBarClick(data, 'Ganhos')}
                />
                <Bar 
                  dataKey="Despesas" 
                  fill="#f43f5e" 
                  radius={[4, 4, 0, 0]} 
                  barSize={period === 'daily' || period === 'monthly' ? 8 : 24}
                  onClick={(data) => handleBarClick(data, 'Despesa')}
                />
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart data={reportData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 700 }} />
                <Line type="monotone" dataKey="Ganhos" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Despesas" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} activeDot={{ r: 6 }} />
              </LineChart>
            ) : (
              <AreaChart data={reportData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 700 }} />
                <Area type="monotone" dataKey="Ganhos" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={3} />
                <Area type="monotone" dataKey="Despesas" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} strokeWidth={3} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
          <PieChartIcon size={18} className="text-rose-500" />
          Distribuição de Despesas
        </h3>
        
        {categoryBreakdown.breakdown.length > 0 ? (
          <div className="space-y-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown.breakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="amount"
                  >
                    {categoryBreakdown.breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      padding: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              {categoryBreakdown.breakdown.map((item, index) => (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <span className="text-slate-600">{item.name}</span>
                    </div>
                    <span className="text-slate-900">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                  </div>
                  <p className="text-[9px] text-right text-slate-400 font-bold">{item.percentage.toFixed(1)}% do total</p>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Total Despesas</span>
                <span className="font-black text-rose-600">{formatCurrency(categoryBreakdown.totalExpenses)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-400 font-medium">Nenhuma despesa registrada neste período.</p>
          </div>
        )}
      </div>

      {/* Detailed List */}
      <div className="space-y-3">
        <h3 className="font-bold text-white ml-1">Detalhamento</h3>
        {reportData.slice().reverse().map((item, idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-slate-800">{item.fullDate}</p>
              <div className="flex gap-3 mt-1">
                <button 
                  onClick={() => handleBarClick(item, 'Ganhos')}
                  className="text-[10px] font-bold text-emerald-600 uppercase hover:underline"
                >
                  G: {formatCurrency(item.Ganhos)}
                </button>
                <button 
                  onClick={() => handleBarClick(item, 'Despesa')}
                  className="text-[10px] font-bold text-rose-600 uppercase hover:underline"
                >
                  D: {formatCurrency(item.Despesas)}
                </button>
                <span className="text-[10px] font-bold text-blue-600 uppercase">
                  KM: {item.kmPercorrido.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-black",
              item.Saldo >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            )}>
              {formatCurrency(item.Saldo)}
            </div>
          </div>
        ))}
      </div>

      {/* Drill-down Modal */}
      <AnimatePresence>
        {drillDown && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrillDown(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    {drillDown.type === 'Ganhos' ? (
                      <TrendingUp className="text-emerald-600" size={20} />
                    ) : drillDown.type === 'Despesa' ? (
                      <TrendingDown className="text-rose-600" size={20} />
                    ) : (
                      <BarChart3 className="text-blue-600" size={20} />
                    )}
                    {drillDown.type === 'KM' ? 'Registros de KM' : `${drillDown.type} Detalhados`}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">{drillDown.periodName}</p>
                </div>
                <button 
                  onClick={() => setDrillDown(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="size-6" />
                </button>
              </div>

              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Visualização</span>
                <div className="flex bg-slate-200 p-0.5 rounded-lg">
                  <button 
                    onClick={() => setDrillDownGrouped(true)}
                    className={cn("p-1.5 rounded-md transition-all", drillDownGrouped ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
                    title="Agrupar por Categoria"
                  >
                    <Layers size={14} />
                  </button>
                  <button 
                    onClick={() => setDrillDownGrouped(false)}
                    className={cn("p-1.5 rounded-md transition-all", !drillDownGrouped ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
                    title="Lista Simples"
                  >
                    <LayoutList size={14} />
                  </button>
                </div>
              </div>
              
              <div className="p-4 overflow-y-auto space-y-3">
                {drillDown.entries.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">Nenhum registro encontrado.</div>
                ) : drillDownGrouped && drillDown.type !== 'KM' ? (
                  // Grouped View
                  Object.entries(
                    drillDown.entries.reduce((acc: Record<string, Entry[]>, entry) => {
                      const category = categories.find(c => c.id === entry.categoriaId);
                      const name = entry.tipo === 'Ganhos' ? 'Fechamento do Dia' : (category?.nome || 'Outros');
                      if (!acc[name]) acc[name] = [];
                      acc[name].push(entry);
                      return acc;
                    }, {})
                  ).map(([groupName, groupEntries]) => {
                    const style = getCategoryStyle(groupName);
                    const groupTotal = groupEntries.reduce((acc, e) => acc + (e.valor || 0), 0);
                    
                    return (
                      <div key={groupName} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1.5 rounded-lg", style.bgColor, style.color)}>
                              {style.icon}
                            </div>
                            <span className="font-bold text-slate-800 text-sm">{groupName}</span>
                          </div>
                          <span className={cn("font-black text-sm", drillDown.type === 'Ganhos' ? "text-emerald-600" : "text-rose-600")}>
                            {formatCurrency(groupTotal)}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {groupEntries.map(entry => (
                            <div key={entry.id} className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-500 font-medium">{format(parseEntryDate(entry.data), 'dd/MM/yyyy')}</span>
                              <div className="flex items-center gap-2">
                                {entry.obs && <span className="text-slate-400 italic truncate max-w-[100px]">"{entry.obs}"</span>}
                                <span className="font-bold text-slate-700">{formatCurrency(entry.valor)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Simple List View
                  drillDown.entries.map((entry) => {
                    const category = categories.find(c => c.id === entry.categoriaId);
                    const style = getCategoryStyle(entry.tipo === 'Ganhos' ? 'Fechamento do Dia' : (category?.nome || 'Outros'));
                    
                    return (
                      <div key={entry.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                        <div className={cn("p-2 rounded-xl shrink-0", style.bgColor, style.color)}>
                          {style.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm truncate">
                                {entry.tipo === 'Ganhos' ? 'Fechamento do Dia' : category?.nome}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold">{format(parseEntryDate(entry.data), 'dd/MM/yyyy')}</p>
                            </div>
                            <div className="text-right">
                              <span className={cn(
                                "font-black text-sm block",
                                entry.tipo === 'Ganhos' ? "text-emerald-600" : "text-rose-600"
                              )}>
                                {formatCurrency(entry.valor)}
                              </span>
                              {entry.km && (
                                <span className="text-[10px] font-bold text-blue-600">{entry.km} km</span>
                              )}
                            </div>
                          </div>
                          {entry.obs && (
                            <p className="text-[10px] text-slate-500 italic mt-0.5 truncate">"{entry.obs}"</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    {drillDown.type === 'KM' ? 'Total Rodado' : `Total ${drillDown.type}`}
                  </span>
                  <span className={cn(
                    "text-lg font-black",
                    drillDown.type === 'Ganhos' ? "text-emerald-600" : 
                    drillDown.type === 'Despesa' ? "text-rose-600" : "text-blue-600"
                  )}>
                    {drillDown.type === 'KM' 
                      ? `${totals.kmPercorrido.toLocaleString('pt-BR')} km`
                      : formatCurrency(drillDown.entries.reduce((acc, e) => acc + (e.valor || 0), 0))
                    }
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
