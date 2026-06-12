import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Fuel, 
  Car, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  X,
  Wallet,
  LayoutDashboard,
  Calculator,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TutorialModalProps {
  onClose: () => void;
}

const steps = [
  {
    title: "Bem-vindo ao LucroNoVolante!",
    description: "A ferramenta definitiva para você profissionalizar sua gestão financeira nas ruas. Vamos te mostrar como tirar o máximo proveito do app.",
    icon: <Car className="text-blue-600 size-12" />,
    color: "bg-blue-50"
  },
  {
    title: "Facilite seu Imposto de Renda",
    description: "Ao registrar tudo aqui, você gera um histórico completo para sua declaração anual. Saiba exatamente quanto foi ganho e descontado, evitando dores de cabeça com o Leão.",
    icon: <Calculator className="text-indigo-600 size-12" />,
    color: "bg-indigo-50"
  },
  {
    title: "Meta Diária Inteligente",
    description: "No Painel, calculamos automaticamente quanto você precisa ganhar hoje para cobrir seus custos fixos, gastos de rua e ainda garantir 10% para sua reserva de emergência.",
    icon: <Target className="text-emerald-600 size-12" />,
    color: "bg-emerald-50"
  },
  {
    title: "Custos Fixos vs. Gastos de Rua",
    description: "Diferenciamos o que é custo fixo (aluguel, seguro) do que é gasto de rua (combustível, lanche). Assim você sabe exatamente para onde vai seu dinheiro.",
    icon: <Wallet className="text-amber-600 size-12" />,
    color: "bg-amber-50"
  },
  {
    title: "Controle de Manutenção",
    description: "Cadastre seus itens de revisão e nós te avisaremos quando estiver chegando a hora de trocar o óleo, pneus ou correia, baseando-se na sua kilometragem.",
    icon: <Fuel className="text-rose-600 size-12" />,
    color: "bg-rose-50"
  },
  {
    title: "Tudo Pronto!",
    description: "Agora é só começar a registrar seus ganhos e despesas. Lembre-se: o que não é medido, não é gerenciado. Boas corridas!",
    icon: <CheckCircle2 className="text-blue-600 size-12" />,
    color: "bg-blue-50"
  },
  {
    title: "Próximo Passo: Custos Fixos",
    description: "Para que o app calcule seu lucro real, você precisa cadastrar seus custos fixos (Aluguel, Seguro, MEI). Vamos fazer isso agora?",
    icon: <Wallet className="text-blue-600 size-12" />,
    color: "bg-blue-50",
    isFinal: true
  }
];

export default function TutorialModal({ 
  onClose, 
  onStartWithExamples 
}: { 
  onClose: (dontShowAgain: boolean) => void, 
  onStartWithExamples?: () => void 
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose(dontShowAgain);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    onClose(dontShowAgain);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden relative z-10"
      >
        <button 
          onClick={handleClose}
          className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center text-center space-y-6"
            >
              <div className={cn("p-6 rounded-[32px] mb-2", steps[currentStep].color)}>
                {steps[currentStep].icon}
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl font-black text-slate-900 leading-tight">
                  {steps[currentStep].title}
                </h2>
                <p className="text-slate-500 font-medium leading-relaxed">
                  {steps[currentStep].description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-12 space-y-6">
            {/* Progress Dots */}
            <div className="flex justify-center gap-2">
              {steps.map((_, idx) => (
                <div 
                  key={`dot-${idx}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    idx === currentStep ? "w-8 bg-blue-600" : "w-2 bg-slate-200"
                  )}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={18} />
                  Voltar
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                {currentStep === steps.length - 1 ? 'Ir para Custos Fixos' : 'Próximo'}
                <ChevronRight size={18} />
              </button>
            </div>

            {currentStep === steps.length - 1 && onStartWithExamples && (
              <button
                onClick={onStartWithExamples}
                className="w-full bg-emerald-50 text-emerald-700 py-3 rounded-2xl font-bold text-xs hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 border border-emerald-100"
              >
                <TrendingUp size={14} />
                Gerar Exemplos de Ganhos e Despesas
              </button>
            )}

            <div className="pt-4 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="peer appearance-none size-5 border-2 border-slate-200 rounded-lg checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                  />
                  <CheckCircle2 className="absolute size-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none transition-opacity" />
                </div>
                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">
                  Não mostrar este tutorial novamente
                </span>
              </label>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
