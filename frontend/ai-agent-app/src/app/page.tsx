'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  TextField,
  IconButton,
  Typography,
  Paper,
  Avatar,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const WEBHOOK_URL = '/api/chat';
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Merhaba! Ben AI Ajan Orkestrasyon Sistemi\'yim. Müşteri ve sipariş işlemlerinizde size yardımcı olabilirim. Ne yapmamı istersiniz?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatInput: input,
          sessionId: sessionId,
        }),
      });

      const data = await response.json();
      const replyText = data?.output || data?.text || data?.message || JSON.stringify(data);

      const assistantMessage: Message = {
        role: 'assistant',
        content: replyText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255,255,255,0.03)',
          py: 2,
          px: 3,
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AutoAwesomeIcon sx={{ color: 'white', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1rem',
                  letterSpacing: '-0.02em',
                }}
              >
                AI Ajan Orkestrasyon Sistemi
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.4 },
                    },
                  }}
                />
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                  Çevrimiçi · Railway Production
                </Typography>
              </Box>
            </Box>
            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
              <Chip
                label="Kunden-Agent"
                size="small"
                sx={{
                  backgroundColor: 'rgba(99,102,241,0.15)',
                  color: '#818cf8',
                  border: '1px solid rgba(99,102,241,0.3)',
                  fontSize: '0.7rem',
                }}
              />
              <Chip
                label="Bestellungs-Agent"
                size="small"
                sx={{
                  backgroundColor: 'rgba(139,92,246,0.15)',
                  color: '#a78bfa',
                  border: '1px solid rgba(139,92,246,0.3)',
                  fontSize: '0.7rem',
                }}
              />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 3 }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {messages.map((msg, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: 1.5,
                }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    background:
                      msg.role === 'assistant'
                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                        : 'linear-gradient(135deg, #374151, #1f2937)',
                    flexShrink: 0,
                  }}
                >
                  {msg.role === 'assistant' ? (
                    <SmartToyIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <PersonIcon sx={{ fontSize: 18 }} />
                  )}
                </Avatar>
                <Box
                  sx={{
                    maxWidth: '75%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    gap: 0.5,
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      px: 2.5,
                      py: 1.5,
                      borderRadius:
                        msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background:
                        msg.role === 'user'
                          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                          : 'rgba(255,255,255,0.06)',
                      border:
                        msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <Typography
                      sx={{
                        color: 'white',
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.content}
                    </Typography>
                  </Paper>
                  <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', px: 1 }}>
                    {formatTime(msg.timestamp)}
                  </Typography>
                </Box>
              </Box>
            ))}

            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  }}
                >
                  <SmartToyIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Paper
                  elevation={0}
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    borderRadius: '18px 18px 18px 4px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={14} sx={{ color: '#818cf8' }} />
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
                      Ajan yanıt üretiyor...
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>
        </Container>
      </Box>

      {/* Suggestions */}
      <Box sx={{ py: 1.5, px: 2 }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
            {[
              'Tüm müşterileri listele',
              'Enes Uçar\'ın siparişleri',
              'Yeni müşteri ekle',
              'Hans Müller\'i güncelle',
            ].map((suggestion) => (
              <Chip
                key={suggestion}
                label={suggestion}
                onClick={() => setInput(suggestion)}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  '&:hover': {
                    backgroundColor: 'rgba(99,102,241,0.15)',
                    color: '#818cf8',
                    border: '1px solid rgba(99,102,241,0.3)',
                  },
                }}
              />
            ))}
          </Box>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 1.5 }} />
        </Container>
      </Box>

      {/* Input */}
      <Box sx={{ pb: 3, px: 2 }}>
        <Container maxWidth="md">
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              '&:focus-within': {
                border: '1px solid rgba(99,102,241,0.5)',
                background: 'rgba(255,255,255,0.08)',
              },
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Bir şey sorun... (Müşteri ekle, sil, listele, sipariş getir)"
              variant="standard"
              slotProps={{ input: { disableUnderline: true } }}
              sx={{
                '& .MuiInputBase-input': {
                  color: 'white',
                  fontSize: '0.875rem',
                  '&::placeholder': {
                    color: 'rgba(255,255,255,0.3)',
                  },
                },
              }}
            />
            <IconButton
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              sx={{
                width: 38,
                height: 38,
                background: input.trim()
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'rgba(255,255,255,0.05)',
                color: 'white',
                flexShrink: 0,
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                },
                '&:disabled': {
                  color: 'rgba(255,255,255,0.2)',
                },
              }}
            >
              <SendIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Paper>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.2)',
              fontSize: '0.7rem',
              textAlign: 'center',
              mt: 1,
            }}
          >
            n8n · OpenRouter GPT-4o Mini · Spring Boot Microservices · Railway
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}