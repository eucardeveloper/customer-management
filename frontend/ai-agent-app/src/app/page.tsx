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
  AppBar,
  Toolbar,
  Divider,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
    },
    secondary: {
      main: '#8b5cf6',
    },
    background: {
      default: '#0f0f1a',
      paper: 'rgba(255,255,255,0.04)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(15,15,26,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },
  },
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  'Tüm müşterileri listele',
  "Enes Uçar'ın siparişleri",
  'Yeni müşteri ekle',
  "Hans Müller'i güncelle",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Merhaba! Ben AI Ajan Orkestrasyon Sistemi'yim. Müşteri ve sipariş işlemlerinizde size yardımcı olabilirim. Ne yapmamı istersiniz?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatInput: input,
          sessionId: `session-${Date.now()}`,
        }),
      });

      const data = await response.json();
      const replyText =
        data?.output || data?.text || data?.message || 'Yanıt alınamadı.';

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: replyText, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Bağlantı hatası. Lütfen tekrar deneyin.',
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

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background:
            'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* AppBar */}
        <AppBar position="sticky" elevation={0}>
          <Toolbar>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                AI Ajan Orkestrasyon Sistemi
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FiberManualRecordIcon
                  sx={{ fontSize: 8, color: '#22c55e' }}
                />
                <Typography variant="caption" color="text.secondary">
                  Çevrimiçi · Railway Production
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label="Kunden-Agent"
                size="small"
                variant="outlined"
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.light',
                  fontSize: '0.7rem',
                }}
              />
              <Chip
                label="Bestellungs-Agent"
                size="small"
                variant="outlined"
                sx={{
                  borderColor: 'secondary.main',
                  color: '#a78bfa',
                  fontSize: '0.7rem',
                }}
              />
            </Box>
          </Toolbar>
        </AppBar>

        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', py: 3 }}>
          <Container maxWidth="md">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {messages.map((msg, i) => (
                <Box
                  key={i}
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
                      alignItems:
                        msg.role === 'user' ? 'flex-end' : 'flex-start',
                      gap: 0.5,
                    }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        px: 2.5,
                        py: 1.5,
                        borderRadius:
                          msg.role === 'user'
                            ? '18px 18px 4px 18px'
                            : '18px 18px 18px 4px',
                        background:
                          msg.role === 'user'
                            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                            : 'rgba(255,255,255,0.06)',
                        border:
                          msg.role === 'assistant'
                            ? '1px solid rgba(255,255,255,0.08)'
                            : 'none',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
                      >
                        {msg.content}
                      </Typography>
                    </Paper>
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ px: 1 }}
                    >
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
                      <CircularProgress size={14} color="primary" />
                      <Typography variant="body2" color="text.secondary">
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

        {/* Suggestions + Input */}
        <Box sx={{ pb: 3 }}>
          <Container maxWidth="md">
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
              {SUGGESTIONS.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  size="small"
                  onClick={() => setInput(s)}
                  variant="outlined"
                  sx={{
                    borderColor: 'rgba(255,255,255,0.12)',
                    color: 'text.secondary',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'primary.main',
                      color: 'primary.light',
                      backgroundColor: 'rgba(99,102,241,0.08)',
                    },
                  }}
                />
              ))}
            </Box>

            <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.06)' }} />

            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 0.75,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(10px)',
                '&:focus-within': {
                  borderColor: 'primary.main',
                  background: 'rgba(255,255,255,0.06)',
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
                    fontSize: '0.875rem',
                    '&::placeholder': { color: 'rgba(255,255,255,0.3)' },
                  },
                }}
              />
              <IconButton
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                sx={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  background: input.trim()
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'transparent',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  },
                  '&.Mui-disabled': { color: 'rgba(255,255,255,0.2)' },
                }}
              >
                <SendIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Paper>

            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ display: 'block', textAlign: 'center', mt: 1 }}
            >
              n8n · OpenRouter GPT-4o Mini · Spring Boot Microservices · Railway
            </Typography>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}