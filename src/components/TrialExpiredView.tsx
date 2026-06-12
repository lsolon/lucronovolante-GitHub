import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, CreditCard, MessageCircle, LogOut, Download, AlertTriangle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { truncateLargeFields } from '../lib/utils';
import { auth, db } from '../firebase';
import { doc, collection, getDocs, writeBatch, deleteDoc, setDoc } from 'firebase/firestore';

interface TrialExpiredViewProps {
  onLogout: () => void;
  entries: any[];
  categories: any[];
  earningCategories: any[];
}

export default function TrialExpiredView({ onLogout, entries, categories, earningCategories }: TrialExpiredViewProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadBackup, setDownloadBackup] = useState(true);

  const handleDeleteData = async () => {
    setIsDeleting(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      if (user.email) {
         try {
           const trialRef = doc(db, 'trials', user.email.toLowerCase());
           // If they delete their account, their future trials are permanently expired
           await setDoc(trialRef, { trialStartDate: new Date("2000-01-01").toISOString() }, { merge: true });
         } catch (e) {
           console.warn("Could not save trial block doc", e);
         }
      }

      if (downloadBackup && entries.length > 0) {
        // Prepare excel export
        const dataToExport = entries.map(entry => {
          const categoryName = categories.find(c => c.id === entry.categoriaId)?.nome || 'Sem Categoria';
          const base = {
            ID: entry.id,
            Tipo: entry.tipo,
            Data: entry.data,
            'Criado Em': entry.createdAt,
            Categoria: categoryName,
            Valor: entry.valor,
            Metragem: entry.metragem || '',
            Observacao: entry.obs || '',
            'Link Nota': entry.linkNota || '',
            Foto: entry.photoUrl || ''
          };

          if (entry.tipo === 'Ganhos' && entry.ganhos) {
            const platformGanhos: Record<string, number> = {};
            earningCategories.forEach(cat => {
              platformGanhos[`Ganho_${cat.nome}`] = entry.ganhos?.[cat.id] || 0;
            });
            return { ...base, ...platformGanhos };
          }
          return base;
        });

        const safeData = truncateLargeFields(dataToExport, 32000);
        const worksheet = XLSX.utils.json_to_sheet(safeData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Lancamentos_Backup");
        XLSX.writeFile(workbook, `LucroNoVolante_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
      }

      // Delete user's entries in Firestore
      const entriesRef = collection(db, 'users', user.uid, 'entries');
      const snapshot = await getDocs(entriesRef);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();

      // Delete user settings
      await deleteDoc(doc(db, 'users', user.uid));
      
      try {
         await user.delete();
      } catch (err) {
         console.error('Failed to delete auth user directly:', err);
      }
      
      onLogout();
      
    } catch (error) {
      console.error('Error deleting data:', error);
      alert('Houve um erro ao tentar excluir os dados. Verifique a conexão e tente novamente.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center py-12">
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

        <button
          onClick={() => setShowDeleteModal(true)}
          className="mt-8 text-[10px] text-slate-400 uppercase font-black tracking-widest hover:text-red-500 transition-colors w-full p-2"
        >
          Não quero continuar (Excluir Conta)
        </button>
      </motion.div>

      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden text-left"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 text-red-600">
                    <div className="p-2 bg-red-50 rounded-xl">
                      <AlertTriangle size={24} />
                    </div>
                    <h3 className="font-bold">Excluir Conta</h3>
                  </div>
                  <button
                    onClick={() => !isDeleting && setShowDeleteModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <p className="text-sm text-slate-600 mb-6">
                  Você está prestes a encerrar sua conta. <strong>TODOS</strong> os seus dados ({entries.length} lançamentos e configurações) serão excluídos permanentemente da nossa plataforma. Essa ação não pode ser desfeita.
                </p>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={downloadBackup}
                      onChange={(e) => setDownloadBackup(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-600"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">Baixar backup em Excel</p>
                      <p className="text-xs text-slate-500 mt-1">Salve seus registros antes que sejam excluídos definitivamente.</p>
                    </div>
                    <Download className="text-slate-400" size={20} />
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteData}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                  >
                    {isDeleting ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    ) : (
                      'Sim, excluir tudo'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
