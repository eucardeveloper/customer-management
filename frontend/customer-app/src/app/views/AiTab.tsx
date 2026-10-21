'use client';
import { isPending } from '@/lib/orderStats';
import { Box, Typography, Paper, Button, TextField, Chip, CircularProgress } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SendIcon from '@mui/icons-material/Send';
import { getQuickQuestionsAdmin, getQuickQuestionsUser } from '../model';
import type { Dispatch, SetStateAction } from 'react';

import type { TFn, SessionUser, ChatMessage, Order } from '../model';

interface AiTabProps {
  t: TFn;
  orders: Order[];
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: Dispatch<SetStateAction<string>>;
  chatLoading: boolean;
  sendMessage: (text: string) => void | Promise<void>;
  currentUser: SessionUser;
  isAdmin: boolean;
}

export function AiTab({ t, orders, chatMessages, chatInput, setChatInput, chatLoading, sendMessage, currentUser, isAdmin }: AiTabProps) {
  return (
              <Box sx={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 300px' }, gap: 2 }}>
                {/* Left: Chat area */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden', minHeight: 0 }}>
                  {/* Quick questions */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>
                    {(isAdmin ? getQuickQuestionsAdmin(t) : getQuickQuestionsUser(t)).map(q => (
                      <Chip key={q} label={q} clickable onClick={() => sendMessage(q)}
                        sx={{ bgcolor: 'var(--surface)', color: '#2563eb', border: '1px solid var(--blue-bd)', height: 32, px: 0.5, fontWeight: 600, fontSize: '0.78rem', '&:hover': { bgcolor: 'var(--blue-bg)' } }} />
                    ))}
                  </Box>

                  {/* Welcome banner — shown only when no messages */}
                  {chatMessages.length === 0 && (
                    <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 3, background: 'linear-gradient(135deg, var(--blue-bg) 0%, var(--violet-bg) 100%)', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)', mb: 0.5 }}>
                          {t('aiWelcome')}, {currentUser?.username ?? 'User'}! 👋
                        </Typography>
                        <Typography sx={{ color: 'var(--text2)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                          {t('aiDescription')}
                        </Typography>
                      </Box>
                      <Box sx={{ width: 80, height: 80, borderRadius: 3, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SmartToyIcon sx={{ fontSize: 44, color: 'white' }} />
                      </Box>
                    </Paper>
                  )}

                  {/* Chat messages */}
                  <Paper elevation={0} sx={{ flex: 1, border: '1px solid var(--border)', borderRadius: 3, p: 2, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: 'var(--surface-2)', minHeight: 0 }}>
                    {chatMessages.length === 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 1.5, py: 4 }}>
                        <SmartToyIcon sx={{ fontSize: 48, color: 'var(--blue-bd)' }} />
                        <Typography sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.95rem' }}>{t('aiEmptyTitle')}</Typography>
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.82rem' }}>{isAdmin ? t('aiEmptyExample') : t('aiEmptyExample')}</Typography>
                      </Box>
                    )}
                    {chatMessages.map((msg, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <Box sx={{
                          maxWidth: '78%', px: 2, py: 1.2,
                          borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: msg.role === 'user' ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'var(--surface)',
                          color: msg.role === 'user' ? 'white' : 'var(--text)',
                          border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                          boxShadow: msg.role === 'assistant' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                        }}>
                          <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                        </Box>
                      </Box>
                    ))}
                    {chatLoading && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={14} sx={{ color: '#2563eb' }} />
                        <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8' }}>AI is thinking…</Typography>
                      </Box>
                    )}
                  </Paper>

                  {/* Input */}
                  <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                    <TextField fullWidth size="small" placeholder={t('aiPlaceholder')} value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); } }}
                      disabled={chatLoading}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--surface)', borderRadius: 2.5 } }} />
                    <Button variant="contained" onClick={() => sendMessage(chatInput)} disabled={chatLoading || !chatInput.trim()} disableElevation
                      sx={{ borderRadius: 2.5, minWidth: 48, px: 2, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}>
                      <SendIcon fontSize="small" />
                    </Button>
                  </Box>
                </Box>

                {/* Right: Stats + History panel */}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: 2, overflow: 'auto' }}>
                  {/* Quick Stats panel */}
                  <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)', mb: 1.5 }}>{t('quickStats')}</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      {[
                        { label: t('totalOrdersLabel'), value: orders.length, color: '#2563eb', icon: '🛒' },
                        { label: t('deliveredLabel'), value: orders.filter(o => o.status === 'DELIVERED').length, color: '#10b981', icon: '✅' },
                        { label: t('pendingLabel'), value: orders.filter(isPending).length, color: '#f59e0b', icon: '⏳' },
                        { label: t('cancelledLabel'), value: orders.filter(o => o.status === 'CANCELLED').length, color: '#ef4444', icon: '❌' },
                      ].map(s => (
                        <Box key={s.label} sx={{ bgcolor: 'var(--surface-2)', borderRadius: 2, p: 1.5, border: '1px solid var(--surface-2)' }}>
                          <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8', mb: 0.3 }}>{s.label}</Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: s.color }}>{s.value}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Paper>

                  {/* Recent Questions */}
                  <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)', mb: 1.5 }}>{t('recentQuestions')}</Typography>
                    {chatMessages.filter(m => m.role === 'user').slice(-5).reverse().map((m, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5, cursor: 'pointer', '&:hover .q-text': { color: '#2563eb' } }} onClick={() => sendMessage(m.content)}>
                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Typography sx={{ fontSize: '0.6rem' }}>🕐</Typography>
                        </Box>
                        <Box>
                          <Typography className="q-text" sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text2)', transition: 'color 0.15s' }}>{m.content}</Typography>
                          <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8' }}>{t('justNow')}</Typography>
                        </Box>
                      </Box>
                    ))}
                    {chatMessages.filter(m => m.role === 'user').length === 0 && (
                      <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', py: 2 }}>{t('noQuestionsYet')}</Typography>
                    )}
                  </Paper>

                  {/* Pro Tip */}
                  <Paper elevation={0} sx={{ border: 'none', borderRadius: 2.5, p: 2, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: 'white', mb: 0.5 }}>💡 {t('proTip')}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
                      {t('proTipText')}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
  );
}
