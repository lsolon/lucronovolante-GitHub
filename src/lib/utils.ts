import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseEntryDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr !== 'string') return new Date();
  
  // Handle yyyy/MM/dd or yyyy-MM-dd date-only strings to avoid UTC shifts
  const dateOnlyMatch = dateStr.match(/^(\d{4})[/-](\d{2})[/-](\d{2})(?:T| )?.*$/);
  if (dateOnlyMatch) {
    const year = parseInt(dateOnlyMatch[1], 10);
    const month = parseInt(dateOnlyMatch[2], 10) - 1;
    const day = parseInt(dateOnlyMatch[3], 10);
    return new Date(year, month, day);
  }

  // Handle dd/MM/yyyy or dd-MM-yyyy format 
  const brDateMatch = dateStr.match(/^(\d{2})[/-](\d{2})[/-](\d{4})(?:T| )?.*$/);
  if (brDateMatch) {
    const day = parseInt(brDateMatch[1], 10);
    const month = parseInt(brDateMatch[2], 10) - 1;
    const year = parseInt(brDateMatch[3], 10);
    return new Date(year, month, day);
  }

  return parseISO(dateStr);
}

export function cleanObject<T>(obj: T): T {
  if (obj === undefined || obj === null) return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObject(item)) as any;
  }

  // Only recurse into plain objects. 
  // Firestore sentinels (FieldValue) and other special objects should be left as is.
  if (typeof obj !== 'object' || obj.constructor !== Object) {
    return obj;
  }

  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    const val = (obj as any)[key];
    if (val !== undefined && val !== null) {
      newObj[key] = cleanObject(val);
    }
  });
  return newObj as T;
}

/**
 * Compresses a base64 image string to be under a certain size limit.
 * Firestore document limit is 1MB, so we aim for much less (e.g., 500KB).
 */
export async function compressImage(base64Str: string, maxWidth = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => resolve(base64Str);
  });
}

/**
 * Recursively truncates strings in an object if they exceed a certain length.
 * This is a safety measure for Firestore's 1MB limit.
 */
export function truncateLargeFields<T>(obj: T, maxLength = 500000): T {
  if (!obj || typeof obj !== 'object') return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => truncateLargeFields(item, maxLength)) as any;
  }

  // Only recurse into plain objects. 
  // Firestore sentinels (FieldValue) and other special objects should be left as is.
  if (obj.constructor !== Object) {
    return obj;
  }

  const newObj = { ...obj };

  Object.keys(newObj).forEach(key => {
    const val = (newObj as any)[key];
    if (typeof val === 'string' && val.length > maxLength && key !== 'photoUrl') {
      console.warn(`Field "${key}" truncated because it exceeded ${maxLength} characters.`);
      (newObj as any)[key] = val.substring(0, maxLength) + '... [TRUNCATED]';
    } else if (typeof val === 'object' && val !== null) {
      (newObj as any)[key] = truncateLargeFields(val, maxLength);
    }
  });

  return newObj as T;
}

/**
 * Converte string de tempo (ex: "06:30", "6h30", "6.5", "6h 30m") em minutos totais.
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const str = timeStr.trim();
  if (str.includes(':')) {
    const [h, m] = str.split(':').map(v => parseInt(v, 10) || 0);
    return (h * 60) + m;
  }
  const hMatch = str.match(/(\d+)\s*h/i);
  const mMatch = str.match(/(\d+)\s*m/i);
  if (hMatch || mMatch) {
    const h = hMatch ? parseInt(hMatch[1], 10) : 0;
    const m = mMatch ? parseInt(mMatch[1], 10) : 0;
    return (h * 60) + m;
  }
  const num = parseFloat(str.replace(',', '.'));
  if (!isNaN(num)) {
    return Math.round(num * 60);
  }
  return 0;
}

/**
 * Formata minutos em formato legível (ex: "6h 30m" ou "45m").
 */
export function formatMinutesToDisplay(minutes?: number): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
