import { useMemo } from 'react';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Fuel, Car, Info, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { Entry } from '../types';

interface DashboardGraphicsProps {
  totals: {
    earnings: number;
    expenses: number;
    totalFixedCosts: number;
    balance: number;
  };
  entries: Entry[];
  categories: { id: string; nome: string }[];
  className?: string;
}

export default function DashboardGraphics({ totals, entries, categories, className }: DashboardGraphicsProps) {
  
  const weekDates = useMemo(() => {
    // Get the start of the week (Monday)
    const d = new Date();
    // Use local offset not UTC
    const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);

    return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const dStr = String(date.getDate()).padStart(2, '0');
        return `${y}/${m}/${dStr}`;
    });
  }, []);

  const weekEntries = useMemo(() => {
    return entries.filter(e => weekDates.includes(e.data));
  }, [entries, weekDates]);

  const weeklyData = useMemo(() => {
    return weekDates.map(date => {
        const dayEntries = weekEntries.filter(e => e.data === date);
        const [y, m, d] = date.split('/');
        const day = new Date(Number(y), Number(m) - 1, Number(d));
        return {
            name: `${day.toLocaleDateString('pt-BR', { weekday: 'short' })} ${String(day.getDate()).padStart(2, '0')}`,
            ganho: dayEntries.filter(e => e.tipo === 'Ganhos').reduce((sum, e) => sum + (e.valor || 0), 0),
            despesa: dayEntries.filter(e => e.tipo === 'Despesa').reduce((sum, e) => sum + (e.valor || 0), 0),
        };
    });
  }, [weekDates, weekEntries]);

  const expenseDetails = useMemo(() => {
    const expenses = weekEntries.filter(e => e.tipo === 'Despesa');
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.valor || 0), 0);
    
    // Aggregate by category
    const categoryTotals = expenses.reduce((acc, e) => {
      acc[e.categoriaId] = (acc[e.categoriaId] || 0) + (e.valor || 0);
      return acc;
    }, {} as Record<string, number>);

    return categories
      .filter(cat => categoryTotals[cat.id] > 0)
      .map(cat => ({
        name: cat.nome,
        amount: categoryTotals[cat.id] || 0,
        percentage: totalExpenses > 0 ? ((categoryTotals[cat.id] / totalExpenses) * 100).toFixed(0) : 0
      }))
      .sort((a, b) => b.amount - a.amount); // Sort by amount descending
  }, [weekEntries, categories]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className={cn("bg-[#1a1a1a] text-white p-4 rounded-3xl space-y-6", className)}>
      {/* Lucro Real Card */}
      <div className="bg-[#2a2a2a] p-6 rounded-3xl">
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-1">Lucro Real:</p>
        <h2 className="text-4xl font-black text-emerald-400">{formatCurrency(totals.balance)}</h2>
      </div>

      {/* Resumo Semanal */}
      <div className="bg-[#2a2a2a] p-6 rounded-3xl">
        <h3 className="text-lg font-bold mb-4">Resumo Semanal (7 dias)</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-400">Ganhos Brutos:</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(totals.earnings)}</p>
            <div className="h-40 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <Bar dataKey="ganho" radius={[4, 4, 0, 0]}>
                    {weeklyData.map((entry, idx) => (
                      <Cell key={`ganho-${entry.name}-${idx}`} fill="#22c55e" />
                    ))}
                    <LabelList dataKey="ganho" position="top" fill="#22c55e" fontSize={10} formatter={(value: number) => value > 0 ? value : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-400">Despesas Totais:</p>
            <p className="text-xl font-bold text-rose-400">{formatCurrency(totals.expenses)}</p>
            <div className="h-40 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <Bar dataKey="despesa" radius={[4, 4, 0, 0]}>
                    {weeklyData.map((entry, idx) => (
                      <Cell key={`despesa-${entry.name}-${idx}`} fill="#f43f5e" />
                    ))}
                    <LabelList dataKey="despesa" position="top" fill="#f43f5e" fontSize={10} formatter={(value: number) => value > 0 ? value : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Detalhes das Despesas */}
      <div className="bg-[#2a2a2a] p-6 rounded-3xl">
        <h3 className="text-lg font-bold mb-4">Detalhes das Despesas</h3>
        <div className="space-y-4">
          {expenseDetails.map((detail, index) => (
            <div key={`expense-${detail.name}-${index}`} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="text-slate-400" size={16} />
                <span>{detail.name} ({detail.percentage}%):</span>
              </div>
              <span className="font-bold">{formatCurrency(detail.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
