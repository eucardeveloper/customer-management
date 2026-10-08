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

interface AuthResponse {
  username: string;
  role: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function LoginPage() {
  const router = useRouter();
  const mounted = useMounted();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Invalid username or password');
      }

      const data: AuthResponse = await res.json();
      saveAuth({ username: data.username, role: data.role });
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
      }}
    >
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
            <Typography sx={{ fontWeight: 700 }} variant="h5" color="text.primary">Customer Management</Typography>
            <Typography variant="body2" color="text.secondary">Sign in to your account</Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          {/* Demo credentials hint */}
          <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(21,101,192,0.06)', border: '1px solid rgba(21,101,192,0.2)' }}>
            <Typography variant="caption" color="primary" sx={{ display: "block", fontWeight: 700, mb: 0.5 }}>
              Demo Credentials
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box>
                <Typography sx={{ display: "block" }} variant="caption" color="text.secondary">Admin</Typography>
                <Typography variant="caption" sx={{ display: "block", fontWeight: 600, fontFamily: 'monospace' }}>admin / admin123</Typography>
              </Box>
              <Box>
                <Typography sx={{ display: "block" }} variant="caption" color="text.secondary">User</Typography>
                <Typography variant="caption" sx={{ display: "block", fontWeight: 600, fontFamily: 'monospace' }}>user1 / user123</Typography>
              </Box>
            </Box>
          </Box>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={3}>
              <TextField
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required fullWidth autoFocus autoComplete="username" variant="outlined"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start"><PersonOutlineIcon color="action" /></InputAdornment>
                    ),
                  },
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                placeholder="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required fullWidth autoComplete="current-password" variant="outlined"
                slotProps={{
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
                disabled={loading || !username || !password}
                sx={{
                  py: 1.5, borderRadius: 2, fontWeight: 600, fontSize: '1rem',
                  background: 'linear-gradient(135deg, #1d4ed8, #12315c)',
                  '&:hover': { background: 'linear-gradient(135deg, #0d47a1, #0b1f3a)' },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" align="center" sx={{ mt: 3, color: 'text.secondary' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'none' }}>
              Create account
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
