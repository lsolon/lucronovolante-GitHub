import { motion } from 'motion/react';
import { AlertTriangle, Clock, ServerCog } from 'lucide-react';

export default function SystemMaintenance() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="bg-amber-100 text-amber-600 p-4 rounded-full">
            <ServerCog size={48} />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Estamos em Manutenção</h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            O sistema atingiu o limite de acessos diários gratuitos do servidor. 
            Isso é uma medida de proteção e <strong className="text-slate-700">nenhum dado foi perdido</strong>.
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 flex items-start gap-3 border border-slate-100 text-left">
          <Clock className="text-slate-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-bold text-slate-700 text-sm">Previsão de Retorno</h3>
            <p className="text-xs text-slate-500 mt-1 pb-1">
              Os limites costumam resetar automaticamente na virada do dia (meia-noite). 
              Tente novamente amanhã!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
