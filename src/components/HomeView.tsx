import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  TrendingUp as TrendingUpIcon,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  User,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HomeViewProps {
  user: any;
  totals: {
    earnings: number;
    expenses: number;
    balance: number;
  };
  onNavigate: (tab: any) => void;
}

export default function HomeView({ user, totals, onNavigate }: HomeViewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const firstName = user?.displayName?.split(' ')[0] || 'Motorista';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-6 pb-24">
      {/* Welcome Header */}
      <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-blue-100 font-medium mb-1">{greeting}, {firstName}!</p>
          <h2 className="text-3xl font-black mb-4">Como estão os ganhos hoje?</h2>
          <button 
            onClick={() => onNavigate('dashboard')}
            className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-bold text-sm shadow-lg hover:bg-blue-50 transition-all active:scale-95 flex items-center gap-2"
          >
            Ver Painel Completo
            <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12">
          <Zap size={180} />
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm"
        >
          <div className="p-2 bg-emerald-50 rounded-xl w-fit mb-3">
            <TrendingUp className="text-emerald-600" size={20} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ganhos do Mês</p>
          <p className="text-xl font-black text-emerald-600">{formatCurrency(totals.earnings)}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm"
        >
          <div className="p-2 bg-rose-50 rounded-xl w-fit mb-3">
            <TrendingDown className="text-rose-600" size={20} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gastos do Mês</p>
          <p className="text-xl font-black text-rose-600">{formatCurrency(totals.expenses)}</p>
        </motion.div>
      </div>

      {/* Main CTA / Status */}
      <div className="bg-[#1a1a1a] p-6 rounded-3xl text-white shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500 rounded-xl">
            <TrendingUpIcon size={20} />
          </div>
          <h3 className="font-bold">Seu Saldo Real</h3>
        </div>
        <p className="text-5xl font-black tracking-tight mb-2">
          {formatCurrency(totals.balance)}
        </p>
        <p className="text-sm text-slate-400 font-medium">
          Dedução automática de custos fixos e variáveis.
        </p>
      </div>

      {/* Shortcuts */}
      <div className="space-y-4">
        <h3 className="font-black text-white ml-1 flex items-center gap-2">
          <Clock size={16} className="text-blue-500" />
          Acesso Rápido
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <ShortcutButton 
            onClick={() => onNavigate('maintenance')}
            icon={<ShoppingBag className="text-amber-500" />}
            label="Manutenção"
          />
          <ShortcutButton 
            onClick={() => onNavigate('map')}
            icon={<Zap className="text-blue-500" />}
            label="Mapa de Preços"
          />
        </div>
      </div>
    </div>
  );
}

function ShortcutButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
    >
      <div className="p-3 bg-slate-50 rounded-2xl">
        {icon}
      </div>
      <span className="text-xs font-bold text-slate-700">{label}</span>
    </button>
  );
}
