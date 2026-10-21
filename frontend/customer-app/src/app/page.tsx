'use client';
import { useTranslation, translate, type Lang } from './translations';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { api } from '@/lib/api';
import { translateServerMessage } from '@/lib/serverMessages';
import { usePersistedPref } from '@/lib/usePersistedPref';
import { downloadXlsx } from '@/lib/exportXlsx';
import { useLang } from '@/lib/useLang';
import { getAuthUser, logout } from '@/lib/auth';
import { useAuthUser } from '@/lib/useAuthUser';
import { useMounted } from '@/lib/useMounted';
import { useState, useEffect, useCallback, useRef } from 'react';
import { percentShares } from '@/lib/percent';
import {
  sumRevenue, isPending, countByStatus, trendWindows, deliveredRateChange, monthlyRevenue, dailyRevenue,
  topCustomersByRevenue, monthlySeries,
} from '@/lib/orderStats';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { ThemeOptions } from '@mui/material/styles';
import {
  Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, Avatar, ThemeProvider, createTheme, GlobalStyles,
  CssBaseline, Alert, Snackbar, CircularProgress, InputAdornment, Tooltip, Divider,
  Select, MenuItem, FormControl, InputLabel, Card, CardContent, ToggleButton, ToggleButtonGroup, SwipeableDrawer,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import StorefrontIcon from '@mui/icons-material/Storefront';
import RefreshIcon from '@mui/icons-material/Refresh';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SendIcon from '@mui/icons-material/Send';
import DownloadIcon from '@mui/icons-material/Download';
import BarChartIcon from '@mui/icons-material/BarChart';
import CloseIcon from '@mui/icons-material/Close';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import LockResetIcon from '@mui/icons-material/LockReset';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { pctChange } from '@/lib/trend';

const DRAWER_WIDTH = 256;

const SIDEBAR_BG = '#0b1f3a';
const SIDEBAR_HOVER = 'rgba(255,255,255,0.06)';
const SIDEBAR_ACTIVE = 'rgba(37,99,235,0.18)';
const HEADER_BG = 'var(--surface)';

const LIGHT_VARS = {
  '--page': '#f1f5f9', '--surface': '#ffffff', '--surface-2': '#f1f5f9', '--text': '#0f172a', '--text2': '#475569', '--border': '#e2e8f0', '--grid': '#e9eef5', '--icon': '#94a3b8', '--head-tx': '#475569',
  '--blue-bg': '#eff6ff', '--blue-bd': '#bfdbfe', '--blue-tx': '#1d4ed8',
  '--green-bg': '#f0fdf4', '--green-bd': '#bbf7d0', '--green-tx': '#15803d',
  '--amber-bg': '#fffbeb', '--amber-bd': '#fde68a', '--amber-tx': '#b45309',
  '--red-bg': '#fef2f2', '--red-bd': '#fecaca', '--red-tx': '#dc2626',
  '--sky-bg': '#f0f9ff', '--sky-bd': '#bae6fd', '--violet-bg': '#faf5ff', '--violet-bd': '#e9d5ff',
};
const DARK_VARS = {
  '--page': '#0b1220', '--surface': '#111c2e', '--surface-2': '#17243a', '--text': '#e5edf8', '--text2': '#cbd5e1', '--border': '#263449', '--grid': '#1e2c43', '--icon': '#7c8ca5', '--head-tx': '#a8b8d0',
  '--blue-bg': 'rgba(59,130,246,0.16)', '--blue-bd': 'rgba(59,130,246,0.40)', '--blue-tx': '#93c5fd',
  '--green-bg': 'rgba(16,185,129,0.16)', '--green-bd': 'rgba(16,185,129,0.40)', '--green-tx': '#6ee7b7',
  '--amber-bg': 'rgba(245,158,11,0.16)', '--amber-bd': 'rgba(245,158,11,0.40)', '--amber-tx': '#fcd34d',
  '--red-bg': 'rgba(239,68,68,0.16)', '--red-bd': 'rgba(239,68,68,0.40)', '--red-tx': '#fca5a5',
  '--sky-bg': 'rgba(14,165,233,0.16)', '--sky-bd': 'rgba(14,165,233,0.40)', '--violet-bg': 'rgba(139,92,246,0.16)', '--violet-bd': 'rgba(139,92,246,0.40)',
};

const baseThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: { main: '#2563eb', dark: '#1d4ed8', light: '#60a5fa' },
    secondary: { main: '#0ea5e9' },
    background: { default: 'var(--surface-2)', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h6: { fontWeight: 700, letterSpacing: '-0.02em' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: HEADER_BG,
          backgroundImage: 'none',
          color: 'var(--text)',
          boxShadow: 'none',
          borderBottom: '1px solid var(--border)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: SIDEBAR_BG,
          color: 'white',
          borderRight: 'none',
          boxShadow: '2px 0 20px rgba(0,0,0,0.15)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: 'var(--surface-2)',
            fontWeight: 700,
            color: 'var(--head-tx)',
            fontSize: '0.72rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            borderTop: 'none',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: 'var(--surface-2)' },
          '& .MuiTableCell-body': { height: 54 },
          transition: 'background-color 0.12s',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid var(--grid)', padding: '10px 20px', fontVariantNumeric: 'tabular-nums',
          // one alignment rule: every column (header and cells, Actions included) is centred; text columns keep their text left-aligned inside a block that is centred in the column (see the textBlock wrappers)
          textAlign: 'center',
          '&.MuiTableCell-alignRight': { textAlign: 'center' },
          '&.MuiTableCell-alignLeft': { textAlign: 'center' },
          // visible vertical divider between columns, header included
          '&:not(:last-child)': { borderRight: '1px solid var(--border)' },
          // screens narrower than the widest table: keep the Actions column (last) pinned so it stays reachable while the table scrolls sideways
          '@media (max-width:1600px)': { '&:last-child': { position: 'sticky', right: 0, backgroundColor: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 1 } },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '-0.01em',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
};

const theme = createTheme(baseThemeOptions);
const darkTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    ...baseThemeOptions.palette,
    mode: 'dark',
    background: { default: '#0b1220', paper: '#111c2e' },
  },
});

interface Customer { id: number; firstName: string; lastName: string; email: string; phone: string; customerType?: string; }
interface Order { id: number; customerId: number; productName: string; price: number; quantity: number; date: string; status?: string; }
interface ChatMessage { role: 'user' | 'assistant'; content: string; }
interface UserItem { id: number; username: string; email: string; role: string; }

const emptyCustomer: Omit<Customer, 'id'> = { firstName: '', lastName: '', email: '', phone: '', customerType: 'INDIVIDUAL' };
type CustomerType = 'individual' | 'company';
const emptyOrder = { customerId: '', productName: '', price: '', quantity: '', status: 'PENDING' };
const getQuickQuestionsAdmin = (t: (k: string) => string) => [t('aiQ1'), t('aiQ2'), t('aiQ3'), t('aiQ4')];
const getQuickQuestionsUser = (t: (k: string) => string) => [t('aiQ5'), t('aiQ6'), t('aiQ3'), t('aiQ7')];
const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

// One label per status, used by chips, charts and dropdowns so they can never disagree.
const statusText = (status: string, tFn: (k: string) => string) =>
  ({ PENDING: tFn('pending'), PROCESSING: tFn('processing'), SHIPPED: tFn('shipped'), DELIVERED: tFn('delivered'), CANCELLED: tFn('cancelled') } as Record<string, string>)[status] ?? status;

// A customer is a company when the data says COMPANY or CORPORATE (the seed data uses CORPORATE).
const isCompany = (c: { customerType?: string }) => c.customerType === 'COMPANY' || c.customerType === 'CORPORATE';

const statusChip = (status?: string, tFn?: (k: string) => string) => {
  const s = status ?? 'PENDING';
  const map: Record<string, { bg: string; color: string; border: string }> = {
    PENDING:   { bg: 'var(--amber-bg)', color: 'var(--amber-tx)', border: 'var(--amber-bd)' },
    PROCESSING: { bg: 'var(--surface-2)', color: 'var(--text2)', border: '#cbd5e1' },
    SHIPPED:   { bg: 'var(--blue-bg)', color: 'var(--blue-tx)', border: 'var(--blue-bd)' },
    DELIVERED: { bg: 'var(--green-bg)', color: 'var(--green-tx)', border: 'var(--green-bd)' },
    CANCELLED: { bg: 'var(--red-bg)', color: 'var(--red-tx)', border: 'var(--red-bd)' },
  };
  const style = map[s] ?? { bg: 'var(--surface-2)', color: '#64748b', border: 'var(--border)' };
  const labelMap: Record<string, string> = {
    PENDING: tFn ? tFn('pending') : 'Pending',
    PROCESSING: tFn ? tFn('processing') : 'Processing',
    SHIPPED: tFn ? tFn('shipped') : 'Shipped',
    DELIVERED: tFn ? tFn('delivered') : 'Delivered',
    CANCELLED: tFn ? tFn('cancelled') : 'Cancelled',
  };
  const chipLabel = labelMap[s] ?? s;
  return <Chip label={chipLabel} size="small" sx={{ bgcolor: style.bg, color: style.color, border: `1px solid ${style.border}`, fontWeight: 700, fontSize: '0.68rem', height: 22 }} />;
};

const customerTypeChip = (c: Customer, tFn?: (k: string) => string) => {
  const type = c.customerType ?? (c.lastName?.trim() ? 'INDIVIDUAL' : 'COMPANY');
  const indLabel = tFn ? tFn('individual') : 'Individual';
  const comLabel = tFn ? tFn('company') : 'Company';
  if (type === 'INDIVIDUAL') return <Chip label={indLabel} size="small" sx={{ bgcolor: 'var(--blue-bg)', color: 'var(--blue-tx)', border: '1px solid var(--blue-bd)', fontSize: '0.7rem', fontWeight: 600 }} />;
  return <Chip label={comLabel} size="small" sx={{ bgcolor: 'var(--violet-bg)', color: '#7c3aed', border: '1px solid var(--violet-bd)', fontSize: '0.7rem', fontWeight: 600 }} />;
};

const formatDate = (dateStr: string, lang: Lang = 'en') => {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return dateStr; }
};

export default function Home() {
  const [tab, setTab] = useState<'dashboard' | 'customers' | 'orders' | 'ai' | 'analytics' | 'users'>('dashboard');
  const [lang, setLang] = useLang();
  const dateLocale = lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : 'en-US';
  // data loaders read the language through a ref so that switching language does not reload the data
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);
  const { t } = useTranslation(lang);
  const [drawerCustomer, setDrawerCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const currentUser = useAuthUser();
  const [loading, setLoading] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [ordSearch, setOrdSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [custPage, setCustPage] = useState(0);
  const [custRowsPerPage, setCustRowsPerPage] = useState(10);
  const [ordPage, setOrdPage] = useState(0);
  const [ordRowsPerPage, setOrdRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Partial<Customer>>(emptyCustomer);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [customerType, setCustomerType] = useState<CustomerType>('individual');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderDeleteDialogOpen, setOrderDeleteDialogOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<{ customerId: string; productName: string; price: string; quantity: string; status: string; date?: string }>(emptyOrder);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editOrderId, setEditOrderId] = useState<number | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'USER' });
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  // One dialog serves both flows: 'self' (change my own password) and 'reset' (admin sets someone else's).
  const [pwDialog, setPwDialog] = useState<{ mode: 'self' | 'reset'; userId?: number; username?: string } | null>(null);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const openPwDialog = (d: { mode: 'self' | 'reset'; userId?: number; username?: string }) => {
    setPwForm({ current: '', next: '', confirm: '' }); setPwError(''); setPwDialog(d);
  };
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState('USER');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const mounted = useMounted();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [chartMode, setChartMode] = useState<'daily' | 'monthly'>('monthly');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarPref, setSidebarPref] = usePersistedPref('sidebarOpen', '1');
  const sidebarOpen = sidebarPref !== '0';
  const [colorPref, setColorPref] = usePersistedPref('colorMode', 'light');
  const colorMode: 'light' | 'dark' = colorPref === 'dark' ? 'dark' : 'light';
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', colorMode);
  }, [colorMode]);
  const toggleColorMode = () => setColorPref(colorMode === 'dark' ? 'light' : 'dark');
  const gridC = colorMode === 'dark' ? '#263449' : '#f1f5f9';
  const tick2C = colorMode === 'dark' ? '#cbd5e1' : '#475569';
  const toggleSidebar = () => {
    if (isMobile) { setMobileOpen(true); return; }
    setSidebarPref(sidebarOpen ? '0' : '1');
  };
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => setSnackbar({ open: true, message, severity }), []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try { const data = await api.get<Customer[]>('/api/customers'); setCustomers(Array.isArray(data) ? data : []); }
    catch { showSnackbar(translate(langRef.current, 'failedLoadCustomers'), 'error'); }
    finally { setLoading(false); }
  }, [showSnackbar]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try { const data = await api.get<Order[]>('/api/orders'); setOrders(Array.isArray(data) ? data : []); setNow(Date.now()); }
    catch { showSnackbar(translate(langRef.current, 'failedLoadOrders'), 'error'); }
    finally { setLoading(false); }
  }, [showSnackbar]);

  const fetchUsers = useCallback(async () => {
    try { const data = await api.get<UserItem[]>('/api/users'); setUsers(Array.isArray(data) ? data : []); }
    catch { /* silently ignore if not ADMIN */ }
  }, []);

  useEffect(() => {
    const user = getAuthUser();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    fetchCustomers();
    fetchOrders();
    if (user?.role === 'ADMIN') fetchUsers();
  }, [fetchCustomers, fetchOrders, fetchUsers]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag is set by the fetcher; this is the data load for the active tab
    if (tab === 'customers') fetchCustomers();
    else if (tab === 'orders') { fetchOrders(); fetchCustomers(); }
    else if (tab === 'users') fetchUsers();
  }, [tab, fetchCustomers, fetchOrders, fetchUsers]);

  const totalRevenue = sumRevenue(orders);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  const validateCustomer = () => {
    const errors: Record<string, string> = {};
    if (customerType === 'individual') {
      if (!editCustomer.firstName?.trim()) errors.firstName = t('firstNameRequired');
      if (!editCustomer.lastName?.trim()) errors.lastName = t('lastNameRequired');
    } else {
      if (!editCustomer.firstName?.trim()) errors.firstName = t('companyNameRequired');
    }
    if (!editCustomer.email?.trim() && !editCustomer.phone?.trim()) {
      errors.email = t('emailOrPhoneRequired');
      errors.phone = t('emailOrPhoneRequired');
    }
    const email = editCustomer.email?.trim();
    const phone = editCustomer.phone?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = t('emailInvalid');
    if (phone && !/^[+0-9 ()-]{5,20}$/.test(phone)) errors.phone = t('phoneInvalid');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateCustomer()) return;
    try {
      const payload = { ...editCustomer, lastName: customerType === 'company' ? '' : editCustomer.lastName || '', customerType: customerType === 'company' ? 'COMPANY' : 'INDIVIDUAL' };
      if (isEditing && editCustomer.id) { await api.put(`/api/customers/${editCustomer.id}`, payload); showSnackbar(t('saved'), 'success'); }
      else { await api.post('/api/customers', payload); showSnackbar(t('saved'), 'success'); }
      setDialogOpen(false); fetchCustomers();
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      showSnackbar(m && !m.startsWith('HTTP') ? translateServerMessage(lang, m) : t('error'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    // Customers and orders live in separate services, so the customer service cannot see orders:
    // never leave orphan orders behind (they would still count towards revenue).
    const linkedOrders = orders.filter(o => o.customerId === deleteId).length;
    if (linkedOrders > 0) { showSnackbar(`${t('customerHasOrders')} (${linkedOrders})`, 'error'); setDeleteDialogOpen(false); return; }
    try { await api.delete(`/api/customers/${deleteId}`); showSnackbar(t('deleted'), 'success'); setDeleteDialogOpen(false); fetchCustomers(); }
    catch { showSnackbar(t('deleteFailed'), 'error'); }
  };

  const handleSaveOrder = async () => {
    const customerId = parseInt(editOrder.customerId);
    const price = parseFloat(editOrder.price);
    const quantity = parseInt(editOrder.quantity);
    if (!editOrder.productName.trim()) { showSnackbar(t('productNameRequired'), 'error'); return; }
    if (isNaN(customerId) || customerId <= 0) { showSnackbar(t('customerIdRequired'), 'error'); return; }
    if (isNaN(price) || price < 0) { showSnackbar(t('priceRequired'), 'error'); return; }
    if (isNaN(quantity) || quantity <= 0) { showSnackbar(t('quantityRequired'), 'error'); return; }
    try {
      const body: Record<string, unknown> = { customerId, productName: editOrder.productName.trim(), price, quantity, status: editOrder.status || 'PENDING' };
      if (isEditingOrder && editOrderId) {
        if (editOrder.date) body.date = editOrder.date;
        await api.put(`/api/orders/${editOrderId}`, body); showSnackbar(t('saved'), 'success');
      }
      else { await api.post('/api/orders', body); showSnackbar(t('saved'), 'success'); }
      setOrderDialogOpen(false); fetchOrders();
    } catch { showSnackbar(t('error'), 'error'); }
  };

  const handleDeleteOrder = async () => {
    if (!deleteOrderId) return;
    try { await api.delete(`/api/orders/${deleteOrderId}`); showSnackbar(t('deleted'), 'success'); setOrderDeleteDialogOpen(false); fetchOrders(); }
    catch { showSnackbar(t('deleteFailed'), 'error'); }
  };

  const submitPassword = async () => {
    if (!pwDialog) return;
    if (pwDialog.mode === 'self' && !pwForm.current) { setPwError(t('allFieldsRequired')); return; }
    if (pwForm.next.length < 8) { setPwError(t('passwordMin8')); return; }
    if (pwForm.next.length > 72) { setPwError(t('passwordMax72')); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError(t('passwordsDontMatch')); return; }
    setPwBusy(true); setPwError('');
    try {
      if (pwDialog.mode === 'self') await api.post('/api/auth/password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      else await api.put(`/api/users/${pwDialog.userId}/password`, { newPassword: pwForm.next });
      showSnackbar(t(pwDialog.mode === 'self' ? 'passwordChanged' : 'passwordReset'), 'success');
      setPwDialog(null);
      // A password change ends every session of that account on the server, including this one.
      if (pwDialog.mode === 'self' || pwDialog.username === currentUser?.username) {
        setTimeout(() => { void logout().finally(() => { window.location.replace('/login'); }); }, 1500);
      }
    } catch (e) {
      // The server's own message ("Current password is incorrect", throttle notice) is safe to show.
      setPwError(e instanceof Error && e.message && !e.message.startsWith('HTTP ') ? translateServerMessage(lang, e.message) : t('passwordFailed'));
    } finally { setPwBusy(false); }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    try { await api.delete(`/api/users/${deleteUserId}`); showSnackbar(t('userDeleted'), 'success'); setDeleteUserDialogOpen(false); fetchUsers(); }
    catch { showSnackbar(t('deleteFailed'), 'error'); }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) { showSnackbar(t('allFieldsRequired'), 'error'); return; }
    try { await api.post('/api/auth/register', { username: newUser.username, email: newUser.email, password: newUser.password, role: newUser.role }); showSnackbar(t('userCreated'), 'success'); setAddUserDialogOpen(false); setNewUser({ username: '', email: '', password: '', role: 'USER' }); fetchUsers(); }
    catch { showSnackbar(t('createFailed'), 'error'); }
  };

  const handleUpdateRole = async () => {
    if (!selectedUserId) return;
    try { await api.patch(`/api/users/${selectedUserId}/role`, { role: selectedRole }); showSnackbar(t('roleUpdated'), 'success'); setRoleDialogOpen(false); fetchUsers(); }
    catch { showSnackbar(t('roleUpdateFailed'), 'error'); }
  };

  const openAdd = () => { setEditCustomer(emptyCustomer); setIsEditing(false); setCustomerType('individual'); setFormErrors({}); setDialogOpen(true); };
  const openEdit = (c: Customer) => { setEditCustomer(c); setIsEditing(true); setFormErrors({}); const type = c.customerType ?? (c.lastName?.trim() ? 'INDIVIDUAL' : 'COMPANY'); setCustomerType(type === 'COMPANY' ? 'company' : 'individual'); setDialogOpen(true); };
  const openDelete = (id: number) => { setDeleteId(id); setDeleteDialogOpen(true); };
  const openAddOrder = () => { setEditOrder(emptyOrder); setIsEditingOrder(false); setEditOrderId(null); setOrderDialogOpen(true); };
  const openEditOrder = (o: Order) => { setEditOrder({ customerId: o.customerId.toString(), productName: o.productName, price: o.price.toString(), quantity: o.quantity.toString(), status: o.status ?? 'PENDING', date: o.date }); setIsEditingOrder(true); setEditOrderId(o.id); setOrderDialogOpen(true); };
  const openDeleteOrder = (id: number) => { setDeleteOrderId(id); setOrderDeleteDialogOpen(true); };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    try { await api.put(`/api/orders/${orderId}`, { customerId: order.customerId, productName: order.productName, price: order.price, quantity: order.quantity, status: newStatus }); showSnackbar(t('saved'), 'success'); fetchOrders(); }
    catch { showSnackbar(t('statusUpdateFailed'), 'error'); }
  };

  const filteredCustomers = [...customers].sort((x, y) => (x.id ?? 0) - (y.id ?? 0)).filter(c => { const q = custSearch.toLowerCase(); if (!q) return true; return `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q) || (c.phone ?? '').toLowerCase().includes(q); });
  const filteredOrders = [...orders].sort((x, y) => (y.id ?? 0) - (x.id ?? 0)).filter(o => { const q = ordSearch.toLowerCase(); if (!q) return true; return (o.productName ?? '').toLowerCase().includes(q) || String(o.customerId ?? '').includes(q) || (o.status ?? '').toLowerCase().includes(q); });
  // Keep the page index valid when rows disappear (delete / search), otherwise the table shows an empty page
  const custPageSafe = Math.min(custPage, Math.max(0, Math.ceil(filteredCustomers.length / custRowsPerPage) - 1));
  const ordPageSafe = Math.min(ordPage, Math.max(0, Math.ceil(filteredOrders.length / ordRowsPerPage) - 1));
  const filteredUsers = users.filter(u => { const q = userSearch.toLowerCase(); if (!q) return true; return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q); });
  const getCustomerName = (id: number) => { const c = customers.find(c => c.id === id); return c ? `${c.firstName} ${c.lastName}` : `ID: ${id}`; };

  const exportExcel = async (type: 'customers' | 'orders') => {
    const stamp = new Date().toISOString().slice(0, 10);
    const dateFormat = 'yyyy-mm-dd'; // unambiguous in every Excel locale
    const statusBadge: Record<string, { bg: string; fg: string }> = {
      PENDING: { bg: 'FEF3C7', fg: '92400E' },
      PROCESSING: { bg: 'E2E8F0', fg: '334155' },
      SHIPPED: { bg: 'DBEAFE', fg: '1E40AF' },
      DELIVERED: { bg: 'DCFCE7', fg: '166534' },
      CANCELLED: { bg: 'FEE2E2', fg: '991B1B' },
    };
    try {
      if (type === 'customers') {
        await downloadXlsx({
          fileName: `customers-${stamp}.xlsx`,
          sheetName: t('customers'),
          dateFormat,
          totalLabel: t('totalCol'),
          rows: [...customers].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)),
          columns: [
            { header: t('id'), width: 7, format: 'integer', align: 'center', value: c => c.id },
            { header: t('firstName'), width: 16, value: c => c.firstName },
            { header: t('lastName'), width: 16, value: c => c.lastName ?? '' },
            { header: t('email'), width: 30, value: c => c.email },
            { header: t('phone'), width: 18, format: 'text', value: c => c.phone },
            { header: t('type'), width: 14, align: 'center', value: c => (isCompany(c) ? t('company') : t('individual')) },
          ],
        });
      } else {
        // Money columns are only exported for ADMIN, the same rule the screen and the API apply.
        await downloadXlsx({
          fileName: `orders-${stamp}.xlsx`,
          sheetName: t('orders'),
          dateFormat,
          totalLabel: t('totalCol'),
          rows: [...orders].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)),
          columns: [
            { header: t('id'), width: 7, format: 'integer', align: 'center', value: o => o.id },
            { header: t('customer'), width: 22, value: o => getCustomerName(o.customerId) },
            { header: t('product'), width: 28, value: o => o.productName },
            ...(isAdmin ? [{ header: t('unitPrice'), width: 14, format: 'money' as const, value: (o: Order) => o.price }] : []),
            { header: t('qty'), width: 8, format: 'integer' as const, align: 'center' as const, value: (o: Order) => o.quantity },
            ...(isAdmin ? [{ header: t('totalCol'), width: 14, format: 'money' as const, total: true, value: (o: Order) => Math.round(o.price * o.quantity * 10000) / 10000 }] : []),
            { header: t('date'), width: 14, format: 'date' as const, align: 'center' as const, value: (o: Order) => (o.date ? new Date(o.date) : '') },
            { header: t('status'), width: 16, value: (o: Order) => statusText(o.status ?? 'PENDING', t), badge: (o: Order) => statusBadge[o.status ?? 'PENDING'] },
          ],
        });
      }
    } catch {
      showSnackbar(t('exportFailed'), 'error');
    }
  };

  // Analytics data
  const revenueByMonth = monthlyRevenue(orders, dateLocale).map(p => [p.label, p.value] as [string, number]);
  const revenueByDay = dailyRevenue(orders, dateLocale).map(p => [p.label, p.value] as [string, number]);

  const chartData = chartMode === 'monthly' ? revenueByMonth : revenueByDay;
  const statusCounts = countByStatus(orders, ORDER_STATUSES);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: newMessages
            .filter(m => !(m.role === 'assistant' && m.content.startsWith('⚠️')))
            .map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string })?.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data.reply ?? t('noResponse');
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('connectionFailed');
      setChatMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${t('errorWord')}: ${message}` }]);
    } finally { setChatLoading(false); }
  };

  const isAdmin = currentUser?.role === 'ADMIN';
  const sidebarItems = [
    { key: 'dashboard', label: t('dashboard'), icon: <BarChartIcon />, count: null, color: '#2563eb' },
    { key: 'customers', label: t('customers'), icon: <PeopleIcon />, count: customers.length, color: '#3b82f6' },
    { key: 'orders', label: t('orders'), icon: <ShoppingCartIcon />, count: orders.length, color: '#3b82f6' },
    { key: 'analytics', label: t('analytics'), icon: <TrendingUpIcon />, count: null, color: '#3b82f6' },
    { key: 'ai', label: t('aiAgent'), icon: <SmartToyIcon />, count: null, color: '#a78bfa' },
    ...(isAdmin ? [{ key: 'users', label: t('userManagement'), icon: <ManageAccountsIcon />, count: users.length, color: '#34d399' }] : []),
  ];

  const pageTitle = tab === 'dashboard' ? t('dashboard') : tab === 'customers' ? t('customers') : tab === 'orders' ? t('orders') : tab === 'analytics' ? t('analytics') : tab === 'users' ? t('userManagement') : t('aiAgent');

  // Stat cards per tab
  const statCards = tab === 'customers'
    ? [
        { label: t('totalCustomers2'), value: customers.length, icon: <PeopleIcon />, color: '#2563eb', bg: 'var(--blue-bg)', border: 'var(--border)' },
        { label: t('individual'), value: customers.filter(c => !isCompany(c)).length, icon: <PeopleIcon />, color: '#2563eb', bg: 'var(--blue-bg)', border: 'var(--border)' },
        { label: t('company'), value: customers.filter(isCompany).length, icon: <StorefrontIcon />, color: '#2563eb', bg: 'var(--blue-bg)', border: 'var(--border)' },
        ...(isAdmin ? [{ label: t('totalRevenue'), value: totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), icon: <AttachMoneyIcon />, color: '#2563eb', bg: 'var(--blue-bg)', border: 'var(--border)' }] : []),
      ]
    : tab === 'orders'
    ? [
        { label: t('totalOrdersLabel'), value: orders.length, icon: <ReceiptIcon />, color: '#2563eb', bg: 'var(--blue-bg)', border: 'var(--border)' },
        ...(isAdmin ? [
          { label: t('totalRevenue'), value: totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), icon: <AttachMoneyIcon />, color: '#2563eb', bg: 'var(--blue-bg)', border: 'var(--border)' },
          { label: t('avgOrderValue'), value: avgOrderValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), icon: <TrendingUpIcon />, color: '#2563eb', bg: 'var(--blue-bg)', border: 'var(--border)' },
        ] : []),
        { label: t('pendingOrders2'), value: orders.filter(isPending).length, icon: <ShoppingCartIcon />, color: '#2563eb', bg: 'var(--blue-bg)', border: 'var(--border)' },
      ]
    : [];

  if (!mounted) return null;

  return (
    <ThemeProvider theme={colorMode === 'dark' ? darkTheme : theme}>
      <CssBaseline />
      <GlobalStyles styles={{ ':root': LIGHT_VARS, ':root[data-mode="dark"]': DARK_VARS, html: { colorScheme: 'light' }, 'html[data-mode="dark"]': { colorScheme: 'dark' }, '*': { scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }, body: { backgroundColor: 'var(--page)' }, '*:focus-visible': { outline: '2px solid #3b82f6', outlineOffset: '2px' } }} />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* ── Sidebar content (shared between permanent + swipeable) ── */}
        {(() => {
          const sidebarContent = (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: SIDEBAR_BG }}>
              {/* Logo */}
              <Box sx={{ px: 2.5, pt: 3, pb: 2.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{
                    width: 38, height: 38, borderRadius: 2.5,
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
                  }}>
                    <StorefrontIcon sx={{ fontSize: 19, color: 'white' }} />
                  </Box>
                  <Box sx={{ overflow: 'hidden' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: 'white', lineHeight: 1.2, whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>CRM Platform</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem', whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase', mt: 0.2 }}>{ t('appSubtitle') }</Typography>
                  </Box>
                </Box>
              </Box>

              {/* Nav */}
              <List sx={{ px: 1.5, pt: 2, flex: 1 }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase', px: 1.5, mb: 1 }}>{t('navigation')}</Typography>
                {sidebarItems.map((item) => {
                  const active = tab === item.key;
                  return (
                    <ListItem key={item.key} disablePadding sx={{ mb: 0.3 }}>
                      <ListItemButton
                        selected={active}
                        onClick={() => { setTab(item.key as typeof tab); if (isMobile) setMobileOpen(false); }}
                        sx={{
                          borderRadius: 2,
                          color: active ? 'white' : 'rgba(255,255,255,0.45)',
                          bgcolor: active ? SIDEBAR_ACTIVE : 'transparent',
                          borderLeft: active ? '2px solid #2563eb' : '2px solid transparent',
                          pl: '14px',
                          py: 1,
                          '&:hover': { bgcolor: SIDEBAR_HOVER, color: 'rgba(255,255,255,0.85)' },
                          '&:hover .MuiListItemIcon-root': { color: 'rgba(255,255,255,0.65)' },
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <ListItemIcon sx={{ color: active ? '#60a5fa' : 'rgba(255,255,255,0.55)', minWidth: 34, transition: 'color 0.15s' }}>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.label} slotProps={{ primary: { style: { fontSize: '0.855rem', fontWeight: active ? 600 : 400, letterSpacing: active ? '-0.01em' : 'normal' } } }} />
                        {item.count !== null && (
                          <Chip label={item.count} size="small" sx={{ bgcolor: active ? 'rgba(37,99,235,0.3)' : 'rgba(255,255,255,0.1)', color: active ? '#93c5fd' : 'rgba(255,255,255,0.7)', fontSize: '0.65rem', height: 18, minWidth: 22, fontWeight: 600 }} />
                        )}
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>

              {/* User info */}
              <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {currentUser && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)', mb: 1.5 }}>
                    <Avatar sx={{ width: 34, height: 34, bgcolor: isAdmin ? 'rgba(16,185,129,0.25)' : 'rgba(37,99,235,0.25)', border: isAdmin ? '1.5px solid rgba(16,185,129,0.5)' : '1.5px solid rgba(37,99,235,0.5)', fontSize: '0.85rem', fontWeight: 700, color: isAdmin ? '#34d399' : '#60a5fa' }}>
                      {currentUser.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, overflow: 'hidden' }}>
                      <Typography sx={{ color: 'white', fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.username}</Typography>
                      <Typography sx={{ color: isAdmin ? '#34d399' : 'rgba(255,255,255,0.65)', fontSize: '0.62rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{currentUser.role}</Typography>
                    </Box>
                                        <Tooltip title={t("signOut")}>
                      <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'rgba(255,255,255,0.8)', bgcolor: 'rgba(255,255,255,0.08)' }, borderRadius: 1.5 }} onClick={() => { void logout().finally(() => { window.location.replace('/login'); }); }}>
                        <LogoutIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
                {currentUser && (
                  <Button fullWidth size="small" startIcon={<VpnKeyIcon sx={{ fontSize: 15 }} />} onClick={() => openPwDialog({ mode: 'self' })}
                    sx={{ textTransform: 'none', justifyContent: 'flex-start', color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem', fontWeight: 600, borderRadius: 2, px: 1.5, mb: 0.5, '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.08)' } }}>
                    {t('changePassword')}
                  </Button>
                )}
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.58rem', letterSpacing: '0.04em' }}>{t('springBootKafkaPostgres')}</Typography>
              </Box>
            </Box>
          );

          if (isMobile) {
            return (
              <SwipeableDrawer
                open={mobileOpen}
                onOpen={() => setMobileOpen(true)}
                onClose={() => setMobileOpen(false)}
                sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none' } }}
              >
                {sidebarContent}
              </SwipeableDrawer>
            );
          }
          return (
            <Drawer variant="persistent" open={sidebarOpen} sx={{ width: sidebarOpen ? DRAWER_WIDTH : 0, flexShrink: 0, transition: 'width 0.2s ease', '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none' } }}>
              {sidebarContent}
            </Drawer>
          );
        })()}

        {/* ── Main ── */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', bgcolor: 'var(--page)' }}>

          {/* TopBar */}
          <AppBar position="static" elevation={0}>
            <Toolbar sx={{ minHeight: '60px !important', px: { xs: 1.5, md: 2.5 } }}>
              <Tooltip title={isMobile ? t('menu') : (sidebarOpen ? t('hideMenu') : t('showMenu'))}>
                <IconButton edge="start" color="inherit" aria-label="toggle navigation" onClick={toggleSidebar} sx={{ mr: 1.5, color: 'var(--text2)' }}>
                  <MenuIcon />
                </IconButton>
              </Tooltip>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--text)' }}>{pageTitle}</Typography>
                <Typography sx={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.2, mt: 0.3 }}>
                  {tab === 'dashboard' && (isAdmin
                    ? `${customers.length} ${t('customers')} · ${orders.length} ${t('orders')} · ${totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} ${t('totalRevenue').toLowerCase()}`
                    : `${customers.length} ${t('customers')} · ${orders.length} ${t('orders')}`
                  )}
                  {tab === 'customers' && `${customers.length} ${t('total')} · ${customers.filter(isCompany).length} ${t('companies')} · ${customers.filter(c => !isCompany(c)).length} ${t('individuals')}`}
                  {tab === 'orders' && `${orders.length} ${t('total')} · ${orders.filter(o => o.status === 'DELIVERED').length} ${t('delivered')} · ${orders.filter(isPending).length} ${t('pending')}`}
                  {tab === 'analytics' && t('businessIntelligence')}
                  {tab === 'ai' && t('aiSubtitle')}
                  {tab === 'users' && `${users.length} ${t('registeredAccounts')}`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isAdmin && (
                  <Chip icon={<AdminPanelSettingsIcon sx={{ fontSize: '13px !important' }} />} label="ADMIN" size="small"
                    sx={{ bgcolor: 'var(--blue-bg)', color: 'var(--blue-tx)', fontSize: '0.68rem', border: '1px solid var(--blue-bd)', height: 24, fontWeight: 700, letterSpacing: '0.05em', '& .MuiChip-icon': { color: 'var(--blue-tx)' } }} />
                )}
                <Box sx={{ display: 'flex', borderRadius: 2, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                  {(['en', 'tr', 'de'] as Lang[]).map(l => (
                    <Box key={l} onClick={() => setLang(l)} sx={{ px: 1.2, py: 0.4, cursor: 'pointer', fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.05em', bgcolor: lang === l ? '#2563eb' : 'transparent', color: lang === l ? 'white' : '#64748b', transition: 'all 0.15s', '&:hover': { bgcolor: lang === l ? '#1d4ed8' : 'var(--surface-2)' } }}>{l.toUpperCase()}</Box>
                  ))}
                </Box>
                <Tooltip title={colorMode === 'dark' ? t('lightMode') : t('darkMode')}>
                  <IconButton size="small" aria-label="toggle color mode" onClick={toggleColorMode} sx={{ color: 'var(--text2)', border: '1px solid var(--border)' }}>
                    {colorMode === 'dark' ? <LightModeIcon sx={{ fontSize: 17 }} /> : <DarkModeIcon sx={{ fontSize: 17 }} />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Toolbar>
          </AppBar>

          {/* Scrollable content */}
          <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', display: 'flex', flexDirection: 'column', p: { xs: 1.5, md: 3 }, gap: { xs: 1.5, md: 2.5 }, '& > *': { width: '100%', maxWidth: 1440, alignSelf: 'center' } }}>

            {/* Stat Cards — only customers/orders */}
            {statCards.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(auto-fit, minmax(210px, 1fr))' }, gap: { xs: 1, md: 2 }, flexShrink: 0 }}>
                {statCards.map((s) => (
                  <Card key={s.label} elevation={0} sx={{ border: `1px solid ${s.border}`, borderRadius: 3, transition: 'all 0.2s ease', cursor: 'default', bgcolor: 'var(--surface)', '&:hover': { boxShadow: '0 8px 28px rgba(0,0,0,0.08)', transform: 'translateY(-2px)', borderColor: s.color + '60' } }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0, sm: 2 }, py: '16px !important', px: { xs: '14px !important', sm: '18px !important' } }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: s.bg, display: { xs: 'none', sm: 'flex' }, alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', mb: 0.2 }}>{s.label}</Typography>
                        <Typography noWrap sx={{ fontWeight: 800, fontSize: '1.25rem', lineHeight: 1.2, color: 'var(--text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.value}</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            {/* ── CUSTOMERS TAB ── */}
            {tab === 'customers' && (
              <Paper elevation={0} sx={{ flex: '0 1 auto', minHeight: 0, minWidth: 0, border: '1px solid var(--border)', borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid var(--surface-2)', flexShrink: 0, bgcolor: 'var(--surface)' }}>
                  <TextField size="small" placeholder={t('searchCustomers')} value={custSearch}
                    onChange={(e) => { setCustSearch(e.target.value); setCustPage(0); }}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 17, color: '#94a3b8' }} /></InputAdornment> } }}
                    sx={{ width: 380, maxWidth: '100%', '& .MuiOutlinedInput-root': { bgcolor: 'var(--surface)', borderRadius: 2 } }} />
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title={t('exportExcel')}><IconButton size="small" onClick={() => exportExcel('customers')} sx={{ color: '#64748b' }}><DownloadIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title={t('refresh')}><IconButton size="small" onClick={fetchCustomers} sx={{ color: '#64748b' }}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
                  {isAdmin && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} aria-label={t('newCustomer')} disableElevation size="small"
                      sx={{ whiteSpace: 'nowrap', flexShrink: 0, minWidth: { xs: 36, sm: 64 }, px: { xs: 1, sm: 1.5 }, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 }, ml: { xs: 0, sm: -0.5 } }, borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', '&:hover': { background: 'linear-gradient(135deg,#1d4ed8,#1e40af)' } }}>
                      <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{t('newCustomer')}</Box>
                    </Button>
                  )}
                </Box>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={32} /></Box>
                ) : (
                  <>
                    <TableContainer sx={{ flex: '0 1 auto', overflow: 'auto', maxHeight: 'calc(100vh - 360px)', minHeight: 0 }}>
                      <Table stickyHeader size="small" sx={{ tableLayout: 'auto', minWidth: 900 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: '1%', whiteSpace: 'nowrap' }}>{t('id')}</TableCell>
                            <TableCell align="center" sx={{ width: '1%', whiteSpace: 'nowrap' }}>{t('type')}</TableCell>
                            <TableCell sx={{ width: '30%' }}>{t('customer')}</TableCell>
                            <TableCell sx={{ width: '34%' }}>{t('email')}</TableCell>
                            <TableCell sx={{ width: '18%', whiteSpace: 'nowrap' }}>{t('phone')}</TableCell>
                            {isAdmin && <TableCell align="right" sx={{ width: '1%', whiteSpace: 'nowrap' }}>{t('actions')}</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredCustomers.length === 0 && (
                            <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                              <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                                <PeopleIcon sx={{ fontSize: 28, color: '#94a3b8' }} />
                              </Box>
                              <Typography sx={{ fontWeight: 700, color: 'var(--text2)', fontSize: '0.95rem', mb: 0.5 }}>{t('noCustomers')}</Typography>
                              <Typography variant="caption" color="text.secondary">{custSearch ? t('tryDifferentSearch') : t('addFirstCustomer')}</Typography>
                            </TableCell></TableRow>
                          )}
                          {filteredCustomers.slice(custPageSafe * custRowsPerPage, custPageSafe * custRowsPerPage + custRowsPerPage).map(c => (
                            <TableRow key={c.id}>
                              <TableCell align="center"><Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>#{c.id}</Typography></TableCell>
                              <TableCell align="center">{customerTypeChip(c, t)}</TableCell>
                              <TableCell sx={{ cursor: 'pointer' }} onClick={() => setDrawerCustomer(c)}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: 'min(100%, 230px)', mx: 'auto', textAlign: 'left' }}>
                                  <Avatar sx={{ width: 30, height: 30, bgcolor: 'var(--blue-bg)', color: 'var(--blue-tx)', fontSize: '0.72rem', fontWeight: 700 }}>
                                    {(c.firstName ?? '?')[0]}{(c.lastName ?? '')[0]}
                                  </Avatar>
                                  <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.875rem', '&:hover': { color: '#2563eb' } }}>{c.firstName} {c.lastName}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell><Box sx={{ width: 'min(100%, 260px)', mx: 'auto', textAlign: 'left' }}><Typography noWrap title={c.email} sx={{ color: '#64748b', fontSize: '0.85rem' }}>{c.email}</Typography></Box></TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}><Box sx={{ width: 'min(100%, 150px)', mx: 'auto', textAlign: 'left' }}><Typography noWrap sx={{ color: '#64748b', fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>{c.phone}</Typography></Box></TableCell>
                              {isAdmin && (
                                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                                  <Tooltip title={t('edit')}><IconButton size="small" onClick={() => openEdit(c)} sx={{ color: 'var(--icon)', mr: 0.5, '&:hover': { color: '#2563eb' } }}><EditIcon sx={{ fontSize: 19 }} /></IconButton></Tooltip>
                                  <Tooltip title={t('delete')}><IconButton size="small" onClick={() => openDelete(c.id)} sx={{ color: 'var(--icon)', '&:hover': { color: '#ef4444' } }}><DeleteIcon sx={{ fontSize: 19 }} /></IconButton></Tooltip>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination component="div" count={filteredCustomers.length} page={custPageSafe}
                      onPageChange={(_, p) => setCustPage(p)} rowsPerPage={custRowsPerPage}
                      onRowsPerPageChange={e => { setCustRowsPerPage(parseInt(e.target.value)); setCustPage(0); }}
                      rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage={t('rowsPerPage')} labelDisplayedRows={({ from, to, count }) => `${from}–${to} ${t('of')} ${count}`} sx={{ borderTop: '1px solid var(--surface-2)', flexShrink: 0 }} />
                  </>
                )}
              </Paper>
            )}

            {/* ── ORDERS TAB ── */}
            {tab === 'orders' && (
              <Paper elevation={0} sx={{ flex: '0 1 auto', minHeight: 0, minWidth: 0, border: '1px solid var(--border)', borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid var(--surface-2)', flexShrink: 0, bgcolor: 'var(--surface)' }}>
                  <TextField size="small" placeholder={t('searchOrders')} value={ordSearch}
                    onChange={(e) => { setOrdSearch(e.target.value); setOrdPage(0); }}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 17, color: '#94a3b8' }} /></InputAdornment> } }}
                    sx={{ width: 380, maxWidth: '100%', '& .MuiOutlinedInput-root': { bgcolor: 'var(--surface)', borderRadius: 2 } }} />
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title={t('exportExcel')}><IconButton size="small" onClick={() => exportExcel('orders')} sx={{ color: '#64748b' }}><DownloadIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title={t('refresh')}><IconButton size="small" onClick={fetchOrders} sx={{ color: '#64748b' }}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
                  {isAdmin && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openAddOrder} aria-label={t('newOrder')} disableElevation size="small"
                      sx={{ whiteSpace: 'nowrap', flexShrink: 0, minWidth: { xs: 36, sm: 64 }, px: { xs: 1, sm: 1.5 }, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 }, ml: { xs: 0, sm: -0.5 } }, borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', '&:hover': { background: 'linear-gradient(135deg,#1d4ed8,#1e40af)' } }}>
                      <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{t('newOrder')}</Box>
                    </Button>
                  )}
                </Box>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={32} /></Box>
                ) : (
                  <>
                    <TableContainer sx={{ flex: '0 1 auto', overflow: 'auto', maxHeight: 'calc(100vh - 360px)', minHeight: 0 }}>
                      <Table stickyHeader size="small" sx={{ tableLayout: 'auto', minWidth: isAdmin ? 1100 : 800 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: '1%', whiteSpace: 'nowrap' }}>{t('id')}</TableCell>
                            <TableCell align="center" sx={{ width: '1%', whiteSpace: 'nowrap' }}>{t('status')}</TableCell>
                            <TableCell sx={{ width: '30%' }}>{t('product')}</TableCell>
                            <TableCell sx={{ width: '26%' }}>{t('customer')}</TableCell>
                            {isAdmin && <TableCell align="right" sx={{ width: '1%', whiteSpace: 'nowrap' }}>{t('unitPrice')}</TableCell>}
                            <TableCell align="center" sx={{ width: '1%', whiteSpace: 'nowrap' }}>{t('qty')}</TableCell>
                            {isAdmin && <TableCell align="right" sx={{ width: '1%', whiteSpace: 'nowrap' }}>{t('totalCol')}</TableCell>}
                            <TableCell sx={{ width: '1%', whiteSpace: 'nowrap' }}>{t('date')}</TableCell>
                            {isAdmin && <TableCell align="right" sx={{ width: '1%', whiteSpace: 'nowrap' }}>{t('actions')}</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredOrders.length === 0 && (
                            <TableRow><TableCell colSpan={isAdmin ? 9 : 6} align="center" sx={{ py: 8 }}>
                              <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                                <ShoppingCartIcon sx={{ fontSize: 28, color: '#94a3b8' }} />
                              </Box>
                              <Typography sx={{ fontWeight: 700, color: 'var(--text2)', fontSize: '0.95rem', mb: 0.5 }}>{t('noOrders')}</Typography>
                              <Typography variant="caption" color="text.secondary">{ordSearch ? t('tryDifferentSearch') : t('createFirstOrder')}</Typography>
                            </TableCell></TableRow>
                          )}
                          {filteredOrders.slice(ordPageSafe * ordRowsPerPage, ordPageSafe * ordRowsPerPage + ordRowsPerPage).map(o => (
                            <TableRow key={o.id}>
                              <TableCell align="center"><Chip label={`#${o.id}`} size="small" sx={{ bgcolor: 'var(--surface-2)', color: '#64748b', fontSize: '0.68rem', height: 20 }} /></TableCell>
                              <TableCell align="center">
                                {isAdmin ? (
                                  <FormControl size="small">
                                    <Select value={o.status ?? 'PENDING'} onChange={e => { e.stopPropagation(); updateOrderStatus(o.id, e.target.value); }}
                                      renderValue={v => statusChip(v, t)}
                                      sx={{ width: 'auto', '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, '& .MuiSelect-select': { p: '0 22px 0 0 !important', display: 'flex', justifyContent: 'flex-start' }, '& .MuiSelect-icon': { right: 0 } }}>
                                      {ORDER_STATUSES.map(s => <MenuItem key={s} value={s}>{statusChip(s, t)}</MenuItem>)}
                                    </Select>
                                  </FormControl>
                                ) : statusChip(o.status ?? 'PENDING', t)}
                              </TableCell>
                              <TableCell><Box sx={{ width: 'min(100%, 200px)', mx: 'auto', textAlign: 'left' }}><Typography noWrap title={o.productName} sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{o.productName}</Typography></Box></TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 'min(100%, 190px)', mx: 'auto', textAlign: 'left' }}>
                                  <Avatar sx={{ width: 22, height: 22, fontSize: '0.6rem', bgcolor: 'var(--blue-bg)', color: 'var(--blue-tx)' }}>{getCustomerName(o.customerId)[0]}</Avatar>
                                  <Typography noWrap sx={{ color: '#64748b', fontSize: '0.85rem' }}>{getCustomerName(o.customerId)}</Typography>
                                </Box>
                              </TableCell>
                              {isAdmin && <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Typography sx={{ fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>{o.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography></TableCell>}
                              <TableCell align="center"><Chip label={`${o.quantity}x`} size="small" sx={{ bgcolor: 'var(--surface-2)', color: 'var(--text2)', fontSize: '0.68rem', height: 20 }} /></TableCell>
                              {isAdmin && (
                                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                                    {(o.price * o.quantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                  </Typography>
                                </TableCell>
                              )}
                              <TableCell sx={{ whiteSpace: 'nowrap' }}><Typography noWrap sx={{ color: '#64748b', fontSize: '0.82rem' }}>{formatDate(o.date, lang)}</Typography></TableCell>
                              {isAdmin && (
                                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                  <Tooltip title={t('edit')}><IconButton size="small" onClick={() => openEditOrder(o)} sx={{ color: 'var(--icon)', mr: 0.5, '&:hover': { color: '#2563eb' } }}><EditIcon sx={{ fontSize: 19 }} /></IconButton></Tooltip>
                                  <Tooltip title={t('delete')}><IconButton size="small" onClick={() => openDeleteOrder(o.id)} sx={{ color: 'var(--icon)', '&:hover': { color: '#ef4444' } }}><DeleteIcon sx={{ fontSize: 19 }} /></IconButton></Tooltip>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination component="div" count={filteredOrders.length} page={ordPageSafe}
                      onPageChange={(_, p) => setOrdPage(p)} rowsPerPage={ordRowsPerPage}
                      onRowsPerPageChange={e => { setOrdRowsPerPage(parseInt(e.target.value)); setOrdPage(0); }}
                      rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage={t('rowsPerPage')} labelDisplayedRows={({ from, to, count }) => `${from}–${to} ${t('of')} ${count}`} sx={{ borderTop: '1px solid var(--surface-2)', flexShrink: 0 }} />
                  </>
                )}
              </Paper>
            )}

            {/* ── USERS TAB ── */}
            {tab === 'users' && isAdmin && (
              <Paper elevation={0} sx={{ flex: '0 1 auto', minHeight: 0, minWidth: 0, border: '1px solid var(--border)', borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid var(--surface-2)', flexShrink: 0, bgcolor: 'var(--surface)' }}>
                  <TextField size="small" placeholder={t('searchUsers')} value={userSearch} onChange={e => setUserSearch(e.target.value)}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 17, color: '#94a3b8' }} /></InputAdornment> } }}
                    sx={{ width: 380, maxWidth: '100%', '& .MuiOutlinedInput-root': { bgcolor: 'var(--surface)', borderRadius: 2 } }} />
                  <Box sx={{ flex: 1 }} />
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddUserDialogOpen(true)} aria-label={t('addUser')} disableElevation size="small" sx={{ whiteSpace: 'nowrap', flexShrink: 0, minWidth: { xs: 36, sm: 64 }, px: { xs: 1, sm: 1.5 }, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 }, ml: { xs: 0, sm: -0.5 } }, textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}><Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{ t('addUser') }</Box></Button>
                  <Tooltip title={t('refresh')}><IconButton size="small" onClick={fetchUsers} sx={{ color: '#64748b' }}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
                </Box>
                <TableContainer sx={{ flex: '0 1 auto', overflow: 'auto', maxHeight: 'calc(100vh - 360px)', minHeight: 0 }}>
                  <Table stickyHeader size="small" sx={{ tableLayout: 'auto', minWidth: 760 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: '1%', whiteSpace: 'nowrap' }}>{t('id')}</TableCell>
                        <TableCell sx={{ width: '34%' }}>{t('username')}</TableCell>
                        <TableCell sx={{ width: '44%' }}>{t('email')}</TableCell>
                        <TableCell align="center" sx={{ width: '1%', whiteSpace: 'nowrap' }}>{t('role')}</TableCell>
                        <TableCell align="right" sx={{ width: '1%', whiteSpace: 'nowrap' }}>{t('actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredUsers.length === 0 && (
                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                          <ManageAccountsIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1, display: 'block', mx: 'auto' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{t('noUsers')}</Typography>
                        </TableCell></TableRow>
                      )}
                      {filteredUsers.map(u => (
                        <TableRow key={u.id}>
                          <TableCell align="center"><Chip label={`#${u.id}`} size="small" sx={{ bgcolor: 'var(--surface-2)', color: '#64748b', fontSize: '0.68rem', height: 20 }} /></TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: 'min(100%, 170px)', mx: 'auto', textAlign: 'left' }}>
                              <Avatar sx={{ width: 30, height: 30, bgcolor: u.role === 'ADMIN' ? '#059669' : '#2563eb', fontSize: '0.75rem', fontWeight: 700 }}>{u.username.charAt(0).toUpperCase()}</Avatar>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.username}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell><Box sx={{ width: 'min(100%, 260px)', mx: 'auto', textAlign: 'left' }}><Typography noWrap title={u.email} sx={{ color: '#64748b', fontSize: '0.85rem' }}>{u.email}</Typography></Box></TableCell>
                          <TableCell align="center">
                            <Chip label={u.role} size="small" sx={{ bgcolor: u.role === 'ADMIN' ? 'var(--green-bg)' : 'var(--blue-bg)', color: u.role === 'ADMIN' ? '#059669' : '#2563eb', border: `1px solid ${u.role === 'ADMIN' ? 'var(--green-bd)' : 'var(--blue-bd)'}`, fontWeight: 700, fontSize: '0.68rem' }} />
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            <Tooltip title={t('changeRole')}>
                              <IconButton size="small" sx={{ color: 'var(--icon)', mr: 0.5, '&:hover': { color: '#059669' } }} onClick={() => { setSelectedUserId(u.id); setSelectedRole(u.role); setRoleDialogOpen(true); }}>
                                <AdminPanelSettingsIcon sx={{ fontSize: 19 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('resetPassword')}>
                              <IconButton size="small" aria-label={t('resetPassword')} sx={{ color: 'var(--icon)', mr: 0.5, '&:hover': { color: '#d97706' } }} onClick={() => openPwDialog({ mode: 'reset', userId: u.id, username: u.username })}>
                                <LockResetIcon sx={{ fontSize: 19 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('deleteUser')}>
                              <IconButton size="small" sx={{ color: 'var(--icon)', '&:hover': { color: '#ef4444' } }} disabled={u.username === currentUser?.username} onClick={() => { setDeleteUserId(u.id); setDeleteUserDialogOpen(true); }}>
                                <DeleteIcon sx={{ fontSize: 19 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* ── DASHBOARD TAB ── */}
            {tab === 'dashboard' && (() => {
              const delivered = orders.filter(o => o.status === 'DELIVERED').length;
              const pending = orders.filter(isPending).length;
              const cancelled = orders.filter(o => o.status === 'CANCELLED').length;
              const fulfillmentRate = orders.length > 0 ? ((delivered / orders.length) * 100).toFixed(1) : '0';
              // Real trend: compare last 30 days vs prior 30 days
              const { current: recentOrders30, previous: prevOrders30 } = trendWindows(orders, now);
              const recentRev = sumRevenue(recentOrders30);
              const prevRev = sumRevenue(prevOrders30);
              const revTrend = pctChange(recentRev, prevRev, recentOrders30.length, prevOrders30.length);
              const fulfillTrend = deliveredRateChange(recentOrders30, prevOrders30);
              const prevPending = prevOrders30.filter(isPending).length;
              const currPending = recentOrders30.filter(isPending).length;
              const pendTrend = pctChange(currPending, prevPending, recentOrders30.length, prevOrders30.length);
              // Top customers by revenue
              const topCustomers = topCustomersByRevenue(orders, 5).map(({ customerId, revenue }) => ({ customer: customers.find(c => c.id === customerId), rev: revenue })).filter(x => x.customer);
              // Recent orders
              const recentOrders = [...orders].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 6);
              // Revenue chart (last 6 months/days)
              const revenueChartData = monthlyRevenue(orders, dateLocale).slice(-6);

              // Real monthly series (last 6 calendar months) for the KPI sparklines — no placeholder data
              const monthSeries = (pick: (os: typeof orders) => number) => monthlySeries(orders, now, pick);

              return (
                <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* KPI Cards */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', md: 'repeat(4,1fr)' }, gap: 2, flexShrink: 0 }}>
                    {(() => {
                      const fmtTrend = (val: string | null, higherIsBetter = true) => {
                        if (val === null) return { label: t('trendNoData'), up: true, dir: true, none: true };
                        const n = parseFloat(val);
                        return { label: `${n >= 0 ? '+' : ''}${val}% ${t('vsLast30d')}`, up: higherIsBetter ? n >= 0 : n <= 0, dir: n >= 0, none: false };
                      };
                      const revT = fmtTrend(revTrend);
                      const fufT = fmtTrend(fulfillTrend);
                      const pndT = fmtTrend(pendTrend, false);
                      const adminCards = [
                        { label: t('totalRevenue'), value: totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), sub: `${orders.length} ${t('ordersTotal')}`, icon: <AttachMoneyIcon />, color: '#2563eb', bg: 'var(--blue-bg)', border: 'var(--blue-bg)', trend: revT.label, up: revT.up, dir: revT.dir, none: revT.none, spark: monthSeries(os => os.reduce((a, o) => a + o.price * o.quantity, 0)) },
                        { label: t('totalCustomers2'), value: customers.length.toString(), sub: `${customers.filter(isCompany).length} ${t('companies')}`, icon: <PeopleIcon />, color: '#0ea5e9', bg: 'var(--sky-bg)', border: 'var(--sky-bd)', trend: t('allTime'), up: true, none: true },
                        { label: t('fulfillmentRate2'), value: `${fulfillmentRate}%`, sub: `${delivered} ${t('of')} ${orders.length} ${t('delivered')}`, icon: <TrendingUpIcon />, color: '#10b981', bg: 'var(--green-bg)', border: 'var(--green-bd)', trend: fufT.label, up: fufT.up, dir: fufT.dir, none: fufT.none, spark: monthSeries(os => os.length > 0 ? (os.filter(o => o.status === 'DELIVERED').length / os.length) * 100 : 0) },
                        { label: t('pendingOrders2'), value: pending.toString(), sub: `${cancelled} ${t('cancelledSub')}`, icon: <ShoppingCartIcon />, color: '#f59e0b', bg: 'var(--amber-bg)', border: 'var(--amber-bd)', trend: pndT.label, up: pndT.up, dir: pndT.dir, none: pndT.none, spark: monthSeries(os => os.filter(o => (o.status ?? 'PENDING') === 'PENDING').length) },
                      ];
                      const userCards = [
                        { label: t('totalOrdersLabel'), value: orders.length.toString(), sub: `${delivered} ${t('delivered')}`, icon: <ReceiptIcon />, color: '#2563eb', bg: 'var(--blue-bg)', border: 'var(--blue-bg)', trend: t('allTime'), up: true, spark: monthSeries(os => os.length) },
                        { label: t('totalCustomers2'), value: customers.length.toString(), sub: `${customers.filter(isCompany).length} ${t('companies')}`, icon: <PeopleIcon />, color: '#0ea5e9', bg: 'var(--sky-bg)', border: 'var(--sky-bd)', trend: t('allTime'), up: true, none: true },
                        { label: t('fulfillmentRate2'), value: `${fulfillmentRate}%`, sub: `${delivered} ${t('of')} ${orders.length} ${t('delivered')}`, icon: <TrendingUpIcon />, color: '#10b981', bg: 'var(--green-bg)', border: 'var(--green-bd)', trend: fufT.label, up: fufT.up, dir: fufT.dir, none: fufT.none, spark: monthSeries(os => os.length > 0 ? (os.filter(o => o.status === 'DELIVERED').length / os.length) * 100 : 0) },
                        { label: t('pendingOrders2'), value: pending.toString(), sub: `${cancelled} ${t('cancelledSub')}`, icon: <ShoppingCartIcon />, color: '#f59e0b', bg: 'var(--amber-bg)', border: 'var(--amber-bd)', trend: pndT.label, up: pndT.up, dir: pndT.dir, none: pndT.none, spark: monthSeries(os => os.filter(o => (o.status ?? 'PENDING') === 'PENDING').length) },
                      ];
                      return (isAdmin ? adminCards : userCards).map(card => (
                        <Paper key={card.label} elevation={0} sx={{
                          border: `1px solid ${card.border}`,
                          borderRadius: 3,
                          p: 2.5,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                          background: 'var(--surface)',
                          transition: 'all 0.2s ease',
                          '&:hover': { boxShadow: `0 8px 32px rgba(0,0,0,0.08)`, transform: 'translateY(-2px)', borderColor: card.color + '50' },
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.3 }}>{card.label}</Typography>
                              <Typography sx={{ fontWeight: 800, fontSize: '1.55rem', color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-0.03em' }}>{card.value}</Typography>
                            </Box>
                            <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, flexShrink: 0 }}>{card.icon}</Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{card.sub}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, whiteSpace: 'nowrap', maxWidth: '100%', px: 0.8, py: 0.2, borderRadius: 5, bgcolor: ('none' in card && card.none) ? 'rgba(148,163,184,0.10)' : card.up ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
                              <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: ('none' in card && card.none) ? '#94a3b8' : card.up ? '#10b981' : '#ef4444' }}>{('none' in card && card.none) ? '' : (('dir' in card ? card.dir : card.up) ? '↑ ' : '↓ ')}{card.trend}</Typography>
                            </Box>
                          </Box>
                          {card.spark && card.spark.some(v => v > 0) && (
                          <Box sx={{ mx: -0.5, mt: 0.5 }}>
                            <ResponsiveContainer width="100%" height={36}>
                              <LineChart data={card.spark.map((v, i) => ({ i, v }))}>
                                <Line type="monotone" dataKey="v" stroke={card.color} strokeWidth={1.8} dot={false} isAnimationActive={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </Box>
                          )}
                        </Paper>
                      ));
                    })()}
                  </Box>

                  {/* Quick Actions */}
                  <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0, flexWrap: 'wrap' }}>
                    {isAdmin && (
                      <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} disableElevation size="small"
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', '&:hover': { background: 'linear-gradient(135deg,#1d4ed8,#1e40af)' } }}>
                        {t('newCustomer')}
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="contained" startIcon={<AddIcon />} onClick={openAddOrder} disableElevation size="small"
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', bgcolor: '#0ea5e9', '&:hover': { bgcolor: '#0284c7' } }}>
                        {t('newOrder')}
                      </Button>
                    )}
                    <Button variant="outlined" startIcon={<BarChartIcon />} onClick={() => setTab('analytics')} size="small"
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', borderColor: 'var(--border)', color: '#64748b', '&:hover': { borderColor: '#2563eb', color: '#2563eb', bgcolor: 'var(--blue-bg)' } }}>
                      {t('analytics')}
                    </Button>
                    <Button variant="outlined" startIcon={<SmartToyIcon />} onClick={() => setTab('ai')} size="small"
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', borderColor: 'var(--border)', color: '#64748b', '&:hover': { borderColor: '#2563eb', color: '#2563eb', bgcolor: 'var(--blue-bg)' } }}>
                      {t('aiAgent')}
                    </Button>
                  </Box>

                  {/* Revenue Chart + Top Customers */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: isAdmin ? '3fr 2fr' : '1fr' }, gap: 2 }}>
                    {isAdmin && (
                      <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', mb: 0.5 }}>{t('revenueTrend')}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mb: 2 }}>{t('monthlyRevenueOverview')}</Typography>
                        {revenueChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={revenueChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                              <defs>
                                <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke={gridC} />
                              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
                              <ReTooltip formatter={(v) => [Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' }), t('revenue')]} contentStyle={{ borderRadius: 8, border: '1px solid var(--surface-2)', fontSize: 12 }} />
                              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6 }} animationDuration={600} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('noOrderDataYet')}</Typography>
                          </Box>
                        )}
                      </Paper>
                    )}

                    {/* Top Customers */}
                    <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', mb: 2 }}>{t('topCustomers')}</Typography>
                      {topCustomers.length === 0 ? (
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', py: 4 }}>{t('noDataYet')}</Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {topCustomers.map(({ customer: c, rev }, i) => (
                            <Box key={c!.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: ['#2563eb','#10b981','#f59e0b','#0ea5e9','#ef4444'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: 'white' }}>{i+1}</Typography>
                              </Box>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: 'var(--blue-bg)', color: 'var(--blue-tx)', fontSize: '0.7rem', fontWeight: 700 }}>{(c!.firstName ?? '?')[0]}</Avatar>
                              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c!.firstName} {c!.lastName}</Typography>
                                <Typography sx={{ fontSize: '0.68rem', color: '#94a3b8' }}>{(() => { const n = orders.filter(o => o.customerId === c!.id).length; return `${n} ${n === 1 ? t('orderSingular') : t('orders')}`; })()}</Typography>
                              </Box>
                              {isAdmin && (
                                <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#10b981', flexShrink: 0 }}>
                                  {rev.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Paper>
                  </Box>

                  {/* Recent Orders + Order Status */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: '2fr 1fr' }, gap: 2 }}>
                    <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{t('recentOrders')}</Typography>
                        <Button size="small" onClick={() => setTab('orders')} sx={{ textTransform: 'none', fontSize: '0.78rem', color: '#2563eb', fontWeight: 600, p: 0 }}>{t('viewAll')} →</Button>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        {recentOrders.length === 0 ? (
                          <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', py: 4 }}>{t('noOrders')}</Typography>
                        ) : recentOrders.map((o, i) => (
                          <Box key={o.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.5, borderBottom: i < recentOrders.length - 1 ? '1px solid var(--surface-2)' : 'none', '&:hover': { bgcolor: 'var(--surface-2)' }, transition: 'background 0.15s' }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'var(--blue-bg)', color: 'var(--blue-tx)', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                              {getCustomerName(o.customerId)[0]}
                            </Avatar>
                            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.productName}</Typography>
                              <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{getCustomerName(o.customerId)} · {formatDate(o.date, lang)}</Typography>
                            </Box>
                            <Box sx={{ width: 124, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                              {isAdmin && (
                                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--green-tx)', fontVariantNumeric: 'tabular-nums' }}>{(o.price * o.quantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography>
                              )}
                              <Box sx={{ mt: 0.3 }}>{statusChip(o.status, t)}</Box>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Paper>

                    {/* Order Status Summary */}
                    <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', mb: 2 }}>{t('orderStatus')}</Typography>
                      {(() => {
                        const PIE_COLORS = ['#f59e0b','#64748b','#2563eb','#10b981','#ef4444'];
                        const allPie = ORDER_STATUSES.map((s, i) => ({ name: statusText(s, t), value: orders.filter(o => (o.status ?? 'PENDING') === s).length || 0.001, realCount: orders.filter(o => (o.status ?? 'PENDING') === s).length, color: PIE_COLORS[i] }));
                        return (
                          <>
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie data={allPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" animationDuration={600}>
                                  {allPie.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" opacity={entry.realCount === 0 ? 0.2 : 1} />)}
                                </Pie>
                                <ReTooltip formatter={(_v, name, item) => [(item?.payload as { realCount?: number } | undefined)?.realCount, name]} contentStyle={{ borderRadius: 8, border: '1px solid var(--surface-2)', fontSize: 12 }} />
                              </PieChart>
                            </ResponsiveContainer>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mt: 1 }}>
                              {(() => {
                                const counts = ORDER_STATUSES.map(s => orders.filter(o => (o.status ?? 'PENDING') === s).length);
                                const shares = percentShares(counts);
                                return ORDER_STATUSES.map((s, i) => {
                                const count = counts[i];
                                return (
                                  <Box key={s} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIE_COLORS[i] }} />
                                      <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{statusText(s, t)}</Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>
                                      {count} ({shares[i]}%)
                                    </Typography>
                                  </Box>
                                );
                                });
                              })()}
                            </Box>
                          </>
                        );
                      })()}
                    </Paper>
                  </Box>
                </Box>
              );
            })()}

            {/* ── ANALYTICS TAB ── */}
            {tab === 'analytics' && (
              <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* Stat Cards with sparklines */}
                {(() => {
                  // Real trend: last 30 days vs prior 30 days
                  const { current: aNow, previous: aPrev } = trendWindows(orders, now);
                  const aNowRev = sumRevenue(aNow);
                  const aPrevRev = sumRevenue(aPrev);
                  const calcTrend = (curr: number, prev: number) => pctChange(curr, prev, aNow.length, aPrev.length);
                  const revTrendA = calcTrend(aNowRev, aPrevRev);
                  const orderTrendA = calcTrend(aNow.length, aPrev.length);
                  const aNowAvg = aNow.length > 0 ? aNowRev / aNow.length : 0;
                  const aPrevAvg = aPrev.length > 0 ? aPrevRev / aPrev.length : 0;
                  const avgTrendA = calcTrend(aNowAvg, aPrevAvg);
                  const pendTrendA = calcTrend(aNow.filter(isPending).length, aPrev.filter(isPending).length);
                  const seriesOf = (fn: (os: Order[]) => number) => monthlySeries(orders, now, fn).map((v, i) => ({ i, v }));
                  // delta: direction of the change; goodUp: whether an increase is good news (pending orders: no).
                  const fmtA = (v: string | null, goodUp: boolean) => {
                    if (v === null) return { text: t('trendNoData'), delta: null as number | null, good: true };
                    const n = parseFloat(v);
                    return { text: `${n >= 0 ? '+' : ''}${v}% ${t('vsLast30d')}`, delta: n, good: n === 0 ? true : (n > 0) === goodUp };
                  };
                  const revF = fmtA(revTrendA, true), ordF = fmtA(orderTrendA, true), avgF = fmtA(avgTrendA, true), pndF = fmtA(pendTrendA, false);
                  const allAnalyticsCards = [
                    { label: t('totalRevenue').toUpperCase(), value: totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), f: revF, sparkColor: '#2563eb', spark: seriesOf(sumRevenue), adminOnly: true },
                    { label: t('totalOrders').toUpperCase(), value: orders.length.toString(), f: ordF, sparkColor: '#10b981', spark: seriesOf(os => os.length), adminOnly: false },
                    { label: t('avgOrderValue').toUpperCase(), value: (orders.length > 0 ? totalRevenue / orders.length : 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }), f: avgF, sparkColor: '#f59e0b', spark: seriesOf(os => os.length ? sumRevenue(os) / os.length : 0), adminOnly: true },
                    { label: t('pendingOrders').toUpperCase(), value: orders.filter(isPending).length.toString(), f: pndF, sparkColor: '#ef4444', spark: seriesOf(os => os.filter(isPending).length), adminOnly: false },
                  ];
                  const analyticsCards = allAnalyticsCards.filter(c => isAdmin || !c.adminOnly);
                  return (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', md: 'repeat(4,1fr)' }, gap: 2, flexShrink: 0 }}>
                      {analyticsCards.map((card) => (
                        <Paper key={card.label} elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5, overflow: 'hidden' }}>
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', mb: 0.5 }}>{card.label}</Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--text)', mb: 0.5 }}>{card.value}</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: card.f.delta === null ? '#94a3b8' : card.f.good ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                            {card.f.delta === null ? '' : card.f.delta >= 0 ? '↑ ' : '↓ '}{card.f.text}
                          </Typography>
                          <Box sx={{ mt: 1, mx: -0.5 }}>
                            <ResponsiveContainer width="100%" height={40}>
                              <LineChart data={card.spark}>
                                <Line type="monotone" dataKey="v" stroke={card.sparkColor} strokeWidth={2} dot={false} isAnimationActive={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  );
                })()}

                {/* Revenue Line Chart + Order Status Pie */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: isAdmin ? '3fr 2fr' : '1fr' }, gap: 2 }}>
                  {isAdmin && <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{t('revenueOverview')}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t('totalRevenue')}</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text)', mt: 0.5 }}>{totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography>
                      </Box>
                      <ToggleButtonGroup value={chartMode} exclusive onChange={(_, v) => v && setChartMode(v)} size="small">
                        <ToggleButton value="daily" sx={{ fontSize: '0.72rem', px: 1.5, py: 0.4, textTransform: 'none' }}>{t('daily')}</ToggleButton>
                        <ToggleButton value="monthly" sx={{ fontSize: '0.72rem', px: 1.5, py: 0.4, textTransform: 'none' }}>{t('monthly')}</ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData.map(([label, value]) => ({ label, value }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridC} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
                        <ReTooltip formatter={(v) => [Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' }), t('revenue')]} contentStyle={{ borderRadius: 8, border: '1px solid var(--surface-2)', fontSize: 12 }} />
                        <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6 }} animationDuration={600} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Paper>}

                  {/* Order Status Donut */}
                  <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', mb: 2 }}>{t('orderStatusDistribution')}</Typography>
                    {(() => {
                      const PIE_COLORS = ['#f59e0b', '#64748b', '#2563eb', '#10b981', '#ef4444'];
                      const statusLabel = (s: string) => statusText(s, t);
                      const allPie = statusCounts.map((s) => ({ name: statusLabel(s.status), value: s.count || 0.001, realCount: s.count, color: PIE_COLORS[ORDER_STATUSES.indexOf(s.status)] }));
                      return (
                        <>
                          <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                              <Pie data={allPie} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value" animationDuration={600}>
                                {allPie.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" opacity={entry.realCount === 0 ? 0.25 : 1} />)}
                              </Pie>
                              <ReTooltip formatter={(_v, name, item) => [(item?.payload as { realCount?: number } | undefined)?.realCount, name]} contentStyle={{ borderRadius: 8, border: '1px solid var(--surface-2)', fontSize: 12 }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mt: 1 }}>
                            {(() => { const shares = percentShares(statusCounts.map(x => x.count)); return statusCounts.map((s, i) => (
                              <Box key={s.status} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIE_COLORS[i] }} />
                                  <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{statusText(s.status, t)}</Typography>
                                </Box>
                                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>
                                  {s.count} ({shares[i]}%)
                                </Typography>
                              </Box>
                            )); })()}
                          </Box>
                        </>
                      );
                    })()}
                  </Paper>
                </Box>

                {/* Customer Types Pie + Top Products */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: isAdmin ? '1fr 2fr' : '1fr' }, gap: 2 }}>
                  <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', mb: 2 }}>{t('customerTypes')}</Typography>
                    {(() => {
                      const individual = customers.filter(c => !isCompany(c)).length;
                      const company = customers.filter(isCompany).length;
                      const pieData = [
                        { name: t('individual'), value: individual || 0.001, realCount: individual, pct: customers.length > 0 ? Math.round((individual / customers.length) * 100) : 0, color: '#2563eb' },
                        { name: t('company'), value: company || 0.001, realCount: company, pct: customers.length > 0 ? Math.round((company / customers.length) * 100) : 0, color: '#10b981' },
                      ];
                      return (
                        <>
                          <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value" animationDuration={600}>
                                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                              </Pie>
                              <ReTooltip formatter={(_v, name, item) => [(item?.payload as { realCount?: number } | undefined)?.realCount, name]} contentStyle={{ borderRadius: 8, border: '1px solid var(--surface-2)', fontSize: 12 }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                            {pieData.map(d => (
                              <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: d.color }} />
                                  <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{d.name} ({d.realCount})</Typography>
                                </Box>
                                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>{d.pct}%</Typography>
                              </Box>
                            ))}
                          </Box>
                        </>
                      );
                    })()}
                  </Paper>

                  {isAdmin && <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', flex: 1 }}>{t('topProductsByRevenue')}</Typography>
                    </Box>
                    {(() => {
                      const productMap: Record<string, number> = {};
                      orders.forEach(o => { productMap[o.productName] = (productMap[o.productName] ?? 0) + o.price * o.quantity; });
                      const top = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name: name.length > 26 ? name.slice(0, 26) + '…' : name, value }));
                      if (top.length === 0) return <Typography variant="body2" color="text.secondary">{t('noOrders')}</Typography>;
                      const PROD_COLORS = ['#2563eb','#0ea5e9','#10b981','#f59e0b','#ef4444'];
                      return (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={top} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridC} horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: tick2C }} axisLine={false} tickLine={false} width={170} />
                            <ReTooltip formatter={(v) => [Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' }), t('revenue')]} contentStyle={{ borderRadius: 8, border: '1px solid var(--surface-2)', fontSize: 12 }} />
                            <Bar dataKey="value" animationDuration={600} radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v: unknown) => `$${(Number(v)/1000).toFixed(1)}k`, fontSize: 11, fill: '#64748b' }}>
                              {top.map((_, i) => <Cell key={i} fill={PROD_COLORS[i % PROD_COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </Paper>}
                </Box>
              </Box>
            )}

            {/* ── AI AGENT TAB ── */}
            {tab === 'ai' && (
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
            )}

          </Box>
        </Box>

        {/* ── Dialogs ── */}

        {/* Customer Add/Edit */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{isEditing ? t('editCustomer') : t('addCustomer')}</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>{t('customerType')}</InputLabel>
                <Select value={customerType} label={t('customerType')} onChange={e => { setCustomerType(e.target.value as CustomerType); setFormErrors({}); if (e.target.value === 'company') setEditCustomer(p => ({ ...p, lastName: '' })); }}>
                  <MenuItem value="individual">{t('individualPerson')}</MenuItem>
                  <MenuItem value="company">{t('companyOrg')}</MenuItem>
                </Select>
              </FormControl>
              {customerType === 'individual' ? (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField label={`${t('firstName')} *`} fullWidth size="small" value={editCustomer.firstName || ''} onChange={e => { setEditCustomer({ ...editCustomer, firstName: e.target.value }); setFormErrors(p => ({ ...p, firstName: '' })); }} error={!!formErrors.firstName} helperText={formErrors.firstName} />
                  <TextField label={`${t('lastName')} *`} fullWidth size="small" value={editCustomer.lastName || ''} onChange={e => { setEditCustomer({ ...editCustomer, lastName: e.target.value }); setFormErrors(p => ({ ...p, lastName: '' })); }} error={!!formErrors.lastName} helperText={formErrors.lastName} />
                </Box>
              ) : (
                <TextField label={`${t('firstName')} *`} fullWidth size="small" value={editCustomer.firstName || ''} onChange={e => { setEditCustomer({ ...editCustomer, firstName: e.target.value }); setFormErrors(p => ({ ...p, firstName: '' })); }} error={!!formErrors.firstName} helperText={formErrors.firstName} />
              )}
              <TextField label={`${t('email')}${!editCustomer.phone?.trim() ? ' *' : ''}`} fullWidth size="small" value={editCustomer.email || ''} onChange={e => { setEditCustomer({ ...editCustomer, email: e.target.value }); setFormErrors(p => ({ ...p, email: '', phone: '' })); }} error={!!formErrors.email} helperText={formErrors.email || t('emailOrPhoneHint')} />
              <TextField label={`${t('phone')}${!editCustomer.email?.trim() ? ' *' : ''}`} fullWidth size="small" value={editCustomer.phone || ''} onChange={e => { setEditCustomer({ ...editCustomer, phone: e.target.value }); setFormErrors(p => ({ ...p, email: '', phone: '' })); }} error={!!formErrors.phone} helperText={formErrors.phone} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>{ t('cancel') }</Button>
            <Button variant="contained" onClick={handleSave} disableElevation sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{isEditing ? t('update') : t('addCustomer')}</Button>
          </DialogActions>
        </Dialog>

        {/* Customer Delete */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>{t('deleteCustomerTitle')}</DialogTitle>
          <DialogContent><Typography variant="body2" color="text.secondary">{t('areYouSure')}</Typography></DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>{ t('cancel') }</Button>
            <Button variant="contained" color="error" onClick={handleDelete} disableElevation sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{ t('delete') }</Button>
          </DialogActions>
        </Dialog>

        {/* Order Add/Edit */}
        <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{isEditingOrder ? t('editOrder') : t('addOrder')}</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>{t('customer')}</InputLabel>
                <Select value={editOrder.customerId} label={t('customer')} onChange={e => setEditOrder({ ...editOrder, customerId: e.target.value })}>
                  {customers.map(c => <MenuItem key={c.id} value={c.id.toString()}>{c.firstName} {c.lastName}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label={t('productName')} fullWidth size="small" value={editOrder.productName} onChange={e => setEditOrder({ ...editOrder, productName: e.target.value })} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label={t('price')} type="text" inputMode="decimal" fullWidth size="small" value={editOrder.price} onChange={e => setEditOrder({ ...editOrder, price: e.target.value })} />
                <TextField label={t('quantity')} type="number" fullWidth size="small" value={editOrder.quantity} onChange={e => setEditOrder({ ...editOrder, quantity: e.target.value })} />
              </Box>
              <FormControl size="small" fullWidth>
                <InputLabel>{t('status')}</InputLabel>
                <Select value={editOrder.status} label={t('status')} onChange={e => setEditOrder({ ...editOrder, status: e.target.value })}>
                  {ORDER_STATUSES.map(s => <MenuItem key={s} value={s}>{statusText(s, t)}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setOrderDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>{ t('cancel') }</Button>
            <Button variant="contained" onClick={handleSaveOrder} disableElevation sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{isEditingOrder ? t('update') : t('addOrder')}</Button>
          </DialogActions>
        </Dialog>

        {/* Order Delete */}
        <Dialog open={orderDeleteDialogOpen} onClose={() => setOrderDeleteDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>{t('deleteOrderTitle')}</DialogTitle>
          <DialogContent><Typography variant="body2" color="text.secondary">{t('areYouSure')}</Typography></DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setOrderDeleteDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>{ t('cancel') }</Button>
            <Button variant="contained" color="error" onClick={handleDeleteOrder} disableElevation sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{ t('delete') }</Button>
          </DialogActions>
        </Dialog>

        {/* User Delete */}
        <Dialog open={addUserDialogOpen} onClose={() => setAddUserDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>{t('addUser')}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
            <TextField label={t('username')} fullWidth size="small" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
            <TextField label={t('email')} fullWidth size="small" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
            <TextField label={t('password')} type="password" fullWidth size="small" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
            <TextField label={t('role')} select fullWidth size="small" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
              <MenuItem value="USER">USER</MenuItem>
              <MenuItem value="ADMIN">ADMIN</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAddUserDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>{ t('cancel') }</Button>
            <Button variant="contained" onClick={handleAddUser} disableElevation sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{ t('createUser') }</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={pwDialog !== null} onClose={() => { if (!pwBusy) setPwDialog(null); }} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>
            {pwDialog?.mode === 'reset' ? `${t('resetPasswordFor')} ${pwDialog.username ?? ''}` : t('changePassword')}
          </DialogTitle>
          <form onSubmit={(e) => { e.preventDefault(); void submitPassword(); }}>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
              {pwDialog?.mode === 'self' && (
                <TextField label={t('currentPassword')} type="password" autoComplete="current-password" autoFocus fullWidth size="small" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} />
              )}
              <TextField label={t('newPassword')} type="password" autoComplete="new-password" autoFocus={pwDialog?.mode === 'reset'} fullWidth size="small" value={pwForm.next} onChange={e => setPwForm({ ...pwForm, next: e.target.value })} helperText={t('passwordMin8')} />
              <TextField label={t('confirmPassword')} type="password" autoComplete="new-password" fullWidth size="small" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
              {pwError && <Typography role="alert" sx={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>{pwError}</Typography>}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setPwDialog(null)} disabled={pwBusy} sx={{ textTransform: 'none', color: '#64748b' }}>{t('cancel')}</Button>
              <Button type="submit" variant="contained" disabled={pwBusy} disableElevation sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{pwDialog?.mode === 'reset' ? t('resetPassword') : t('changePassword')}</Button>
            </DialogActions>
          </form>
        </Dialog>

        <Dialog open={deleteUserDialogOpen} onClose={() => setDeleteUserDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>{t('deleteUserTitle')}</DialogTitle>
          <DialogContent><Typography variant="body2" color="text.secondary">{t('areYouSure')}</Typography></DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setDeleteUserDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>{ t('cancel') }</Button>
            <Button variant="contained" color="error" onClick={handleDeleteUser} disableElevation sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{ t('delete') }</Button>
          </DialogActions>
        </Dialog>

        {/* Role Change */}
        <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>{t('changeRoleTitle')}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>{t('role')}</InputLabel>
              <Select value={selectedRole} label={t('role')} onChange={e => setSelectedRole(e.target.value)}>
                <MenuItem value="USER">USER</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setRoleDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>{ t('cancel') }</Button>
            <Button variant="contained" onClick={handleUpdateRole} disableElevation sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{t('updateRole')}</Button>
          </DialogActions>
        </Dialog>

        {/* Customer Detail */}
        <Dialog open={!!drawerCustomer} onClose={() => setDrawerCustomer(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
          {drawerCustomer && (() => {
            const custOrders = orders.filter(o => o.customerId === drawerCustomer.id);
            const custRevenue = custOrders.reduce((s, o) => s + o.price * o.quantity, 0);
            return (
              <>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
                  {t('customerDetail')} <IconButton size="small" onClick={() => setDrawerCustomer(null)}><CloseIcon /></IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'var(--surface-2)', borderRadius: 2 }}>
                    <Avatar sx={{ width: 52, height: 52, bgcolor: '#2563eb', fontSize: '1.1rem', fontWeight: 700 }}>
                      {(drawerCustomer.firstName ?? '?')[0]}{(drawerCustomer.lastName ?? '')[0]}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{drawerCustomer.firstName} {drawerCustomer.lastName}</Typography>
                      <Box sx={{ mt: 0.5 }}>{customerTypeChip(drawerCustomer, t)}</Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, mb: 2.5 }}>
                    {drawerCustomer.email && <Box sx={{ display: 'flex', gap: 1.5 }}><Typography sx={{ color: '#94a3b8', fontSize: '0.78rem', width: 55 }}>{t('email')}</Typography><Typography sx={{ fontSize: '0.875rem' }}>{drawerCustomer.email}</Typography></Box>}
                    {drawerCustomer.phone && <Box sx={{ display: 'flex', gap: 1.5 }}><Typography sx={{ color: '#94a3b8', fontSize: '0.78rem', width: 55 }}>{t('phone')}</Typography><Typography sx={{ fontSize: '0.875rem' }}>{drawerCustomer.phone}</Typography></Box>}
                    <Box sx={{ display: 'flex', gap: 1.5 }}><Typography sx={{ color: '#94a3b8', fontSize: '0.78rem', width: 55 }}>{t('id')}</Typography><Typography sx={{ fontSize: '0.875rem' }}>#{drawerCustomer.id}</Typography></Box>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: 1.5, mb: 2.5 }}>
                    <Box sx={{ p: 2, bgcolor: 'var(--blue-bg)', border: '1px solid var(--blue-bd)', borderRadius: 2, textAlign: 'center' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--blue-tx)' }}>{custOrders.length}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>{t('totalOrdersLabel')}</Typography>
                    </Box>
                    {isAdmin && (
                      <Box sx={{ p: 2, bgcolor: 'var(--green-bg)', border: '1px solid var(--green-bd)', borderRadius: 2, textAlign: 'center' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--green-tx)' }}>{custRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>{t('totalSpent')}</Typography>
                      </Box>
                    )}
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 1.5 }}>{t('orderHistory')}</Typography>
                  {custOrders.length === 0 ? (
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', py: 3 }}>{t('noOrders')}</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {custOrders.map(o => (
                        <Box key={o.id} sx={{ p: 1.5, border: '1px solid var(--surface-2)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{o.productName}</Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{formatDate(o.date, lang)} · {o.quantity} {t('pcs')}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            {isAdmin && (
                              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--green-tx)' }}>{(o.price * o.quantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography>
                            )}
                            {statusChip(o.status, t)}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </DialogContent>
                {isAdmin && (
                  <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => { openDelete(drawerCustomer.id); setDrawerCustomer(null); }} sx={{ textTransform: 'none', borderRadius: 2 }}>{ t('delete') }</Button>
                    <Button fullWidth variant="contained" startIcon={<EditIcon />} onClick={() => { openEdit(drawerCustomer); setDrawerCustomer(null); }} disableElevation sx={{ textTransform: 'none', borderRadius: 2 }}>{t('edit')}</Button>
                  </DialogActions>
                )}
              </>
            );
          })()}
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
