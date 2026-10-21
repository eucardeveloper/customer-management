'use client';
import { useTranslation, translate, type Lang } from './translations';

import { api } from '@/lib/api';
import { translateServerMessage } from '@/lib/serverMessages';
import { usePersistedPref } from '@/lib/usePersistedPref';
import { downloadXlsx } from '@/lib/exportXlsx';
import { useLang } from '@/lib/useLang';
import { getAuthUser, logout } from '@/lib/auth';
import { useAuthUser } from '@/lib/useAuthUser';
import { useMounted } from '@/lib/useMounted';
import { useState, useEffect, useCallback, useRef } from 'react';

import { sumRevenue, isPending, countByStatus, monthlyRevenue, dailyRevenue } from '@/lib/orderStats';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { ThemeOptions } from '@mui/material/styles';
import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Avatar, ThemeProvider, GlobalStyles, CssBaseline, Alert, Snackbar, CircularProgress, InputAdornment, Tooltip, Divider, Select, MenuItem, FormControl, InputLabel, Card, CardContent, SwipeableDrawer } from '@mui/material';
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

import { DRAWER_WIDTH, SIDEBAR_BG, SIDEBAR_HOVER, SIDEBAR_ACTIVE, LIGHT_VARS, DARK_VARS, theme, darkTheme } from './theme';
import { type Customer, type Order, type ChatMessage, type UserItem, emptyCustomer, type CustomerType, emptyOrder, ORDER_STATUSES, statusText, isCompany, statusChip, customerTypeChip, formatDate } from './model';
import { AiTab } from './tabs/AiTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { DashboardTab } from './tabs/DashboardTab';

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
            {tab === 'dashboard' && (
              <DashboardTab t={t} lang={lang} dateLocale={dateLocale} orders={orders} customers={customers} isAdmin={isAdmin} now={now}
                gridC={gridC} totalRevenue={totalRevenue} getCustomerName={getCustomerName} openAdd={openAdd} openAddOrder={openAddOrder} setTab={setTab} />
            )}

            {/* ── ANALYTICS TAB ── */}
            {tab === 'analytics' && (
              <AnalyticsTab t={t} orders={orders} customers={customers} isAdmin={isAdmin} now={now} chartData={chartData}
                chartMode={chartMode} setChartMode={setChartMode} gridC={gridC} tick2C={tick2C} statusCounts={statusCounts} totalRevenue={totalRevenue} />
            )}

            {/* ── AI AGENT TAB ── */}
            {tab === 'ai' && (
              <AiTab t={t} orders={orders} chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput}
                chatLoading={chatLoading} sendMessage={sendMessage} currentUser={currentUser} isAdmin={isAdmin} />
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
