import { 
  Fuel, 
  Droplets, 
  Wrench, 
  Navigation, 
  ShieldCheck, 
  Utensils, 
  Droplet, 
  FileText, 
  MoreHorizontal,
  TrendingUp,
  Car,
  Smartphone,
  MapPin,
  Wallet,
  Disc,
  CircleDot,
  Wind,
  AirVent,
  Thermometer,
  Battery,
  Coins
} from 'lucide-react';
import { ReactNode } from 'react';

export interface CategoryStyle {
  icon: ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function getCategoryStyle(name: string): CategoryStyle {
  const normalized = name.toLowerCase();
  
  if (normalized.includes('abastecimento')) {
    return {
      icon: <Fuel size={20} />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100'
    };
  }
  
  if (normalized.includes('lavagem')) {
    return {
      icon: <Droplets size={20} />,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-100'
    };
  }
  
  if (normalized.includes('manutenção')) {
    return {
      icon: <Wrench size={20} />,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-100'
    };
  }
  
  if (normalized.includes('pedagio') || normalized.includes('pedágio')) {
    return {
      icon: <Navigation size={20} />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100'
    };
  }
  
  if (normalized.includes('seguro')) {
    return {
      icon: <ShieldCheck size={20} />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100'
    };
  }
  
  if (normalized.includes('alimentação')) {
    return {
      icon: <Utensils size={20} />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-100'
    };
  }
  
  if (normalized.includes('oleo') || normalized.includes('óleo')) {
    return {
      icon: <Droplet size={20} />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100'
    };
  }

  if (normalized.includes('pastilha') || normalized.includes('freio')) {
    return {
      icon: <Disc size={20} />,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100'
    };
  }

  if (normalized.includes('pneu') || normalized.includes('rodízio')) {
    return {
      icon: <CircleDot size={20} />,
      color: 'text-slate-800',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-200'
    };
  }

  if (normalized.includes('filtro de ar')) {
    return {
      icon: <Wind size={20} />,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-100'
    };
  }

  if (normalized.includes('filtro de cabine')) {
    return {
      icon: <AirVent size={20} />,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-100'
    };
  }

  if (normalized.includes('arrefeicimento') || normalized.includes('líquido')) {
    return {
      icon: <Thermometer size={20} />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100'
    };
  }

  if (normalized.includes('bateria')) {
    return {
      icon: <Battery size={20} />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-100'
    };
  }
  
  if (normalized.includes('imposto')) {
    return {
      icon: <FileText size={20} />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100'
    };
  }

  if (normalized.includes('estacionamento')) {
    return {
      icon: <MapPin size={20} />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100'
    };
  }

  if (normalized.includes('financiamento')) {
    return {
      icon: <Wallet size={20} />,
      color: 'text-rose-500',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100'
    };
  }

  if (normalized.includes('uber')) {
    return {
      icon: <Car size={20} />,
      color: 'text-black',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-200'
    };
  }

  if (normalized.includes('99')) {
    return {
      icon: <Smartphone size={20} />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-100'
    };
  }

  if (normalized.includes('fechamento')) {
    return {
      icon: <TrendingUp size={20} />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100'
    };
  }

  if (normalized.includes('reembolso') || normalized.includes('ressarcimento') || normalized.includes('pedágio') || normalized.includes('pedagio')) {
    return {
      icon: <Coins size={20} />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100'
    };
  }
  
  return {
    icon: <MoreHorizontal size={20} />,
    color: 'text-slate-500',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100'
  };
}
