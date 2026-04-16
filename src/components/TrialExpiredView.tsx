import { motion } from 'motion/react';
import { ShieldAlert, CreditCard, MessageCircle, LogOut } from 'lucide-react';

interface TrialExpiredViewProps {
  onLogout: () => void;
}

export default function TrialExpiredView({ onLogout }: TrialExpiredViewProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 max-w-sm w-full"
      >
        <div className="bg-rose-100 p-4 rounded-3xl w-fit mx-auto mb-6">
          <ShieldAlert className="text-rose-600 size-12" />
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Período de Teste Encerrado</h2>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          Esperamos que o <strong>LucroNoVolante</strong> tenha ajudado você a entender melhor seus ganhos nestes últimos 30 dias.
        </p>

        <div className="space-y-4">
          <button 
            onClick={() => window.open('https://wa.me/5511999999999?text=Quero+assinar+o+LucroNoVolante', '_blank')}
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
          >
            <CreditCard size={20} />
            Assinar Agora
          </button>
          
          <button 
            onClick={() => window.open('https://wa.me/5511999999999?text=Tenho+uma+duvida+sobre+o+app', '_blank')}
            className="w-full bg-emerald-50 text-emerald-700 p-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all"
          >
            <MessageCircle size={20} />
            Falar com Suporte
          </button>

          <button 
            onClick={onLogout}
            className="w-full bg-slate-100 text-slate-500 p-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-200 transition-all"
          >
            <LogOut size={20} />
            Sair da Conta
          </button>
        </div>

        <p className="mt-8 text-[10px] text-slate-400 uppercase font-black tracking-widest">
          Seus dados continuam salvos e seguros.
        </p>
      </motion.div>
    </div>
  );
}
