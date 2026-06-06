import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Parsers
app.use(express.json());

// 1. API: Proxy M3U feeds to bypass client-side browser CORS restrictions
app.get('/api/proxy-m3u', async (req, res) => {
  const urlParam = req.query.url as string;
  if (!urlParam) {
    return res.status(400).send('Missing "url" parameter.');
  }

  try {
    const parsedUrl = new URL(urlParam);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).send('Invalid url protocol. Standard HTT/HTTPS URLs only.');
    }

    // Set standard browser headers to look like a standard mediaplayer request
    const response = await fetch(urlParam, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      return res.status(response.status).send(`Stream source server returned code: ${response.status}`);
    }

    const text = await response.text();
    
    // Set permissive CORS so client browser can read it freely
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(text);
  } catch (error: any) {
    console.error('Error proxying M3U playlist:', error.message);
    return res.status(500).send(`Server failed to fetch remote playlist: ${error.message}`);
  }
});

// 2. API: Server-side Gemini AI Chat Assistant Proxy (Strict @google/genai syntax)
app.post('/api/gemini/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing standard messages array.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(500).json({ 
      error: 'GEMINI_API_KEY is not configured inside server secrets.'
    });
  }

  try {
    // Initialize standard GoogleGenAI client (with recommended custom build telemetry)
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    // Translate client simple history to standard content Parts format
    const contents = messages.map((m: any) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    // Call modern gemini-3.5-flash for general-purpose chatbot tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: "You are FA TV's IPTV Assistant & Diagnostic Engine. You help Bengali-speaking and global users get working public IPTV streams, explain how .m3u and HLS .m3u8 streaming works, and troubleshoot player screen issues. Answer user queries in simple english (or insert friendly bengali words like 'bhaia', 'asalamu alaikum'). Provide valid public test M3U8 list files such as: 'https://iptv-org.github.io/iptv/countries/bd.m3u' for Bangladesh, 'https://iptv-org.github.io/iptv/categories/news.m3u' for News. Clearly advise them on CORS restrictions and how our server-side remote loader helps bypass CORS!"
      }
    });

    return res.json({ text: response.text });
  } catch (error: any) {
    console.error('Error generating AI contents:', error.message);
    return res.status(500).json({ 
      error: `Gemini execution failure: ${error.message}` 
    });
  }
});

// 3. Vite development vs static production server routing setup
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Booted Vite Development Middleware Server.');
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving Compiled Build Files.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FA TV server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
