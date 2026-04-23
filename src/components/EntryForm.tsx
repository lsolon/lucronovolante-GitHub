import { useState, FormEvent, ReactNode, useMemo, useEffect, useRef, ChangeEvent } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Fuel, 
  Car, 
  Utensils, 
  Navigation, 
  MoreHorizontal,
  ChevronDown,
  Save,
  MapPin,
  AlertCircle,
  Camera,
  QrCode,
  X,
  CheckCircle2,
  Calendar,
  Star
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { auth } from '../firebase';
import { format } from 'date-fns';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { cn, compressImage } from '../lib/utils';
import { Entry, EntryType, Category } from '../types';
import { getCategoryStyle } from '../lib/category-styles';
import { GAS_STATIONS } from '../constants';
import { extractInvoiceDataFromImage, extractInvoiceDataFromText } from '../services/geminiService';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';

interface EntryFormProps {
  onSubmit: (entry: Omit<Entry, 'id'>) => void;
  categories: Category[];
  earningCategories: Category[];
  lastKm: number;
  entries: Entry[];
  initialData?: Entry;
}

export default function EntryForm({ onSubmit, categories, earningCategories, lastKm, entries, initialData }: EntryFormProps) {
  const [tipo, setTipo] = useState<EntryType>(initialData?.tipo || 'Ganhos');
  const [data, setData] = useState(() => {
    if (initialData?.data) {
      // Convert yyyy/MM/dd to yyyy-MM-dd for input type="date"
      return initialData.data.replace(/\//g, '-');
    }
    return format(new Date(), 'yyyy-MM-dd');
  });
  const [categoriaId, setCategoriaId] = useState(initialData?.categoriaId || '10'); // Default to Fechamento do Dia
  const [valor, setValor] = useState(initialData?.valor?.toString() || '');
  const [km, setKm] = useState(initialData?.km?.toString() || '');
  const [ganhos, setGanhos] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    earningCategories.forEach(cat => {
      initial[cat.id] = initialData?.ganhos?.[cat.id]?.toString() || '';
    });
    return initial;
  });
  const [obs, setObs] = useState(initialData?.obs || '');
  const [combustivel, setCombustivel] = useState(initialData?.combustivel || 'Gasolina');
  const [quantidade, setQuantidade] = useState(initialData?.quantidade?.toString() || '');
  const [valorUnitario, setValorUnitario] = useState(initialData?.valorUnitario?.toString() || '');
  const [bandeiraPosto, setBandeiraPosto] = useState(initialData?.bandeiraPosto || '');
  const [linkNota, setLinkNota] = useState(initialData?.linkNota || '');
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(() => {
    if (initialData?.location) return initialData.location;
    if (initialData?.gps) {
      const parts = initialData.gps.split(',');
      if (parts.length === 2) {
        return {
          lat: Number(parts[0].trim()),
          lng: Number(parts[1].trim()),
          address: initialData.endereco
        };
      }
    }
    return null;
  });
  
  // Star Ratings State
  const [ratingServico, setRatingServico] = useState(initialData?.ratings?.servico || 0);
  const [ratingHigiene, setRatingHigiene] = useState(initialData?.ratings?.higiene || 0);
  const [ratingAtendimento, setRatingAtendimento] = useState(initialData?.ratings?.atendimento || 0);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialData?.photoUrl || null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(initialData?.qrCodeData || null);
  const [isScanning, setIsScanning] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCategory = categories.find(c => c.id === categoriaId);
  const isAbastecimento = selectedCategory?.nome.toLowerCase() === 'abastecimento';
  const isAlimentacao = selectedCategory?.nome.toLowerCase() === 'alimentação' || selectedCategory?.nome.toLowerCase() === 'alimentacao';
  const isTrocaOleo = selectedCategory?.nome.toLowerCase() === 'troca de oleo' || selectedCategory?.nome.toLowerCase() === 'troca de óleo';
  const isMaintenance = selectedCategory?.nome.toLowerCase() === 'manutenção' || selectedCategory?.parentId === '3';
  const hasLocation = ['abastecimento', 'lavagem', 'manutenção', 'alimentação', 'alimentacao'].includes(selectedCategory?.nome.toLowerCase() || '') || selectedCategory?.parentId === '3';

  // Auto-get location if category supports it
  useEffect(() => {
    if (hasLocation && !location && !isGettingLocation) {
      handleGetLocation();
    }
  }, [categoriaId, hasLocation]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setIsGettingLocation(false);
      },
      (err) => {
        console.error('Error getting location', err);
        setIsGettingLocation(false);
      }
    );
  };

  const handlePhotoCapture = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setPhotoUrl(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const qrFileInputRef = useRef<HTMLInputElement>(null);

  const handleQrFileScan = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("qr-reader-hidden");
    html5QrCode.scanFile(file, true)
      .then(decodedText => {
        setQrCodeData(decodedText);
        setLinkNota(decodedText);
        // Clean up
        html5QrCode.clear();
      })
      .catch(err => {
        // If it's just "not found", show a friendly message
        if (err.toString().includes("No MultiFormat Readers")) {
          alert('Não foi possível encontrar um QR Code nesta imagem. Tente tirar uma foto mais nítida, certifique-se que o QR Code está centralizado e bem iluminado.');
        } else {
          console.error('Error scanning file:', err);
          alert('Ocorreu um erro ao processar a imagem. Tente novamente ou use a câmera ao vivo.');
        }
        html5QrCode.clear();
      });
  };

  const handleExtractFromImage = async () => {
    if (!photoUrl) return;
    const admins = ['leandrosolon@gmail.com', 'leandrosolon0@gmail.com'];
    if (!auth.currentUser?.email || !admins.includes(auth.currentUser.email)) {
      alert('Esta funcionalidade está disponível apenas para o administrador.');
      return;
    }
    setIsExtracting(true);
    try {
      const data = await extractInvoiceDataFromImage(photoUrl);
      if (data) {
        applyExtractedData(data);
      } else {
        alert('Não foi possível extrair os dados desta imagem. Tente uma foto mais nítida.');
      }
    } catch (error: any) {
      console.error('Error extracting from image:', error);
      const message = error?.message || '';
      if (message.includes('GEMINI_API_KEY')) {
        alert('A chave de API do Gemini não está configurada. Por favor, adicione-a nas configurações do projeto.');
      } else {
        alert(`Erro ao processar imagem: ${message || 'Ocorreu um erro ao conectar com a IA. Verifique sua conexão.'}`);
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractFromUrl = async (url: string) => {
    if (!url) return;
    const admins = ['leandrosolon@gmail.com', 'leandrosolon0@gmail.com'];
    if (!auth.currentUser?.email || !admins.includes(auth.currentUser.email)) {
      alert('Esta funcionalidade está disponível apenas para o administrador.');
      return;
    }
    setIsExtracting(true);
    try {
      // Use local API proxy to avoid CORS and Firebase Function dependency
      const apiUrl = `/api/fetch-url?url=${encodeURIComponent(url)}`;
      console.log('Attempting to fetch invoice from:', apiUrl);
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let errorMsg = `Erro de Servidor (${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // Not JSON
        }
        throw new Error(errorMsg);
      }
      
      const html = await response.text();
      console.log('Fetched HTML length:', html?.length);
      
      if (!html || html.length < 50) {
        throw new Error('O conteúdo da nota retornou vazio. O site pode estar bloqueando o acesso.');
      }

      const data = await extractInvoiceDataFromText(html);
      if (data) {
        applyExtractedData(data);
      } else {
        alert('A IA não conseguiu encontrar os dados na página da nota. Tente tirar uma foto da nota física.');
      }
    } catch (error: any) {
      console.error('Detailed extraction error:', error);
      const message = error?.message || 'Erro desconhecido';
      
      if (message.includes('GEMINI_API_KEY')) {
        alert('A chave de API do Gemini não está configurada. Por favor, adicione-a nas configurações do projeto (Secrets).');
      } else if (message.includes('vazio') || message.includes('bloqueando')) {
        alert('Não foi possível ler o conteúdo deste link. Alguns sites de notas fiscais (SEFAZ) bloqueiam o acesso automático por segurança. Por favor, use a opção de "Anexar Foto da Nota".');
      } else {
        alert(`Erro ao processar nota: ${message}`);
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const applyExtractedData = (data: any) => {
    if (data.valorTotal) setValor(data.valorTotal.toString());
    if (data.valorUnitario) setValorUnitario(data.valorUnitario.toString());
    if (data.quantidade) setQuantidade(data.quantidade.toString());
    if (data.combustivel) {
      const normalized = data.combustivel.toLowerCase();
      if (normalized.includes('gasolina')) setCombustivel('Gasolina');
      else if (normalized.includes('etanol') || normalized.includes('alcool')) setCombustivel('Etanol');
      else if (normalized.includes('gnv')) setCombustivel('GNV');
    }
    if (data.posto) {
      const found = GAS_STATIONS.find(p => data.posto.toLowerCase().includes(p.toLowerCase()));
      if (found) setBandeiraPosto(found);
    }
    if (data.data) {
      setData(data.data);
    }
  };

  const [isScannerLoading, setIsScannerLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(err => console.warn('Error stopping scanner on unmount', err));
      }
    };
  }, []);

  const stopScanner = async () => {
    setIsScannerLoading(false);
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.warn('Error stopping scanner', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const startScanner = async () => {
    if (scannerRef.current) {
      await stopScanner();
    }
    
    // Check if browser supports camera
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Seu navegador não suporta acesso à câmera. Tente usar um navegador mais moderno ou use a opção de anexo de arquivo.');
      return;
    }

    setIsScanning(true);
    setIsScannerLoading(true);
    
    // Wait for the DOM element to be available and rendered
    setTimeout(async () => {
      const qrReaderElement = document.getElementById("qr-reader");
      if (!qrReaderElement) {
        console.error('QR Reader element not found');
        setIsScanning(false);
        setIsScannerLoading(false);
        return;
      }

      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;
        
        const config = { 
          fps: 15, 
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.75);
            return {
              width: qrboxSize,
              height: qrboxSize
            };
          },
          aspectRatio: 1.0
        };

        // Try to start with environment camera
        try {
          await html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            (decodedText) => {
              setQrCodeData(decodedText);
              setLinkNota(decodedText);
              stopScanner();
              // Removed automatic extraction to avoid errors with SEFAZ blocking
            },
            (errorMessage) => {
              // This is called for every frame where a QR code is not detected
              // We don't want to show an error to the user here as it's normal
              // during the scanning process.
              if (errorMessage.includes("No MultiFormat Readers")) {
                // Ignore "not found" errors during live scanning
                return;
              }
              console.debug("QR Scan error:", errorMessage);
            }
          );
          // Camera started successfully
          setIsScannerLoading(false);
        } catch (startErr) {
          console.warn('Failed to start with environment mode, trying default camera', startErr);
          // Fallback: try to get any camera
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            // Try to find a back camera
            const backCamera = cameras.find(c => 
              c.label.toLowerCase().includes('back') || 
              c.label.toLowerCase().includes('traseira') ||
              c.label.toLowerCase().includes('rear') ||
              c.label.toLowerCase().includes('environment')
            );
            const cameraToUse = backCamera || cameras[cameras.length - 1]; // Usually the last one is the back camera on many devices
            
            await html5QrCode.start(
              cameraToUse.id,
              config,
              (decodedText) => {
                setQrCodeData(decodedText);
                setLinkNota(decodedText);
                stopScanner();
                // Removed automatic extraction to avoid errors with SEFAZ blocking
              },
              (errorMessage) => {
                if (errorMessage.includes("No MultiFormat Readers")) return;
                console.debug("QR Scan error:", errorMessage);
              }
            );
            setIsScannerLoading(false);
          } else {
            throw new Error('No cameras found');
          }
        }
      } catch (err: any) {
        console.error('Error starting scanner', err);
        setIsScannerLoading(false);
        let errorMessage = 'Não foi possível iniciar a câmera.';
        
        if (err?.message?.includes('Permission denied') || err?.name === 'NotAllowedError') {
          errorMessage = 'Permissão de câmera negada. Por favor, autorize o acesso à câmera nas configurações do seu navegador.';
        } else if (err?.message?.includes('NotFound') || err?.name === 'NotFoundError') {
          errorMessage = 'Nenhuma câmera encontrada no dispositivo.';
        } else if (err?.message?.includes('NotReadableError')) {
          errorMessage = 'A câmera está sendo usada por outro aplicativo ou aba.';
        }
        
        alert(errorMessage);
        setIsScanning(false);
      }
    }, 800); // Increased timeout for better reliability
  };

  const currentFormTotal = useMemo(() => {
    if (tipo === 'Despesa') return Number(valor) || 0;
    return Object.values(ganhos).reduce((acc: number, val) => acc + (Number(val) || 0), 0);
  }, [tipo, ganhos, valor]);

  const todayEarnings = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return entries
      .filter(e => e.tipo === 'Ganhos' && typeof e.data === 'string' && e.data.startsWith(today))
      .reduce((acc, curr) => acc + (curr.valor || 0), 0);
  }, [entries]);

  // Auto-calculate total value for fueling
  useEffect(() => {
    if (isAbastecimento && quantidade && valorUnitario) {
      const q = Number(quantidade.replace(',', '.'));
      const v = Number(valorUnitario.replace(',', '.'));
      if (!isNaN(q) && !isNaN(v)) {
        const total = q * v;
        setValor(total.toFixed(2));
      }
    }
  }, [isAbastecimento, quantidade, valorUnitario]);

  const lastEntryKm = useMemo(() => {
    const kmEntries = entries
      .filter(e => e.km)
      .sort((a, b) => {
        const dateA = a.data + ' ' + (a.createdAt?.split(' ')[1] || '00:00:00');
        const dateB = b.data + ' ' + (b.createdAt?.split(' ')[1] || '00:00:00');
        return dateB.localeCompare(dateA);
      });
    return kmEntries.length > 0 ? kmEntries[0].km : null;
  }, [entries]);

  const lastTrocaOleoKm = useMemo(() => {
    const oilEntries = entries.filter(e => {
      const cat = categories.find(c => c.id === e.categoriaId);
      const name = cat?.nome.toLowerCase();
      return (name === 'troca de oleo' || name === 'troca de óleo') && e.km;
    });
    return oilEntries.length > 0 ? oilEntries[0].km : null;
  }, [entries, categories]);

  const kmRodadoPreview = useMemo(() => {
    if (!km || !lastEntryKm) return null;
    const diff = Number(km) - lastEntryKm;
    return diff > 0 ? diff : null;
  }, [km, lastEntryKm]);

  const oilLifePreview = useMemo(() => {
    if (!isTrocaOleo || !km) return null;
    return Number(km) + 10000;
  }, [isTrocaOleo, km]);

  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (tipo === 'Despesa' && (isAbastecimento || isTrocaOleo || isMaintenance) && !km) {
      setFormError('O preenchimento do KM é obrigatório para este lançamento.');
      return;
    }

    if (!data) {
      setFormError('Por favor, selecione uma data.');
      return;
    }

    let entryValor = 0;
    const numericGanhos: Record<string, number> = {};

    if (tipo === 'Ganhos') {
      Object.entries(ganhos).forEach(([id, val]) => {
        const n = Number(val.toString().replace(',', '.'));
        if (!isNaN(n) && n > 0) {
          numericGanhos[id] = n;
          entryValor += n;
        }
      });
      
      if (entryValor <= 0) {
        setFormError('Por favor, insira pelo menos um valor de ganho.');
        return;
      }
    } else {
      const n = Number(valor.toString().replace(',', '.'));
      entryValor = isNaN(n) ? 0 : n;
      
      if (entryValor <= 0) {
        setFormError('Por favor, insira o valor da despesa.');
        return;
      }
    }

    const currentKmNum = Number(km.toString().replace(',', '.'));
    const validKm = isNaN(currentKmNum) ? undefined : (currentKmNum || undefined);
    const kmRodado = (lastEntryKm && validKm) ? (validKm - lastEntryKm) : undefined;

    const now = new Date();
    const formattedDate = data.replace(/-/g, '/'); // Convert yyyy-MM-dd back to yyyy/MM/dd
    const formattedCreatedAt = format(now, 'yyyy/MM/dd HH:mm:ss');

    const gps = location ? `${location.lat}, ${location.lng}` : undefined;
    const endereco = location?.address || undefined;

    const currentQty = isAbastecimento ? Number(quantidade.toString().replace(',', '.')) : undefined;
    const currentPrice = isAbastecimento ? Number(valorUnitario.toString().replace(',', '.')) : undefined;

    onSubmit({
      data: formattedDate,
      createdAt: initialData?.createdAt || formattedCreatedAt,
      tipo,
      categoriaId,
      valor: entryValor,
      km: validKm,
      kmRodado: initialData?.kmRodado || kmRodado,
      combustivel: isAbastecimento ? combustivel : undefined,
      quantidade: isNaN(currentQty as number) ? undefined : currentQty,
      valorUnitario: isNaN(currentPrice as number) ? undefined : currentPrice,
      bandeiraPosto: isAbastecimento ? bandeiraPosto : undefined,
      gps,
      endereco,
      photoUrl: photoUrl || undefined,
      qrCodeData: qrCodeData || undefined,
      linkNota: linkNota || undefined,
      ganhos: numericGanhos,
      obs,
      ratings: (isAbastecimento || isAlimentacao) ? {
        servico: ratingServico,
        higiene: ratingHigiene,
        atendimento: ratingAtendimento
      } : undefined
    });
  };

  const handleGanhosChange = (id: string, value: string) => {
    setGanhos(prev => ({ ...prev, [id]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-slate-900 pb-6">
      {/* Type Selector */}
      <div className="flex p-1.5 bg-slate-100 rounded-[22px] shadow-inner">
        <button
          type="button"
          onClick={() => {
            setTipo('Ganhos');
            setCategoriaId('10');
          }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[18px] font-black text-sm transition-all",
            tipo === 'Ganhos' ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <TrendingUp size={20} />
          Ganhos
        </button>
        <button
          type="button"
          onClick={() => {
            setTipo('Despesa');
            setCategoriaId('1');
          }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[18px] font-black text-sm transition-all",
            tipo === 'Despesa' ? "bg-white text-rose-600 shadow-md" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <TrendingDown size={20} />
          Despesas
        </button>
      </div>

      {/* Date Selector */}
      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Data do Lançamento</label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <Calendar className="text-blue-500" size={18} />
          </div>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-11 pr-4 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {formError && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="text-rose-600 size-5 shrink-0" />
          <p className="text-sm font-bold text-rose-700">{formError}</p>
        </div>
      )}

      {tipo === 'Ganhos' ? (
        <div className="space-y-4">
          {earningCategories.map(cat => (
            <InputGroup 
              key={cat.id}
              label={`Ganhos ${cat.nome}`} 
              value={ganhos[cat.id] || ''} 
              onChange={(v) => handleGanhosChange(cat.id, v)} 
              placeholder="R$ 0,00" 
              type="number"
              icon={cat.nome.toLowerCase() === 'uber' ? <Car className="text-slate-400" size={18} /> : <MoreHorizontal className="text-slate-400" size={18} />}
            />
          ))}

          {currentFormTotal > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="bg-blue-50 p-4 rounded-2xl flex justify-between items-center border border-blue-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Total do Lançamento</span>
                  <span className="text-lg font-black text-blue-800">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentFormTotal)}
                  </span>
                </div>
                <div className="text-right flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total do Dia</span>
                  <span className="text-sm font-bold text-slate-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(todayEarnings + currentFormTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Categoria</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                {getCategoryStyle(categories.find(c => c.id === categoriaId)?.nome || '').icon}
              </div>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-11 pr-10 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                {categories.filter(c => !c.parentId && c.nome !== 'Fechamento do Dia').map(parent => {
                  const children = categories.filter(c => c.parentId === parent.id);
                  if (children.length > 0) {
                    return (
                      <optgroup key={parent.id} label={parent.nome}>
                        <option value={parent.id}>{parent.nome} (Geral)</option>
                        {children.map(child => (
                          <option key={child.id} value={child.id}>{child.nome}</option>
                        ))}
                      </optgroup>
                    );
                  }
                  return (
                    <option key={parent.id} value={parent.id}>
                      {parent.nome}
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>
          <InputGroup 
            label="Valor da Despesa" 
            value={valor} 
            onChange={setValor} 
            placeholder="R$ 0,00" 
            type="number"
            icon={<TrendingDown className="text-slate-400" size={18} />}
            disabled={isAbastecimento}
          />

          {isAbastecimento && (
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Selecionar Posto</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Fuel className="text-blue-500" size={18} />
                  </div>
                  <select
                    value={bandeiraPosto}
                    onChange={(e) => setBandeiraPosto(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-11 pr-10 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Selecione o Posto</option>
                    {GAS_STATIONS.map(posto => (
                      <option key={posto} value={posto}>
                        {posto}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Tipo de Combustível</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Gasolina', 'Etanol', 'GNV'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCombustivel(type)}
                      className={cn(
                        "py-4 px-2 rounded-2xl text-xs font-black border-2 transition-all",
                        combustivel === type 
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                          : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <InputGroup 
                  label="Quantidade (L/m³)" 
                  value={quantidade} 
                  onChange={setQuantidade} 
                  placeholder="0,00" 
                  type="number"
                />
                <InputGroup 
                  label="Valor Unitário" 
                  value={valorUnitario} 
                  onChange={setValorUnitario} 
                  placeholder="R$ 0,00" 
                  type="number"
                />
              </div>
              
              {(quantidade && valorUnitario) && (
                <div className="bg-blue-50 p-3 rounded-xl flex justify-between items-center border border-blue-100">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Total Calculado</span>
                  <span className="font-black text-blue-800">R$ {valor}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={startScanner}
                  disabled={isExtracting}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all disabled:opacity-50"
                >
                  {isExtracting ? <Loader2 className="animate-spin" size={16} /> : <QrCode size={16} />}
                  Ler QR Code
                </button>
                <button
                  type="button"
                  onClick={() => qrFileInputRef.current?.click()}
                  disabled={isExtracting}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  <QrCode size={16} />
                  QR de Arquivo
                </button>
                
                {photoUrl ? (
                  <button
                    type="button"
                    onClick={handleExtractFromImage}
                    disabled={isExtracting}
                    className="col-span-2 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-100 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Extraindo dados...
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        Mágica: Extrair Dados da Foto
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExtracting}
                    className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    <Camera size={16} />
                    Anexar Foto da Nota
                  </button>
                )}

                {linkNota && !isExtracting && (
                  <button
                    type="button"
                    onClick={() => handleExtractFromUrl(linkNota)}
                    className="col-span-2 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                  >
                    <Wand2 size={16} />
                    Reprocessar Link da Nota
                  </button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoCapture} 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                />
                <input 
                  type="file" 
                  ref={qrFileInputRef} 
                  onChange={handleQrFileScan} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <InputGroup 
                label="Link da Nota (QR Code)" 
                value={linkNota} 
                onChange={setLinkNota} 
                placeholder="https://..." 
                icon={<QrCode className="text-slate-400" size={18} />}
              />

              {/* Hidden div for file scanning */}
              <div id="qr-reader-hidden" className="hidden"></div>

              {isScanning && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center p-4">
                  <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-[70]">
                    <div className="flex flex-col">
                      <h3 className="text-white font-bold">Scanner de Nota</h3>
                      <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">Aponte para o QR Code</p>
                    </div>
                    <button 
                      onClick={stopScanner}
                      className="text-white p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className="relative w-full max-w-sm aspect-square overflow-hidden rounded-3xl border-2 border-white/20 bg-slate-900 shadow-2xl">
                    <div id="qr-reader" className="w-full h-full bg-black min-h-[300px]"></div>
                    
                    {isScannerLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
                        <Loader2 className="size-12 text-blue-500 animate-spin mb-4" />
                        <p className="text-white font-bold mb-6">Iniciando Câmera...</p>
                        <button 
                          onClick={() => {
                            stopScanner();
                            setTimeout(startScanner, 300);
                          }}
                          className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20 transition-all"
                        >
                          Tentar Novamente
                        </button>
                      </div>
                    )}

                    {/* Scanning Animation Overlay */}
                    {!isScannerLoading && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        <div className="w-64 h-64 border-2 border-blue-500/50 rounded-2xl relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.8)] animate-scan-line"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex flex-col items-center gap-4">
                    <p className="text-white/80 text-sm text-center max-w-[250px]">
                      Mantenha o QR Code centralizado e bem iluminado.
                    </p>
                    
                    <div className="flex flex-col gap-3 w-full max-w-[250px]">
                      <button
                        type="button"
                        onClick={() => {
                          stopScanner();
                          fileInputRef.current?.click();
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-all border border-white/10"
                      >
                        <Camera size={20} />
                        Tirar Foto da Nota
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          stopScanner();
                          qrFileInputRef.current?.click();
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-all border border-white/10"
                      >
                        <QrCode size={20} />
                        Escolher da Galeria
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {qrCodeData && (
                <div className="bg-emerald-50 p-3 rounded-xl flex items-center gap-2 border border-emerald-100">
                  <CheckCircle2 className="text-emerald-600" size={16} />
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Nota Lida com Sucesso</span>
                </div>
              )}

              {photoUrl && (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                  <img src={photoUrl} alt="Nota Fiscal" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setPhotoUrl(null)}
                    className="absolute top-1 right-1 bg-black/50 text-white p-0.5 rounded-full"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4 pt-2 border-t border-slate-100">
        <div className={cn(
          "p-3 rounded-xl flex justify-between items-center border transition-all",
          location ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
        )}>
          <div className="flex items-center gap-2">
            <MapPin className={location ? "text-emerald-600" : "text-slate-400"} size={16} />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              location ? "text-emerald-700" : "text-slate-500"
            )}>
              {isGettingLocation ? "Obtendo Localização..." : (location ? "Localização Salva" : "Localização não obtida")}
            </span>
          </div>
          <button 
            type="button" 
            onClick={handleGetLocation}
            className="text-[10px] font-black text-blue-600 underline uppercase"
          >
            {location ? "Atualizar" : "Obter Agora"}
          </button>
        </div>

        <InputGroup 
          label="Km Atual" 
          value={km} 
          onChange={setKm} 
          placeholder={lastKm > 0 ? `Ex: ${lastKm}` : "Digite o KM atual"} 
          type="number"
          icon={<Car className="text-slate-400" size={18} />}
        />
        
        {kmRodadoPreview !== null && (
          <div className="bg-blue-600 p-4 rounded-2xl flex justify-between items-center shadow-lg shadow-blue-100 border border-blue-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Navigation className="text-white" size={18} />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Km desde o último abastecimento</span>
            </div>
            <span className="text-xl font-black text-white">{kmRodadoPreview} km</span>
          </div>
        )}

        {oilLifePreview !== null && (
          <div className="bg-emerald-50 p-3 rounded-xl flex justify-between items-center border border-emerald-100">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Próxima Troca (Estimada)</span>
            <span className="font-black text-emerald-800">{oilLifePreview} km</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
            Observações {selectedCategory ? `de ${selectedCategory.nome}` : ''}
          </label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder={isAbastecimento ? "Ex: Abasteci no Posto Shell, combustível de boa qualidade..." : "Ex: Detalhes sobre este lançamento..."}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[80px]"
          />
        </div>

        {(isAbastecimento || isAlimentacao) && (
          <div className="space-y-3 bg-yellow-50 border border-yellow-100 p-4 rounded-2xl mt-4">
             <label className="text-xs font-bold text-yellow-800 uppercase tracking-wider ml-1">
               Avaliação do {isAlimentacao ? 'Local' : 'Posto'} (Opcional)
             </label>
             <div className="space-y-2">
                <StarRating label={`Serviço ${isAlimentacao ? '(Comida/Preço)' : '(Gasolina/Bomba)'}`} value={ratingServico} onChange={setRatingServico} />
                <StarRating label={`Higiene ${isAlimentacao ? '(Mesas/Banheiro)' : '(Banheiros/Loja)'}`} value={ratingHigiene} onChange={setRatingHigiene} />
                <StarRating label={`Atendimento ${isAlimentacao ? '(Garçom/Caixa)' : '(Frentista)'}`} value={ratingAtendimento} onChange={setRatingAtendimento} />
             </div>
          </div>
        )}

        {location && (
          <div className="space-y-1.5 mt-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Localização Geográfica</label>
            <div className="h-32 w-full rounded-2xl overflow-hidden border border-slate-200 relative z-0">
              <img 
                src={`https://static-maps.yandex.ru/1.x/?lang=pt_BR&ll=${location.lng},${location.lat}&z=15&l=map&size=450,150&pt=${location.lng},${location.lat},pm2blm`}
                alt="Mapa de Localização"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                <span className="text-[10px] font-bold text-white drop-shadow-md truncate max-w-[70%]">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
                <Navigation size={12} className="text-white drop-shadow-md" />
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        className={cn(
          "w-full py-4 rounded-2xl text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
          tipo === 'Ganhos' ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200" : "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
        )}
      >
        <Save size={20} />
        {initialData ? 'Atualizar Lançamento' : 'Salvar Lançamento'}
      </button>
    </form>
  );
}

interface InputGroupProps {
  key?: string | number;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

function InputGroup({ label, value, onChange, placeholder, type = "text", icon, disabled }: InputGroupProps) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pr-4 text-base font-bold text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all",
            icon ? "pl-11" : "pl-5",
            disabled && "opacity-60 cursor-not-allowed bg-slate-100"
          )}
        />
      </div>
    </div>
  );
}

function StarRating({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="flex justify-between items-center py-1">
       <span className="text-xs font-bold text-slate-700">{label}</span>
       <div className="flex gap-1">
         {[1, 2, 3, 4, 5].map((star) => (
           <button
             key={star}
             type="button"
             className="focus:outline-none focus:scale-110 transition-transform p-0.5"
             onClick={() => onChange(star === value ? 0 : star)}
           >
             <Star 
                size={18} 
                className={cn(
                  "transition-colors",
                  star <= value ? "fill-yellow-500 text-yellow-500" : "text-slate-300"
                )} 
             />
           </button>
         ))}
       </div>
    </div>
  )
}

