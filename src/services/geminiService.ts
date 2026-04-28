export interface InvoiceData {
  valorTotal: number;
  valorUnitario: number;
  quantidade: number;
  combustivel: string;
  posto: string;
  data: string;
}

export async function extractInvoiceDataFromImage(base64Image: string): Promise<InvoiceData | null> {
  try {
    const base64Data = base64Image.split(',')[1] || base64Image;

    const prompt = `Analise esta nota fiscal de combustível e extraia os seguintes dados em formato JSON:
    - valorTotal (número)
    - valorUnitario (número)
    - quantidade (número de litros)
    - combustivel (string: Gasolina, Etanol, GNV, Diesel, etc)
    - posto (string: Nome do posto ou bandeira)
    - data (string no formato YYYY-MM-DD)

    Retorne apenas o JSON. Se não encontrar algum dado, use null ou 0.`;

    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isStructuredDataRequest: true,
        text: prompt,
        imageBytes: base64Data
      })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro na API do Gemini");
    }

    const data = await res.json();
    const resultText = data.text;
    
    // Clean markdown formatting if present
    const cleanText = resultText.replace(/```json\n?|\n?```/g, '').trim();
    if (!cleanText) return null;

    return JSON.parse(cleanText) as InvoiceData;
  } catch (error) {
    console.error("Error extracting invoice data:", error);
    throw error;
  }
}

export async function extractInvoiceDataFromText(text: string): Promise<InvoiceData | null> {
  try {
    const prompt = `Analise o texto abaixo de uma nota fiscal de combustível e extraia os seguintes dados em formato JSON:
    - valorTotal (número)
    - valorUnitario (número)
    - quantidade (número de litros)
    - combustivel (string: Gasolina, Etanol, GNV, Diesel, etc)
    - posto (string: Nome do posto ou bandeira)
    - data (string no formato YYYY-MM-DD)

    Texto:
    ${text}

    Retorne apenas o JSON.`;

    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isStructuredDataRequest: true,
        text: prompt
      })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro na API do Gemini");
    }

    const data = await res.json();
    const resultText = data.text;
    
    // Clean markdown formatting if present
    const cleanText = resultText.replace(/```json\n?|\n?```/g, '').trim();
    if (!cleanText) return null;

    return JSON.parse(cleanText) as InvoiceData;
  } catch (error) {
    console.error("Error extracting invoice data from text:", error);
    throw error;
  }
}
