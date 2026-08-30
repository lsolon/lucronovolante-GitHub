import { X, BookOpen, PlusCircle, LayoutDashboard, Settings, Fuel, BarChart3, TrendingUp, History, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useState } from 'react';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManualModal({ isOpen, onClose }: ManualModalProps) {
  const [activeTab, setActiveTab] = useState<'intro' | 'add' | 'reports' | 'costs'>('intro');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#1e1e1e] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-white/10"
        >
          {/* Header */}
          <div className="bg-[#2a2a2a] p-4 flex items-center justify-between border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-xl">
                <BookOpen className="text-blue-400" size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Guia de Uso</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col md:flex-row overflow-hidden flex-1">
            {/* Sidebar / Tabs */}
            <div className="md:w-64 bg-[#2a2a2a]/50 border-b md:border-b-0 md:border-r border-white/5 p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0 hide-scrollbar">
              <button
                onClick={() => setActiveTab('intro')}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors whitespace-nowrap text-left",
                  activeTab === 'intro' ? "bg-blue-500/20 text-blue-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <LayoutDashboard size={18} />
                <span className="font-medium text-sm">Visão Geral</span>
              </button>
              <button
                onClick={() => setActiveTab('add')}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors whitespace-nowrap text-left",
                  activeTab === 'add' ? "bg-blue-500/20 text-blue-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <PlusCircle size={18} />
                <span className="font-medium text-sm">Registrar Valores</span>
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors whitespace-nowrap text-left",
                  activeTab === 'reports' ? "bg-blue-500/20 text-blue-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <BarChart3 size={18} />
                <span className="font-medium text-sm">Relatórios e Gráficos</span>
              </button>
              <button
                onClick={() => setActiveTab('costs')}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors whitespace-nowrap text-left",
                  activeTab === 'costs' ? "bg-blue-500/20 text-blue-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Settings size={18} />
                <span className="font-medium text-sm">Custos e Revisões</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#1a1a1a] text-slate-300">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {activeTab === 'intro' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">Bem-vindo ao LucroNoVolante!</h3>
                        <p className="text-sm">
                          O aplicativo foi desenvolvido para ajudar motoristas a acompanharem de perto seus ganhos reais e despesas.
                          A tela principal (Painel) é o seu resumo diário de resultados.
                        </p>
                      </div>

                      <div className="bg-[#2a2a2a] p-4 rounded-2xl border border-white/5">
                        <h4 className="flex items-center gap-2 text-white font-bold mb-3">
                          <LayoutDashboard className="text-blue-400" size={18} /> O Painel Principal
                        </h4>
                        <ul className="space-y-3 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs mt-0.5 whitespace-nowrap">Receitas</span>
                            <span>Mostra todos os ganhos do mês (corridas, etc).</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-xs mt-0.5 whitespace-nowrap">Despesas</span>
                            <span>Soma de todo o dinheiro que saiu no mês corrente.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs mt-0.5 whitespace-nowrap">Saldo Real</span>
                            <span>A diferença entre o que você ganhou, o que gastou e a <b>provisão dos seus custos fixos e manutenções diárias</b> calculadas automaticamente.</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 text-sm flex gap-3 text-blue-200">
                        <Info className="shrink-0 text-blue-400 mt-0.5" size={18} />
                        <p>O aplicativo deduz os seus "Custos Fixos" automaticamente na aba principal para sempre lhe informar o "Lucro Líquido" exato.</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'add' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">Adicionando Lançamentos</h3>
                        <p className="text-sm">
                          Utilize o botão flutuante <span className="bg-blue-600 text-white rounded-full p-1 inline-flex align-middle mx-1"><PlusCircle size={14}/></span> (Novo Lançamento) no celular ou inferior na tela para informar ganhos ou despesas.
                        </p>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="bg-[#2a2a2a] p-4 rounded-2xl border border-white/5">
                          <h4 className="flex items-center gap-2 text-emerald-400 font-bold mb-3">
                             Ganhos
                          </h4>
                          <p className="text-sm text-slate-300 mb-2">Adicione os ganhos diários ou pontuais.</p>
                          <ul className="text-xs space-y-2 text-slate-400 list-disc list-inside">
                            <li>Digite o valor do ganho.</li>
                            <li>Escolha a data e categoria (ex: Uber, 99).</li>
                            <li>A quilometragem do dia é opcional.</li>
                          </ul>
                        </div>
                        <div className="bg-[#2a2a2a] p-4 rounded-2xl border border-white/5">
                          <h4 className="flex items-center gap-2 text-rose-400 font-bold mb-3">
                             Despesas
                          </h4>
                          <p className="text-sm text-slate-300 mb-2">Abastecimentos e manutenções variadas.</p>
                          <ul className="text-xs space-y-2 text-slate-400 list-disc list-inside">
                            <li>Se for "Abastecimento", preencha a quantidade de litros/m³ e o valor unitário.</li>
                            <li><b>Opção "Tanque Vazio":</b> Marque quando abastecer com o tanque ou cilindro zerado/na reserva. No próximo abastecimento com tanque vazio, o app calculará automaticamente quantos km você rodou no ciclo, o consumo médio real (km/L ou km/m³) e o custo por km rodado!</li>
                            <li>Anotar o "Hodômetro / Quilometragem atual" ajudará o app a calcular as trocas de óleo e ciclos de combustível.</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-[#2a2a2a] p-4 rounded-2xl border border-white/5">
                       <h4 className="font-bold text-white mb-2 text-sm">Histórico</h4>
                       <p className="text-sm">Todas as informações registradas podem ser revistas ou apagadas na aba <b>"Histórico"</b> <History className="inline size-4 text-slate-400 mx-1"/>. Lá, as entradas ficam ordenadas por mês e data.</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'reports' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">Relatórios e Gráficos</h3>
                        <p className="text-sm">
                          Acompanhe sua saúde financeira agrupada por períodos e visualize nas novas opções da tela de "Relatórios".
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-[#2a2a2a] p-4 rounded-2xl border border-white/5">
                          <h4 className="font-bold text-white mb-2 text-sm flex items-center gap-2">
                            <TrendingUp className="text-blue-400" size={16}/> Relatórios (Tabelas)
                          </h4>
                          <p className="text-xs text-slate-400 mb-2">Alternando os períodos no topo da tela (Diário, Semanal, Mensal ou Anual), você visualiza a performance por grupo.</p>
                          <ul className="text-xs text-slate-400 list-disc list-inside">
                            <li><b>Receitas</b> x <b>Despesas</b> no período selecionado.</li>
                            <li>Total em KM rodada x Literagem.</li>
                            <li>Permite expandir os dias para ver os detalhes da semana/mês.</li>
                          </ul>
                        </div>

                        <div className="bg-[#2a2a2a] p-4 rounded-2xl border border-white/5">
                          <h4 className="font-bold text-white mb-2 text-sm flex items-center gap-2">
                             <BarChart3 className="text-emerald-400" size={16}/> Gráficos (Visual)
                          </h4>
                          <p className="text-xs text-slate-400 mb-2">Visualize barras que demonstram o fechamento da semana atual de "Segunda a Domingo".</p>
                          <ul className="text-xs text-slate-400 list-disc list-inside">
                            <li>Barras de ganhos do lado das barras de despesas do mesmo dia.</li>
                            <li>Eixo X demonstra a data atual, os ganhos aparecem no topo da barra.</li>
                            <li>Exibição e somatório das despesas agrupadas por "%" (Ex: Combustível 55%, Manutenção 10%...).</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'costs' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">Custos Fixos e Manutenção</h3>
                        <p className="text-sm">
                          É impossível ver o real lucro sem mapear quanto aquele pneu gasto na rua custará amanhã.
                        </p>
                      </div>

                      <div className="bg-[#2a2a2a] p-4 rounded-2xl border border-white/5">
                        <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                           <Settings className="text-rose-400" size={18}/> Custos Fixos (Mensais)
                        </h4>
                        <p className="text-sm mb-2 text-slate-300">Nesta aba, registre todos os gastos fixos mensais com o seu carro de trabalho, ex:</p>
                        <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                          <li>Prestação de Financiamento/Consórcio</li>
                          <li>Seguro ou Proteção Veicular</li>
                          <li>Aluguel / Mensalidade App</li>
                          <li>IPVA / Licenciamento Anual dividido por 12 vezes</li>
                        </ul>
                        <p className="text-xs font-semibold text-rose-300 mt-3 pt-3 border-t border-white/5">O app soma tudo, divide por 30 dias ativos e desconta no seu lucro R$ diário do painel!</p>
                      </div>

                      <div className="bg-[#2a2a2a] p-4 rounded-2xl border border-white/5">
                        <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                           <Fuel className="text-emerald-400" size={18}/> Aba Revisão
                        </h4>
                        <p className="text-sm mb-2 text-slate-300">Manutenções periódicas por Odômetro (KM).</p>
                        <p className="text-xs text-slate-400">
                          Acompanhe quanto tempo falta para trocar "Pastilhas, Óleo ou Pneus". Você informa com qual KM comprou a peça, de quantos em quantos KMs vai trocar (Ciclo), e o app irá te avisar quando a Troca estiver próxima (vermelha)!
                        </p>
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
