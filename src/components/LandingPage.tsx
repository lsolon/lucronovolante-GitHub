import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  CheckCircle2, 
  ChevronRight, 
  Car, 
  BarChart3, 
  Settings, 
  Fuel,
  Target,
  ArrowRight,
  AlertCircle,
  Share2
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface LandingPageProps {
  onLogin: () => void;
  error?: string | null;
}

export default function LandingPage({ onLogin, error }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: 'LucroNoVolante',
      text: 'Motorista, pare de apenas dirigir e comece a lucrar! Conheça o LucroNoVolante, o app de gestão financeira para motoristas de aplicativo.',
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        alert('Link do app copiado para a área de transferência!');
      }
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-700">
      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4",
        scrolled ? "bg-white/80 backdrop-blur-md border-b border-slate-100 py-3" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-200">
              <Car className="text-white size-6" />
            </div>
            <span className="font-black text-xl tracking-tighter text-slate-800">LucroNoVolante</span>
          </div>
          <button 
            onClick={onLogin}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            Entrar no App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-6">
              <Zap size={14} />
              O App nº 1 para Motoristas de App
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tighter mb-6">
              Pare de apenas dirigir. <br />
              <span className="text-blue-600">Comece a lucrar.</span>
            </h1>
            <p className="text-lg text-slate-500 mb-8 max-w-lg leading-relaxed">
              A ferramenta definitiva para motoristas Uber, 99 e InDrive. Controle seus ganhos, despesas e manutenções em tempo real com inteligência financeira.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onLogin}
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 group"
              >
                Começar Agora Grátis
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={handleShare}
                className="bg-slate-100 text-slate-700 px-8 py-4 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={20} className="text-blue-600" />
                Compartilhar
              </button>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 text-sm font-bold"
              >
                <AlertCircle className="size-5 shrink-0" />
                {error}
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-blue-600/5 rounded-[40px] blur-3xl" />
            <div className="relative bg-slate-900 rounded-[40px] p-4 shadow-2xl border border-slate-800">
              <img 
                src="https://picsum.photos/seed/app-preview/800/1200" 
                alt="App Preview" 
                className="rounded-[32px] w-full h-auto"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-4">
              Tudo o que você precisa para dominar as ruas
            </h2>
            <p className="text-slate-500 font-medium">
              Desenvolvido por quem entende a realidade do motorista brasileiro.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<TrendingUp className="text-emerald-600" />}
              title="Lucro Real"
              description="Saiba exatamente quanto sobra no seu bolso após descontar combustível, aluguel e manutenção."
            />
            <FeatureCard 
              icon={<Target className="text-blue-600" />}
              title="Metas Inteligentes"
              description="Defina quanto quer ganhar e o app calcula sua meta diária baseada nos seus custos reais."
            />
            <FeatureCard 
              icon={<Fuel className="text-amber-600" />}
              title="Mapa de Combustível"
              description="Encontre os postos com melhor custo-benefício baseados nos seus próprios registros."
            />
            <FeatureCard 
              icon={<Settings className="text-slate-600" />}
              title="Gestão de Revisão"
              description="Alertas automáticos de troca de óleo, pneus e correias baseados na sua kilometragem."
            />
            <FeatureCard 
              icon={<BarChart3 className="text-indigo-600" />}
              title="Relatórios Mensais"
              description="Visualize seu desempenho por plataforma (Uber, 99, InDrive) e otimize seu tempo."
            />
            <FeatureCard 
              icon={<Shield className="text-rose-600" />}
              title="Dados na Nuvem"
              description="Nunca perca seus registros. Seus dados são salvos com segurança e acessíveis de qualquer lugar."
            />
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto bg-blue-600 rounded-[40px] p-12 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10"><Car size={100} /></div>
            <div className="absolute bottom-10 right-10"><TrendingUp size={100} /></div>
          </div>
          
          <div className="relative z-10">
            <h2 className="text-4xl font-black mb-12 tracking-tight">O motorista que se organiza, lucra mais.</h2>
            <div className="grid sm:grid-cols-3 gap-8 mb-12">
              <div>
                <p className="text-5xl font-black mb-2">30%</p>
                <p className="text-sm font-bold uppercase tracking-widest opacity-80">Aumento Médio no Lucro</p>
              </div>
              <div>
                <p className="text-5xl font-black mb-2">500+</p>
                <p className="text-sm font-bold uppercase tracking-widest opacity-80">Motoristas Ativos</p>
              </div>
              <div>
                <p className="text-5xl font-black mb-2">R$ 0</p>
                <p className="text-sm font-bold uppercase tracking-widest opacity-80">Custo Inicial</p>
              </div>
            </div>
            <button 
              onClick={handleShare}
              className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black text-lg hover:bg-blue-50 transition-all shadow-xl flex items-center justify-center gap-2 mx-auto"
            >
              <Share2 size={20} />
              Convidar um Amigo Motorista
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-1 rounded-lg">
              <Car className="text-white size-5" />
            </div>
            <span className="font-black text-lg tracking-tighter text-slate-800">LucroNoVolante</span>
          </div>
          <p className="text-slate-400 text-sm font-medium">
            © 2026 LucroNoVolante. Todos os direitos reservados.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-400 hover:text-slate-600 text-sm font-bold uppercase tracking-widest">Termos</a>
            <a href="#" className="text-slate-400 hover:text-slate-600 text-sm font-bold uppercase tracking-widest">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="p-3 bg-slate-50 rounded-2xl w-fit mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">{title}</h3>
      <p className="text-slate-500 leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );
}
