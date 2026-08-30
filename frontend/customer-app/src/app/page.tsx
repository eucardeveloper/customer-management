'use client';
import { useTranslation, type Lang } from './translations';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { api } from '@/lib/api';
import { getAuthUser } from '@/lib/auth';
import { useState, useEffect, useCallback, useRef } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, Avatar, ThemeProvider, createTheme,
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
import MenuIcon from '@mui/icons-material/Menu';

const DRAWER_WIDTH = 256;
const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_KEY || '';
const OPENROUTER_MODEL = 'google/gemini-2.5-flash';

const SIDEBAR_BG = '#0f172a';
const SIDEBAR_HOVER = 'rgba(255,255,255,0.06)';
const SIDEBAR_ACTIVE = 'rgba(99,102,241,0.18)';
const HEADER_BG = '#0f172a';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#6366f1', dark: '#4f46e5', light: '#818cf8' },
    secondary: { main: '#0ea5e9' },
    background: { default: '#f1f5f9', paper: '#ffffff' },
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
          boxShadow: '0 1px 0 rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
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
            backgroundColor: '#f8fafc',
            fontWeight: 700,
            color: '#94a3b8',
            fontSize: '0.67rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderBottom: '1px solid #e2e8f0',
            borderTop: 'none',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: '#f8fafc' },
          '&:last-child td': { borderBottom: 'none' },
          transition: 'background-color 0.12s',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: '1px solid #eef2f7', padding: '12px 16px' },
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
const ORDER_STATUSES = ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const statusChip = (status?: string, tFn?: (k: string) => string) => {
  const s = status ?? 'PENDING';
  const map: Record<string, { bg: string; color: string; border: string }> = {
    PENDING:   { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    SHIPPED:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    DELIVERED: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    CANCELLED: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  };
  const style = map[s] ?? { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
  const labelMap: Record<string, string> = {
    PENDING: tFn ? tFn('pending') : 'Pending',
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
  if (type === 'INDIVIDUAL') return <Chip label={indLabel} size="small" sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '0.7rem', fontWeight: 600 }} />;
  return <Chip label={comLabel} size="small" sx={{ bgcolor: '#faf5ff', color: '#7c3aed', border: '1px solid #e9d5ff', fontSize: '0.7rem', fontWeight: 600 }} />;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return dateStr; }
};

export default function Home() {
  const [tab, setTab] = useState<'dashboard' | 'customers' | 'orders' | 'ai' | 'analytics' | 'users'>('dashboard');
  const [lang, setLang] = useState<Lang>('en');
  const { t } = useTranslation(lang);
  const [drawerCustomer, setDrawerCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);
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
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState('USER');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState('session-init');
  const [mounted, setMounted] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [chartMode, setChartMode] = useState<'daily' | 'monthly'>('monthly');
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try { const data = await api.get<Customer[]>('/api/customers'); setCustomers(Array.isArray(data) ? data : []); }
    catch { showSnackbar('Failed to load customers.', 'error'); }
    finally { setLoading(false); }
  }, [t]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try { const data = await api.get<Order[]>('/api/orders'); setOrders(Array.isArray(data) ? data : []); }
    catch { showSnackbar(t('error'), 'error'); }
    finally { setLoading(false); }
  }, [t]);

  const fetchUsers = useCallback(async () => {
    try { const data = await api.get<UserItem[]>('/api/users'); setUsers(Array.isArray(data) ? data : []); }
    catch { /* silently ignore if not ADMIN */ }
  }, []);

  useEffect(() => {
    setMounted(true);
    setSessionId(`session-${Date.now()}`);
    const user = getAuthUser();
    setCurrentUser(user);
    fetchCustomers();
    fetchOrders();
    if (user?.role === 'ADMIN') fetchUsers();
  }, [fetchCustomers, fetchOrders, fetchUsers]);

  useEffect(() => {
    if (tab === 'customers') fetchCustomers();
    else if (tab === 'orders') { fetchOrders(); fetchCustomers(); }
    else if (tab === 'users') fetchUsers();
  }, [tab, fetchCustomers, fetchOrders, fetchUsers]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => setSnackbar({ open: true, message, severity });

  const totalRevenue = orders.reduce((sum, o) => sum + o.price * o.quantity, 0);
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
    } catch { showSnackbar(t('error'), 'error'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await api.delete(`/api/customers/${deleteId}`); showSnackbar(t('deleted'), 'success'); setDeleteDialogOpen(false); fetchCustomers(); }
    catch { showSnackbar(t('deleteFailed'), 'error'); }
  };

  const handleSaveOrder = async () => {
    const customerId = parseInt(editOrder.customerId);
    const price = parseFloat(editOrder.price);
    const quantity = parseInt(editOrder.quantity);
    if (!editOrder.productName.trim()) { showSnackbar('Product name is required', 'error'); return; }
    if (isNaN(customerId) || customerId <= 0) { showSnackbar('Valid customer ID is required', 'error'); return; }
    if (isNaN(price) || price < 0) { showSnackbar('Valid price is required', 'error'); return; }
    if (isNaN(quantity) || quantity <= 0) { showSnackbar('Valid quantity is required', 'error'); return; }
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
    catch { showSnackbar('Status update failed.', 'error'); }
  };

  const filteredCustomers = customers.filter(c => { const q = custSearch.toLowerCase(); if (!q) return true; return `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q) || (c.phone ?? '').toLowerCase().includes(q); });
  const filteredOrders = orders.filter(o => { const q = ordSearch.toLowerCase(); if (!q) return true; return (o.productName ?? '').toLowerCase().includes(q) || String(o.customerId ?? '').includes(q) || (o.status ?? '').toLowerCase().includes(q); });
  const filteredUsers = users.filter(u => { const q = userSearch.toLowerCase(); if (!q) return true; return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q); });
  const getCustomerName = (id: number) => { const c = customers.find(c => c.id === id); return c ? `${c.firstName} ${c.lastName}` : `ID: ${id}`; };

  const exportExcel = (type: 'customers' | 'orders') => {
    const wb = XLSX.utils.book_new();
    if (type === 'customers') {
      const rows = customers.map(c => ({
        ID: c.id, 'First Name': c.firstName, 'Last Name': c.lastName ?? '',
        Email: c.email, Phone: c.phone, Type: c.customerType ?? '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');
      XLSX.writeFile(wb, 'customers.xlsx');
    } else {
      const rows = orders.map(o => ({
        ID: o.id,
        Customer: getCustomerName(o.customerId),
        Product: o.productName,
        'Unit Price': o.price,
        Qty: o.quantity,
        Total: Math.round((o.price * o.quantity) * 10000) / 10000,
        Date: o.date ? new Date(o.date).toLocaleDateString('en-US') : '',
        Status: o.status ?? '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      // Keep numbers as-is — Excel General format shows exactly what was entered
      // No forced decimal format: 5.2 shows as 5.2, 5.999932 shows as 5.999932
      ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 24 }, { wch: 12 }, { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');
      XLSX.writeFile(wb, 'orders.xlsx');
    }
  };

  // Analytics data
  const revenueByMonth = (() => {
    const map: Record<string, { label: string; value: number }> = {};
    orders.forEach(o => {
      if (!o.date) return;
      const d = new Date(o.date);
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      if (!map[sortKey]) map[sortKey] = { label, value: 0 };
      map[sortKey].value += o.price * o.quantity;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => [v.label, v.value] as [string, number]);
  })();

  const revenueByDay = (() => {
    const map: Record<string, { label: string; value: number }> = {};
    orders.forEach(o => {
      if (!o.date) return;
      const d = new Date(o.date);
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!map[sortKey]) map[sortKey] = { label, value: 0 };
      map[sortKey].value += o.price * o.quantity;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => [v.label, v.value] as [string, number]);
  })();

  const chartData = chartMode === 'monthly' ? revenueByMonth : revenueByDay;
  const maxChartVal = Math.max(...chartData.map(([, v]) => v), 1);
  const statusCounts = ORDER_STATUSES.map(s => ({ status: s, count: orders.filter(o => (o.status ?? 'PENDING') === s).length }));

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);
    try {
      // Build system context from real data
      const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'ROLE_ADMIN';
  const customerSummary = customers.map(c =>
    isAdmin
      ? `- ID:${c.id} ${c.firstName} ${c.lastName} (${c.customerType ?? 'INDIVIDUAL'}) email:${c.email} phone:${c.phone}`
      : `- ID:${c.id} ${c.firstName} ${c.lastName} (${c.customerType ?? 'INDIVIDUAL'})`
  ).join('\n');
      const isAdminUser = currentUser?.role === 'ADMIN';
      const orderSummary = orders.map(o => {
        const base = `- ID:${o.id} product:"${o.productName}" customer_id:${o.customerId} qty:${o.quantity} status:${o.status ?? 'PENDING'} date:${o.date ? new Date(o.date).toLocaleDateString('en-US') : '-'}`;
        return isAdminUser ? `${base} price:${o.price} total:${(o.price*o.quantity).toFixed(2)}` : base;
      }).join('\n');
      const totalRev = orders.reduce((s, o) => s + o.price * o.quantity, 0);
      const revenueSection = isAdminUser
        ? `\n### Revenue Summary:\nTotal revenue: ${totalRev.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} across ${orders.length} orders\nAverage order value: ${orders.length > 0 ? (totalRev / orders.length).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0'}`
        : '';
      const systemPrompt = `You are a CRM assistant. You have access to the user's real customer and order data and answer questions based on it. Always respond in the same language the user writes in — if they write in Turkish, respond in Turkish; if in English, respond in English.

## Current Data

### Customers (${customers.length} total):
${customerSummary || 'No customers yet.'}

### Orders (${orders.length} total):
${orderSummary || 'No orders yet.'}${revenueSection}

## Rules
- Always respond in the same language the user uses (Turkish if they write Turkish, English if they write English)
- Give concrete, accurate answers based on the data
- Perform calculations when needed (rates, averages, totals, etc.)
- Be concise and clear — avoid unnecessary verbosity
- Do NOT add, delete, or modify customers/orders — analysis only
${!isAdminUser ? '- Do NOT reveal pricing, revenue, or financial information — this user does not have permission to see financial data' : ''}`;

      const messages = [
        ...chatMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: text }
      ];

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://customer-management-app.com',
          'X-Title': 'Customer Management CRM',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          max_tokens: 1024,
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? 'No response received.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${err?.message ?? 'Connection failed.'}` }]);
    } finally { setChatLoading(false); }
  };

  const isAdmin = currentUser?.role === 'ADMIN';
  const sidebarItems = [
    { key: 'dashboard', label: t('dashboard'), icon: <BarChartIcon />, count: null, color: '#6366f1' },
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
        { label: t('totalCustomers2'), value: customers.length, icon: <PeopleIcon />, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
        { label: t('individual'), value: customers.filter(c => (c.customerType ?? 'INDIVIDUAL') === 'INDIVIDUAL').length, icon: <PeopleIcon />, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
        { label: t('company'), value: customers.filter(c => c.customerType === 'COMPANY').length, icon: <StorefrontIcon />, color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
        ...(isAdmin ? [{ label: t('totalRevenue'), value: totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), icon: <AttachMoneyIcon />, color: '#d97706', bg: '#fffbeb', border: '#fde68a' }] : []),
      ]
    : tab === 'orders'
    ? [
        { label: t('totalOrdersLabel'), value: orders.length, icon: <ReceiptIcon />, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
        ...(isAdmin ? [
          { label: t('totalRevenue'), value: totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), icon: <AttachMoneyIcon />, color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: t('avgOrderValue'), value: avgOrderValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), icon: <TrendingUpIcon />, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
        ] : []),
        { label: t('pendingOrders2'), value: orders.filter(o => (o.status ?? 'PENDING') === 'PENDING').length, icon: <ShoppingCartIcon />, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
      ]
    : [];

  if (!mounted) return null;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                  }}>
                    <StorefrontIcon sx={{ fontSize: 19, color: 'white' }} />
                  </Box>
                  <Box sx={{ overflow: 'hidden' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: 'white', lineHeight: 1.2, whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>CRM Platform</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase', mt: 0.2 }}>{ t('appSubtitle') }</Typography>
                  </Box>
                </Box>
              </Box>

              {/* Nav */}
              <List sx={{ px: 1.5, pt: 2, flex: 1 }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', textTransform: 'uppercase', px: 1.5, mb: 1 }}>Navigation</Typography>
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
                          borderLeft: active ? '2px solid #6366f1' : '2px solid transparent',
                          pl: '14px',
                          py: 1,
                          '&:hover': { bgcolor: SIDEBAR_HOVER, color: 'rgba(255,255,255,0.85)' },
                          '&:hover .MuiListItemIcon-root': { color: 'rgba(255,255,255,0.65)' },
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <ListItemIcon sx={{ color: active ? '#818cf8' : 'rgba(255,255,255,0.28)', minWidth: 34, transition: 'color 0.15s' }}>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.label} slotProps={{ primary: { style: { fontSize: '0.855rem', fontWeight: active ? 600 : 400, letterSpacing: active ? '-0.01em' : 'normal' } } }} />
                        {item.count !== null && (
                          <Chip label={item.count} size="small" sx={{ bgcolor: active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)', color: active ? '#a5b4fc' : 'rgba(255,255,255,0.28)', fontSize: '0.65rem', height: 18, minWidth: 22, fontWeight: 600 }} />
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
                    <Avatar sx={{ width: 34, height: 34, bgcolor: isAdmin ? 'rgba(16,185,129,0.25)' : 'rgba(99,102,241,0.25)', border: isAdmin ? '1.5px solid rgba(16,185,129,0.5)' : '1.5px solid rgba(99,102,241,0.5)', fontSize: '0.85rem', fontWeight: 700, color: isAdmin ? '#34d399' : '#818cf8' }}>
                      {currentUser.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, overflow: 'hidden' }}>
                      <Typography sx={{ color: 'white', fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.username}</Typography>
                      <Typography sx={{ color: isAdmin ? '#34d399' : 'rgba(255,255,255,0.3)', fontSize: '0.62rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{currentUser.role}</Typography>
                    </Box>
                    <Tooltip title={t("signOut")}>
                      <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.25)', '&:hover': { color: 'rgba(255,255,255,0.8)', bgcolor: 'rgba(255,255,255,0.08)' }, borderRadius: 1.5 }} onClick={() => { localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); document.cookie = 'auth_token=; path=/; max-age=0'; window.location.href = '/login'; }}>
                        <LogoutIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
                <Typography sx={{ color: 'rgba(255,255,255,0.12)', fontSize: '0.58rem', letterSpacing: '0.04em' }}>{t('springBootKafkaPostgres')}</Typography>
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
            <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none' } }}>
              {sidebarContent}
            </Drawer>
          );
        })()}

        {/* ── Main ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', bgcolor: '#f1f5f9' }}>

          {/* TopBar */}
          <AppBar position="static" elevation={0}>
            <Toolbar sx={{ minHeight: '60px !important', px: { xs: 1.5, md: 2.5 } }}>
              {isMobile && (
                <IconButton edge="start" color="inherit" onClick={() => setMobileOpen(true)} sx={{ mr: 1.5, color: 'rgba(255,255,255,0.7)' }}>
                  <MenuIcon />
                </IconButton>
              )}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em', lineHeight: 1.2, color: 'white' }}>{pageTitle}</Typography>
                <Typography sx={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1, mt: 0.2 }}>
                  {tab === 'dashboard' && (isAdmin
                    ? `${customers.length} ${t('customers')} · ${orders.length} ${t('orders')} · ${totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} ${t('totalRevenue').toLowerCase()}`
                    : `${customers.length} ${t('customers')} · ${orders.length} ${t('orders')}`
                  )}
                  {tab === 'customers' && `${customers.length} ${t('total')} · ${customers.filter(c => c.customerType === 'COMPANY').length} ${t('companies')} · ${customers.filter(c => (c.customerType ?? 'INDIVIDUAL') === 'INDIVIDUAL').length} ${t('individuals')}`}
                  {tab === 'orders' && `${orders.length} ${t('total')} · ${orders.filter(o => o.status === 'DELIVERED').length} ${t('delivered')} · ${orders.filter(o => (o.status ?? 'PENDING') === 'PENDING').length} ${t('pending')}`}
                  {tab === 'analytics' && t('businessIntelligence')}
                  {tab === 'ai' && t('aiSubtitle')}
                  {tab === 'users' && `${users.length} ${t('registeredAccounts')}`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isAdmin && (
                  <Chip icon={<AdminPanelSettingsIcon sx={{ fontSize: '13px !important' }} />} label="ADMIN" size="small"
                    sx={{ bgcolor: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: '0.67rem', border: '1px solid rgba(99,102,241,0.25)', height: 24, fontWeight: 700, letterSpacing: '0.05em' }} />
                )}
                <Box sx={{ display: 'flex', borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
                  {(['en', 'tr'] as Lang[]).map(l => (
                    <Box key={l} onClick={() => setLang(l)} sx={{ px: 1.2, py: 0.4, cursor: 'pointer', fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.05em', bgcolor: lang === l ? 'rgba(99,102,241,0.4)' : 'transparent', color: lang === l ? 'white' : 'rgba(255,255,255,0.45)', transition: 'all 0.15s', '&:hover': { bgcolor: lang === l ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)' } }}>{l.toUpperCase()}</Box>
                  ))}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.2, py: 0.4, borderRadius: 10, bgcolor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.18)' }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.8)' }} />
                  <Typography sx={{ fontSize: '0.67rem', color: '#86efac', fontWeight: 600 }}>Live</Typography>
                </Box>
              </Box>
            </Toolbar>
          </AppBar>

          {/* Scrollable content */}
          <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: { xs: 1.5, md: 3 }, gap: { xs: 1.5, md: 2.5 } }}>

            {/* Stat Cards — only customers/orders */}
            {statCards.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(2,1fr)', md: `repeat(${Math.min(statCards.length, 4)},1fr)` }, gap: { xs: 1, md: 2 }, flexShrink: 0 }}>
                {statCards.map((s) => (
                  <Card key={s.label} elevation={0} sx={{ border: `1px solid ${s.border}`, borderRadius: 3, transition: 'all 0.2s ease', cursor: 'default', bgcolor: 'white', '&:hover': { boxShadow: '0 8px 28px rgba(0,0,0,0.08)', transform: 'translateY(-2px)', borderColor: s.color + '60' } }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '16px !important', px: '18px !important' }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', mb: 0.2 }}>{s.label}</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', lineHeight: 1.2, color: '#0f172a', letterSpacing: '-0.02em' }}>{s.value}</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            {/* ── CUSTOMERS TAB ── */}
            {tab === 'customers' && (
              <Paper elevation={0} sx={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9', flexShrink: 0, bgcolor: 'white' }}>
                  <TextField size="small" placeholder={t('searchCustomers')} value={custSearch}
                    onChange={(e) => { setCustSearch(e.target.value); setCustPage(0); }}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 17, color: '#94a3b8' }} /></InputAdornment> } }}
                    sx={{ width: 300, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 2 } }} />
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title={t('exportExcel')}><IconButton size="small" onClick={() => exportExcel('customers')} sx={{ color: '#64748b' }}><DownloadIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Refresh"><IconButton size="small" onClick={fetchCustomers} sx={{ color: '#64748b' }}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
                  {isAdmin && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} disableElevation size="small"
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', '&:hover': { background: 'linear-gradient(135deg,#4f46e5,#4338ca)' } }}>
                      {t('newCustomer')}
                    </Button>
                  )}
                </Box>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={32} /></Box>
                ) : (
                  <>
                    <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: 60 }}>{t('id')}</TableCell>
                            <TableCell sx={{ width: 110 }}>{t('type')}</TableCell>
                            <TableCell>{t('customer')}</TableCell>
                            <TableCell>{t('email')}</TableCell>
                            <TableCell>{t('phone')}</TableCell>
                            {isAdmin && <TableCell align="right" sx={{ width: 90 }}>{t('actions')}</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredCustomers.length === 0 && (
                            <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                              <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                                <PeopleIcon sx={{ fontSize: 28, color: '#94a3b8' }} />
                              </Box>
                              <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '0.95rem', mb: 0.5 }}>{t('noCustomers')}</Typography>
                              <Typography variant="caption" color="text.secondary">{custSearch ? t('tryDifferentSearch') : t('addFirstCustomer')}</Typography>
                            </TableCell></TableRow>
                          )}
                          {filteredCustomers.slice(custPage * custRowsPerPage, custPage * custRowsPerPage + custRowsPerPage).map(c => (
                            <TableRow key={c.id}>
                              <TableCell><Chip label={`#${c.id}`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontSize: '0.68rem', height: 20 }} /></TableCell>
                              <TableCell>{customerTypeChip(c, t)}</TableCell>
                              <TableCell sx={{ cursor: 'pointer' }} onClick={() => setDrawerCustomer(c)}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Avatar sx={{ width: 30, height: 30, bgcolor: '#dbeafe', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700 }}>
                                    {(c.firstName ?? '?')[0]}{(c.lastName ?? '')[0]}
                                  </Avatar>
                                  <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', '&:hover': { color: '#2563eb' } }}>{c.firstName} {c.lastName}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell><Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>{c.email}</Typography></TableCell>
                              <TableCell><Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>{c.phone}</Typography></TableCell>
                              {isAdmin && (
                                <TableCell align="right" onClick={e => e.stopPropagation()}>
                                  <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(c)} sx={{ color: '#2563eb', mr: 0.5 }}><EditIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                  <Tooltip title="Delete"><IconButton size="small" onClick={() => openDelete(c.id)} sx={{ color: '#ef4444' }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination component="div" count={filteredCustomers.length} page={custPage}
                      onPageChange={(_, p) => setCustPage(p)} rowsPerPage={custRowsPerPage}
                      onRowsPerPageChange={e => { setCustRowsPerPage(parseInt(e.target.value)); setCustPage(0); }}
                      rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage={t('rowsPerPage')} labelDisplayedRows={({ from, to, count }) => `${from}–${to} ${t('of')} ${count}`} sx={{ borderTop: '1px solid #f1f5f9', flexShrink: 0 }} />
                  </>
                )}
              </Paper>
            )}

            {/* ── ORDERS TAB ── */}
            {tab === 'orders' && (
              <Paper elevation={0} sx={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9', flexShrink: 0, bgcolor: 'white' }}>
                  <TextField size="small" placeholder={t('searchOrders')} value={ordSearch}
                    onChange={(e) => { setOrdSearch(e.target.value); setOrdPage(0); }}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 17, color: '#94a3b8' }} /></InputAdornment> } }}
                    sx={{ width: 300, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 2 } }} />
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title={t('exportExcel')}><IconButton size="small" onClick={() => exportExcel('orders')} sx={{ color: '#64748b' }}><DownloadIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Refresh"><IconButton size="small" onClick={fetchOrders} sx={{ color: '#64748b' }}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
                  {isAdmin && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openAddOrder} disableElevation size="small"
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', '&:hover': { background: 'linear-gradient(135deg,#4f46e5,#4338ca)' } }}>
                      {t('newOrder')}
                    </Button>
                  )}
                </Box>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={32} /></Box>
                ) : (
                  <>
                    <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: 55 }}>{t('id')}</TableCell>
                            <TableCell sx={{ width: 140 }}>{t('status')}</TableCell>
                            <TableCell>{t('product')}</TableCell>
                            <TableCell>{t('customer')}</TableCell>
                            {isAdmin && <TableCell sx={{ width: 110 }}>{t('unitPrice')}</TableCell>}
                            <TableCell sx={{ width: 70 }}>{t('qty')}</TableCell>
                            {isAdmin && <TableCell sx={{ width: 110 }}>{t('total')}</TableCell>}
                            <TableCell sx={{ width: 110 }}>{t('date')}</TableCell>
                            {isAdmin && <TableCell align="right" sx={{ width: 80 }}>{t('actions')}</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredOrders.length === 0 && (
                            <TableRow><TableCell colSpan={isAdmin ? 9 : 6} align="center" sx={{ py: 8 }}>
                              <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                                <ShoppingCartIcon sx={{ fontSize: 28, color: '#94a3b8' }} />
                              </Box>
                              <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '0.95rem', mb: 0.5 }}>{t('noOrders')}</Typography>
                              <Typography variant="caption" color="text.secondary">{ordSearch ? t('tryDifferentSearch') : t('createFirstOrder')}</Typography>
                            </TableCell></TableRow>
                          )}
                          {filteredOrders.slice(ordPage * ordRowsPerPage, ordPage * ordRowsPerPage + ordRowsPerPage).map(o => (
                            <TableRow key={o.id}>
                              <TableCell><Chip label={`#${o.id}`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontSize: '0.68rem', height: 20 }} /></TableCell>
                              <TableCell>
                                {isAdmin ? (
                                  <FormControl size="small">
                                    <Select value={o.status ?? 'PENDING'} onChange={e => { e.stopPropagation(); updateOrderStatus(o.id, e.target.value); }}
                                      renderValue={v => statusChip(v, t)}
                                      sx={{ '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, '& .MuiSelect-select': { p: 0 }, minWidth: 110 }}>
                                      {ORDER_STATUSES.map(s => <MenuItem key={s} value={s}>{statusChip(s, t)}</MenuItem>)}
                                    </Select>
                                  </FormControl>
                                ) : statusChip(o.status ?? 'PENDING', t)}
                              </TableCell>
                              <TableCell><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{o.productName}</Typography></TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Avatar sx={{ width: 22, height: 22, fontSize: '0.6rem', bgcolor: '#e0e7ff', color: '#4338ca' }}>{getCustomerName(o.customerId)[0]}</Avatar>
                                  <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>{getCustomerName(o.customerId)}</Typography>
                                </Box>
                              </TableCell>
                              {isAdmin && <TableCell><Typography sx={{ fontSize: '0.85rem' }}>{o.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography></TableCell>}
                              <TableCell><Chip label={`${o.quantity}x`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontSize: '0.68rem', height: 20 }} /></TableCell>
                              {isAdmin && (
                                <TableCell>
                                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#16a34a' }}>
                                    {(o.price * o.quantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                  </Typography>
                                </TableCell>
                              )}
                              <TableCell><Typography sx={{ color: '#64748b', fontSize: '0.82rem' }}>{formatDate(o.date)}</Typography></TableCell>
                              {isAdmin && (
                                <TableCell align="right">
                                  <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditOrder(o)} sx={{ color: '#2563eb', mr: 0.5 }}><EditIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                  <Tooltip title="Delete"><IconButton size="small" onClick={() => openDeleteOrder(o.id)} sx={{ color: '#ef4444' }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination component="div" count={filteredOrders.length} page={ordPage}
                      onPageChange={(_, p) => setOrdPage(p)} rowsPerPage={ordRowsPerPage}
                      onRowsPerPageChange={e => { setOrdRowsPerPage(parseInt(e.target.value)); setOrdPage(0); }}
                      rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage={t('rowsPerPage')} labelDisplayedRows={({ from, to, count }) => `${from}–${to} ${t('of')} ${count}`} sx={{ borderTop: '1px solid #f1f5f9', flexShrink: 0 }} />
                  </>
                )}
              </Paper>
            )}

            {/* ── USERS TAB ── */}
            {tab === 'users' && isAdmin && (
              <Paper elevation={0} sx={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9', flexShrink: 0, bgcolor: 'white' }}>
                  <TextField size="small" placeholder={t('searchUsers')} value={userSearch} onChange={e => setUserSearch(e.target.value)}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 17, color: '#94a3b8' }} /></InputAdornment> } }}
                    sx={{ width: 300, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 2 } }} />
                  <Box sx={{ flex: 1 }} />
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddUserDialogOpen(true)} disableElevation size="small" sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}>{ t('addUser') }</Button>
                  <Tooltip title="Refresh"><IconButton size="small" onClick={fetchUsers} sx={{ color: '#64748b' }}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
                </Box>
                <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 60 }}>{t('id')}</TableCell>
                        <TableCell>{t('username')}</TableCell>
                        <TableCell>{t('email')}</TableCell>
                        <TableCell sx={{ width: 100 }}>{t('role')}</TableCell>
                        <TableCell align="right" sx={{ width: 100 }}>{t('actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredUsers.length === 0 && (
                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                          <ManageAccountsIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1, display: 'block', mx: 'auto' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>No users found</Typography>
                        </TableCell></TableRow>
                      )}
                      {filteredUsers.map(u => (
                        <TableRow key={u.id}>
                          <TableCell><Chip label={`#${u.id}`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontSize: '0.68rem', height: 20 }} /></TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 30, height: 30, bgcolor: u.role === 'ADMIN' ? '#059669' : '#2563eb', fontSize: '0.75rem', fontWeight: 700 }}>{u.username.charAt(0).toUpperCase()}</Avatar>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.username}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell><Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>{u.email}</Typography></TableCell>
                          <TableCell>
                            <Chip label={u.role} size="small" sx={{ bgcolor: u.role === 'ADMIN' ? '#f0fdf4' : '#eff6ff', color: u.role === 'ADMIN' ? '#059669' : '#2563eb', border: `1px solid ${u.role === 'ADMIN' ? '#bbf7d0' : '#bfdbfe'}`, fontWeight: 700, fontSize: '0.68rem' }} />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title={t('changeRole')}>
                              <IconButton size="small" sx={{ color: '#059669', mr: 0.5 }} onClick={() => { setSelectedUserId(u.id); setSelectedRole(u.role); setRoleDialogOpen(true); }}>
                                <AdminPanelSettingsIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('deleteUser')}>
                              <IconButton size="small" sx={{ color: '#ef4444' }} disabled={u.username === currentUser?.username} onClick={() => { setDeleteUserId(u.id); setDeleteUserDialogOpen(true); }}>
                                <DeleteIcon sx={{ fontSize: 16 }} />
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
              const pending = orders.filter(o => (o.status ?? 'PENDING') === 'PENDING').length;
              const cancelled = orders.filter(o => o.status === 'CANCELLED').length;
              const fulfillmentRate = orders.length > 0 ? ((delivered / orders.length) * 100).toFixed(1) : '0';
              // Real trend: compare last 30 days vs prior 30 days
              const now = Date.now();
              const d30 = 30 * 24 * 60 * 60 * 1000;
              const recentOrders30 = orders.filter(o => o.date && (now - new Date(o.date).getTime()) < d30);
              const prevOrders30 = orders.filter(o => o.date && (now - new Date(o.date).getTime()) >= d30 && (now - new Date(o.date).getTime()) < 2 * d30);
              const recentRev = recentOrders30.reduce((s, o) => s + o.price * o.quantity, 0);
              const prevRev = prevOrders30.reduce((s, o) => s + o.price * o.quantity, 0);
              const revTrend = prevRev > 0 ? (((recentRev - prevRev) / prevRev) * 100).toFixed(1) : null;
              const custTrend = null; // no creation date on customer — omit
              const prevDelivered = prevOrders30.filter(o => o.status === 'DELIVERED').length;
              const prevFulfillRate = prevOrders30.length > 0 ? (prevDelivered / prevOrders30.length) * 100 : null;
              const currFulfillNum = recentOrders30.length > 0 ? (recentOrders30.filter(o => o.status === 'DELIVERED').length / recentOrders30.length) * 100 : null;
              const fulfillTrend = prevFulfillRate !== null && currFulfillNum !== null ? (currFulfillNum - prevFulfillRate).toFixed(1) : null;
              const prevPending = prevOrders30.filter(o => (o.status ?? 'PENDING') === 'PENDING').length;
              const currPending = recentOrders30.filter(o => (o.status ?? 'PENDING') === 'PENDING').length;
              const pendTrend = prevPending > 0 ? (((currPending - prevPending) / prevPending) * 100).toFixed(1) : null;
              // Top customers by revenue
              const custRevMap: Record<number, number> = {};
              orders.forEach(o => { custRevMap[o.customerId] = (custRevMap[o.customerId] ?? 0) + o.price * o.quantity; });
              const topCustomers = Object.entries(custRevMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, rev]) => ({ customer: customers.find(c => c.id === Number(id)), rev })).filter(x => x.customer);
              // Recent orders
              const recentOrders = [...orders].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 6);
              // Revenue chart (last 6 months/days)
              const revenueChartData = (() => {
                const map: Record<string, { label: string; value: number }> = {};
                orders.forEach(o => {
                  if (!o.date) return;
                  const d = new Date(o.date);
                  const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
                  if (!map[sortKey]) map[sortKey] = { label, value: 0 };
                  map[sortKey].value += o.price * o.quantity;
                });
                return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([, v]) => v);
              })();

              return (
                <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* KPI Cards */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2, flexShrink: 0 }}>
                    {(() => {
                      const fmtTrend = (val: string | null, higherIsBetter = true) => {
                        if (val === null) return { label: t('vsLast30d'), up: true };
                        const n = parseFloat(val);
                        return { label: `${n >= 0 ? '+' : ''}${val}% ${t('vsLast30d')}`, up: higherIsBetter ? n >= 0 : n <= 0 };
                      };
                      const revT = fmtTrend(revTrend);
                      const fufT = fmtTrend(fulfillTrend);
                      const pndT = fmtTrend(pendTrend, false);
                      const adminCards = [
                        { label: t('totalRevenue'), value: totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), sub: `${orders.length} ${t('ordersTotal')}`, icon: <AttachMoneyIcon />, color: '#6366f1', bg: '#f5f3ff', border: '#e0e7ff', trend: revT.label, up: revT.up },
                        { label: t('totalCustomers2'), value: customers.length.toString(), sub: `${customers.filter(c => c.customerType === 'COMPANY').length} ${t('companies')}`, icon: <PeopleIcon />, color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd', trend: t('allTime'), up: true },
                        { label: t('fulfillmentRate2'), value: `${fulfillmentRate}%`, sub: `${delivered} ${t('of')} ${orders.length} ${t('delivered')}`, icon: <TrendingUpIcon />, color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', trend: fufT.label, up: fufT.up },
                        { label: t('pendingOrders2'), value: pending.toString(), sub: `${cancelled} ${t('cancelledSub')}`, icon: <ShoppingCartIcon />, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', trend: pndT.label, up: pndT.up },
                      ];
                      const userCards = [
                        { label: t('totalOrdersLabel'), value: orders.length.toString(), sub: `${delivered} ${t('delivered')}`, icon: <ReceiptIcon />, color: '#6366f1', bg: '#f5f3ff', border: '#e0e7ff', trend: t('allTime'), up: true },
                        { label: t('totalCustomers2'), value: customers.length.toString(), sub: `${customers.filter(c => c.customerType === 'COMPANY').length} ${t('companies')}`, icon: <PeopleIcon />, color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd', trend: t('allTime'), up: true },
                        { label: t('fulfillmentRate2'), value: `${fulfillmentRate}%`, sub: `${delivered} ${t('of')} ${orders.length} ${t('delivered')}`, icon: <TrendingUpIcon />, color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', trend: fufT.label, up: fufT.up },
                        { label: t('pendingOrders2'), value: pending.toString(), sub: `${cancelled} ${t('cancelledSub')}`, icon: <ShoppingCartIcon />, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', trend: pndT.label, up: pndT.up },
                      ];
                      return (isAdmin ? adminCards : userCards).map(card => (
                        <Paper key={card.label} elevation={0} sx={{
                          border: `1px solid ${card.border}`,
                          borderRadius: 3,
                          p: 2.5,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                          background: 'white',
                          transition: 'all 0.2s ease',
                          '&:hover': { boxShadow: `0 8px 32px rgba(0,0,0,0.08)`, transform: 'translateY(-2px)', borderColor: card.color + '50' },
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.3 }}>{card.label}</Typography>
                              <Typography sx={{ fontWeight: 800, fontSize: '1.55rem', color: '#0f172a', lineHeight: 1.1, letterSpacing: '-0.03em' }}>{card.value}</Typography>
                            </Box>
                            <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, flexShrink: 0 }}>{card.icon}</Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{card.sub}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, px: 0.8, py: 0.2, borderRadius: 5, bgcolor: card.up ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
                              <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: card.up ? '#10b981' : '#ef4444' }}>{card.up ? '↑' : '↓'} {card.trend}</Typography>
                            </Box>
                          </Box>
                          <Box sx={{ mx: -0.5, mt: 0.5 }}>
                            <ResponsiveContainer width="100%" height={36}>
                              <LineChart data={[3,5,4,7,6,9,8,11,10,13,12,15].map((v,i) => ({i,v}))}>
                                <Line type="monotone" dataKey="v" stroke={card.color} strokeWidth={1.8} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </Box>
                        </Paper>
                      ));
                    })()}
                  </Box>

                  {/* Quick Actions */}
                  <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0, flexWrap: 'wrap' }}>
                    {isAdmin && (
                      <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} disableElevation size="small"
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', '&:hover': { background: 'linear-gradient(135deg,#4f46e5,#4338ca)' } }}>
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
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', borderColor: '#e2e8f0', color: '#64748b', '&:hover': { borderColor: '#6366f1', color: '#6366f1', bgcolor: '#f5f3ff' } }}>
                      {t('analytics')}
                    </Button>
                    <Button variant="outlined" startIcon={<SmartToyIcon />} onClick={() => setTab('ai')} size="small"
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', borderColor: '#e2e8f0', color: '#64748b', '&:hover': { borderColor: '#6366f1', color: '#6366f1', bgcolor: '#f5f3ff' } }}>
                      {t('aiAgent')}
                    </Button>
                  </Box>

                  {/* Revenue Chart + Top Customers */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: isAdmin ? '3fr 2fr' : '1fr' }, gap: 2 }}>
                    {isAdmin && (
                      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 2.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', mb: 0.5 }}>{t('revenueTrend')}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mb: 2 }}>{t('monthlyRevenueOverview')}</Typography>
                        {revenueChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={revenueChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                              <defs>
                                <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                              <ReTooltip formatter={(v: number) => [v.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #eef2f7', fontSize: 12 }} />
                              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>No order data yet</Typography>
                          </Box>
                        )}
                      </Paper>
                    )}

                    {/* Top Customers */}
                    <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 2.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', mb: 2 }}>{t('topCustomers')}</Typography>
                      {topCustomers.length === 0 ? (
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', py: 4 }}>{t('noDataYet')}</Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {topCustomers.map(({ customer: c, rev }, i) => (
                            <Box key={c!.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: ['#6366f1','#10b981','#f59e0b','#0ea5e9','#ef4444'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: 'white' }}>{i+1}</Typography>
                              </Box>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: '#e0e7ff', color: '#4338ca', fontSize: '0.7rem', fontWeight: 700 }}>{(c!.firstName ?? '?')[0]}</Avatar>
                              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c!.firstName} {c!.lastName}</Typography>
                                <Typography sx={{ fontSize: '0.68rem', color: '#94a3b8' }}>{orders.filter(o => o.customerId === c!.id).length} {t('orders')}</Typography>
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
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
                    <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{t('recentOrders')}</Typography>
                        <Button size="small" onClick={() => setTab('orders')} sx={{ textTransform: 'none', fontSize: '0.78rem', color: '#6366f1', fontWeight: 600, p: 0 }}>{t('viewAll')} →</Button>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        {recentOrders.length === 0 ? (
                          <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', py: 4 }}>{t('noOrders')}</Typography>
                        ) : recentOrders.map((o, i) => (
                          <Box key={o.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.5, borderBottom: i < recentOrders.length - 1 ? '1px solid #f8fafc' : 'none', '&:hover': { bgcolor: '#fafbfc' }, transition: 'background 0.15s' }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#e0e7ff', color: '#4338ca', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                              {getCustomerName(o.customerId)[0]}
                            </Avatar>
                            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.productName}</Typography>
                              <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{getCustomerName(o.customerId)} · {formatDate(o.date)}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                              {isAdmin && (
                                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#15803d' }}>{(o.price * o.quantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography>
                              )}
                              <Box sx={{ mt: 0.3 }}>{statusChip(o.status, t)}</Box>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Paper>

                    {/* Order Status Summary */}
                    <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 2.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', mb: 2 }}>{t('orderStatus')}</Typography>
                      {(() => {
                        const PIE_COLORS = ['#f59e0b','#6366f1','#10b981','#ef4444'];
                        const allPie = ORDER_STATUSES.map((s, i) => ({ name: s === 'PENDING' ? t('pending') : s === 'SHIPPED' ? t('shipped') : s === 'DELIVERED' ? t('delivered') : t('cancelled'), value: orders.filter(o => (o.status ?? 'PENDING') === s).length || 0.001, realCount: orders.filter(o => (o.status ?? 'PENDING') === s).length, color: PIE_COLORS[i] }));
                        return (
                          <>
                            <ResponsiveContainer width="100%" height={140}>
                              <PieChart>
                                <Pie data={allPie} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="value">
                                  {allPie.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" opacity={entry.realCount === 0 ? 0.2 : 1} />)}
                                </Pie>
                                <ReTooltip formatter={(v: number, name: string, props: any) => [props.payload.realCount, name]} contentStyle={{ borderRadius: 8, border: '1px solid #eef2f7', fontSize: 12 }} />
                              </PieChart>
                            </ResponsiveContainer>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mt: 1 }}>
                              {ORDER_STATUSES.map((s, i) => {
                                const count = orders.filter(o => (o.status ?? 'PENDING') === s).length;
                                return (
                                  <Box key={s} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIE_COLORS[i] }} />
                                      <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{s === 'PENDING' ? t('pending') : s === 'SHIPPED' ? t('shipped') : s === 'DELIVERED' ? t('delivered') : t('cancelled')}</Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                                      {count} ({orders.length > 0 ? ((count / orders.length) * 100).toFixed(0) : 0}%)
                                    </Typography>
                                  </Box>
                                );
                              })}
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
                  const now2 = Date.now();
                  const d30a = 30 * 24 * 60 * 60 * 1000;
                  const aNow = orders.filter(o => o.date && (now2 - new Date(o.date).getTime()) < d30a);
                  const aPrev = orders.filter(o => o.date && (now2 - new Date(o.date).getTime()) >= d30a && (now2 - new Date(o.date).getTime()) < 2 * d30a);
                  const aNowRev = aNow.reduce((s, o) => s + o.price * o.quantity, 0);
                  const aPrevRev = aPrev.reduce((s, o) => s + o.price * o.quantity, 0);
                  const calcTrend = (curr: number, prev: number) => prev > 0 ? (((curr - prev) / prev) * 100).toFixed(1) : null;
                  const revTrendA = calcTrend(aNowRev, aPrevRev);
                  const orderTrendA = calcTrend(aNow.length, aPrev.length);
                  const aNowAvg = aNow.length > 0 ? aNowRev / aNow.length : 0;
                  const aPrevAvg = aPrev.length > 0 ? aPrevRev / aPrev.length : 0;
                  const avgTrendA = calcTrend(aNowAvg, aPrevAvg);
                  const aNowPend = aNow.filter(o => (o.status ?? 'PENDING') === 'PENDING').length;
                  const aPrevPend = aPrev.filter(o => (o.status ?? 'PENDING') === 'PENDING').length;
                  const pendTrendA = calcTrend(aNowPend, aPrevPend);
                  const fmtA = (v: string | null, up?: boolean) => v === null ? { text: t('vsLast30d'), up: up ?? true } : { text: `${parseFloat(v) >= 0 ? '+' : ''}${v}% ${t('vsLast30d')}`, up: up !== undefined ? up : parseFloat(v) >= 0 };
                  const allAnalyticsCards = [
                    { label: t('totalRevenue').toUpperCase(), value: totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), trend: fmtA(revTrendA).text, trendUp: fmtA(revTrendA).up, color: '#6366f1', sparkColor: '#6366f1', adminOnly: true },
                    { label: t('totalOrders').toUpperCase(), value: orders.length.toString(), trend: fmtA(orderTrendA).text, trendUp: fmtA(orderTrendA).up, color: '#10b981', sparkColor: '#10b981', adminOnly: false },
                    { label: t('avgOrderValue').toUpperCase(), value: (orders.length > 0 ? totalRevenue / orders.length : 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }), trend: fmtA(avgTrendA).text, trendUp: fmtA(avgTrendA).up, color: '#f59e0b', sparkColor: '#f59e0b', adminOnly: true },
                    { label: t('pendingOrders').toUpperCase(), value: orders.filter(o => (o.status ?? 'PENDING') === 'PENDING').length.toString(), trend: fmtA(pendTrendA, pendTrendA !== null ? parseFloat(pendTrendA) <= 0 : true).text, trendUp: fmtA(pendTrendA, pendTrendA !== null ? parseFloat(pendTrendA) <= 0 : true).up, color: '#ef4444', sparkColor: '#ef4444', adminOnly: false },
                  ];
                  const analyticsCards = allAnalyticsCards.filter(c => isAdmin || !c.adminOnly);
                  // Sparkline: monthly order counts for last 12 months
                  const sparkMap: Record<number, number> = {};
                  orders.forEach(o => { if (o.date) { const m = new Date(o.date).getMonth(); sparkMap[m] = (sparkMap[m] ?? 0) + 1; } });
                  const sparkData = Array.from({ length: 12 }, (_, i) => sparkMap[i] ?? 0);
                  return (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2, flexShrink: 0 }}>
                      {analyticsCards.map((card) => (
                        <Paper key={card.label} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 2.5, overflow: 'hidden' }}>
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', mb: 0.5 }}>{card.label}</Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: '#0f172a', mb: 0.5 }}>{card.value}</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: card.trendUp ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                            {card.trendUp ? '↑' : '↓'} {card.trend}
                          </Typography>
                          <Box sx={{ mt: 1, mx: -0.5 }}>
                            <ResponsiveContainer width="100%" height={40}>
                              <LineChart data={sparkData.map((v, i) => ({ i, v }))}>
                                <Line type="monotone" dataKey="v" stroke={card.sparkColor} strokeWidth={2} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  );
                })()}

                {/* Revenue Line Chart + Order Status Pie */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: isAdmin ? '3fr 2fr' : '1fr' }, gap: 2 }}>
                  {isAdmin && <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{t('revenueOverview')}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t('totalRevenue')}</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: '#0f172a', mt: 0.5 }}>{totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography>
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
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                        <ReTooltip formatter={(v: number) => [v.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #eef2f7', fontSize: 12 }} />
                        <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Paper>}

                  {/* Order Status Donut */}
                  <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 2.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', mb: 2 }}>{t('orderStatusDistribution')}</Typography>
                    {(() => {
                      const PIE_COLORS = ['#f59e0b', '#6366f1', '#10b981', '#ef4444'];
                      const statusLabel = (s: string) => s === 'PENDING' ? t('pending') : s === 'SHIPPED' ? t('shipped') : s === 'DELIVERED' ? t('delivered') : t('cancelled');
                      const allPie = statusCounts.map((s) => ({ name: statusLabel(s.status), value: s.count || 0.001, realCount: s.count, color: PIE_COLORS[ORDER_STATUSES.indexOf(s.status)] }));
                      return (
                        <>
                          <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                              <Pie data={allPie} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value">
                                {allPie.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" opacity={entry.realCount === 0 ? 0.25 : 1} />)}
                              </Pie>
                              <ReTooltip formatter={(v: number, name: string, props: any) => [props.payload.realCount, name]} contentStyle={{ borderRadius: 8, border: '1px solid #eef2f7', fontSize: 12 }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mt: 1 }}>
                            {statusCounts.map((s, i) => (
                              <Box key={s.status} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIE_COLORS[i] }} />
                                  <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{s.status === 'PENDING' ? t('pending') : s.status === 'SHIPPED' ? t('shipped') : s.status === 'DELIVERED' ? t('delivered') : t('cancelled')}</Typography>
                                </Box>
                                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                                  {s.count} ({orders.length > 0 ? ((s.count / orders.length) * 100).toFixed(0) : 0}%)
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </>
                      );
                    })()}
                  </Paper>
                </Box>

                {/* Customer Types Pie + Top Products */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: isAdmin ? '1fr 2fr' : '1fr' }, gap: 2 }}>
                  <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 2.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', mb: 2 }}>{t('customerTypes')}</Typography>
                    {(() => {
                      const individual = customers.filter(c => (c.customerType ?? 'INDIVIDUAL') === 'INDIVIDUAL').length;
                      const company = customers.filter(c => c.customerType === 'COMPANY').length;
                      const pieData = [
                        { name: t('individual'), value: individual || 0.001, realCount: individual, pct: customers.length > 0 ? Math.round((individual / customers.length) * 100) : 0, color: '#6366f1' },
                        { name: t('company'), value: company || 0.001, realCount: company, pct: customers.length > 0 ? Math.round((company / customers.length) * 100) : 0, color: '#10b981' },
                      ];
                      return (
                        <>
                          <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                              </Pie>
                              <ReTooltip formatter={(v: number, name: string, props: any) => [props.payload.realCount, name]} contentStyle={{ borderRadius: 8, border: '1px solid #eef2f7', fontSize: 12 }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                            {pieData.map(d => (
                              <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: d.color }} />
                                  <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{d.name} ({d.realCount})</Typography>
                                </Box>
                                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{d.pct}%</Typography>
                              </Box>
                            ))}
                          </Box>
                        </>
                      );
                    })()}
                  </Paper>

                  {isAdmin && <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', flex: 1 }}>{t('topProductsByRevenue')}</Typography>
                    </Box>
                    {(() => {
                      const productMap: Record<string, number> = {};
                      orders.forEach(o => { productMap[o.productName] = (productMap[o.productName] ?? 0) + o.price * o.quantity; });
                      const top = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name: name.length > 16 ? name.slice(0, 16) + '…' : name, value }));
                      if (top.length === 0) return <Typography variant="body2" color="text.secondary">{t('noOrders')}</Typography>;
                      const PROD_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444'];
                      return (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={top} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={105} />
                            <ReTooltip formatter={(v: number) => [v.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #eef2f7', fontSize: 12 }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v: number) => `$${(v/1000).toFixed(1)}k`, fontSize: 11, fill: '#64748b' }}>
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
                        sx={{ bgcolor: '#f5f3ff', color: '#6366f1', border: '1px solid #e0e7ff', fontWeight: 500, fontSize: '0.78rem', '&:hover': { bgcolor: '#ede9fe' } }} />
                    ))}
                  </Box>

                  {/* Welcome banner — shown only when no messages */}
                  {chatMessages.length === 0 && (
                    <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 3, background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e1b4b', mb: 0.5 }}>
                          {t('aiWelcome')}, {currentUser?.username ?? 'User'}! 👋
                        </Typography>
                        <Typography sx={{ color: '#4c1d95', fontSize: '0.85rem', lineHeight: 1.6 }}>
                          {t('aiDescription')}
                        </Typography>
                      </Box>
                      <Box sx={{ width: 80, height: 80, borderRadius: 3, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SmartToyIcon sx={{ fontSize: 44, color: 'white' }} />
                      </Box>
                    </Paper>
                  )}

                  {/* Chat messages */}
                  <Paper elevation={0} sx={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 3, p: 2, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: '#fafbfc', minHeight: 0 }}>
                    {chatMessages.length === 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 1.5, py: 4 }}>
                        <SmartToyIcon sx={{ fontSize: 48, color: '#c7d2fe' }} />
                        <Typography sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.95rem' }}>{t('aiEmptyTitle')}</Typography>
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.82rem' }}>{isAdmin ? t('aiEmptyExample') : t('aiEmptyExample')}</Typography>
                      </Box>
                    )}
                    {chatMessages.map((msg, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <Box sx={{
                          maxWidth: '78%', px: 2, py: 1.2,
                          borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: msg.role === 'user' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#ffffff',
                          color: msg.role === 'user' ? 'white' : '#1e293b',
                          border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                          boxShadow: msg.role === 'assistant' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                        }}>
                          <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                        </Box>
                      </Box>
                    ))}
                    {chatLoading && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={14} sx={{ color: '#6366f1' }} />
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
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 2.5 } }} />
                    <Button variant="contained" onClick={() => sendMessage(chatInput)} disabled={chatLoading || !chatInput.trim()} disableElevation
                      sx={{ borderRadius: 2.5, minWidth: 48, px: 2, bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
                      <SendIcon fontSize="small" />
                    </Button>
                  </Box>
                </Box>

                {/* Right: Stats + History panel */}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: 2, overflow: 'auto' }}>
                  {/* Quick Stats panel */}
                  <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 2 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a', mb: 1.5 }}>{t('quickStats')}</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      {[
                        { label: t('totalOrdersLabel'), value: orders.length, color: '#6366f1', icon: '🛒' },
                        { label: t('deliveredLabel'), value: orders.filter(o => o.status === 'DELIVERED').length, color: '#10b981', icon: '✅' },
                        { label: t('pendingLabel'), value: orders.filter(o => (o.status ?? 'PENDING') === 'PENDING').length, color: '#f59e0b', icon: '⏳' },
                        { label: t('cancelledLabel'), value: orders.filter(o => o.status === 'CANCELLED').length, color: '#ef4444', icon: '❌' },
                      ].map(s => (
                        <Box key={s.label} sx={{ bgcolor: '#f8fafc', borderRadius: 2, p: 1.5, border: '1px solid #f1f5f9' }}>
                          <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8', mb: 0.3 }}>{s.label}</Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: s.color }}>{s.value}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Paper>

                  {/* Recent Questions */}
                  <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 2, flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a', mb: 1.5 }}>{t('recentQuestions')}</Typography>
                    {chatMessages.filter(m => m.role === 'user').slice(-5).reverse().map((m, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5, cursor: 'pointer', '&:hover .q-text': { color: '#6366f1' } }} onClick={() => sendMessage(m.content)}>
                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Typography sx={{ fontSize: '0.6rem' }}>🕐</Typography>
                        </Box>
                        <Box>
                          <Typography className="q-text" sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', transition: 'color 0.15s' }}>{m.content}</Typography>
                          <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8' }}>{t('justNow')}</Typography>
                        </Box>
                      </Box>
                    ))}
                    {chatMessages.filter(m => m.role === 'user').length === 0 && (
                      <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', py: 2 }}>{t('noQuestionsYet')}</Typography>
                    )}
                  </Paper>

                  {/* Pro Tip */}
                  <Paper elevation={0} sx={{ border: 'none', borderRadius: 2.5, p: 2, background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
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
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
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
                  <TextField label="First Name *" fullWidth size="small" value={editCustomer.firstName || ''} onChange={e => { setEditCustomer({ ...editCustomer, firstName: e.target.value }); setFormErrors(p => ({ ...p, firstName: '' })); }} error={!!formErrors.firstName} helperText={formErrors.firstName} />
                  <TextField label="Last Name *" fullWidth size="small" value={editCustomer.lastName || ''} onChange={e => { setEditCustomer({ ...editCustomer, lastName: e.target.value }); setFormErrors(p => ({ ...p, lastName: '' })); }} error={!!formErrors.lastName} helperText={formErrors.lastName} />
                </Box>
              ) : (
                <TextField label={`${t('firstName')} *`} fullWidth size="small" value={editCustomer.firstName || ''} onChange={e => { setEditCustomer({ ...editCustomer, firstName: e.target.value }); setFormErrors(p => ({ ...p, firstName: '' })); }} error={!!formErrors.firstName} helperText={formErrors.firstName} />
              )}
              <TextField label={`Email${!editCustomer.phone?.trim() ? ' *' : ''}`} fullWidth size="small" value={editCustomer.email || ''} onChange={e => { setEditCustomer({ ...editCustomer, email: e.target.value }); setFormErrors(p => ({ ...p, email: '', phone: '' })); }} error={!!formErrors.email} helperText={formErrors.email || t('emailOrPhoneHint')} />
              <TextField label={`Phone${!editCustomer.email?.trim() ? ' *' : ''}`} fullWidth size="small" value={editCustomer.phone || ''} onChange={e => { setEditCustomer({ ...editCustomer, phone: e.target.value }); setFormErrors(p => ({ ...p, email: '', phone: '' })); }} error={!!formErrors.phone} helperText={formErrors.phone} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>{ t('cancel') }</Button>
            <Button variant="contained" onClick={handleSave} disableElevation sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{isEditing ? t('update') : t('addCustomer')}</Button>
          </DialogActions>
        </Dialog>

        {/* Customer Delete */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>{t('deleteCustomerTitle')}</DialogTitle>
          <DialogContent><Typography variant="body2" color="text.secondary">Are you sure? This action cannot be undone.</Typography></DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>{ t('cancel') }</Button>
            <Button variant="contained" color="error" onClick={handleDelete} disableElevation sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{ t('delete') }</Button>
          </DialogActions>
        </Dialog>

        {/* Order Add/Edit */}
        <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
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
                  {ORDER_STATUSES.map(s => <MenuItem key={s} value={s}>{s === 'PENDING' ? t('pending') : s === 'SHIPPED' ? t('shipped') : s === 'DELIVERED' ? t('delivered') : t('cancelled')}</MenuItem>)}
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
        <Dialog open={orderDeleteDialogOpen} onClose={() => setOrderDeleteDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>{t('deleteOrderTitle')}</DialogTitle>
          <DialogContent><Typography variant="body2" color="text.secondary">Are you sure? This action cannot be undone.</Typography></DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setOrderDeleteDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>{ t('cancel') }</Button>
            <Button variant="contained" color="error" onClick={handleDeleteOrder} disableElevation sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{ t('delete') }</Button>
          </DialogActions>
        </Dialog>

        {/* User Delete */}
        <Dialog open={addUserDialogOpen} onClose={() => setAddUserDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
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

        <Dialog open={deleteUserDialogOpen} onClose={() => setDeleteUserDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>{t('deleteUserTitle')}</DialogTitle>
          <DialogContent><Typography variant="body2" color="text.secondary">Are you sure? This action cannot be undone.</Typography></DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setDeleteUserDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>{ t('cancel') }</Button>
            <Button variant="contained" color="error" onClick={handleDeleteUser} disableElevation sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{ t('delete') }</Button>
          </DialogActions>
        </Dialog>

        {/* Role Change */}
        <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
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
            <Button variant="contained" onClick={handleUpdateRole} disableElevation sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>Update Role</Button>
          </DialogActions>
        </Dialog>

        {/* Customer Detail */}
        <Dialog open={!!drawerCustomer} onClose={() => setDrawerCustomer(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          {drawerCustomer && (() => {
            const custOrders = orders.filter(o => o.customerId === drawerCustomer.id);
            const custRevenue = custOrders.reduce((s, o) => s + o.price * o.quantity, 0);
            return (
              <>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
                  Customer Detail <IconButton size="small" onClick={() => setDrawerCustomer(null)}><CloseIcon /></IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Avatar sx={{ width: 52, height: 52, bgcolor: '#2563eb', fontSize: '1.1rem', fontWeight: 700 }}>
                      {(drawerCustomer.firstName ?? '?')[0]}{(drawerCustomer.lastName ?? '')[0]}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{drawerCustomer.firstName} {drawerCustomer.lastName}</Typography>
                      <Box sx={{ mt: 0.5 }}>{customerTypeChip(drawerCustomer, t)}</Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, mb: 2.5 }}>
                    {drawerCustomer.email && <Box sx={{ display: 'flex', gap: 1.5 }}><Typography sx={{ color: '#94a3b8', fontSize: '0.78rem', width: 55 }}>Email</Typography><Typography sx={{ fontSize: '0.875rem' }}>{drawerCustomer.email}</Typography></Box>}
                    {drawerCustomer.phone && <Box sx={{ display: 'flex', gap: 1.5 }}><Typography sx={{ color: '#94a3b8', fontSize: '0.78rem', width: 55 }}>{t('phone')}</Typography><Typography sx={{ fontSize: '0.875rem' }}>{drawerCustomer.phone}</Typography></Box>}
                    <Box sx={{ display: 'flex', gap: 1.5 }}><Typography sx={{ color: '#94a3b8', fontSize: '0.78rem', width: 55 }}>{t('id')}</Typography><Typography sx={{ fontSize: '0.875rem' }}>#{drawerCustomer.id}</Typography></Box>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: 1.5, mb: 2.5 }}>
                    <Box sx={{ p: 2, bgcolor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 2, textAlign: 'center' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: '#1d4ed8' }}>{custOrders.length}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>{t('totalOrdersLabel')}</Typography>
                    </Box>
                    {isAdmin && (
                      <Box sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2, textAlign: 'center' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#15803d' }}>{custRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography>
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
                        <Box key={o.id} sx={{ p: 1.5, border: '1px solid #eef2f7', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{o.productName}</Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{formatDate(o.date)} · {o.quantity} pcs</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            {isAdmin && (
                              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#15803d' }}>{(o.price * o.quantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography>
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
                    <Button fullWidth variant="contained" startIcon={<EditIcon />} onClick={() => { openEdit(drawerCustomer); setDrawerCustomer(null); }} disableElevation sx={{ textTransform: 'none', borderRadius: 2 }}>Edit</Button>
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
