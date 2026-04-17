import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  Send, 
  Sparkles, 
  Copy, 
  Check, 
  X, 
  MessageSquare, 
  Clapperboard, 
  FileText,
  ChevronRight,
  Bot,
  Share2,
  ExternalLink,
  Smartphone,
  Facebook,
  Instagram,
  Download,
  Save
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, writeBatch, collection, arrayUnion, updateDoc } from 'firebase/firestore';
import { AICampaign } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string;
  video?: string;
}

const SYSTEM_PROMPT = `Você é o Diretor Criativo e Especialista em Marketing do aplicativo "LucroNoVolante".
Seu objetivo é ajudar o usuário (um motorista de aplicativo) a criar materiais de divulgação virais e profissionais.

O aplicativo LucroNoVolante ajuda motoristas a:
1. Calcular o lucro real (Ganhos - Custos Fixos - Gastos de Rua).
2. Bater metas diárias inteligentes (que incluem reserva de emergência).
3. Controlar manutenção preventiva (óleo, pneus, etc).
4. Sincronizar dados com AppSheet e Excel.

Ao sugerir roteiros ou propagandas, foque em:
- Dores do motorista (trabalhar muito e não ver a cor do dinheiro).
- Soluções práticas (o app faz a conta chata por você).
- Chamadas para ação (CTA) claras.
- Formatos compartilháveis (mensagens curtas para WhatsApp, posts para Instagram, etc).

Sempre responda em Português do Brasil, com um tom motivador, profissional e direto.
Para "Propagandas Compartilháveis", use emojis e uma estrutura que funcione bem em grupos de WhatsApp.`;

const SUGGESTIONS = [
  {
    title: "Gerar Vídeo Curto",
    prompt: "Gere um vídeo cinematográfico de 5 segundos de um carro de aplicativo dirigindo por uma cidade moderna ao pôr do sol, com luzes neon.",
    icon: <Video className="size-4" />
  },
  {
    title: "Criar Post com Imagem",
    prompt: "Gere uma imagem de publicidade de alta qualidade para Instagram: um motorista de aplicativo focado e feliz, dentro de um carro moderno. Foco total em uma composição visual limpa, sem qualquer texto ou logotipo na imagem.",
    icon: <Sparkles className="size-4" />
  },
  {
    title: "Propaganda WhatsApp",
    prompt: "Gere uma imagem atraente para status de WhatsApp com um motorista de app sorrindo e o celular na mão com o app aberto. Foco total em uma composição visual limpa, sem qualquer texto ou logotipo na imagem.",
    icon: <Share2 className="size-4" />
  },
  {
    title: "Roteiro para Reels",
    prompt: "Crie um roteiro de 30 segundos para um Reels do Instagram focado na dor de não saber o lucro real no final do dia.",
    icon: <Clapperboard className="size-4" />
  },
  {
    title: "Convite de Indicação",
    prompt: "Crie uma mensagem de convite para eu enviar para um colega motorista, explicando por que ele deveria usar o LucroNoVolante.",
    icon: <Smartphone className="size-4" />
  }
];

import CampaignsHistory from './CampaignsHistory';
// ... existing imports

export default function AIVideoStudio({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (showHistory) {
    return <CampaignsHistory onClose={() => setShowHistory(false)} />;
  }

  // The actual render logic is fully contained within the main return block at line 321


  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    if (auth.currentUser?.email !== 'leandrosolon@gmail.com') {
      setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, este recurso está disponível apenas para o administrador autorizado.' }]);
      return;
    }

    const userMessage: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY não configurada. Por favor, configure a chave de API.");
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const isImageRequest = text.toLowerCase().includes('imagem') || 
                            text.toLowerCase().includes('foto') || 
                            text.toLowerCase().includes('desenhe');
      
      const isVideoRequest = text.toLowerCase().includes('vídeo') || 
                            text.toLowerCase().includes('video') || 
                            text.toLowerCase().includes('filme') ||
                            text.toLowerCase().includes('animação');

      if (isVideoRequest) {
        setMessages(prev => [...prev, { 
          role: 'model', 
          text: "Aqui está um prompt detalhado e profissional para você usar em ferramentas externas de geração de vídeo:\n\n" + 
          `"${text} [Cena cinematográfica de alta qualidade, 4k, realista] - Instrução de edição: Adicione uma legenda dinâmica profissional e o logotipo do meu aplicativo 'LucroNoVolante' inseridos de forma elegante no canto inferior da tela."` 
        }]);
        setIsLoading(false);
        return;
      } else if (isImageRequest) {
        // Image Generation
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nUsuário pediu: ${text}\n\nSiga estas DUAS instruções:\n1. GERE UMA IMAGEM de divulgação profissional para o LucroNoVolante baseada nesse pedido. Foco total em uma composição visual limpa, sem texto ou logotipo na imagem.\n2. GERE UM TEXTO ATRATIVO PARA PUBLICAR ABAIXO DA IMAGEM, em uma seção clara chamada "LEGENDA PARA PUBLICAR:".` }] }],
          config: {
            imageConfig: {
              aspectRatio: "1:1",
            }
          }
        });

        let imageUrl = '';
        let modelText = '';

        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          } else if (part.text) {
            modelText += part.text;
          }
        }

        if (!modelText) modelText = "Aqui está a imagem de divulgação que criei para você!";
        setMessages(prev => [...prev, { role: 'model', text: modelText, image: imageUrl }]);
      } else {
        // Text Generation (Chat)
        const history = messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            ...history,
            { role: 'user', parts: [{ text }] }
          ],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.7,
          }
        });

        const modelText = response.text || "Desculpe, não consegui gerar uma resposta agora.";
        setMessages(prev => [...prev, { role: 'model', text: modelText }]);
      }
    } catch (error: any) {
      console.error("Erro no Gemini:", error);
      let errorMessage = "Ocorreu um erro ao conectar com a inteligência artificial. Verifique sua conexão ou tente novamente mais tarde.";
      
      if (error?.message?.includes("GEMINI_API_KEY não configurada")) {
        errorMessage = "A chave de API (GEMINI_API_KEY) não foi configurada. Por favor, adicione-a nas configurações do projeto.";
      } else if (error?.message?.includes("API key not valid")) {
        errorMessage = "A chave de API do Gemini é inválida. Verifique se você a copiou corretamente.";
      } else if (error?.message?.includes("quota")) {
        errorMessage = "Limite de uso da IA atingido. Tente novamente em alguns instantes.";
      } else if (error?.message) {
        // Show the actual error message if it's descriptive
        errorMessage = `Erro na IA: ${error.message}`;
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: errorMessage 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!auth.currentUser || messages.length === 0) return;
    
    const title = messages[0].text.substring(0, 30) + '...';
    const newCampaign: AICampaign = {
      id: crypto.randomUUID?.() || Date.now().toString(),
      title,
      messages,
      createdAt: new Date().toISOString(),
    };

    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, { 
        aiCampaigns: arrayUnion(newCampaign)
      });
      alert('Campanha salva com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar campanha.');
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const shareToWhatsApp = (text: string) => {
    const link = window.location.origin;
    const fullText = `${text}\n\nConfira o app: ${link}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
    window.open(url, '_blank');
  };

  const shareToFacebook = (text: string) => {
    const link = window.location.origin;
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}&quote=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const copyForSocial = (text: string, platform: string) => {
    const link = window.location.origin;
    const fullText = `${text}\n\nLink do App: ${link}`;
    navigator.clipboard.writeText(fullText);
    alert(`Texto copiado para o ${platform}! Agora é só colar no seu post.`);
  };

  const downloadMedia = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Erro ao baixar mídia:", error);
      // Fallback for base64
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-2xl h-[85vh] rounded-[32px] shadow-2xl overflow-hidden relative z-10 flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <Sparkles className="text-white size-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">AI Video Studio</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Seu Diretor Criativo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowHistory(true)}
              className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all"
            >
              <FileText size={20} />
            </button>
            <button 
              onClick={handleSaveCampaign}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center gap-2 font-bold text-sm"
            >
              <Save size={18} />
              Salvar
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50"
        >
          {messages.length === 0 && (
            <div className="space-y-8 py-8">
              <div className="text-center space-y-4">
                <div className="inline-flex p-4 bg-blue-50 rounded-3xl mb-2">
                  <Bot className="text-blue-600 size-12" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Como posso te ajudar hoje?</h3>
                <p className="text-slate-500 max-w-sm mx-auto font-medium">
                  Eu posso criar roteiros, legendas e ideias de cenas para seus vídeos de divulgação.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s.prompt)}
                    className="p-4 bg-white border border-slate-100 rounded-2xl text-left hover:border-blue-200 hover:shadow-md transition-all group"
                  >
                    <div className="p-2 bg-slate-50 rounded-lg w-fit mb-3 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors text-slate-600">
                      {s.icon}
                    </div>
                    <p className="text-sm font-bold text-slate-800 leading-tight">{s.title}</p>
                    <ChevronRight className="size-4 text-slate-300 mt-2 group-hover:text-blue-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i}
              className={cn(
                "flex gap-4 max-w-[85%]",
                m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "size-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                m.role === 'user' ? "bg-slate-100" : "bg-blue-600"
              )}>
                {m.role === 'user' ? (
                  <MessageSquare className="size-4 text-slate-500" />
                ) : (
                  <Sparkles className="size-4 text-white" />
                )}
              </div>
              
              <div className="space-y-2">
                <div className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed relative group",
                  m.role === 'user' 
                    ? "bg-slate-900 text-white rounded-tr-none" 
                    : "bg-white border border-slate-100 text-slate-700 shadow-sm rounded-tl-none"
                )}>
                  {m.image && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-slate-100 shadow-inner bg-slate-50">
                      <img 
                        src={m.image} 
                        alt="AI Generated" 
                        className="w-full aspect-square object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  {m.video && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-slate-100 shadow-inner bg-slate-900 aspect-[9/16]">
                      <video 
                        src={m.video} 
                        controls 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="whitespace-pre-wrap font-medium">{m.text}</div>
                  
                  {m.role === 'model' && (
                    <div className="absolute -right-12 top-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyToClipboard(m.text, i)}
                        className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-slate-50"
                        title="Copiar texto"
                      >
                        {copiedIndex === i ? (
                          <Check className="size-4 text-emerald-500" />
                        ) : (
                          <Copy className="size-4 text-slate-400" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => shareToWhatsApp(m.text)}
                        className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                        title="Compartilhar no WhatsApp"
                      >
                        <Share2 className="size-4 text-slate-600" />
                      </button>

                      <button
                        onClick={() => shareToFacebook(m.text)}
                        className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Compartilhar no Facebook"
                      >
                        <Facebook className="size-4 text-slate-600" />
                      </button>

                      <button
                        onClick={() => copyForSocial(m.text, 'Instagram')}
                        className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-pink-50 hover:text-pink-600 transition-colors"
                        title="Copiar para Instagram"
                      >
                        <Instagram className="size-4 text-slate-600" />
                      </button>

                      <button
                        onClick={() => copyForSocial(m.text, 'TikTok')}
                        className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-slate-900 hover:text-white transition-colors"
                        title="Copiar para TikTok"
                      >
                        <Video className="size-4 text-slate-600" />
                      </button>

                      {(m.image || m.video) && (
                        <button
                          onClick={() => downloadMedia(m.image || m.video || '', m.image ? 'propaganda.png' : 'video.mp4')}
                          className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Baixar mídia"
                        >
                          <Download className="size-4 text-slate-600" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <div className="flex gap-4 mr-auto animate-pulse">
              <div className="size-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Sparkles className="size-4 text-blue-400" />
              </div>
              <div className="p-4 bg-white border border-slate-100 rounded-2xl rounded-tl-none w-32 h-12" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-slate-100">
          <div className="relative flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Peça um roteiro, legenda ou ideia..."
              className="flex-1 bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none transition-all pr-16"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={cn(
                "absolute right-2 p-3 rounded-xl transition-all",
                !input.trim() || isLoading
                  ? "text-slate-300"
                  : "text-blue-600 hover:bg-blue-50"
              )}
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-4 font-bold uppercase tracking-widest">
            Alimentado por Gemini AI • Criatividade Instantânea
          </p>
        </div>
      </motion.div>
    </div>
  );
}
