import React from 'react';
import { Share2, Car, TrendingUp, ShieldCheck, Download, Printer, Mail } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function MarketingFlyer({ onClose }: { onClose: () => void }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 overflow-y-auto">
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 flex justify-center items-start">
        
        {/* Controls */}
        <div className="fixed top-4 right-4 flex gap-4 print:hidden">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition"
          >
            <Printer size={20} />
            Imprimir PDF
          </button>
          <button 
            onClick={onClose}
            className="bg-white/10 text-white px-4 py-2 rounded-xl font-bold hover:bg-white/20 transition"
          >
            Fechar
          </button>
        </div>

        {/* Printable Flyer A5 vertical format approximate ratio */}
        <div id="printable-flyer" className="bg-white w-full max-w-[794px] aspect-[1/1.414] shadow-2xl overflow-hidden relative print:shadow-none print:w-[100vw] print:aspect-auto print:min-h-[100vh]">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-indigo-800 text-white p-12 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="flex items-center gap-3 mb-6 bg-white/10 backdrop-blur px-6 py-2 rounded-full border border-white/20">
                <Car className="text-emerald-400" size={28} />
                <h1 className="text-3xl font-black tracking-tight">LucroNoVolante</h1>
              </div>
              <h2 className="text-5xl font-black mb-4 leading-tight tracking-tighter">
                Pare de rodar no escuro. <br/>
                <span className="text-emerald-400">Controle seu lucro real.</span>
              </h2>
              <p className="text-xl text-indigo-100 font-medium max-w-xl">
                O "lucro" do aplicativo não é o que sobra na sua mão. Descubra quanto você realmente ganha depois do combustível, manutenção e impostos.
              </p>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-12 print:p-8">
            <div className="grid grid-cols-2 gap-12 print:grid-cols-2">
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600 mt-1">
                    <TrendingUp size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Lucro Real e Meta Diária</h3>
                    <p className="text-slate-600">Subtraímos seus custos fixos e variáveis automaticamente. Saiba exatamente o quanto faturar no dia para cobrir as contas e alcançar seu lucro desejado.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-rose-100 p-3 rounded-2xl text-rose-600 mt-1">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Preparo para o Carnê-Leão (IRPF)</h3>
                    <p className="text-slate-600">Calculamos sua base tributável automaticamente (60% dos ganhos). Saiba quando você estará isento ou se precisará emitir o DARF mensal.</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col justify-center items-center text-center">
                <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Comece grátis hoje</h3>
                <p className="text-slate-500 mb-8 font-medium">Aponte a câmera e comece a ter o controle do seu negócio.</p>
                
                {/* QR Code */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center justify-center">
                  <QRCode value="https://lucronovolante.app.br" size={160} level="H" />
                </div>
                
                <p className="text-indigo-600 font-bold flex items-center gap-2 mb-4">
                  <Download size={18} /> Sem enrolação.
                </p>

                <div className="flex items-center gap-2 text-slate-400 text-sm mt-2">
                  <Mail size={16} />
                  <span>lucronovolanteapp@gmail.com</span>
                </div>
              </div>
            </div>
            
            <div className="mt-16 text-center border-t border-slate-100 pt-8">
               <p className="text-2xl font-black text-slate-300 tracking-widest uppercase">
                  O volante é seu, o controle também.
               </p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
