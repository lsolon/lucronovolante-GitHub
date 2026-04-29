import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log(`[DEBUG] GEMINI_API_KEY exists: ${!!apiKey}`);
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não configurada. Por favor, adicione a chave de API nas configurações.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

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
    const ai = getAI();
    if (!ai) throw new Error("AI não configurada. Por favor, adicione a GEMINI_API_KEY.");
    
    // Remove prefix if exists
    const base64Data = base64Image.split(',')[1] || base64Image;

    const prompt = `Analise esta nota fiscal de combustível e extraia os seguintes dados em formato JSON:
    - valorTotal (número)
    - valorUnitario (número)
    - quantidade (número de litros)
    - combustivel (string: Gasolina, Etanol, GNV, Diesel, etc)
    - posto (string: Nome do posto ou bandeira)
    - data (string no formato YYYY-MM-DD)

    Retorne apenas o JSON. Se não encontrar algum dado, use null ou 0.`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            valorTotal: { type: Type.NUMBER },
            valorUnitario: { type: Type.NUMBER },
            quantidade: { type: Type.NUMBER },
            combustivel: { type: Type.STRING },
            posto: { type: Type.STRING },
            data: { type: Type.STRING }
          },
          required: ["valorTotal", "valorUnitario", "quantidade", "combustivel", "posto", "data"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    return JSON.parse(text) as InvoiceData;
  } catch (error) {
    console.error("Error extracting invoice data:", error);
    throw error;
  }
}

export async function extractInvoiceDataFromText(text: string): Promise<InvoiceData | null> {
  try {
    const ai = getAI();
    if (!ai) throw new Error("AI não configurada. Por favor, adicione a GEMINI_API_KEY.");

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

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            valorTotal: { type: Type.NUMBER },
            valorUnitario: { type: Type.NUMBER },
            quantidade: { type: Type.NUMBER },
            combustivel: { type: Type.STRING },
            posto: { type: Type.STRING },
            data: { type: Type.STRING }
          },
          required: ["valorTotal", "valorUnitario", "quantidade", "combustivel", "posto", "data"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) return null;

    return JSON.parse(resultText) as InvoiceData;
  } catch (error) {
    console.error("Error extracting invoice data from text:", error);
    throw error;
  }
}
