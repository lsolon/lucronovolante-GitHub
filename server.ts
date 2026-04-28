import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);

  // Parse JSON bodies
  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV, keys: Object.keys(process.env).filter(k => k.includes('GEMINI')) });
  });

  app.post("/api/gemini", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor backend." });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const { isImageRequest, text, systemPrompt, history, isStructuredDataRequest, imageBytes } = req.body;

      if (isStructuredDataRequest) {
        const { Type } = await import("@google/genai");
        const contents: any[] = [];
        if (imageBytes) {
          contents.push({
            parts: [
              { text },
              { inlineData: { mimeType: "image/jpeg", data: imageBytes } }
            ]
          });
        } else {
          contents.push({ parts: [{ text }] });
        }

        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents,
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
        
        return res.json({ text: response.text });
      } else if (isImageRequest) {
        try {
          // Generate caption
          const textResponse = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ parts: [{ text: `Gere UM TEXTO ATRATIVO PARA PUBLICAR nas redes sociais (com emojis) sobre este pedido: "${text}". NÃO gere a imagem, apenas a legenda. Seja direto e motivador para motoristas de app.` }] }],
          });
          
          let modelText = textResponse.text || "Aqui está a legenda para a sua imagem!";

          // Generate image
          let imageUrl = '';
          try {
            const imageResponse = await ai.models.generateImages({
              model: 'imagen-3.0-generate-002',
              prompt: `A high quality, clean, professional advertising photo for a rideshare driver app. User request: ${text}. No text, no words, no letters, no logos on the image. Clear and well-lit.`,
              config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
              }
            });

            if (imageResponse.generatedImages?.[0]?.image?.imageBytes) {
              imageUrl = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
            }
          } catch (imgError: any) {
            console.error("Imagen API Error:", imgError);
            if (imgError.message?.includes("not available") || imgError.message?.includes("not found") || imgError.message?.includes("quota") || imgError.message?.includes("429")) {
               modelText += "\n\n(Obs: O limite de uso para geração de imagens foi atingido no momento ou o recurso está indisponível na sua conta gratuita. Tente novamente mais tarde.)";
            } else {
               throw imgError; // Let main catch block handle quota limit and show the error 
            }
          }

          return res.json({ text: modelText, image: imageUrl });
        } catch (error: any) {
             throw error;
        }
      } else {
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [
            ...(history || []),
            { role: 'user', parts: [{ text }] }
          ],
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
          }
        });
        return res.json({ text: response.text });
      }
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI content" });
    }
  });

  app.get("/api/fetch-url", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL is required" });
    }

    console.log(`[API] Fetching URL: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      
      console.log(`[API] Fetch response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`Falha ao acessar o site da nota (${response.status})`);
      }
      const text = await response.text();
      console.log(`[API] Fetch content length: ${text.length}`);
      res.send(text);
    } catch (error) {
      console.error("Error fetching URL:", error);
      res.status(500).json({ error: "Failed to fetch URL content" });
    }
  });

  // Logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      // Only log errors or API calls or custom domain requests
      if (res.statusCode >= 400 || req.url.startsWith('/api') || req.headers.host?.includes('lucronovolante')) {
        console.log(`${new Date().toISOString()} - [${req.headers.host}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
      }
    });
    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    console.log(`[Production] Serving static files from: ${distPath}`);
    
    // Serve static files with explicit logging for assets
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      immutable: true,
      maxAge: '1y',
      fallthrough: false // If an asset is missing, don't fall through to index.html
    }));

    // Prevent caching for service worker files and manifest so updates apply
    app.use(['/sw.js', '/registerSW.js', '/manifest.webmanifest'], (req, res, next) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      next();
    });

    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      // For SPA, serve index.html for any non-file request
      if (req.accepts('html')) {
        res.sendFile(path.join(distPath, 'index.html'));
      } else {
        res.status(404).send('Not found');
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`GEMINI_API_KEY is ${process.env.GEMINI_API_KEY ? 'DEFINED' : 'NOT DEFINED'}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
