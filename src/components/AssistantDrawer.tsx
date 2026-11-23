import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Loader2, AlertCircle, CheckCircle2, Camera, Mic, Paperclip, StopCircle } from 'lucide-react';
import { Movement } from '../types';

interface Message {
  role: 'user' | 'model';
  content: string;
  isError?: boolean;
  isFunctionCall?: boolean;
  attachment?: {
    type: 'image' | 'audio';
    preview?: string;
  };
}

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterExpense: (expense: Omit<Movement, 'id'>) => Promise<void> | void;
  onUpdateExpense: (
    id: string,
    updates: Partial<Pick<Movement, 'amount' | 'category' | 'date' | 'description' | 'paymentMethod' | 'observations'>>
  ) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  expenses: Movement[];
  availableBalance: number;
  userName: string;
  accountId?: string;
}

export default function AssistantDrawer({
  isOpen,
  onClose,
  onRegisterExpense,
  onUpdateExpense,
  onDeleteExpense,
  expenses,
  availableBalance,
  userName,
  accountId,
}: AssistantDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: `¡Hola ${userName}! Soy tu asistente financiero. ¿En qué puedo ayudarte hoy? Puedes pedirme registrar, editar o borrar un gasto, subir un ticket o enviarme una nota de voz.` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ file: File, type: 'image' | 'audio', preview?: string } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isHoldingRecordRef = useRef(false);

  useEffect(() => {
    setMessages([
      { role: 'model', content: `¡Hola ${userName}! Soy tu asistente financiero. ¿En qué puedo ayudarte hoy? Puedes pedirme registrar, editar o borrar un gasto, subir un ticket o enviarme una nota de voz.` }
    ]);
    setInput('');
    setSelectedFile(null);
  }, [accountId, userName]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const inferMediaInfo = (file: File): { type: 'image' | 'audio' | null; mimeType: string } => {
    const rawMime = (file.type || '').split(';')[0].trim().toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (rawMime.startsWith('image/') || /^(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/.test(ext)) {
      const normalized =
        rawMime === 'image/jpg'
          ? 'image/jpeg'
          : rawMime ||
            (ext === 'png'
              ? 'image/png'
              : ext === 'webp'
                ? 'image/webp'
                : ext === 'gif'
                  ? 'image/gif'
                  : 'image/jpeg');
      return { type: 'image', mimeType: normalized };
    }

    if (rawMime.startsWith('audio/') || /^(webm|mp3|mpeg|wav|ogg|m4a|mp4|aac|flac)$/.test(ext)) {
      let normalized = rawMime;
      if (normalized === 'audio/x-m4a' || normalized === 'audio/m4a' || ext === 'm4a') {
        normalized = 'audio/mp4';
      } else if (normalized === 'audio/mp3' || ext === 'mp3') {
        normalized = 'audio/mpeg';
      } else if (normalized === 'audio/x-wav' || normalized === 'audio/wave' || ext === 'wav') {
        normalized = 'audio/wav';
      } else if (!normalized) {
        normalized = ext === 'ogg' ? 'audio/ogg' : ext === 'aac' ? 'audio/aac' : ext === 'flac' ? 'audio/flac' : 'audio/webm';
      }
      return { type: 'audio', mimeType: normalized };
    }

    return { type: null, mimeType: rawMime };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size === 0) {
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: 'El archivo seleccionado está vacío. Por favor elige una imagen o audio válido.',
          isError: true,
        },
      ]);
      return;
    }

    const { type } = inferMediaInfo(file);
    if (!type) {
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: 'Formato no compatible. Por favor selecciona una imagen (JPG, PNG, WEBP) o un archivo de audio (MP3, WAV, M4A, OGG, WEBM).',
          isError: true,
        },
      ]);
      return;
    }

    if (selectedFile?.preview) {
      URL.revokeObjectURL(selectedFile.preview);
    }

    const preview = type === 'image' ? URL.createObjectURL(file) : undefined;
    setSelectedFile({ file, type, preview });
  };

  const clearSelectedFile = () => {
    if (selectedFile?.preview) {
      URL.revokeObjectURL(selectedFile.preview);
    }
    setSelectedFile(null);
  };

  const startRecording = async () => {
    if (isRecording || isLoading) return;
    isHoldingRecordRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!isHoldingRecordRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        setMessages(prev => [
          ...prev,
          {
            role: 'model',
            content: 'Mantén presionado el botón del micrófono mientras grabas tu nota de voz.',
            isError: true,
          },
        ]);
        return;
      }

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      const supportedType =
        typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function'
          ? preferredTypes.find((t) => MediaRecorder.isTypeSupported(t))
          : undefined;

      const mediaRecorder = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const rawMime = mediaRecorder.mimeType || supportedType || 'audio/webm';
        const cleanMime = rawMime.split(';')[0].trim().toLowerCase() || 'audio/webm';
        const ext = cleanMime.includes('mp4') ? 'm4a' : cleanMime.includes('ogg') ? 'ogg' : 'webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: cleanMime });
        audioChunksRef.current = [];

        if (audioBlob.size < 400) {
          setMessages(prev => [
            ...prev,
            {
              role: 'model',
              content: 'La grabación fue demasiado corta o no capturó audio. Mantén presionado el micrófono mientras hablas.',
              isError: true,
            },
          ]);
          return;
        }

        const audioFile = new File([audioBlob], `recording.${ext}`, { type: cleanMime });
        setSelectedFile({ file: audioFile, type: 'audio' });
      };

      mediaRecorder.start(250);
      setIsRecording(true);
    } catch (err) {
      isHoldingRecordRef.current = false;
      console.error("Error accessing microphone:", err);
      setMessages(prev => [...prev, { role: 'model', content: "No pude acceder al micrófono. Por favor, revisa los permisos.", isError: true }]);
    }
  };

  const stopRecording = () => {
    isHoldingRecordRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result?.toString().split(',')[1];
        resolve(base64String || '');
      };
      reader.onerror = error => reject(error);
    });
  };

  const prepareMediaPayload = async (
    file: File,
    type: 'image' | 'audio'
  ): Promise<{ data: string; mimeType: string }> => {
    if (file.size === 0) {
      throw new Error('El archivo adjunto está vacío. Intenta seleccionarlo o grabarlo nuevamente.');
    }

    const inferred = inferMediaInfo(file);

    if (type === 'image') {
      try {
        const objectUrl = URL.createObjectURL(file);
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = objectUrl;
          });

          if (!img.width || !img.height) {
            throw new Error('La imagen no tiene dimensiones válidas.');
          }

          const MAX_DIMENSION = 1600;
          let { width, height } = img;
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            const scale = MAX_DIMENSION / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          // Always re-encode decodable raster images via canvas to guarantee clean JPEG bytes and valid dimensions
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
            const base64 = dataUrl.split(',')[1];
            if (base64 && base64.length >= 16) {
              return { data: base64, mimeType: 'image/jpeg' };
            }
          }
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      } catch (err) {
        console.warn('No se pudo procesar la imagen en canvas:', err);
        const supportedRawImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
        if (!supportedRawImageTypes.includes(inferred.mimeType)) {
          throw new Error('No se pudo leer la imagen. Por favor sube una imagen válida en formato JPG, PNG o WEBP.');
        }
      }

      const data = await fileToBase64(file);
      if (!data || data.length < 16) {
        throw new Error('La imagen está vacía o dañada. Intenta con otra foto.');
      }
      return { data, mimeType: inferred.mimeType || 'image/jpeg' };
    }

    const data = await fileToBase64(file);
    if (!data || data.length < 16) {
      throw new Error('El audio está vacío o dañado. Intenta grabarlo o subirlo nuevamente.');
    }
    return { data, mimeType: inferred.mimeType || 'audio/webm' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedFile) || isLoading) return;

    const userMessage = input.trim();
    const currentFile = selectedFile;
    
    setInput('');
    setSelectedFile(null);
    
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage || (currentFile?.type === 'image' ? 'Imagen enviada' : 'Audio enviado'),
      attachment: currentFile ? { type: currentFile.type, preview: currentFile.preview } : undefined
    }]);
    
    setIsLoading(true);

    try {
      const validHistory = messages.filter(m => !m.isError && !m.isFunctionCall && m.content.trim());
      const firstUserIdx = validHistory.findIndex(m => m.role === 'user');
      const chatHistory = (firstUserIdx >= 0 ? validHistory.slice(firstUserIdx) : []).map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      
      const newParts: any[] = [];
      if (userMessage) newParts.push({ text: userMessage });
      
      if (currentFile) {
        try {
          const media = await prepareMediaPayload(currentFile.file, currentFile.type);
          newParts.push({
            inlineData: {
              data: media.data,
              mimeType: media.mimeType
            }
          });
        } catch (mediaErr: any) {
          setMessages(prev => [...prev, {
            role: 'model',
            content: mediaErr?.message || 'No pude procesar el archivo adjunto. Intenta con otro archivo.',
            isError: true,
          }]);
          setIsLoading(false);
          return;
        }
      }

      chatHistory.push({ role: 'user', parts: newParts });

      const now = new Date();
      const localDate = now.toLocaleDateString('en-CA');

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: chatHistory,
          context: {
            userName,
            availableBalance,
            currentDate: `${localDate} (${now.toISOString()})`,
            expenses: expenses.slice(0, 50).map((exp) => ({
              id: exp.id,
              description: exp.description,
              amount: exp.amount,
              category: exp.category,
              date: exp.date,
            })),
          }
        }),
      });

      const rawText = await response.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = null;
      }

      if (!response.ok) {
        const status = data?.status || response.status;
        let errorMessage = data?.error || 'Ocurrió un error inesperado al procesar tu solicitud.';
        if (status === 413) {
          errorMessage = 'La imagen o el audio es demasiado pesado. Por favor, intenta con un archivo más pequeño.';
        } else if (status === 429) {
          errorMessage = 'He alcanzado mi límite de mensajes por ahora. Intenta de nuevo más tarde.';
        } else if (status === 503 || status === 502 || status === 504) {
          errorMessage = 'El asistente tardó en responder o está muy solicitado. Por favor, intenta de nuevo en un momento.';
        }

        setMessages(prev => [...prev, { 
          role: 'model', 
          content: errorMessage, 
          isError: true 
        }]);
      } else if (!data) {
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: 'Recibí una respuesta inesperada del servidor. Por favor, intenta de nuevo.', 
          isError: true 
        }]);
      } else {
        if (data.text) {
          setMessages(prev => [...prev, { role: 'model', content: data.text }]);
        }

        if (data.functionCalls && data.functionCalls.length > 0) {
          for (const call of data.functionCalls) {
            if (call.name === 'registerExpense') {
              const { amount, date, description, category } = call.args || {};
              await onRegisterExpense({
                amount: Number(amount),
                date: date,
                description: description,
                category: category,
                type: 'expense'
              });
              
              setMessages(prev => [...prev, { 
                role: 'model', 
                content: `¡Listo, ${userName}! He guardado tu gasto: ${description} por $${Number(amount).toLocaleString('es-CO')}`,
                isFunctionCall: true 
              }]);
            } else if (call.name === 'updateExpense') {
              const { id, amount, date, description, category } = call.args || {};
              const existingExpense = expenses.find((item) => item.id === id);
              if (!existingExpense) {
                setMessages(prev => [...prev, {
                  role: 'model',
                  content: 'No encontré ese gasto para editarlo. Indícame exactamente cuál deseas modificar.',
                  isError: true,
                }]);
                continue;
              }

              const nextAmount = amount !== undefined ? Number(amount) : existingExpense.amount;
              if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
                setMessages(prev => [...prev, {
                  role: 'model',
                  content: 'El monto para actualizar el gasto debe ser mayor a $0.',
                  isError: true,
                }]);
                continue;
              }
              const nextDescription = description ?? existingExpense.description;
              const nextCategory = category ?? existingExpense.category;
              const nextDate = date ?? existingExpense.date;

              await onUpdateExpense(existingExpense.id, {
                amount: nextAmount,
                description: nextDescription,
                category: nextCategory,
                date: nextDate,
                paymentMethod: existingExpense.paymentMethod,
                observations: existingExpense.observations,
              });

              setMessages(prev => [...prev, {
                role: 'model',
                content: `¡Listo, ${userName}! He actualizado el gasto "${nextDescription}" por $${Number(nextAmount).toLocaleString('es-CO')}.`,
                isFunctionCall: true,
              }]);
            } else if (call.name === 'deleteExpense') {
              const { id } = call.args || {};
              const existingExpense = expenses.find((item) => item.id === id);
              if (!existingExpense) {
                setMessages(prev => [...prev, {
                  role: 'model',
                  content: 'No encontré ese gasto para eliminarlo. Indícame exactamente cuál deseas borrar.',
                  isError: true,
                }]);
                continue;
              }

              await onDeleteExpense(existingExpense.id);

              setMessages(prev => [...prev, {
                role: 'model',
                content: `¡Listo, ${userName}! He eliminado el gasto "${existingExpense.description}" ($${Number(existingExpense.amount).toLocaleString('es-CO')}).`,
                isFunctionCall: true,
              }]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error en AssistantDrawer:', error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: 'Error de conexión. Revisa tu internet e intenta de nuevo.', 
        isError: true 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-sm z-[60]"
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-[70] flex flex-col border-l border-transparent dark:border-slate-800"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0">
              <div className="flex items-center gap-3">
                <div className="bg-[#5B3DF5] p-2.5 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-indigo-950/50">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">Asistente Inteligente</h3>
                  <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    En línea
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/60">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                        msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-[#5B3DF5]'
                      }`}>
                        {msg.role === 'user' ? <User className="w-4 h-4 text-slate-600 dark:text-slate-200" /> : <Bot className="w-4 h-4 text-white" />}
                      </div>
                      <div className={`p-4 rounded-2xl text-sm font-medium shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 rounded-tr-none border border-slate-100 dark:border-slate-700' 
                          : msg.isError
                            ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-900/60 rounded-tl-none'
                            : msg.isFunctionCall
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/60 rounded-tl-none'
                              : 'bg-[#5B3DF5] text-white rounded-tl-none'
                      }`}>
                        {msg.isError && <AlertCircle className="w-4 h-4 mb-2" />}
                        {msg.isFunctionCall && <CheckCircle2 className="w-4 h-4 mb-2" />}
                        {msg.content}
                        
                        {msg.attachment?.type === 'image' && msg.attachment.preview && (
                          <div className="mt-3 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
                            <img src={msg.attachment.preview} alt="Adjunto" className="w-full h-auto max-h-48 object-cover" />
                          </div>
                        )}
                        {msg.attachment?.type === 'audio' && (
                          <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
                            <Mic className="w-3 h-3" />
                            <span>Audio adjunto</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#5B3DF5] flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                      <span className="text-xs text-slate-400 dark:text-slate-300 font-bold">Escribiendo</span>
                      <div className="flex gap-1">
                        <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1 h-1 bg-slate-300 dark:bg-slate-500 rounded-full" />
                        <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1 h-1 bg-slate-300 dark:bg-slate-500 rounded-full" />
                        <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1 h-1 bg-slate-300 dark:bg-slate-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              {selectedFile && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl flex items-center justify-between border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                      {selectedFile.type === 'image' ? <Camera className="w-4 h-4 text-[#5B3DF5] dark:text-indigo-400" /> : <Mic className="w-4 h-4 text-[#5B3DF5] dark:text-indigo-400" />}
                    </div>
                    <div className="text-xs">
                      <p className="font-black text-slate-700 dark:text-slate-100 truncate max-w-[150px]">{selectedFile.file.name}</p>
                      <p className="text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest text-[9px]">{selectedFile.type}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={clearSelectedFile}
                    className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400 dark:text-slate-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,audio/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                
                <button
                  type="button"
                  onPointerDown={startRecording}
                  onPointerUp={stopRecording}
                  onPointerCancel={stopRecording}
                  onPointerLeave={stopRecording}
                  className={`p-3 rounded-xl transition-all touch-none select-none ${
                    isRecording 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <form onSubmit={handleSubmit} className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Dime qué gastaste..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#5B3DF5] focus:bg-white dark:focus:bg-slate-800 p-3 pr-12 rounded-xl outline-none font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all text-sm"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={(!input.trim() && !selectedFile) || isLoading}
                    className="absolute right-1.5 top-1.5 p-1.5 bg-[#5B3DF5] text-white rounded-lg shadow-lg shadow-indigo-100 dark:shadow-indigo-950/50 hover:bg-[#4a32c8] transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold text-center uppercase tracking-widest">
                {isRecording ? 'Suelta para finalizar grabación' : 'Mantén presionado para grabar audio'}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

