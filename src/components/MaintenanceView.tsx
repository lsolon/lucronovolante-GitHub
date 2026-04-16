import { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Fuel, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  History,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Entry, MaintenanceInterval } from '../types';
import { getCategoryStyle } from '../lib/category-styles';

interface MaintenanceViewProps {
  currentKm: number;
  maintenanceIntervals: MaintenanceInterval[];
  entries: Entry[];
  categories: { id: string; nome: string }[];
}

export default function MaintenanceView({ 
  currentKm, 
  maintenanceIntervals, 
  entries, 
  categories 
}: MaintenanceViewProps) {
  const maintenanceStatus = useMemo(() => {
    return maintenanceIntervals.map(interval => {
      const lastEntry = entries.find(e => {
        const cat = categories.find(c => c.id === e.categoriaId);
        const name = cat?.nome.toLowerCase() || '';
        const itemName = interval.item.toLowerCase();
        
        if (itemName.includes('óleo') || itemName.includes('oleo')) {
          return (name === 'troca de oleo' || name === 'troca de óleo') && e.km;
        }
        
        return name.includes(itemName) && e.km;
      });

      if (!lastEntry || !lastEntry.km) return { ...interval, remaining: null, percent: 0, lastKm: null };

      const nextChange = lastEntry.km + interval.intervaloKm;
      const remaining = nextChange - currentKm;
      const percent = Math.max(0, Math.min(100, (remaining / interval.intervaloKm) * 100));
      
      return { ...interval, remaining, percent, lastKm: lastEntry.km };
    });
  }, [maintenanceIntervals, entries, categories, currentKm]);

  const criticalItems = maintenanceStatus.filter(item => item.remaining !== null && item.remaining < 500);
  const warningItems = maintenanceStatus.filter(item => item.remaining !== null && item.remaining >= 500 && item.remaining < 1500);
  const healthyItems = maintenanceStatus.filter(item => item.remaining === null || item.remaining >= 1500);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-lg shadow-slate-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/10 rounded-xl">
            <Fuel className="text-white size-6" />
          </div>
          <h2 className="font-bold text-xl">Manutenção e Revisão</h2>
        </div>
        <p className="text-sm opacity-70 font-medium">
          Acompanhe o estado de conservação e as próximas revisões do seu veículo.
        </p>
        
        <div className="mt-6 flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
          <div>
            <p className="text-[10px] font-bold uppercase opacity-50 tracking-wider">KM Atual do Veículo</p>
            <p className="text-2xl font-black">{currentKm} <span className="text-sm opacity-50">km</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase opacity-50 tracking-wider">Status Geral</p>
            <div className="flex items-center gap-1 justify-end">
              {criticalItems.length > 0 ? (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <AlertCircle size={14} /> Crítico
                </span>
              ) : warningItems.length > 0 ? (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <AlertCircle size={14} /> Atenção
                </span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={14} /> Em dia
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {criticalItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest px-1 flex items-center gap-2">
            <AlertCircle size={14} /> Itens Críticos
          </h3>
          {criticalItems.map(item => (
            <MaintenanceCard key={item.id} item={item} currentKm={currentKm} />
          ))}
        </div>
      )}

      {warningItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest px-1 flex items-center gap-2">
            <Info size={14} /> Atenção Necessária
          </h3>
          {warningItems.map(item => (
            <MaintenanceCard key={item.id} item={item} currentKm={currentKm} />
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
          <CheckCircle2 size={14} /> Itens em Dia / Sem Registro
        </h3>
        {healthyItems.map(item => (
          <MaintenanceCard key={item.id} item={item} currentKm={currentKm} />
        ))}
      </div>
      
      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
        <History className="text-blue-500 shrink-0" size={20} />
        <p className="text-xs text-blue-700 font-medium leading-relaxed">
          Dica: Para atualizar um item, registre uma nova despesa com a categoria correspondente e informe a quilometragem atual do veículo.
        </p>
      </div>
    </div>
  );
}

function MaintenanceCard({ item, currentKm }: { item: any, currentKm: number }) {
  const style = getCategoryStyle(item.item);
  const isCritical = item.remaining !== null && item.remaining < 500;
  const isWarning = item.remaining !== null && item.remaining >= 500 && item.remaining < 1500;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white p-5 rounded-3xl shadow-sm border transition-all duration-300",
        isCritical ? "border-rose-200 bg-rose-50/20" : 
        isWarning ? "border-amber-200 bg-amber-50/20" : "border-slate-100"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl",
            isCritical ? "bg-rose-100 text-rose-600" : 
            isWarning ? "bg-amber-100 text-amber-600" : style.bgColor + " " + style.color
          )}>
            {style.icon}
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{item.item}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Intervalo: {item.intervaloKm} km
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-slate-300" />
      </div>
      
      <div className="flex justify-between items-end mb-2">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {item.remaining !== null ? "Restam" : "Status"}
          </p>
          <p className={cn(
            "text-2xl font-black tracking-tight",
            isCritical ? "text-rose-600" : 
            isWarning ? "text-amber-600" : "text-slate-800"
          )}>
            {item.remaining !== null ? `${item.remaining} km` : "Sem registro"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Última Revisão</p>
          <p className="font-bold text-slate-600">
            {item.lastKm !== null ? `${item.lastKm} km` : "---"}
          </p>
        </div>
      </div>

      {item.remaining !== null && (
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${item.percent}%` }}
            className={cn(
              "h-full rounded-full shadow-sm transition-colors duration-500",
              item.percent < 10 ? "bg-rose-600" : 
              item.percent < 30 ? "bg-amber-500" : "bg-emerald-500"
            )}
          />
        </div>
      )}
    </motion.div>
  );
}
