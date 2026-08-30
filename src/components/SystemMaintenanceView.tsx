import React from 'react';
import { Wrench } from 'lucide-react';
import { motion } from 'motion/react';

export default function SystemMaintenanceView() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-blue-900/5 max-w-md w-full border border-slate-100"
      >
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Wrench className="text-blue-600 size-10" />
        </div>
        
        <h1 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">
          Sistema em Manutenção
        </h1>
        
        <p className="text-slate-500 mb-8 leading-relaxed">
          Estamos realizando melhorias no LucroNoVolante para trazer novidades e uma experiência ainda melhor para você. Voltamos em breve!
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
          Trabalhando nas atualizações...
        </div>
      </motion.div>
    </div>
  );
}
