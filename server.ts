import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json({ limit: '10mb' }));

  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  app.post("/api/gemini", async (req, res) => {
    try {
      const { text, history, systemInstruction, imageConfig } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      if (imageConfig) {
        // Image Generation
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ parts: [{ text: `${systemInstruction}\n\nUsuário pediu: ${text}` }] }],
        });

        let imageUrl = '';
        let modelText = '';

        if (response.candidates && response.candidates[0] && response.candidates[0].content) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            } else if (part.text) {
              modelText += part.text;
            }
          }
        }
        
        return res.json({ text: modelText, image: imageUrl });
      } else {
        // Text Generation
        const formattedHistory = (history || []).map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [
            ...formattedHistory,
            { role: 'user', parts: [{ text }] }
          ],
          config: {
            systemInstruction,
            temperature: 0.7,
          }
        });

        return res.json({ text: response.text });
      }
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate content" });
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
