import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Share2, FileText, ChevronLeft, Trash2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { AICampaign } from '../types';

export default function CampaignsHistory({ onClose }: { onClose: () => void }) {
  const [campaigns, setCampaigns] = useState<AICampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!auth.currentUser) return;
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setCampaigns(userDoc.data().aiCampaigns || []);
        }
      } catch (error) {
        console.error("Erro ao buscar campanhas:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  const deleteCampaign = async (campaignId: string) => {
    if (!auth.currentUser || !confirm('Deseja excluir esta campanha?')) return;
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const filteredCampaigns = campaigns.filter(c => c.id !== campaignId);
      await updateDoc(userDocRef, { aiCampaigns: filteredCampaigns });
      setCampaigns(filteredCampaigns);
    } catch (error) {
      console.error("Erro ao deletar:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0047AB] z-50 p-4 overflow-y-auto">
      <div className="max-w-lg mx-auto">
        <button onClick={onClose} className="flex items-center text-white/70 mb-6">
          <ChevronLeft /> Voltar
        </button>
        <h2 className="text-2xl font-black text-white mb-6">Minhas Campanhas</h2>

        {loading ? (
          <p className="text-white">Carregando...</p>
        ) : (
          <div className="space-y-4">
            {campaigns.map((c) => (
              <div key={c.id} className="bg-white p-4 rounded-2xl shadow-lg">
                <h3 className="font-bold text-gray-800 mb-2">{c.title}</h3>
                <div className="flex gap-2">
                  <button onClick={() => deleteCampaign(c.id)} className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                  {/* Here you could add a function to "re-open" the campaign in the AI Studio */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
