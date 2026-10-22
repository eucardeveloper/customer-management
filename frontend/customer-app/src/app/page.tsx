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
import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Button, IconButton, Chip, Avatar, ThemeProvider, GlobalStyles, CssBaseline, Alert, Snackbar, Tooltip, Card, CardContent, SwipeableDrawer } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

import StorefrontIcon from '@mui/icons-material/Storefront';

import SmartToyIcon from '@mui/icons-material/SmartToy';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

import BarChartIcon from '@mui/icons-material/BarChart';

import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

import { DRAWER_WIDTH, SIDEBAR_BG, SIDEBAR_HOVER, SIDEBAR_ACTIVE, LIGHT_VARS, DARK_VARS, theme, darkTheme } from './theme';
import { type Customer, type Order, type ChatMessage, type UserItem, emptyCustomer, type CustomerType, emptyOrder, ORDER_STATUSES, statusText, isCompany } from './model';
import { AiTab } from './views/AiTab';
import { AnalyticsTab } from './views/AnalyticsTab';
import { DashboardTab } from './views/DashboardTab';
import { CustomersTab } from './views/CustomersTab';
import { OrdersTab } from './views/OrdersTab';
import { UsersTab } from './views/UsersTab';
import { CustomerDialogs } from './views/CustomerDialogs';
import { OrderDialogs } from './views/OrderDialogs';
import { UserDialogs } from './views/UserDialogs';

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
    // POST /api/users, not public sign-up: sign-up ignores the role and would put the new account's session cookie in this (the admin's) browser.
    try { await api.post('/api/users', { username: newUser.username, email: newUser.email, password: newUser.password, role: newUser.role }); showSnackbar(t('userCreated'), 'success'); setAddUserDialogOpen(false); setNewUser({ username: '', email: '', password: '', role: 'USER' }); fetchUsers(); }
    catch (e) {
      // "Username already taken" / "Email already registered" tell the admin what to change; the generic text does not.
      const m = e instanceof Error ? e.message : '';
      showSnackbar(m && !m.startsWith('HTTP') ? translateServerMessage(lang, m) : t('createFailed'), 'error');
    }
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
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--text)' }}>{pageTitle}</Typography>
                <Typography noWrap sx={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.2, mt: 0.3 }}>
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
              <CustomersTab t={t} isAdmin={isAdmin} loading={loading} custSearch={custSearch} setCustSearch={setCustSearch}
                setCustPage={setCustPage} custPageSafe={custPageSafe} custRowsPerPage={custRowsPerPage} setCustRowsPerPage={setCustRowsPerPage}
                filteredCustomers={filteredCustomers} fetchCustomers={fetchCustomers} exportExcel={exportExcel}
                openAdd={openAdd} openEdit={openEdit} openDelete={openDelete} setDrawerCustomer={setDrawerCustomer} />
            )}

            {/* ── ORDERS TAB ── */}
            {tab === 'orders' && (
              <OrdersTab t={t} lang={lang} isAdmin={isAdmin} loading={loading} ordSearch={ordSearch} setOrdSearch={setOrdSearch}
                setOrdPage={setOrdPage} ordPageSafe={ordPageSafe} ordRowsPerPage={ordRowsPerPage} setOrdRowsPerPage={setOrdRowsPerPage}
                filteredOrders={filteredOrders} fetchOrders={fetchOrders} exportExcel={exportExcel} getCustomerName={getCustomerName}
                openAddOrder={openAddOrder} openEditOrder={openEditOrder} openDeleteOrder={openDeleteOrder} updateOrderStatus={updateOrderStatus} />
            )}

            {/* ── USERS TAB ── */}
            {tab === 'users' && isAdmin && (
              <UsersTab t={t} currentUser={currentUser} userSearch={userSearch} setUserSearch={setUserSearch} filteredUsers={filteredUsers}
                fetchUsers={fetchUsers} openPwDialog={openPwDialog} setAddUserDialogOpen={setAddUserDialogOpen}
                setDeleteUserDialogOpen={setDeleteUserDialogOpen} setDeleteUserId={setDeleteUserId} setRoleDialogOpen={setRoleDialogOpen}
                setSelectedRole={setSelectedRole} setSelectedUserId={setSelectedUserId} />
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

        <CustomerDialogs t={t} lang={lang} isAdmin={isAdmin} orders={orders} dialogOpen={dialogOpen} setDialogOpen={setDialogOpen}
          isEditing={isEditing} editCustomer={editCustomer} setEditCustomer={setEditCustomer} customerType={customerType}
          setCustomerType={setCustomerType} formErrors={formErrors} setFormErrors={setFormErrors} handleSave={handleSave}
          deleteDialogOpen={deleteDialogOpen} setDeleteDialogOpen={setDeleteDialogOpen} handleDelete={handleDelete}
          drawerCustomer={drawerCustomer} setDrawerCustomer={setDrawerCustomer} openEdit={openEdit} openDelete={openDelete} />
        <OrderDialogs t={t} customers={customers} orderDialogOpen={orderDialogOpen} setOrderDialogOpen={setOrderDialogOpen}
          isEditingOrder={isEditingOrder} editOrder={editOrder} setEditOrder={setEditOrder} handleSaveOrder={handleSaveOrder}
          orderDeleteDialogOpen={orderDeleteDialogOpen} setOrderDeleteDialogOpen={setOrderDeleteDialogOpen} handleDeleteOrder={handleDeleteOrder} />
        <UserDialogs t={t} deleteUserDialogOpen={deleteUserDialogOpen} setDeleteUserDialogOpen={setDeleteUserDialogOpen}
          handleDeleteUser={handleDeleteUser} addUserDialogOpen={addUserDialogOpen} setAddUserDialogOpen={setAddUserDialogOpen}
          newUser={newUser} setNewUser={setNewUser} handleAddUser={handleAddUser} pwDialog={pwDialog} setPwDialog={setPwDialog}
          pwForm={pwForm} setPwForm={setPwForm} pwError={pwError} pwBusy={pwBusy} submitPassword={submitPassword}
          roleDialogOpen={roleDialogOpen} setRoleDialogOpen={setRoleDialogOpen} selectedRole={selectedRole}
          setSelectedRole={setSelectedRole} handleUpdateRole={handleUpdateRole} />

        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
