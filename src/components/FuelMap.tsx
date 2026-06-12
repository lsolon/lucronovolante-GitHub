import { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { Entry, Category } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Fuel, MapPin, Navigation, Maximize, Layers, Info, ListFilter, X, ArrowDown } from 'lucide-react';
import { parseEntryDate, cn } from '../lib/utils';
import { getCategoryStyle } from '../lib/category-styles';

// --- (rest of the file content remains the same up to FuelMap component) ---

// Component to handle map view changes
function ChangeView({ center, bounds }: { center: [number, number], bounds?: L.LatLngBoundsExpression }) {
  const map = useMap();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (bounds) {
        map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        map.setView(center, map.getZoom());
      }
      map.invalidateSize();
    }, 300); // Wait for animation to finish

    return () => clearTimeout(timer);
  }, [center, bounds, map]);

  return null;
}

// Fix for default marker icon in Leaflet with React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface FuelMapProps {
  entries: Entry[];
  categories: Category[];
  activeTab: string;
}

export default function FuelMap({ entries, categories, activeTab }: FuelMapProps) {
  const [showOnlyFuel, setShowOnlyFuel] = useState(false);
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'price'>('price');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Ask for user location to calculate "nearest"
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location: ", error);
        }
      );
    }
  }, []);

  // Helper to calculate distance loosely (Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
  };

  const mappedEntries = useMemo(() => {
    return entries.filter(e => {
      const hasLoc = e.location || (e.gps && e.gps.includes(','));
      if (!hasLoc) return false;
      
      const cat = categories.find(c => c.id === e.categoriaId);
      
      if (showOnlyFuel) {
        return cat?.nome.toLowerCase() === 'abastecimento';
      }
      return true;
    }).map(e => {
      if (e.gps && !e.location) {
        const [lat, lng] = e.gps.split(',').map(Number);
        return { ...e, location: { lat, lng, address: e.endereco } };
      }
      return e;
    });
  }, [entries, categories, showOnlyFuel]);

  const mapCenter: [number, number] = useMemo(() => {
    if (userLocation) return [userLocation.lat, userLocation.lng];
    if (mappedEntries.length > 0 && mappedEntries[0].location) {
      return [mappedEntries[0].location.lat, mappedEntries[0].location.lng];
    }
    return [-23.5505, -46.6333]; // Default to São Paulo
  }, [mappedEntries, userLocation]);

  const mapBounds = useMemo(() => {
    if (mappedEntries.length === 0) return undefined;
    const points = mappedEntries.map(e => [e.location!.lat, e.location!.lng] as [number, number]);
    try {
      return L.latLngBounds(points);
    } catch (e) {
      console.error('Error calculating bounds', e);
      return undefined;
    }
  }, [mappedEntries]);

  // Derive unique stations/locations with pricing
  const stationsList = useMemo(() => {
    const validEntries = mappedEntries.filter(e => {
      const cat = categories.find(c => c.id === e.categoriaId);
      const catName = cat?.nome.toLowerCase() || '';
      return catName === 'abastecimento' || catName === 'alimentação' || catName === 'alimentacao';
    });
    
    const stations: any[] = [];
    
    // Process older entries first so newer ones can overwrite their prices/dates/locations
    const sortedEntries = [...validEntries].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    sortedEntries.forEach(entry => {
      if (!entry.location) return;
      
      const cat = categories.find(c => c.id === entry.categoriaId);
      const isFuel = cat?.nome.toLowerCase() === 'abastecimento';
      
      const pricePerLiter = isFuel ? (entry.valorUnitario || (entry.quantidade ? entry.valor / entry.quantidade : 0)) : 0;
      const name = entry.bandeiraPosto || entry.posto || (isFuel ? 'Posto Desconhecido' : 'Local Desconhecido');
      
      let distanceToUser = null;
      if (userLocation) {
        distanceToUser = calculateDistance(userLocation.lat, userLocation.lng, entry.location.lat, entry.location.lng);
      }
      
      // Find if this station already exists in our aggregated list
      const existingStationIndex = stations.findIndex((s: any) => {
         const distToExisting = calculateDistance(s.location.lat, s.location.lng, entry.location.lat, entry.location.lng);
         const isSameName = (s.name.toLowerCase() === name.toLowerCase()) && !name.includes('Desconhecido');
         
         // If it's the exact same name and within 1.5km, it's very likely the same station
         if (isSameName && distToExisting < 1.5) return true;
         // If it's within 150 meters (0.15km), group them regardless of slight name spelling diffs
         if (distToExisting < 0.15) return true;
         
         return false;
      });
      
      if (existingStationIndex >= 0) {
        const existing = stations[existingStationIndex];
        
        // Update price ONLY if the new entry actually gives us a valid price > 0
        if (pricePerLiter > 0) {
           existing.pricePerLiter = pricePerLiter;
        }
        
        // Update other info to be the most recent
        if (name !== 'Posto Desconhecido') existing.name = name;
        existing.lastUpdate = entry.createdAt;
        existing.location = entry.location;
        if (distanceToUser !== null) existing.distance = distanceToUser;
        
        // Accumulate ratings
        if (entry.ratings) {
           existing.ratingsTotal.servico += entry.ratings.servico || 0;
           existing.ratingsTotal.higiene += entry.ratings.higiene || 0;
           existing.ratingsTotal.atendimento += entry.ratings.atendimento || 0;
           
           if (entry.ratings.servico > 0) existing.ratingsCount.servico++;
           if (entry.ratings.higiene > 0) existing.ratingsCount.higiene++;
           if (entry.ratings.atendimento > 0) existing.ratingsCount.atendimento++;
        }
        
      } else {
        stations.push({
          id: entry.id,
          name: name,
          pricePerLiter: pricePerLiter,
          totalSpent: entry.valor,
          lastUpdate: entry.createdAt,
          location: entry.location,
          distance: distanceToUser,
          ratingsTotal: {
             servico: entry.ratings?.servico || 0,
             higiene: entry.ratings?.higiene || 0,
             atendimento: entry.ratings?.atendimento || 0
          },
          ratingsCount: {
             servico: (entry.ratings?.servico || 0) > 0 ? 1 : 0,
             higiene: (entry.ratings?.higiene || 0) > 0 ? 1 : 0,
             atendimento: (entry.ratings?.atendimento || 0) > 0 ? 1 : 0
          }
        });
      }
    });

    if (sortBy === 'price') {
      return stations.sort((a, b) => {
        if (!a.pricePerLiter) return 1;
        if (!b.pricePerLiter) return -1;
        return a.pricePerLiter - b.pricePerLiter;
      });
    } else {
      return stations.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }
  }, [mappedEntries, categories, userLocation, sortBy]);

  const formatCurrency = (value: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-4 flex flex-col mb-16">
      <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-xl mb-1">Mapa de Lançamentos</h2>
            <p className="text-sm opacity-80 font-medium">
              Visualize seus gastos e abastecimentos geograficamente.
            </p>
          </div>
          <div className="p-2 bg-white/10 backdrop-blur-md rounded-2xl">
            <MapPin size={24} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setShowOnlyFuel(false)}
          className={cn(
            "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
            !showOnlyFuel ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "bg-white text-slate-500 border border-slate-100"
          )}
        >
          Todos os Locais
        </button>
        <button
          onClick={() => setShowOnlyFuel(true)}
          className={cn(
            "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
            showOnlyFuel ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "bg-white text-slate-500 border border-slate-100"
          )}
        >
          Apenas Abastecimentos
        </button>
        <button
          onClick={() => setIsStationModalOpen(true)}
          className="px-4 py-2 bg-yellow-500 text-yellow-900 border-none rounded-full text-xs font-bold whitespace-nowrap shadow-md shadow-yellow-200 hover:bg-yellow-400 flex items-center gap-1"
        >
          <ListFilter size={14} />
          Locais Avaliados
        </button>
      </div>

      <div className="h-[450px] bg-slate-100 rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative z-0">
        <MapContainer 
          key={`map-${mappedEntries.length}-${activeTab}`}
          center={mapCenter} 
          zoom={13} 
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: '#f8fafc' }}
        >
          <ChangeView center={mapCenter} bounds={mapBounds} />
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <LayersControl position="topright">
            <LayersControl.BaseLayer name="Satélite">
              <TileLayer
                attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]}>
               <Popup>
                 <div className="font-bold text-slate-700">Sua Localização Atual</div>
               </Popup>
            </Marker>
          )}

          {mappedEntries.map((entry, idx) => {
            const cat = categories.find(c => c.id === entry.categoriaId);
            const style = getCategoryStyle(cat?.nome || '');
            
            return (
              <Marker 
                key={`${entry.id}-${idx}`} 
                position={[entry.location!.lat, entry.location!.lng]}
              >
                <Popup>
                  <div className="p-1 min-w-[180px]">
                    <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                       <div className={cn("p-1.5 rounded-lg shrink-0", style.bgColor, style.color)}>
                        {style.icon}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {format(parseEntryDate(entry.data), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        <p className="font-bold text-slate-800 leading-none">
                          {entry.bandeiraPosto || cat?.nome || 'Lançamento'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      {entry.combustivel && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Combustível:</span>
                          <span className="font-bold text-slate-700">{entry.combustivel}</span>
                        </div>
                      )}
                      
                      {/* Show Liters Price if available */}
                      {((entry.valorUnitario && entry.valorUnitario > 0) || (entry.quantidade && entry.quantidade > 0 && entry.valor > 0)) && (
                        <div className="flex justify-between text-xs bg-yellow-50 p-1 rounded font-bold text-yellow-800">
                           <span>Litro:</span>
                           <span>{formatCurrency(entry.valorUnitario || (entry.valor / (entry.quantidade || 1)))}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Valor Total:</span>
                        <span className="font-bold text-blue-600">{formatCurrency(entry.valor)}</span>
                      </div>
                      {entry.km && (
                        <div className="flex justify-between text-xs pt-1 border-t border-slate-50">
                          <span className="text-slate-500">Km:</span>
                          <span className="font-bold text-slate-600">{entry.km} km</span>
                        </div>
                      )}
                      {entry.obs && (
                        <div className="text-[10px] text-slate-500 italic mt-1 line-clamp-2">
                          "{entry.obs}"
                        </div>
                      )}
                      
                      {entry.ratings && (
                        <div className="mt-2 pt-2 border-t border-slate-50">
                           <p className="text-[10px] font-bold text-slate-400 mb-1">AVALIAÇÃO DO POSTO</p>
                           <div className="flex flex-col gap-0.5">
                             {entry.ratings.servico > 0 && <span className="text-[10px] flex justify-between"><span>Serviço:</span> <span className="text-yellow-500">{'★'.repeat(entry.ratings.servico)}</span></span>}
                             {entry.ratings.higiene > 0 && <span className="text-[10px] flex justify-between"><span>Higiene:</span> <span className="text-yellow-500">{'★'.repeat(entry.ratings.higiene)}</span></span>}
                             {entry.ratings.atendimento > 0 && <span className="text-[10px] flex justify-between"><span>Atend.:</span> <span className="text-yellow-500">{'★'.repeat(entry.ratings.atendimento)}</span></span>}
                           </div>
                        </div>
                      )}
                    </div>

                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${entry.location!.lat},${entry.location!.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-200 transition-all"
                    >
                      <Navigation size={12} />
                      Navegar até lá
                    </a>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-50 rounded-xl">
               <MapPin className="text-blue-600" size={18} />
             </div>
             <div>
               <h4 className="text-sm font-bold text-slate-700">Locais Mapeados</h4>
               <p className="text-xs text-slate-500">{mappedEntries.length} registros com coordenadas.</p>
             </div>
           </div>
           <div className="flex gap-2">
             {mappedEntries.length > 0 && (
               <button 
                 onClick={() => {
                   window.dispatchEvent(new Event('resize'));
                 }}
                 className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                 title="Ajustar Visualização"
               >
                 <Maximize size={18} />
               </button>
             )}
           </div>
         </div>
       </div>

       {/* Station Listing Modal */}
       {isStationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
               <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <MapPin className="text-blue-600" size={20} />
                    Ranking de Locais
                  </h3>
                  <p className="text-xs text-slate-500">
                    Histórico de postos e restaurantes
                  </p>
               </div>
              <button 
                onClick={() => setIsStationModalOpen(false)}
                className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"
               >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-3 bg-white border-b border-slate-100 shrink-0">
               <div className="flex gap-2">
                 <button 
                    onClick={() => setSortBy('price')}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
                      sortBy === 'price' ? "bg-yellow-500 text-yellow-950 shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                 >
                    Mais Baratos
                 </button>
                 <button 
                    onClick={() => setSortBy('distance')}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
                      sortBy === 'distance' ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                 >
                    Mais Próximos
                 </button>
               </div>
            </div>

            <div className="overflow-y-auto p-4 space-y-3 flex-1 bg-slate-50/50">
               {stationsList.length === 0 ? (
                 <div className="text-center py-10 text-slate-500">
                   <MapPin size={40} className="mx-auto text-slate-300 mb-3" />
                   <p className="text-sm font-medium">Nenhum local encontrado.</p>
                   <p className="text-xs mt-1">Lembre-se de registrar a localização<br/>quando adicionar um lançamento.</p>
                 </div>
               ) : (
                 stationsList.map((station, index) => (
                   <div key={`${station.id}-${index}`} className="bg-white border text-left border-slate-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
                     {index === 0 && sortBy === 'price' && station.pricePerLiter > 0 && (
                       <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                         Mais Barato
                       </div>
                     )}
                     <div className="flex justify-between items-start mb-2">
                       <div>
                         <h4 className="font-bold text-slate-800 text-sm">{station.name}</h4>
                         {/* Average rating calculation */}
                         {(() => {
                           const totalServico = station.ratingsTotal.servico;
                           const countServico = station.ratingsCount.servico;
                           const totalHigiene = station.ratingsTotal.higiene;
                           const countHigiene = station.ratingsCount.higiene;
                           const totalAtend = station.ratingsTotal.atendimento;
                           const countAtend = station.ratingsCount.atendimento;
                           
                           const hasAnyRating = countServico > 0 || countHigiene > 0 || countAtend > 0;
                           if (!hasAnyRating) return <p className="text-[10px] text-slate-400">Sem avaliações</p>;
                           
                           const avgScore = 
                             ((totalServico + totalHigiene + totalAtend) / 
                             ((countServico + countHigiene + countAtend) * 5)) * 5;
                             
                           return (
                             <div className="flex items-center gap-1 mt-0.5">
                               <span className="text-yellow-500 text-[12px]">{'★'.repeat(Math.round(avgScore))}{'☆'.repeat(5 - Math.round(avgScore))}</span>
                               <span className="text-[10px] text-slate-400 font-bold ml-1">{avgScore.toFixed(1)}</span>
                             </div>
                           );
                         })()}
                       </div>
                     </div>
                     
                     <div className="flex justify-between items-end mt-3">
                       <div className="space-y-1">
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                             <MapPin size={12} />
                             {station.distance !== null ? `${station.distance.toFixed(1)} km de você` : 'Distância indisp.'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Última atulização: {format(new Date(station.lastUpdate), "dd/MM/yy")}
                          </p>
                       </div>
                       
                       <div className="text-right">
                          <p className="text-[10px] font-medium text-slate-500 uppercase">{station.pricePerLiter > 0 ? "Preço/Litro" : "Gasto Total"}</p>
                          <p className={cn(
                            "text-xl font-black -mt-1", 
                            station.pricePerLiter > 0 ? "text-yellow-600" : "text-blue-600"
                          )}>
                            {station.pricePerLiter > 0 ? formatCurrency(station.pricePerLiter) : formatCurrency(station.totalSpent)}
                          </p>
                       </div>
                     </div>
                     
                     <div className="mt-4 pt-3 border-t border-slate-50 flex gap-2">
                        <a 
                          href={`https://www.google.com/maps/dir/?api=1&destination=${station.location!.lat},${station.location!.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-xl text-xs font-bold transition-colors"
                        >
                          Rota
                        </a>
                        <button 
                          onClick={() => {
                            // Close modal and focus map on this marker
                            setIsStationModalOpen(false);
                            // It will naturally focus if we had a dedicated state, but for now we just close
                          }}
                          className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-xl text-xs font-bold transition-colors"
                        >
                          Ver no Mapa
                        </button>
                     </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        </div>
       )}

    </div>
  );
}
