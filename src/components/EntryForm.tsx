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
  Star,
  Coins,
  Check
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { auth } from '../firebase';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { cn, compressImage, parseEntryDate } from '../lib/utils';
import { Entry, EntryType, Category, FixedCost } from '../types';
import { getCategoryStyle } from '../lib/category-styles';
import { GAS_STATIONS } from '../constants';
import { extractInvoiceDataFromImage, extractInvoiceDataFromText } from '../services/geminiService';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';

interface EntryFormProps {
  onSubmit: (entry: Omit<Entry, 'id'> | Omit<Entry, 'id'>[]) => void;
  categories: Category[];
  earningCategories: Category[];
  refundCategories: Category[];
  lastKm: number;
  entries: Entry[];
  initialData?: Entry;
  fixedCosts: FixedCost[];
}

export default function EntryForm({ onSubmit, categories, earningCategories, refundCategories, lastKm, entries, initialData, fixedCosts }: EntryFormProps) {
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
  const [km, setKm] = useState(initialData?.km?.toString() || (lastKm > 0 ? lastKm.toString() : ''));
  const [ganhos, setGanhos] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    earningCategories.forEach(cat => {
      initial[cat.id] = initialData?.ganhos?.[cat.id]?.toString() || '';
    });
    return initial;
  });
  const [reembolsos, setReembolsos] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    refundCategories.forEach(cat => {
      initial[cat.id] = initialData?.reembolsos?.[cat.id]?.toString() || '';
    });
    return initial;
  });
  const [showRefunds, setShowRefunds] = useState(() => {
    return !!initialData?.reembolsos && Object.values(initialData.reembolsos).some(v => Number(v) > 0);
  });
  const [obs, setObs] = useState(initialData?.obs || '');
  const [combustivel, setCombustivel] = useState(initialData?.combustivel || 'Gasolina');
  const [quantidade, setQuantidade] = useState(initialData?.quantidade?.toString() || '');
  const [valorUnitario, setValorUnitario] = useState(initialData?.valorUnitario?.toString() || '');
  const [tanqueVazio, setTanqueVazio] = useState<boolean>(initialData?.tanqueVazio || false);
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
  const [referenciaMes, setReferenciaMes] = useState(initialData?.referenciaMes || format(new Date(), 'yyyy-MM'));
  const [isScanning, setIsScanning] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const months = useMemo(() => {
    const list = [];
    const base = new Date();
    // Show 3 months before and 3 months after
    for (let i = -3; i <= 3; i++) {
      list.push(format(addMonths(base, i), 'yyyy-MM'));
    }
    return list;
  }, []);

  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState('2');
  const [installmentDueDate, setInstallmentDueDate] = useState('10');
  const [startNextMonth, setStartNextMonth] = useState(false);
  
  const [isMaintenanceItem, setIsMaintenanceItem] = useState(false);
  const [maintenanceItemName, setMaintenanceItemName] = useState('');
  const [garantiaKm, setGarantiaKm] = useState('');
  const [garantiaMeses, setGarantiaMeses] = useState('');

  const selectedCategory = categories.find(c => c.id === categoriaId);
  const isAbastecimento = selectedCategory?.nome.toLowerCase() === 'abastecimento';
  const isAlimentacao = selectedCategory?.nome.toLowerCase() === 'alimentação' || selectedCategory?.nome.toLowerCase() === 'alimentacao';
  
  const isFixedCost = useMemo(() => {
    if (tipo !== 'Despesa') return false;
    const catName = selectedCategory?.nome.toLowerCase().trim() || '';
    const observation = obs.toLowerCase().trim();
    return fixedCosts.some(fc => {
        const fcItem = fc.item.toLowerCase().trim();
        return catName === fcItem || observation === fcItem;
    });
  }, [tipo, selectedCategory, obs, fixedCosts]);

  const lastRefuelingKm = useMemo(() => {
    const fuelEntries = entries
      .filter(e => {
        const cat = categories.find(c => c.id === e.categoriaId);
        return cat?.nome.toLowerCase() === 'abastecimento' && e.km && e.km > 0;
      })
      .sort((a, b) => {
        const dateA = a.data + ' ' + (a.createdAt?.split(' ')[1] || '00:00:00');
        const dateB = b.data + ' ' + (b.createdAt?.split(' ')[1] || '00:00:00');
        return dateB.localeCompare(dateA);
      });

    if (initialData) {
      const idx = fuelEntries.findIndex(e => e.id === initialData.id);
      if (idx !== -1 && fuelEntries[idx + 1]) return fuelEntries[idx + 1].km as number;
      if (idx === -1 && fuelEntries.length > 0) return fuelEntries[0].km as number;
      return null;
    }
    
    return fuelEntries.length > 0 ? fuelEntries[0].km as number : null;
  }, [entries, categories, initialData]);
  
  const kmPlaceholder = tipo === 'Despesa' && lastRefuelingKm && lastRefuelingKm > 0 
    ? lastRefuelingKm.toString() 
    : (lastKm > 0 ? lastKm.toString() : "Digite o KM atual");

  const isTrocaOleo = selectedCategory?.nome.toLowerCase() === 'troca de oleo' || selectedCategory?.nome.toLowerCase() === 'troca de óleo';
  const isMaintenance = selectedCategory?.nome.toLowerCase() === 'manutenção' || selectedCategory?.parentId === '3';
  const hasLocation = ['abastecimento', 'lavagem', 'manutenção', 'alimentação', 'alimentacao'].includes(selectedCategory?.nome.toLowerCase() || '') || selectedCategory?.parentId === '3';

  // Auto-get location if category supports it
  useEffect(() => {
    if (hasLocation && !location && !isGettingLocation) {
      handleGetLocation();
    }
    
    if (tipo === 'Despesa') {
      setIsMaintenanceItem(isMaintenance || isTrocaOleo);
    } else {
      setIsMaintenanceItem(false);
    }
  }, [categoriaId, hasLocation, tipo, isMaintenance, isTrocaOleo]);

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
    if (auth.currentUser?.email !== 'leandrosolon@gmail.com') {
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
    if (auth.currentUser?.email !== 'leandrosolon@gmail.com') {
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
    const gTotal = Object.values(ganhos).reduce((acc: number, val) => acc + (Number(val) || 0), 0);
    const rTotal = showRefunds ? Object.values(reembolsos).reduce((acc: number, val) => acc + (Number(val) || 0), 0) : 0;
    return gTotal + rTotal;
  }, [tipo, ganhos, reembolsos, showRefunds, valor]);

  const todayEarnings = useMemo(() => {
    return entries
      .filter(e => {
        // Exclude the current entry being edited so we don't double count it
        if (initialData?.id && e.id === initialData.id) return false;
        if (e.tipo !== 'Ganhos' || !e.data) return false;
        
        // e.data is format yyyy/MM/dd, data is yyyy-MM-dd
        const eData = e.data.replace(/\//g, '-');
        return eData === data;
      })
      .reduce((acc, curr) => acc + (curr.valor || 0), 0);
  }, [entries, data, initialData?.id]);

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

  const kmRodadoPreview = useMemo(() => {
    if (!km || !lastRefuelingKm) return null;
    const diff = Number(km) - lastRefuelingKm;
    return diff > 0 ? diff : null;
  }, [km, lastRefuelingKm]);

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
    const numericReembolsos: Record<string, number> = {};

    if (tipo === 'Ganhos') {
      Object.entries(ganhos).forEach(([id, val]) => {
        const n = Number(val.toString().replace(',', '.'));
        if (!isNaN(n) && n > 0) {
          numericGanhos[id] = n;
          entryValor += n;
        }
      });

      if (showRefunds) {
        Object.entries(reembolsos).forEach(([id, val]) => {
          const n = Number(val.toString().replace(',', '.'));
          if (!isNaN(n) && n > 0) {
            numericReembolsos[id] = n;
            entryValor += n;
          }
        });
      }
      
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
    const kmRodado = (lastRefuelingKm && validKm) ? (validKm - lastRefuelingKm) : undefined;

    const now = new Date();
    const formattedDate = data.replace(/-/g, '/'); // Convert yyyy-MM-dd back to yyyy/MM/dd
    const formattedCreatedAt = format(now, 'yyyy/MM/dd HH:mm:ss');

    const gps = location ? `${location.lat}, ${location.lng}` : undefined;
    const endereco = location?.address || undefined;

    const currentQty = isAbastecimento ? Number(quantidade.toString().replace(',', '.')) : undefined;
    const currentPrice = isAbastecimento ? Number(valorUnitario.toString().replace(',', '.')) : undefined;

    const numGarantiaKm = Number(garantiaKm.replace(/\D/g, ''));
    const numGarantiaMeses = Number(garantiaMeses);

    if (tipo === 'Despesa' && isInstallment) {
      const count = Number(installmentsCount);
      if (count > 0 && entryValor > 0) {
        const entriesToSubmit = [];
        let baseDate = new Date(data.replace(/-/g, '/'));
        if (startNextMonth) {
          baseDate = addMonths(baseDate, 1);
        }
        
        const dueDay = parseInt(installmentDueDate, 10);
        if (!isNaN(dueDay)) {
          // Set to the target day, clamping to end of month if necessary
          const endOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
          baseDate.setDate(Math.min(dueDay, endOfMonth));
        }

        const installmentValue = entryValor / count;
        
        for (let i = 0; i < count; i++) {
          const installmentDate = addMonths(baseDate, i);
          if (!isNaN(dueDay)) {
            const endOfMonth = new Date(installmentDate.getFullYear(), installmentDate.getMonth() + 1, 0).getDate();
            installmentDate.setDate(Math.min(dueDay, endOfMonth));
          }
          const formattedInstDate = format(installmentDate, 'yyyy/MM/dd');
          
          entriesToSubmit.push({
            data: formattedInstDate,
            createdAt: initialData?.createdAt || formattedCreatedAt,
            tipo,
            categoriaId,
            valor: Number(installmentValue.toFixed(2)),
            km: i === 0 ? validKm : undefined,
            kmRodado: i === 0 ? (initialData?.kmRodado || kmRodado) : undefined,
            combustivel: isAbastecimento ? combustivel : undefined,
            tanqueVazio: i === 0 ? (isAbastecimento ? tanqueVazio : undefined) : undefined,
            quantidade: i === 0 ? (isNaN(currentQty as number) ? undefined : currentQty) : undefined,
            valorUnitario: i === 0 ? (isNaN(currentPrice as number) ? undefined : currentPrice) : undefined,
            bandeiraPosto: i === 0 ? (isAbastecimento ? bandeiraPosto : undefined) : undefined,
            gps: i === 0 ? gps : undefined,
            endereco: i === 0 ? endereco : undefined,
            photoUrl: i === 0 ? (photoUrl || undefined) : undefined,
            qrCodeData: i === 0 ? (qrCodeData || undefined) : undefined,
            linkNota: i === 0 ? (linkNota || undefined) : undefined,
            ganhos: undefined,
            obs: `${obs ? obs + ' - ' : ''}Parcela ${i + 1}/${count}`,
            referenciaMes: i === 0 ? referenciaMes : format(installmentDate, 'yyyy-MM'),
            garantiaKm: i === 0 && numGarantiaKm > 0 ? numGarantiaKm : undefined,
            garantiaMeses: i === 0 && numGarantiaMeses > 0 ? numGarantiaMeses : undefined,
            manutencaoItem: i === 0 && isMaintenanceItem ? (maintenanceItemName || 'Sim') : undefined,
            ratings: i === 0 ? ((isAbastecimento || isAlimentacao) ? {
              servico: ratingServico,
              higiene: ratingHigiene,
              atendimento: ratingAtendimento
            } : undefined) : undefined
          });
        }
        
        onSubmit(entriesToSubmit);
        return;
      }
    }

    onSubmit({
      data: formattedDate,
      createdAt: initialData?.createdAt || formattedCreatedAt,
      tipo,
      categoriaId,
      valor: entryValor,
      km: validKm,
      kmRodado: initialData?.kmRodado || kmRodado,
      combustivel: isAbastecimento ? combustivel : undefined,
      tanqueVazio: isAbastecimento ? tanqueVazio : undefined,
      quantidade: isNaN(currentQty as number) ? undefined : currentQty,
      valorUnitario: isNaN(currentPrice as number) ? undefined : currentPrice,
      bandeiraPosto: isAbastecimento ? bandeiraPosto : undefined,
      gps,
      endereco,
      photoUrl: photoUrl || undefined,
      qrCodeData: qrCodeData || undefined,
      linkNota: linkNota || undefined,
      ganhos: numericGanhos,
      reembolsos: showRefunds ? numericReembolsos : undefined,
      obs,
      referenciaMes: isFixedCost ? referenciaMes : undefined,
      garantiaKm: numGarantiaKm > 0 ? numGarantiaKm : undefined,
      garantiaMeses: numGarantiaMeses > 0 ? numGarantiaMeses : undefined,
      manutencaoItem: isMaintenanceItem ? (maintenanceItemName || 'Sim') : undefined,
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

  const handleRefundsChange = (id: string, value: string) => {
    setReembolsos(prev => ({ ...prev, [id]: value }));
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
      <div className={cn("grid gap-4", isFixedCost ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
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

        {isFixedCost && (
          <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Mês de Referência</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Calendar className="text-emerald-500" size={18} />
              </div>
              <select
                value={referenciaMes}
                onChange={(e) => setReferenciaMes(e.target.value)}
                className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl py-4 pl-11 pr-10 text-base font-bold text-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
              >
                {months.map(m => (
                  <option key={m} value={m}>
                    {format(new Date(m + '-02'), 'MMMM yyyy', { locale: ptBR })}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>
        )}
      </div>

      {formError && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="text-rose-600 size-5 shrink-0" />
          <p className="text-sm font-bold text-rose-700">{formError}</p>
        </div>
      )}

      {tipo === 'Ganhos' ? (
        <div className="space-y-4">
          {earningCategories.map((cat, idx) => (
            <InputGroup 
              key={`${cat.id}-${idx}`}
              label={`Ganhos ${cat.nome}`} 
              value={ganhos[cat.id] || ''} 
              onChange={(v) => handleGanhosChange(cat.id, v)} 
              placeholder="R$ 0,00" 
              type="number"
              icon={cat.nome.toLowerCase() === 'uber' ? <Car className="text-slate-400" size={18} /> : <MoreHorizontal className="text-slate-400" size={18} />}
            />
          ))}

          {/* Reembolso Toggle */}
          <div className="pt-2">
            <label className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer">
              <input 
                type="checkbox" 
                checked={showRefunds} 
                onChange={(e) => setShowRefunds(e.target.checked)} 
                className="rounded text-blue-600 focus:ring-blue-500/20 size-5 cursor-pointer"
              />
              <div>
                <p className="text-sm font-bold text-slate-700">Incluir Reembolsos / Ressarcimentos</p>
                <p className="text-[11px] text-slate-500">Registre valores de pedágio, combustível ou outras despesas reembolsadas</p>
              </div>
            </label>
          </div>

          {showRefunds && (
            <div className="space-y-4 p-5 bg-blue-50/40 rounded-3xl border border-blue-100/50 animate-in fade-in slide-in-from-top-2 duration-200">
              <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Coins size={14} /> Valores de Reembolso
              </h4>
              
              {refundCategories.map((cat, idx) => (
                <InputGroup 
                  key={`ref-${cat.id}-${idx}`}
                  label={cat.nome} 
                  value={reembolsos[cat.id] || ''} 
                  onChange={(v) => handleRefundsChange(cat.id, v)} 
                  placeholder="R$ 0,00" 
                  type="number"
                  icon={<Coins className="text-slate-400" size={18} />}
                />
              ))}
            </div>
          )}

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
                {categories.filter(c => !c.parentId && c.nome !== 'Fechamento do Dia').map((parent, idx) => {
                  const children = categories.filter(c => c.parentId === parent.id);
                  if (children.length > 0) {
                    return (
                      <optgroup key={`${parent.id}-${idx}`} label={parent.nome}>
                        <option key={`parent-geral-${parent.id}-${idx}`} value={parent.id}>{parent.nome} (Geral)</option>
                        {children.map((child, cIdx) => (
                          <option key={`${child.id}-${cIdx}`} value={child.id}>{child.nome}</option>
                        ))}
                      </optgroup>
                    );
                  }
                  return (
                    <option key={`${parent.id}-${idx}`} value={parent.id}>
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
            label="Valor Total da Despesa" 
            value={valor} 
            onChange={setValor} 
            placeholder="R$ 0,00" 
            type="number"
            icon={<TrendingDown className="text-slate-400" size={18} />}
            disabled={isAbastecimento}
          />
          
          {tipo === 'Despesa' && (
            <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/50 -mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isInstallment}
                  onChange={(e) => setIsInstallment(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                />
                <span className="text-sm font-bold text-slate-600">Dividir valor em parcelas mensais?</span>
              </label>
              
              {isInstallment && (
                <div className="flex flex-col gap-3 mt-2 animate-in fade-in zoom-in-95 pl-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Em quantas vezes?</span>
                    <input
                      type="number"
                      min="2"
                      max="48"
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(e.target.value)}
                      className="w-16 bg-white border border-slate-200 rounded-lg p-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="text-xs text-slate-400">vezes</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Dia do vencimento:</span>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={installmentDueDate}
                      onChange={(e) => setInstallmentDueDate(e.target.value)}
                      className="w-16 bg-white border border-slate-200 rounded-lg p-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input 
                      type="checkbox" 
                      checked={startNextMonth}
                      onChange={(e) => setStartNextMonth(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                    />
                    <span className="text-xs font-semibold text-slate-600">A primeira parcela será descontada no próximo mês?</span>
                  </label>
                  
                  <div className="text-xs text-slate-500 italic mt-1 bg-blue-50 p-2 rounded-lg border border-blue-100">
                    O app irá calcular automaticamente o valor de cada parcela: <br/>
                    <span className="font-bold text-blue-700">{installmentsCount}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((Number(valor) || 0) / (Number(installmentsCount) || 1))}</span>
                  </div>
                </div>
              )}
            </div>
          )}

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
                    <option key="empty-station" value="">Selecione o Posto</option>
                    {GAS_STATIONS.map((posto, idx) => (
                      <option key={`${posto}-${idx}`} value={posto}>
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
                  {['Gasolina', 'Etanol', 'GNV'].map((type, idx) => (
                    <button
                      key={`${type}-${idx}`}
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

              {/* Opção Marcar como Tanque Vazio */}
              <div 
                id="fuel-empty-tank-toggle"
                onClick={() => setTanqueVazio(!tanqueVazio)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none",
                  tanqueVazio 
                    ? "bg-amber-500/10 border-amber-300 shadow-sm" 
                    : "bg-slate-50 border-slate-200/80 hover:bg-slate-100/70"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0",
                    tanqueVazio ? "bg-amber-500 text-white shadow-sm" : "bg-white text-slate-400 border border-slate-200"
                  )}>
                    <Fuel size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-800">Abastecido com Tanque Vazio</span>
                      {tanqueVazio && (
                        <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-black rounded-full uppercase tracking-wider">
                          Reserva
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Marque se o veículo estava no final do tanque ou na reserva
                    </p>
                  </div>
                </div>
                
                <div className={cn(
                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ml-3 shrink-0",
                  tanqueVazio 
                    ? "bg-amber-500 border-amber-500 text-white shadow-sm" 
                    : "border-slate-300 bg-white"
                )}>
                  {tanqueVazio && <Check size={14} strokeWidth={3} />}
                </div>
              </div>

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
                    disabled={isExtracting || !!qrCodeData}
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
                    disabled={isExtracting || !!qrCodeData}
                    className={`col-span-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all ${qrCodeData ? 'bg-slate-100/50 text-slate-400 cursor-not-allowed' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50'}`}
                  >
                    <Camera size={16} />
                    {qrCodeData ? 'Foto Desabilitada (QR Code Lido)' : 'Anexar Foto da Nota'}
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
          placeholder={kmPlaceholder} 
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
            rows={2}
          />
        </div>

        {tipo === 'Despesa' && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 mt-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isMaintenanceItem}
                onChange={(e) => setIsMaintenanceItem(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
              />
              <span className="text-sm font-bold text-slate-700">Este é um item de manutenção ou possui garantia?</span>
            </label>
            
            {isMaintenanceItem && (
              <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 pl-6 pt-2 border-l-2 border-blue-100 ml-2">
                <span className="text-xs text-slate-500 italic pb-1">
                  Preencha os campos abaixo para acompanhar o tempo de uso ou a validade da garantia. O "Km Atual" precisa estar preenchido logo acima.
                </span>
                <div className="grid grid-cols-1 gap-3 mb-1">
                  <InputGroup 
                    label="Nome da Peça / Qual pneu (Opcional)" 
                    value={maintenanceItemName} 
                    onChange={setMaintenanceItemName} 
                    placeholder="Ex: Pneu Dianteiro Direito, Correia Dentada..." 
                    type="text"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <InputGroup 
                    label="Garantia/Troca em KM" 
                    value={garantiaKm} 
                    onChange={setGarantiaKm} 
                    placeholder="Ex: 10000" 
                    type="number"
                  />
                  <InputGroup 
                    label="Garantia/Troca (Meses)" 
                    value={garantiaMeses} 
                    onChange={setGarantiaMeses} 
                    placeholder="Ex: 12" 
                    type="number"
                  />
                </div>
              </div>
            )}
          </div>
        )}

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

