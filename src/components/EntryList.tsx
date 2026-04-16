import { useState, useMemo } from 'react';
import { 
  format, 
  parseISO, 
  isWithinInterval, 
  startOfDay, 
  endOfDay,
  subDays,
  isAfter,
  isBefore
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  TrendingUp, 
  TrendingDown, 
  Fuel, 
  Utensils, 
  Car, 
  Trash2,
  Calendar,
  ChevronRight,
  MapPin,
  Camera,
  QrCode,
  Edit2,
  Filter,
  X,
  Search,
  ChevronDown,
  Navigation
} from 'lucide-react';
import { cn, parseEntryDate } from '../lib/utils';
import { Entry, Category } from '../types';
import { getCategoryStyle } from '../lib/category-styles';
import { motion, AnimatePresence } from 'motion/react';

interface EntryListProps {
  entries: Entry[];
  categories: Category[];
  onDelete: (id: string) => void;
  onEdit: (entry: Entry) => void;
}

export default function EntryList({ entries, categories, onDelete, onEdit }: EntryListProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'Ganhos' | 'Despesa'>('all');
  const [filterCategoryId, setFilterCategoryId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredEntries = useMemo(() => {
    const filtered = entries.filter(entry => {
      // Type filter
      if (filterType !== 'all' && entry.tipo !== filterType) return false;

      // Category filter
      if (filterCategoryId !== 'all' && entry.categoriaId !== filterCategoryId) return false;

      // Date filter
      const entryDate = typeof entry.data === 'string' ? parseISO(entry.data) : (entry.data as any);
      if (startDate) {
        const start = startOfDay(parseISO(startDate));
        if (isBefore(entryDate, start)) return false;
      }
      if (endDate) {
        const end = endOfDay(parseISO(endDate));
        if (isAfter(entryDate, end)) return false;
      }

      // Search term (obs or category name)
      if (searchTerm) {
        const category = categories.find(c => c.id === entry.categoriaId);
        const searchLower = searchTerm.toLowerCase();
        const matchesObs = entry.obs?.toLowerCase().includes(searchLower);
        const matchesCat = category?.nome.toLowerCase().includes(searchLower);
        if (!matchesObs && !matchesCat) return false;
      }

      return true;
    });

    // Sort by createdAt descending (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.createdAt || a.data;
      const dateB = b.createdAt || b.data;
      return dateB.localeCompare(dateA);
    });
  }, [entries, filterType, filterCategoryId, startDate, endDate, searchTerm, categories]);

  const clearFilters = () => {
    setFilterType('all');
    setFilterCategoryId('all');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  const hasActiveFilters = filterType !== 'all' || filterCategoryId !== 'all' || startDate || endDate || searchTerm;

  return (
    <div className="space-y-4 text-slate-900">
      <div className="flex justify-between items-center px-2">
        <h2 className="font-black text-white text-lg tracking-tight">Histórico</h2>
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all border shadow-sm",
            isFilterOpen || hasActiveFilters
              ? "bg-blue-600 border-blue-600 text-white shadow-blue-900/20" 
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          )}
        >
          <Filter size={14} />
          Filtros
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por observação ou categoria..."
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Type */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Tipo</label>
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none cursor-pointer"
                >
                  <option value="all">Todos</option>
                  <option value="Ganhos">Ganhos</option>
                  <option value="Despesa">Despesas</option>
                </select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Categoria</label>
                <select 
                  value={filterCategoryId}
                  onChange={(e) => setFilterCategoryId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none cursor-pointer"
                >
                  <option value="all">Todas</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Início</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Fim</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-2 py-2 text-rose-600 text-xs font-black uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all"
              >
                <X size={14} />
                Limpar Filtros
              </button>
            )}
          </div>
        </motion.div>
      )}

      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="p-4 bg-white/10 rounded-full">
            <Calendar className="text-blue-200 size-10" />
          </div>
          <div>
            <h3 className="font-bold text-white">Nenhum lançamento encontrado</h3>
            <p className="text-sm text-blue-200">Tente ajustar seus filtros ou busca.</p>
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="mt-4 text-blue-600 font-bold text-sm underline"
              >
                Ver todos os lançamentos
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry, index) => {
          const category = categories.find(c => c.id === entry.categoriaId);
          const date = parseEntryDate(entry.data);
          const style = getCategoryStyle(entry.tipo === 'Ganhos' ? 'Fechamento do Dia' : (category?.nome || 'Outros'));
          
          return (
            <div 
              key={entry.id}
              onClick={() => setSelectedEntry(entry)}
              className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 group cursor-pointer hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.99]"
            >
              <div className={cn(
                "p-3 rounded-2xl shrink-0",
                style.bgColor,
                style.color
              )}>
                {style.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 truncate">
                      {entry.tipo === 'Ganhos' ? 'Fechamento do Dia' : category?.nome}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {format(date, "dd 'de' MMMM", { locale: ptBR })}
                      {entry.createdAt && (
                        <span className="ml-1 opacity-70">
                          • {entry.createdAt.split(' ')[1]}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-black text-sm",
                      entry.tipo === 'Ganhos' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {entry.tipo === 'Ganhos' ? '+' : '-'} {formatCurrency(entry.valor)}
                    </p>
                    {entry.km && (
                      <p className="text-[10px] font-bold text-slate-400">
                        {entry.km} km
                        {(() => {
                          // Find the chronologically previous entry that has KM
                          const nextWithKm = filteredEntries.slice(index + 1).find(e => e.km && e.km > 0);
                          if (nextWithKm && nextWithKm.km) {
                            const diff = entry.km - nextWithKm.km;
                            if (diff > 0) {
                              return (
                                <span className="text-blue-500 ml-1">
                                  (+{diff} km)
                                </span>
                              );
                            }
                          }
                          return null;
                        })()}
                      </p>
                    )}
                  </div>
                </div>
                
                {category?.nome.toLowerCase() === 'abastecimento' && (entry.combustivel || entry.quantidade || entry.bandeiraPosto) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entry.bandeiraPosto && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                        {entry.bandeiraPosto}
                      </span>
                    )}
                    {entry.combustivel && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                        {entry.combustivel}
                      </span>
                    )}
                    {entry.quantidade && (
                      <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-100">
                        {entry.quantidade} L/m³
                      </span>
                    )}
                    {entry.valorUnitario && (
                      <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-100">
                        {formatCurrency(entry.valorUnitario)}/un
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  {(entry.location || entry.gps) && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${entry.gps || (entry.location ? `${entry.location.lat},${entry.location.lng}` : '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase hover:text-blue-500 hover:underline transition-colors"
                    >
                      <MapPin size={10} />
                      {entry.endereco || entry.location?.address || "Localização Salva"}
                    </a>
                  )}
                  {entry.photoUrl && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingPhoto(entry.photoUrl!);
                      }}
                      className="flex items-center gap-1 text-[9px] font-bold text-blue-500 uppercase hover:underline"
                    >
                      <Camera size={10} />
                      Ver Foto
                    </button>
                  )}
                  {entry.qrCodeData && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 uppercase">
                      <QrCode size={10} />
                      Nota Lida
                    </div>
                  )}
                  {entry.linkNota && (
                    <a 
                      href={entry.linkNota}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-[9px] font-bold text-blue-500 uppercase hover:underline"
                    >
                      <QrCode size={10} />
                      Ver Nota
                    </a>
                  )}
                </div>

                {entry.obs && (
                  <p className="text-xs text-slate-500 mt-1 italic truncate">
                    "{entry.obs}"
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(entry);
                  }}
                  className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(entry.id);
                  }}
                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}

    {/* Photo Viewer Modal */}
    {viewingPhoto && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
        <button 
          onClick={() => setViewingPhoto(null)}
          className="absolute top-6 right-6 text-white p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"
        >
          <X size={24} />
        </button>
        <img 
          src={viewingPhoto} 
          alt="Comprovante" 
          className="max-w-full max-h-full rounded-2xl shadow-2xl"
          referrerPolicy="no-referrer"
        />
      </div>
    )}

    {/* Entry Details Modal */}
    <AnimatePresence>
      {selectedEntry && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedEntry(null)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-slate-900"
          >
            {/* Header */}
            <div className={cn(
              "p-6 flex justify-between items-start",
              selectedEntry.tipo === 'Ganhos' ? "bg-emerald-50" : "bg-rose-50"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-4 rounded-2xl shadow-sm",
                  getCategoryStyle(selectedEntry.tipo === 'Ganhos' ? 'Fechamento do Dia' : (categories.find(c => c.id === selectedEntry.categoriaId)?.nome || 'Outros')).bgColor,
                  getCategoryStyle(selectedEntry.tipo === 'Ganhos' ? 'Fechamento do Dia' : (categories.find(c => c.id === selectedEntry.categoriaId)?.nome || 'Outros')).color
                )}>
                  {getCategoryStyle(selectedEntry.tipo === 'Ganhos' ? 'Fechamento do Dia' : (categories.find(c => c.id === selectedEntry.categoriaId)?.nome || 'Outros')).icon}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    {selectedEntry.tipo === 'Ganhos' ? 'Fechamento do Dia' : categories.find(c => c.id === selectedEntry.categoriaId)?.nome}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {format(parseEntryDate(selectedEntry.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEntry(null)}
                className="p-2 bg-white/50 hover:bg-white rounded-full transition-all text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Value Card */}
              <div className={cn(
                "p-6 rounded-3xl flex flex-col items-center justify-center text-center border-2",
                selectedEntry.tipo === 'Ganhos' ? "bg-emerald-50/30 border-emerald-100" : "bg-rose-50/30 border-rose-100"
              )}>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Valor Total</span>
                <span className={cn(
                  "text-4xl font-black",
                  selectedEntry.tipo === 'Ganhos' ? "text-emerald-600" : "text-rose-600"
                )}>
                  {formatCurrency(selectedEntry.valor)}
                </span>
                {selectedEntry.createdAt && (
                  <span className="mt-2 text-[10px] font-bold text-slate-400 uppercase">
                    Registrado às {selectedEntry.createdAt.split(' ')[1]}
                  </span>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                {selectedEntry.km && (
                  <DetailItem 
                    label="Kilometragem" 
                    value={`${selectedEntry.km} km`} 
                    subValue={(() => {
                      const currentIndex = entries.findIndex(e => e.id === selectedEntry.id);
                      const sortedEntries = [...entries].sort((a, b) => {
                        const dateA = a.data + ' ' + (a.createdAt?.split(' ')[1] || '00:00:00');
                        const dateB = b.data + ' ' + (b.createdAt?.split(' ')[1] || '00:00:00');
                        return dateB.localeCompare(dateA);
                      });
                      const sortedIndex = sortedEntries.findIndex(e => e.id === selectedEntry.id);
                      const nextWithKm = sortedEntries.slice(sortedIndex + 1).find(e => e.km && e.km > 0);
                      if (nextWithKm && nextWithKm.km) {
                        const diff = selectedEntry.km! - nextWithKm.km;
                        if (diff > 0) return `+${diff} km rodados`;
                      }
                      return undefined;
                    })()}
                    icon={<Car size={16} />}
                  />
                )}
                {selectedEntry.combustivel && (
                  <DetailItem 
                    label="Combustível" 
                    value={selectedEntry.combustivel} 
                    icon={<Fuel size={16} />}
                  />
                )}
                {selectedEntry.quantidade && (
                  <DetailItem 
                    label="Quantidade" 
                    value={`${selectedEntry.quantidade} L/m³`} 
                    icon={<Navigation size={16} />}
                  />
                )}
                {selectedEntry.valorUnitario && (
                  <DetailItem 
                    label="Preço Unitário" 
                    value={formatCurrency(selectedEntry.valorUnitario)} 
                    icon={<TrendingDown size={16} />}
                  />
                )}
              </div>

              {/* Ganhos Breakdown */}
              {selectedEntry.tipo === 'Ganhos' && selectedEntry.ganhos && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Detalhamento por Plataforma</h4>
                  <div className="bg-slate-50 rounded-3xl p-4 space-y-3 border border-slate-100">
                    {Object.entries(selectedEntry.ganhos).map(([catId, val]) => {
                      const cat = categories.find(c => c.id === catId);
                      if (!val) return null;
                      return (
                        <div key={catId} className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-600">{cat?.nome || 'Outros'}</span>
                          <span className="text-sm font-black text-emerald-600">{formatCurrency(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Location */}
              {(selectedEntry.location || selectedEntry.gps) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Localização</h4>
                  <div className="bg-slate-50 rounded-3xl overflow-hidden border border-slate-100">
                    <div className="h-32 w-full relative">
                      <img 
                        src={`https://static-maps.yandex.ru/1.x/?lang=pt_BR&ll=${selectedEntry.gps?.split(',')[1].trim() || selectedEntry.location?.lng},${selectedEntry.gps?.split(',')[0].trim() || selectedEntry.location?.lat}&z=15&l=map&size=450,150&pt=${selectedEntry.gps?.split(',')[1].trim() || selectedEntry.location?.lng},${selectedEntry.gps?.split(',')[0].trim() || selectedEntry.location?.lat},pm2blm`}
                        alt="Mapa"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedEntry.gps || `${selectedEntry.location?.lat},${selectedEntry.location?.lng}`}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-all group"
                      >
                        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg group-hover:scale-105 transition-all">
                          <MapPin size={12} className="text-blue-600" />
                          Abrir no Google Maps
                        </div>
                      </a>
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-bold text-slate-600">
                        {selectedEntry.endereco || selectedEntry.location?.address || "Endereço não disponível"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {selectedEntry.photoUrl && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Comprovante</h4>
                    <button 
                      onClick={() => setViewingPhoto(selectedEntry.photoUrl!)}
                      className="w-full aspect-square rounded-3xl overflow-hidden border-2 border-slate-100 relative group"
                    >
                      <img src={selectedEntry.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                        <Camera className="text-white opacity-0 group-hover:opacity-100 transition-all" size={32} />
                      </div>
                    </button>
                  </div>
                )}
                {selectedEntry.obs && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Observações</h4>
                    <div className="bg-slate-50 rounded-3xl p-4 border border-slate-100 min-h-[100px]">
                      <p className="text-sm text-slate-600 italic leading-relaxed">
                        "{selectedEntry.obs}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => {
                  onEdit(selectedEntry);
                  setSelectedEntry(null);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Edit2 size={18} />
                Editar
              </button>
              <button 
                onClick={() => {
                  if (confirm('Deseja realmente excluir este lançamento?')) {
                    onDelete(selectedEntry.id);
                    setSelectedEntry(null);
                  }
                }}
                className="px-6 bg-white border border-slate-200 text-rose-600 py-4 rounded-2xl font-bold hover:bg-rose-50 transition-all active:scale-95"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </div>
  );
}

function DetailItem({ label, value, subValue, icon }: { label: string, value: string, subValue?: string, icon: React.ReactNode }) {
  return (
    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-1">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-black text-slate-700">{value}</span>
        {subValue && <span className="text-[9px] font-bold text-blue-500">{subValue}</span>}
      </div>
    </div>
  );
}
