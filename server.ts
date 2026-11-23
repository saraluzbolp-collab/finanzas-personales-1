import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Models to try in order (Fallback cascade)
const MODELS = [
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite'
];

const registerExpenseTool: FunctionDeclaration = {
  name: "registerExpense",
  parameters: {
    type: Type.OBJECT,
    description: "Registra un nuevo gasto en el sistema de presupuesto.",
    properties: {
      amount: {
        type: Type.NUMBER,
        description: "El monto del gasto en números.",
      },
      date: {
        type: Type.STRING,
        description: "La fecha del gasto en formato YYYY-MM-DD.",
      },
      description: {
        type: Type.STRING,
        description: "Una descripción breve del gasto.",
      },
      category: {
        type: Type.STRING,
        description: "La categoría del gasto (ej: Alimentación, Transporte, Salud, Hogar, Entretenimiento, Otros).",
      },
    },
    required: ["amount", "date", "description", "category"],
  },
};

const updateExpenseTool: FunctionDeclaration = {
  name: "updateExpense",
  parameters: {
    type: Type.OBJECT,
    description: "Edita o actualiza un gasto existente del usuario usando su ID exacto.",
    properties: {
      id: {
        type: Type.STRING,
        description: "El ID exacto del gasto existente que se desea editar.",
      },
      amount: {
        type: Type.NUMBER,
        description: "Nuevo monto del gasto en números positivos (opcional si no cambia).",
      },
      date: {
        type: Type.STRING,
        description: "Nueva fecha del gasto en formato YYYY-MM-DD (opcional si no cambia).",
      },
      description: {
        type: Type.STRING,
        description: "Nueva descripción breve del gasto (opcional si no cambia).",
      },
      category: {
        type: Type.STRING,
        description: "Nueva categoría del gasto (ej: Alimentación, Transporte, Servicios, Ropa, Entretenimiento, Salud, Hogar, Otros) (opcional si no cambia).",
      },
    },
    required: ["id"],
  },
};

const deleteExpenseTool: FunctionDeclaration = {
  name: "deleteExpense",
  parameters: {
    type: Type.OBJECT,
    description: "Elimina un gasto existente del usuario usando su ID exacto.",
    properties: {
      id: {
        type: Type.STRING,
        description: "El ID exacto del gasto existente que se desea eliminar.",
      },
      description: {
        type: Type.STRING,
        description: "Descripción del gasto eliminado para mostrar al usuario.",
      },
    },
    required: ["id"],
  },
};

const ALLOWED_MEDIA_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
]);

function normalizeMimeType(rawMime: unknown): string {
  const base = String(rawMime || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  switch (base) {
    case 'image/jpg':
      return 'image/jpeg';
    case 'audio/x-m4a':
    case 'audio/m4a':
      return 'audio/mp4';
    case 'audio/mp3':
      return 'audio/mpeg';
    case 'audio/x-wav':
    case 'audio/wave':
      return 'audio/wav';
    case 'video/webm':
      return 'audio/webm';
    default:
      return base;
  }
}

app.post('/api/assistant', async (req, res) => {
  const { messages, context } = req.body || {};

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY no está configurada.' });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No se recibieron mensajes para procesar.', status: 400 });
  }

  // Validate and normalize message parts (including inlineData media)
  const sanitizedMessages: Array<{ role: 'user' | 'model'; parts: any[] }> = [];
  for (const msg of messages) {
    if (!msg || (msg.role !== 'user' && msg.role !== 'model') || !Array.isArray(msg.parts)) {
      continue;
    }

    const cleanParts: any[] = [];
    for (const part of msg.parts) {
      if (!part || typeof part !== 'object') continue;

      if (typeof part.text === 'string' && part.text.trim().length > 0) {
        cleanParts.push({ text: part.text });
        continue;
      }

      if (part.inlineData && typeof part.inlineData === 'object') {
        let base64Data = String(part.inlineData.data || '').trim();
        let mimeType = normalizeMimeType(part.inlineData.mimeType);

        // Strip accidental data URL prefix if present
        const dataUrlMatch = base64Data.match(/^data:([^;]+);base64,(.+)$/i);
        if (dataUrlMatch) {
          if (!mimeType) {
            mimeType = normalizeMimeType(dataUrlMatch[1]);
          }
          base64Data = dataUrlMatch[2].trim();
        }

        if (!base64Data || base64Data.length < 16) {
          return res.status(400).json({
            error: 'El archivo de imagen o audio está vacío o dañado. Por favor intenta grabarlo o subirlo de nuevo.',
            status: 400,
          });
        }

        if (!ALLOWED_MEDIA_MIME_TYPES.has(mimeType)) {
          return res.status(400).json({
            error: `Formato multimedia no compatible (${mimeType || 'desconocido'}). Usa imágenes JPG, PNG o WEBP, o audio WEBM, MP3, M4A, WAV u OGG.`,
            status: 400,
          });
        }

        const decodedBytes = Buffer.from(base64Data, 'base64');
        if (!decodedBytes || decodedBytes.length < 16) {
          return res.status(400).json({
            error: 'El archivo multimedia enviado está vacío o corrupto. Intenta con otro archivo.',
            status: 400,
          });
        }

        cleanParts.push({
          inlineData: {
            data: base64Data,
            mimeType,
          },
        });
      }
    }

    if (cleanParts.length > 0) {
      sanitizedMessages.push({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: cleanParts,
      });
    }
  }

  const firstUserIndex = sanitizedMessages.findIndex((m) => m.role === 'user');
  const contents = firstUserIndex >= 0 ? sanitizedMessages.slice(firstUserIndex) : [];

  if (contents.length === 0) {
    return res.status(400).json({ error: 'El mensaje no tiene contenido válido.', status: 400 });
  }

  const { userName, availableBalance, currentDate, expenses } = context || {};
  const expensesList = Array.isArray(expenses) ? expenses.slice(0, 50) : [];
  const expensesSummary =
    expensesList.length > 0
      ? expensesList
          .map(
            (e: any) =>
              `- id="${e.id}" | ${e.description} | $${Number(e.amount).toLocaleString('es-CO')} COP | ${e.category} | ${e.date}`
          )
          .join('\n      ')
      : 'Sin gastos registrados aún.';

  let lastError: any = null;

  for (const modelName of MODELS) {
    try {
      console.log(`Intentando con modelo: ${modelName}`);
      
      const systemInstruction = `Eres un asistente experto en finanzas personales, breve y amable. Ayudas a los usuarios a registrar sus gastos. 
      Contexto Actual:
      - Fecha: ${currentDate || new Date().toISOString()}
      - Usuario: ${userName || 'Usuario'}
      - Saldo Disponible: $${(availableBalance || 0).toLocaleString('es-CO')} COP
      - Gastos actuales del usuario:
      ${expensesSummary}

      Instrucciones:
      1. Cuando el usuario mencione un gasto, usa la función registerExpense para guardarlo.
      2. Al finalizar un registro exitoso, dirígete al usuario por su nombre (ej: "¡Listo, ${userName || 'Usuario'}! He guardado tu gasto").
      3. Imagen: Si recibes una imagen (ticket, recibo, captura), extrae monto, fecha y descripción. Si los datos son dudosos o la imagen es borrosa, pregunta antes de guardar. NO inventes información.
      4. Audio: Si recibes un audio, transcríbelo y extrae monto, fecha y descripción. Si falta información, solicita aclaración. NO inventes información.
      5. Validación: Si el archivo o mensaje no tiene que ver con gastos o finanzas de "Mi Presupuesto", indica que no puedes procesarlo.
      6. Consultas: Si preguntan si pueden comprar algo, compara el gasto con el saldo disponible ($${(availableBalance || 0).toLocaleString('es-CO')}).
      7. Confirma siempre los datos antes o después de usar la función.
      8. Edición de gastos: Cuando el usuario pida editar, corregir o cambiar un gasto existente (monto, descripción, categoría o fecha), búscalo en "Gastos actuales del usuario". Si hay varios gastos parecidos o no queda claro cuál editar, pregunta antes de aplicar el cambio. Cuando esté claro, llama a updateExpense con su id exacto y los nuevos valores.
      9. Eliminación de gastos: Cuando el usuario pida borrar o eliminar un gasto, búscalo en "Gastos actuales del usuario". Si hay ambigüedad entre varios gastos o falta confirmar cuál es, pide aclaración primero. Cuando esté claro qué gasto eliminar, llama a deleteExpense con su id exacto.
      10. Al finalizar una edición o eliminación exitosa, dirígete al usuario por su nombre (${userName || 'Usuario'}). Si el gasto mencionado no existe en la lista, indícalo claramente.`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: [registerExpenseTool, updateExpenseTool, deleteExpenseTool] }],
        },
      });

      // Extract parts manually as requested
      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      
      const textPart = parts.find(p => p.text);
      const functionCalls = parts.filter(p => p.functionCall);

      return res.json({
        text: textPart?.text || '',
        functionCalls: functionCalls.map(f => f.functionCall),
        modelUsed: modelName
      });

    } catch (error: any) {
      const errStatus = error?.status || error?.statusCode || error?.error?.code;
      console.error(`Error con ${modelName}:`, errStatus, error?.message || error);
      lastError = error;
      
      // Retry only on specific errors
      if (errStatus === 429 || errStatus === 503 || errStatus === 404) {
        continue; // Try next model
      } else {
        break; // Stop for other errors
      }
    }
  }

  // If we reach here, all models failed or we hit a non-retryable error
  const status = Number(lastError?.status || lastError?.statusCode || lastError?.error?.code) || 500;
  let message = lastError?.message || 'Error desconocido en el asistente.';
  if (
    status === 400 &&
    (/unable to process input/i.test(message) || /invalid_argument/i.test(message))
  ) {
    message =
      'No pude procesar la imagen o el audio porque el archivo está vacío, dañado o tiene un formato no compatible. Intenta enviarlo nuevamente en formato JPG, PNG, WEBP o audio estándar.';
  }
  
  res.status(status).json({ 
    error: message,
    status: status
  });
});

// Always return JSON for Express middleware errors (e.g. PayloadTooLargeError)
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      error: 'El archivo es demasiado pesado para procesarse. Intenta con una imagen o audio más ligero.',
      status: 413
    });
  }
  if (err) {
    console.error('Express middleware error:', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Error interno del servidor.',
      status: err.status || 500
    });
  }
  next();
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
