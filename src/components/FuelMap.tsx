import { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { Entry, Category } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Fuel, MapPin, Navigation, Maximize, Layers, Info } from 'lucide-react';
import { parseEntryDate, cn } from '../lib/utils';
import { getCategoryStyle } from '../lib/category-styles';

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

  const mappedEntries = useMemo(() => {
    return entries.filter(e => {
      const hasLoc = e.location || (e.gps && e.gps.includes(','));
      if (!hasLoc) return false;
      
      if (showOnlyFuel) {
        const cat = categories.find(c => c.id === e.categoriaId);
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
    if (mappedEntries.length > 0 && mappedEntries[0].location) {
      return [mappedEntries[0].location.lat, mappedEntries[0].location.lng];
    }
    return [-23.5505, -46.6333]; // Default to São Paulo
  }, [mappedEntries]);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-4 flex flex-col">
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

          {mappedEntries.map((entry) => {
            const cat = categories.find(c => c.id === entry.categoriaId);
            const style = getCategoryStyle(cat?.nome || '');
            
            return (
              <Marker 
                key={entry.id} 
                position={[entry.location!.lat, entry.location!.lng]}
              >
                <Popup>
                  <div className="p-1 min-w-[180px]">
                    <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                      <div className={cn("p-1.5 rounded-lg", style.bgColor, style.color)}>
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
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Valor:</span>
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
                    </div>

                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${entry.location!.lat},${entry.location!.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-200 transition-all"
                    >
                      <Navigation size={12} />
                      Abrir no Google Maps
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
    </div>
  );
}
