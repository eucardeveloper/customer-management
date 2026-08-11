'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Alert,
  Snackbar,
  CircularProgress,
  InputAdornment,
  Tooltip,
  Divider,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import StorefrontIcon from '@mui/icons-material/Storefront';
import RefreshIcon from '@mui/icons-material/Refresh';

const DRAWER_WIDTH = 240;
const KUNDEN_URL = 'https://kundenverwaltung-production.up.railway.app/api/kunden';
const BESTELLUNG_URL = 'https://bestellungservice-production.up.railway.app/api/bestellungen';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1d4ed8', dark: '#1e3a8a', light: '#3b82f6' },
    secondary: { main: '#7c3aed' },
    background: { default: '#f8fafc', paper: '#ffffff' },
  },
  typography: { fontFamily: '"Inter", "Roboto", sans-serif' },
  shape: { borderRadius: 10 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#1d4ed8',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0f172a',
          color: 'white',
          borderRight: 'none',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#f1f5f9',
            fontWeight: 700,
            color: '#334155',
            fontSize: '0.8rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          },
        },
      },
    },
  },
});

interface Kunde {
  id: number;
  ad: string;
  soyad: string;
  email: string;
  telefon: string;
}

interface Bestellung {
  id: number;
  kundeId: number;
  urunAdi: string;
  fiyat: number;
  miktar: number;
  tarih: string;
}

const emptyKunde: Omit<Kunde, 'id'> = { ad: '', soyad: '', email: '', telefon: '' };

export default function Home() {
  const [tab, setTab] = useState<'kunden' | 'bestellungen'>('kunden');
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [bestellungen, setBestellungen] = useState<Bestellung[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editKunde, setEditKunde] = useState<Partial<Kunde>>(emptyKunde);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchKunden = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(KUNDEN_URL);
      const data = await res.json();
      setKunden(data);
    } catch {
      showSnackbar('Müşteriler yüklenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBestellungen = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(BESTELLUNG_URL);
      const data = await res.json();
      setBestellungen(data);
    } catch {
      showSnackbar('Siparişler yüklenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'kunden') fetchKunden();
    else fetchBestellungen();
  }, [tab, fetchKunden, fetchBestellungen]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSave = async () => {
    try {
      if (isEditing && editKunde.id) {
        await fetch(`${KUNDEN_URL}/${editKunde.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editKunde),
        });
        showSnackbar('Müşteri güncellendi.', 'success');
      } else {
        await fetch(KUNDEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editKunde),
        });
        showSnackbar('Müşteri eklendi.', 'success');
      }
      setDialogOpen(false);
      fetchKunden();
    } catch {
      showSnackbar('İşlem başarısız.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`${KUNDEN_URL}/${deleteId}`, { method: 'DELETE' });
      showSnackbar('Müşteri silindi.', 'success');
      setDeleteDialogOpen(false);
      fetchKunden();
    } catch {
      showSnackbar('Silme başarısız.', 'error');
    }
  };

  const openAdd = () => {
    setEditKunde(emptyKunde);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const openEdit = (k: Kunde) => {
    setEditKunde(k);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const openDelete = (id: number) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const filteredKunden = kunden.filter(
    (k) =>
      k.ad.toLowerCase().includes(search.toLowerCase()) ||
      k.soyad.toLowerCase().includes(search.toLowerCase()) ||
      k.email.toLowerCase().includes(search.toLowerCase())
  );

  const getKundeName = (id: number) => {
    const k = kunden.find((k) => k.id === id);
    return k ? `${k.ad} ${k.soyad}` : `ID: ${id}`;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>

        {/* Sidebar */}
        <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}>
          <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <StorefrontIcon sx={{ fontSize: 20, color: 'white' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="white">
                  Müşteri Yönetimi
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>
                  Microservices · Railway
                </Typography>
              </Box>
            </Box>
          </Box>

          <List sx={{ px: 1, pt: 2 }}>
            {[
              { key: 'kunden', label: 'Müşteriler', icon: <PeopleIcon /> },
              { key: 'bestellungen', label: 'Siparişler', icon: <ShoppingCartIcon /> },
            ].map((item) => (
              <ListItem key={item.key} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={tab === item.key}
                  onClick={() => setTab(item.key as 'kunden' | 'bestellungen')}
                  sx={{
                    borderRadius: 2,
                    color: 'rgba(255,255,255,0.6)',
                    '&.Mui-selected': {
                      bgcolor: 'rgba(59,130,246,0.2)',
                      color: '#93c5fd',
                      '& .MuiListItemIcon-root': { color: '#93c5fd' },
                    },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: 'white' },
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} slotProps={{ primary: { fontSize: '0.875rem', fontWeight: 500 } }} />
                  {item.key === 'kunden' && (
                    <Chip label={kunden.length} size="small" sx={{ bgcolor: 'rgba(59,130,246,0.3)', color: '#93c5fd', fontSize: '0.7rem', height: 20 }} />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem' }}>
              Apache Kafka · Spring Cloud Gateway · PostgreSQL
            </Typography>
          </Box>
        </Drawer>

        {/* Main */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <AppBar position="sticky" elevation={0}>
            <Toolbar>
              <Typography variant="h6" fontWeight={700} sx={{ flex: 1, fontSize: '1rem' }}>
                {tab === 'kunden' ? 'Müşteriler' : 'Siparişler'}
              </Typography>
              <Chip
                label="● Canlı"
                size="small"
                sx={{ bgcolor: 'rgba(34,197,94,0.2)', color: '#86efac', fontSize: '0.7rem', mr: 1 }}
              />
            </Toolbar>
          </AppBar>

          <Container maxWidth="xl" sx={{ py: 3, flex: 1 }}>

            {/* Toolbar */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder={tab === 'kunden' ? 'Ad, soyad veya e-posta ara...' : 'Ürün ara...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 18, color: 'grey.400' }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ width: 320, bgcolor: 'white', borderRadius: 2 }}
              />
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Yenile">
                <IconButton onClick={() => tab === 'kunden' ? fetchKunden() : fetchBestellungen()} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              {tab === 'kunden' && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openAdd}
                  disableElevation
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Yeni Müşteri
                </Button>
              )}
            </Box>

            {/* Table */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress color="primary" />
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {tab === 'kunden' ? (
                        <>
                          <TableCell>Müşteri</TableCell>
                          <TableCell>E-posta</TableCell>
                          <TableCell>Telefon</TableCell>
                          <TableCell>ID</TableCell>
                          <TableCell align="right">İşlemler</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>Ürün</TableCell>
                          <TableCell>Müşteri</TableCell>
                          <TableCell>Fiyat</TableCell>
                          <TableCell>Miktar</TableCell>
                          <TableCell>Tarih</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tab === 'kunden'
                      ? filteredKunden.map((k) => (
                          <TableRow key={k.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: '0.8rem' }}>
                                  {k.ad[0]}{k.soyad[0]}
                                </Avatar>
                                <Typography variant="body2" fontWeight={600}>
                                  {k.ad} {k.soyad}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">{k.email}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">{k.telefon}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={`#${k.id}`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontSize: '0.7rem' }} />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Düzenle">
                                <IconButton size="small" onClick={() => openEdit(k)} sx={{ color: 'primary.main', mr: 0.5 }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Sil">
                                <IconButton size="small" onClick={() => openDelete(k.id)} sx={{ color: 'error.main' }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      : bestellungen
                          .filter((b) => b.urunAdi.toLowerCase().includes(search.toLowerCase()))
                          .map((b) => (
                            <TableRow key={b.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>{b.urunAdi}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">{getKundeName(b.kundeId)}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={`${b.fiyat.toLocaleString('tr-TR')} ₺`}
                                  size="small"
                                  sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 600, fontSize: '0.75rem' }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{b.miktar} adet</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(b.tarih).toLocaleDateString('tr-TR')}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Container>
        </Box>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {isEditing ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Ad"
                  fullWidth
                  size="small"
                  value={editKunde.ad || ''}
                  onChange={(e) => setEditKunde({ ...editKunde, ad: e.target.value })}
                />
                <TextField
                  label="Soyad"
                  fullWidth
                  size="small"
                  value={editKunde.soyad || ''}
                  onChange={(e) => setEditKunde({ ...editKunde, soyad: e.target.value })}
                />
              </Box>
              <TextField
                label="E-posta"
                fullWidth
                size="small"
                value={editKunde.email || ''}
                onChange={(e) => setEditKunde({ ...editKunde, email: e.target.value })}
              />
              <TextField
                label="Telefon"
                fullWidth
                size="small"
                value={editKunde.telefon || ''}
                onChange={(e) => setEditKunde({ ...editKunde, telefon: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>İptal</Button>
            <Button variant="contained" onClick={handleSave} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
              {isEditing ? 'Güncelle' : 'Ekle'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight={700}>Müşteri Sil</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>İptal</Button>
            <Button variant="contained" color="error" onClick={handleDelete} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
              Sil
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}