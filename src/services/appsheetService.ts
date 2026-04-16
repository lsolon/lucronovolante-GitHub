import { Entry, Category, AppSheetMapping } from '../types';

/**
 * Service to handle AppSheet API integration.
 * 
 * To use this, you need to provide:
 * 1. App ID
 * 2. Access Key
 * 3. Table Name
 * 
 * These should be set in the environment variables (via Settings menu).
 */

const getEnv = (key: string) => {
  const env = (import.meta as any).env;
  if (env && env[key]) return env[key];
  return undefined;
};

const APPSHEET_APP_ID = getEnv('VITE_APPSHEET_APP_ID');
const APPSHEET_ACCESS_KEY = getEnv('VITE_APPSHEET_ACCESS_KEY');
const APPSHEET_TABLE_NAME = getEnv('VITE_APPSHEET_TABLE_NAME');

export interface AppSheetRow {
  [key: string]: any;
}

export async function fetchAppSheetData(): Promise<AppSheetRow[]> {
  const missing = [];
  if (!APPSHEET_APP_ID) missing.push('VITE_APPSHEET_APP_ID');
  if (!APPSHEET_ACCESS_KEY) missing.push('VITE_APPSHEET_ACCESS_KEY');
  if (!APPSHEET_TABLE_NAME) missing.push('VITE_APPSHEET_TABLE_NAME');

  if (missing.length > 0) {
    const msg = `Configuração do AppSheet incompleta. Faltando: ${missing.join(', ')}. 
    
Para corrigir:
1. Clique no ícone de engrenagem (Settings) no canto superior direito do AI Studio.
2. Adicione as variáveis acima com seus respectivos valores do AppSheet.
3. Clique em Save e aguarde o app reiniciar.`;
    throw new Error(msg);
  }

  const url = `https://api.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${APPSHEET_TABLE_NAME}/Action`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'ApplicationAccessKey': APPSHEET_ACCESS_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Action: "Find",
      Properties: {
        Locale: "pt-BR",
        Timezone: "E. South America Standard Time"
      },
      Rows: []
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na API do AppSheet: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Sends rows to AppSheet API using the "Add" action.
 */
export async function addRowsToAppSheet(rows: AppSheetRow[]): Promise<any> {
  const missing = [];
  if (!APPSHEET_APP_ID) missing.push('VITE_APPSHEET_APP_ID');
  if (!APPSHEET_ACCESS_KEY) missing.push('VITE_APPSHEET_ACCESS_KEY');
  if (!APPSHEET_TABLE_NAME) missing.push('VITE_APPSHEET_TABLE_NAME');

  if (missing.length > 0) {
    throw new Error('Configuração do AppSheet incompleta para envio de dados.');
  }

  const url = `https://api.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${APPSHEET_TABLE_NAME}/Action`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'ApplicationAccessKey': APPSHEET_ACCESS_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Action: "Add",
      Properties: {
        Locale: "pt-BR",
        Timezone: "E. South America Standard Time"
      },
      Rows: rows
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao enviar para AppSheet: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Maps application Entry to AppSheet row format using the provided mapping.
 */
export function mapEntryToAppSheet(
  entry: Entry, 
  categories: Category[], 
  earningCategories: Category[],
  mapping: AppSheetMapping
): AppSheetRow {
  const category = categories.find(c => c.id === entry.categoriaId);
  
  const row: AppSheetRow = {};
  
  if (mapping.data) row[mapping.data] = entry.data;
  if (mapping.tipo) row[mapping.tipo] = entry.tipo;
  if (mapping.valor) row[mapping.valor] = entry.valor;
  if (mapping.categoria) row[mapping.categoria] = entry.tipo === 'Ganhos' ? 'Fechamento do Dia' : (category?.nome || 'Outros');
  if (mapping.km) row[mapping.km] = entry.km || '';
  if (mapping.obs) row[mapping.obs] = entry.obs || '';
  if (mapping.posto) row[mapping.posto] = entry.posto || '';
  if (mapping.combustivel) row[mapping.combustivel] = entry.combustivel || '';
  if (mapping.quantidade) row[mapping.quantidade] = entry.quantidade || '';
  if (mapping.valorUnitario) row[mapping.valorUnitario] = entry.valorUnitario || '';

  // Handle dynamic earnings
  if (entry.tipo === 'Ganhos' && entry.ganhos) {
    earningCategories.forEach(cat => {
      const val = entry.ganhos?.[cat.id];
      if (val !== undefined) {
        row[cat.nome] = val;
      }
    });
  }

  return row;
}

/**
 * Maps AppSheet rows to the application's Entry format.
 */
export function mapAppSheetToEntry(
  row: AppSheetRow, 
  categories: Category[] = [], 
  earningCategories: Category[] = [],
  customMapping?: AppSheetMapping
): Omit<Entry, 'id'> {
  // Helper to find value by multiple possible keys (case-insensitive, handles spaces and accents)
  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, '');
  
  const getVal = (keys: string[], customKey?: string) => {
    if (customKey && row[customKey] !== undefined) return row[customKey];
    
    const rowKeys = Object.keys(row);
    const normalizedKeys = keys.map(normalize);
    
    for (const rk of rowKeys) {
      if (normalizedKeys.includes(normalize(rk))) return row[rk];
    }
    return undefined;
  };

  const tipoRaw = getVal(['Tipo', 'Type', 'Tipo de Lancamento', 'Natureza'], customMapping?.tipo) || 'Despesa';
  const tipo = (normalize(String(tipoRaw)).includes('ganho') || normalize(String(tipoRaw)).includes('receita')) ? 'Ganhos' : 'Despesa';
  
  const valor = Number(getVal(['Valor', 'Value', 'Preco', 'Total', 'Quantia'], customMapping?.valor) || 0);
  
  let dataRaw = getVal(['Data', 'Date', 'Data do Lancamento', 'Dia'], customMapping?.data);
  let data = new Date().toISOString().split('T')[0].replace(/-/g, '/');
  let createdAt = new Date().toISOString().replace('T', ' ').split('.')[0].replace(/-/g, '/');
  
  if (dataRaw) {
    const parsedDate = new Date(dataRaw);
    if (!isNaN(parsedDate.getTime())) {
      // Extract local date components to avoid UTC shift
      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const d = String(parsedDate.getDate()).padStart(2, '0');
      data = `${y}/${m}/${d}`;

      const hh = String(parsedDate.getHours()).padStart(2, '0');
      const mm = String(parsedDate.getMinutes()).padStart(2, '0');
      const ss = String(parsedDate.getSeconds()).padStart(2, '0');
      
      // If there's a specific time in the data, use it for createdAt
      if (hh !== '00' || mm !== '00' || ss !== '00') {
        createdAt = `${data} ${hh}:${mm}:${ss}`;
      }
    }
  }

  // Check if there's a specific CreatedAt column in AppSheet
  const createdAtRaw = getVal(['Criado Em', 'Created At', 'Timestamp', 'Horario'], customMapping?.obs); // Using obs as fallback key check
  if (createdAtRaw) {
    const parsedCreatedAt = new Date(createdAtRaw);
    if (!isNaN(parsedCreatedAt.getTime())) {
      const y = parsedCreatedAt.getFullYear();
      const m = String(parsedCreatedAt.getMonth() + 1).padStart(2, '0');
      const d = String(parsedCreatedAt.getDate()).padStart(2, '0');
      const hh = String(parsedCreatedAt.getHours()).padStart(2, '0');
      const mm = String(parsedCreatedAt.getMinutes()).padStart(2, '0');
      const ss = String(parsedCreatedAt.getSeconds()).padStart(2, '0');
      createdAt = `${y}/${m}/${d} ${hh}:${mm}:${ss}`;
    }
  }

  // Category Matching
  const categoriaNome = getVal(['Categoria', 'Category', 'Item', 'Descricao Categoria'], customMapping?.categoria);
  let categoriaId = getVal(['CategoriaId', 'CategoryId']);

  if (!categoriaId && categoriaNome && categories.length > 0) {
    const found = categories.find(c => normalize(c.nome) === normalize(String(categoriaNome)));
    if (found) categoriaId = found.id;
  }

  // Default IDs if not found
  if (!categoriaId) {
    categoriaId = tipo === 'Ganhos' ? '10' : '9';
  }

  const entry: Omit<Entry, 'id'> = {
    data,
    createdAt,
    tipo,
    categoriaId: String(categoriaId),
    valor,
    km: Number(getVal(['Km', 'Kilometragem', 'Odometro', 'Km Atual'], customMapping?.km)) || undefined,
    obs: getVal(['Observacao', 'Observacoes', 'Notes', 'Descricao', 'Comentario'], customMapping?.obs) || `Importado do AppSheet`,
    posto: getVal(['Posto', 'Gas Station', 'Bandeira', 'Local'], customMapping?.posto),
    combustivel: getVal(['Combustivel', 'Fuel Type', 'Tipo Combustivel'], customMapping?.combustivel),
    quantidade: Number(getVal(['Quantidade', 'Litros', 'Volume', 'Qtd'], customMapping?.quantidade)) || undefined,
    valorUnitario: Number(getVal(['Valor Unitario', 'Preco Unitario', 'Unit Price', 'Preco Litro'], customMapping?.valorUnitario)) || undefined,
  };

  // Handle dynamic earnings if it's a 'Ganhos' entry
  if (tipo === 'Ganhos' && earningCategories.length > 0) {
    const platformGanhos: Record<string, number> = {};
    let hasPlatformData = false;
    
    earningCategories.forEach(cat => {
      const val = getVal([cat.nome, `Ganho ${cat.nome}`, `Earning ${cat.nome}`]);
      if (val !== undefined) {
        const numVal = Number(val);
        if (!isNaN(numVal)) {
          platformGanhos[cat.id] = numVal;
          hasPlatformData = true;
        }
      }
    });

    if (hasPlatformData) {
      entry.ganhos = platformGanhos;
    }
  }

  return entry;
}
