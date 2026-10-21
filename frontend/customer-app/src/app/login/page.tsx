'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  IconButton,
  Alert,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/Person';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { saveAuth } from '@/lib/auth';
import { useMounted } from '@/lib/useMounted';
import { fetchWithStartupRetry, isTransientStatus, STARTING_MESSAGE } from '@/lib/loginRequest';
import { useLang } from '@/lib/useLang';
import { useTranslation } from '@/app/translations';
import { LangPills } from '@/components/LangPills';

interface AuthResponse {
  username: string;
  role: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
// Build-time opt-in: the demo-account hint is only compiled in when explicitly requested (docker compose does, a hosted build does not).
const SHOW_DEMO_LOGIN = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === 'true';
// A hosted demo can show only the read-only account (the admin password stays private): build with NEXT_PUBLIC_DEMO_ADMIN_HINT=false.
const SHOW_DEMO_ADMIN = process.env.NEXT_PUBLIC_DEMO_ADMIN_HINT !== 'false';
// Same for the sign-up link: public registration is off on the server unless AUTH_REGISTRATION_ENABLED is set.
const ALLOW_REGISTER = process.env.NEXT_PUBLIC_ALLOW_REGISTER === 'true';

export default function LoginPage() {
  const router = useRouter();
  const mounted = useMounted();
  const [lang, setLang] = useLang();
  const { t } = useTranslation(lang);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // The app sends users here with ?expired=1 when the server no longer accepts their session.
  const sessionExpired = mounted && new URLSearchParams(window.location.search).get('expired') === '1';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Read the real field values: browser autofill fills the inputs without always firing onChange,
    // so React state can still be empty even though the fields look filled.
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const user = String(form.get('username') ?? username).trim();
    const pass = String(form.get('password') ?? password);
    if (!user || !pass) { setError(t('enterCredentials')); return; }
    setError('');
    setLoading(true);

    try {
      const res = await fetchWithStartupRetry(fetch, `${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: user, password: pass }),
      });

      if (isTransientStatus(res.status)) throw new Error(STARTING_MESSAGE);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || t('invalidCredentials'));
      }

      const data: AuthResponse = await res.json();
      saveAuth({ username: data.username, role: data.role });
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? (err.message === STARTING_MESSAGE ? t('serverStarting') : err.message) : t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0b1f3a 0%, #12315c 50%, #1d4ed8 100%)',
        p: 2,
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}><LangPills lang={lang} onChange={setLang} /></Box>
      <Card elevation={24} sx={{ width: '100%', maxWidth: 420, borderRadius: 3, overflow: 'visible' }}>
        <CardContent sx={{ p: 5 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 4 }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1d4ed8, #12315c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(21,101,192,0.4)',
            }}>
              <LockOutlinedIcon sx={{ color: '#fff', fontSize: 32 }} />
            </Box>
            <Typography sx={{ fontWeight: 700 }} variant="h5" color="text.primary">{t('signInTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('signInSubtitle')}</Typography>
          </Box>

          {sessionExpired && !error && <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>{t('sessionEnded')}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          {/* Demo credentials hint (build-time opt-in) */}
          {SHOW_DEMO_LOGIN && (
          <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(21,101,192,0.06)', border: '1px solid rgba(21,101,192,0.2)' }}>
            <Typography variant="caption" color="primary" sx={{ display: "block", fontWeight: 700, mb: 0.5 }}>
              {t('demoCredentials')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              {SHOW_DEMO_ADMIN && (
              <Box>
                <Typography sx={{ display: "block" }} variant="caption" color="text.secondary">{t('demoAdmin')}</Typography>
                <Typography variant="caption" sx={{ display: "block", fontWeight: 600, fontFamily: 'monospace' }}>admin / admin123</Typography>
              </Box>
              )}
              <Box>
                <Typography sx={{ display: "block" }} variant="caption" color="text.secondary">{SHOW_DEMO_ADMIN ? t('demoUser') : t('demoReadOnly')}</Typography>
                <Typography variant="caption" sx={{ display: "block", fontWeight: 600, fontFamily: 'monospace' }}>user1 / user123</Typography>
              </Box>
            </Box>
          </Box>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={3}>
              <TextField
                placeholder={t('username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required fullWidth autoFocus autoComplete="username" variant="outlined"
                slotProps={{
                  htmlInput: { name: 'username', 'aria-label': t('username') },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start"><PersonOutlineIcon color="action" /></InputAdornment>
                    ),
                  },
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                placeholder={t('password')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required fullWidth autoComplete="current-password" variant="outlined"
                slotProps={{
                  htmlInput: { name: 'password', 'aria-label': t('password') },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start"><LockOutlinedIcon color="action" /></InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" tabIndex={-1}>
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <Button
                type="submit" variant="contained" size="large" fullWidth
                disabled={loading}
                sx={{
                  py: 1.5, borderRadius: 2, fontWeight: 600, fontSize: '1rem',
                  background: 'linear-gradient(135deg, #1d4ed8, #12315c)',
                  '&:hover': { background: 'linear-gradient(135deg, #0d47a1, #0b1f3a)' },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : t('signIn')}
              </Button>
            </Stack>
          </Box>

          {ALLOW_REGISTER && (
          <Typography variant="body2" align="center" sx={{ mt: 3, color: 'text.secondary' }}>
            {t('noAccount')}{' '}
            <Link href="/register" style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'none' }}>
              {t('createAccountLink')}
            </Link>
          </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
