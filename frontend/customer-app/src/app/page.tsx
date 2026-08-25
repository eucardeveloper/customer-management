'use client';

import { api } from '@/lib/api';
import { getAuthUser } from '@/lib/auth';
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
  TablePagination,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
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

const DRAWER_WIDTH = 240;
const AI_AGENT_URL = 'http://localhost:5678/webhook/e3f86e7c-0c58-4ac0-a8a2-a5d7c95a3fd0/chat';

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

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  customerType?: string;
}
interface Order {
  id: number;
  customerId: number;
  productName: string;
  price: number;
  quantity: number;
  date: string;
  status?: string;
}
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
interface UserItem {
  id: number;
  username: string;
  email: string;
  role: string;
}

const emptyCustomer: Omit<Customer, 'id'> = { firstName: '', lastName: '', email: '', phone: '', customerType: 'INDIVIDUAL' };
type CustomerType = 'individual' | 'company';
const emptyOrder = { customerId: '', productName: '', price: '', quantity: '', status: 'PENDING' };

const QUICK_QUESTIONS = [
  'En pahalı siparişi kim verdi?',
  'Toplam kaç sipariş var?',
  'En son eklenen müşteri kim?',
  'En ucuz siparişi sil',
];

const ORDER_STATUSES = ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const statusChip = (status?: string) => {
  const s = status ?? 'PENDING';
  const map: Record<string, { bg: string; color: string }> = {
    PENDING:   { bg: '#fffbeb', color: '#d97706' },
    SHIPPED:   { bg: '#eff6ff', color: '#1d4ed8' },
    DELIVERED: { bg: '#f0fdf4', color: '#16a34a' },
    CANCELLED: { bg: '#fef2f2', color: '#dc2626' },
  };
  const style = map[s] ?? { bg: '#f1f5f9', color: '#64748b' };
  return <Chip label={s} size="small" sx={{ bgcolor: style.bg, color: style.color, fontWeight: 700, fontSize: '0.68rem' }} />;
};

const customerTypeChip = (c: Customer) => {
  const type = c.customerType ?? (c.lastName?.trim() ? 'INDIVIDUAL' : 'COMPANY');
  if (type === 'INDIVIDUAL') {
    return <Chip label="Individual" size="small" sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontSize: '0.7rem', fontWeight: 600 }} />;
  }
  return <Chip label="Company" size="small" sx={{ bgcolor: '#faf5ff', color: '#7c3aed', fontSize: '0.7rem', fontWeight: 600 }} />;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
};

export default function Home() {
  const [tab, setTab] = useState<'customers' | 'orders' | 'ai' | 'analytics' | 'users'>('customers');
  const [drawerCustomer, setDrawerCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [ordSearch, setOrdSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  // Pagination
  const [custPage, setCustPage] = useState(0);
  const [custRowsPerPage, setCustRowsPerPage] = useState(10);
  const [ordPage, setOrdPage] = useState(0);
  const [ordRowsPerPage, setOrdRowsPerPage] = useState(10);
  // Customer dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Partial<Customer>>(emptyCustomer);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [customerType, setCustomerType] = useState<CustomerType>('individual');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // Order dialog state
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderDeleteDialogOpen, setOrderDeleteDialogOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<typeof emptyOrder>(emptyOrder);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editOrderId, setEditOrderId] = useState<number | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);
  // User management state
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState('USER');
  // AI Agent state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState('session-init');
  const [mounted, setMounted] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Customer[]>('/api/customers');
      setCustomers(Array.isArray(data) ? data : []);
    } catch {
      showSnackbar('Failed to load customers.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Order[]>('/api/orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      showSnackbar('Failed to load orders.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.get<UserItem[]>('/api/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      // ADMIN değilse sessizce geç
    }
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

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // Stats
  const totalRevenue = orders.reduce((sum, o) => sum + o.price * o.quantity, 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Customer CRUD
  const validateCustomer = () => {
    const errors: Record<string, string> = {};
    if (customerType === 'individual') {
      if (!editCustomer.firstName?.trim()) errors.firstName = 'First name is required';
      if (!editCustomer.lastName?.trim()) errors.lastName = 'Last name is required';
    } else {
      if (!editCustomer.firstName?.trim()) errors.firstName = 'Company name is required';
    }
    if (!editCustomer.email?.trim() && !editCustomer.phone?.trim()) {
      errors.email = 'Email or phone is required';
      errors.phone = 'Email or phone is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateCustomer()) return;
    try {
      const payload = {
        ...editCustomer,
        lastName: customerType === 'company' ? '' : editCustomer.lastName || '',
        customerType: customerType === 'company' ? 'COMPANY' : 'INDIVIDUAL',
      };
      if (isEditing && editCustomer.id) {
        await api.put(`/api/customers/${editCustomer.id}`, payload);
        showSnackbar('Customer updated.', 'success');
      } else {
        await api.post('/api/customers', payload);
        showSnackbar('Customer added.', 'success');
      }
      setDialogOpen(false);
      fetchCustomers();
    } catch {
      showSnackbar('Operation failed.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/customers/${deleteId}`);
      showSnackbar('Customer deleted.', 'success');
      setDeleteDialogOpen(false);
      fetchCustomers();
    } catch {
      showSnackbar('Delete failed.', 'error');
    }
  };

  // Order CRUD
  const handleSaveOrder = async () => {
    try {
      const body = {
        customerId: parseInt(editOrder.customerId),
        productName: editOrder.productName,
        price: parseFloat(editOrder.price),
        quantity: parseInt(editOrder.quantity),
        status: editOrder.status || 'PENDING',
      };
      if (isEditingOrder && editOrderId) {
        await api.put(`/api/orders/${editOrderId}`, body);
        showSnackbar('Order updated.', 'success');
      } else {
        await api.post('/api/orders', body);
        showSnackbar('Order added.', 'success');
      }
      setOrderDialogOpen(false);
      fetchOrders();
    } catch {
      showSnackbar('Operation failed.', 'error');
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteOrderId) return;
    try {
      await api.delete(`/api/orders/${deleteOrderId}`);
      showSnackbar('Order deleted.', 'success');
      setOrderDeleteDialogOpen(false);
      fetchOrders();
    } catch {
      showSnackbar('Delete failed.', 'error');
    }
  };

  // User Management
  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    try {
      await api.delete(`/api/users/${deleteUserId}`);
      showSnackbar('User deleted.', 'success');
      setDeleteUserDialogOpen(false);
      fetchUsers();
    } catch {
      showSnackbar('Delete failed.', 'error');
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUserId) return;
    try {
      await api.patch(`/api/users/${selectedUserId}/role`, { role: selectedRole });
      showSnackbar('Role updated.', 'success');
      setRoleDialogOpen(false);
      fetchUsers();
    } catch {
      showSnackbar('Role update failed.', 'error');
    }
  };

  const openAdd = () => {
    setEditCustomer(emptyCustomer);
    setIsEditing(false);
    setCustomerType('individual');
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setIsEditing(true);
    setFormErrors({});
    const type = c.customerType ?? (c.lastName?.trim() ? 'INDIVIDUAL' : 'COMPANY');
    setCustomerType(type === 'COMPANY' ? 'company' : 'individual');
    setDialogOpen(true);
  };

  const openDelete = (id: number) => { setDeleteId(id); setDeleteDialogOpen(true); };

  const openAddOrder = () => {
    setEditOrder(emptyOrder);
    setIsEditingOrder(false);
    setEditOrderId(null);
    setOrderDialogOpen(true);
  };

  const openEditOrder = (o: Order) => {
    setEditOrder({
      customerId: o.customerId.toString(),
      productName: o.productName,
      price: o.price.toString(),
      quantity: o.quantity.toString(),
      status: o.status ?? 'PENDING',
    });
    setIsEditingOrder(true);
    setEditOrderId(o.id);
    setOrderDialogOpen(true);
  };

  const openDeleteOrder = (id: number) => { setDeleteOrderId(id); setOrderDeleteDialogOpen(true); };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    try {
      await api.put(`/api/orders/${orderId}`, {
        customerId: order.customerId,
        productName: order.productName,
        price: order.price,
        quantity: order.quantity,
        status: newStatus,
      });
      showSnackbar(`Status updated to ${newStatus}`, 'success');
      fetchOrders();
    } catch {
      showSnackbar('Status update failed.', 'error');
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = custSearch.toLowerCase();
    if (!q) return true;
    return (
      `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q) ||
      (c.customerType ?? '').toLowerCase().includes(q)
    );
  });

  const filteredOrders = orders.filter((o) => {
    const q = ordSearch.toLowerCase();
    if (!q) return true;
    return (
      (o.productName ?? '').toLowerCase().includes(q) ||
      String(o.customerId ?? '').includes(q) ||
      (o.status ?? '').toLowerCase().includes(q)
    );
  });

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const getCustomerName = (id: number) => {
    const c = customers.find((c) => c.id === id);
    return c ? `${c.firstName} ${c.lastName}` : `ID: ${id}`;
  };

  const exportCSV = (type: 'customers' | 'orders') => {
    if (type === 'customers') {
      const rows = [['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Type'],
        ...customers.map(c => [c.id, c.firstName, c.lastName, c.email, c.phone, c.customerType ?? ''])];
      downloadCSV(rows, 'customers.csv');
    } else {
      const rows = [['ID', 'Customer', 'Product', 'Price', 'Qty', 'Total', 'Date', 'Status'],
        ...orders.map(o => [o.id, getCustomerName(o.customerId), o.productName, o.price, o.quantity, o.price * o.quantity, o.date, o.status ?? ''])];
      downloadCSV(rows, 'orders.csv');
    }
  };

  const downloadCSV = (rows: (string | number)[][], filename: string) => {
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const monthlyRevenue = (() => {
    const map: Record<string, number> = {};
    orders.forEach(o => {
      const month = o.date ? new Date(o.date).toLocaleString('en-US', { month: 'short', year: '2-digit' }) : 'N/A';
      map[month] = (map[month] ?? 0) + o.price * o.quantity;
    });
    return Object.entries(map).slice(-6);
  })();

  const maxRevenue = Math.max(...monthlyRevenue.map(([, v]) => v), 1);

  const statusCounts = ORDER_STATUSES.map(s => ({
    status: s,
    count: orders.filter(o => (o.status ?? 'PENDING') === s).length,
  }));

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch(AI_AGENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatInput: text, sessionId }),
      });
      const data = await res.json();
      const reply = data.output || data.message || data.response || JSON.stringify(data);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ AI Agent bağlantısı kurulamadı.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Customers', value: customers.length, icon: <PeopleIcon />, color: '#1d4ed8', bg: '#eff6ff' },
    { label: 'Total Orders', value: orders.length, icon: <ReceiptIcon />, color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Total Revenue', value: totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), icon: <AttachMoneyIcon />, color: '#059669', bg: '#f0fdf4' },
    { label: 'Avg Order Value', value: avgOrderValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), icon: <TrendingUpIcon />, color: '#d97706', bg: '#fffbeb' },
  ];

  const isAdmin = currentUser?.role === 'ADMIN';

  const sidebarItems = [
    { key: 'customers', label: 'Customers', icon: <PeopleIcon />, count: customers.length },
    { key: 'orders', label: 'Orders', icon: <ShoppingCartIcon />, count: orders.length },
    { key: 'analytics', label: 'Analytics', icon: <BarChartIcon />, count: null },
    { key: 'ai', label: 'AI Agent', icon: <SmartToyIcon />, count: null },
    ...(isAdmin ? [{ key: 'users', label: 'User Management', icon: <ManageAccountsIcon />, count: users.length }] : []),
  ];

  if (!mounted) return null;

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
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="white">Customer Mgmt</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>Microservices · Railway</Typography>
              </Box>
            </Box>
          </Box>
          <List sx={{ px: 1, pt: 2 }}>
            {sidebarItems.map((item) => (
              <ListItem key={item.key} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={tab === item.key}
                  onClick={() => setTab(item.key as typeof tab)}
                  sx={{
                    borderRadius: 2,
                    color: 'rgba(255,255,255,0.6)',
                    '&.Mui-selected': {
                      bgcolor: item.key === 'ai' ? 'rgba(124,58,237,0.2)' : item.key === 'users' ? 'rgba(5,150,105,0.2)' : 'rgba(59,130,246,0.2)',
                      color: item.key === 'ai' ? '#c4b5fd' : item.key === 'users' ? '#6ee7b7' : '#93c5fd',
                      '& .MuiListItemIcon-root': { color: item.key === 'ai' ? '#c4b5fd' : item.key === 'users' ? '#6ee7b7' : '#93c5fd' },
                    },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: 'white' },
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} slotProps={{ primary: { style: { fontSize: '0.875rem', fontWeight: 500 } } }} />
                  {item.count !== null && (
                    <Chip label={item.count} size="small" sx={{ bgcolor: 'rgba(59,130,246,0.3)', color: '#93c5fd', fontSize: '0.7rem', height: 20 }} />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem' }}>
              Kafka · Spring Cloud Gateway · PostgreSQL
            </Typography>
          </Box>
        </Drawer>

        {/* Main */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <AppBar position="sticky" elevation={0}>
            <Toolbar>
              <Typography variant="h6" sx={{ fontWeight: 700, flex: 1, fontSize: '1rem' }}>
                {tab === 'customers' ? 'Customers' : tab === 'orders' ? 'Orders' : tab === 'analytics' ? 'Analytics' : tab === 'users' ? 'User Management' : 'AI Agent'}
              </Typography>
              {isAdmin && (
                <Chip
                  icon={<AdminPanelSettingsIcon sx={{ fontSize: '14px !important' }} />}
                  label="ADMIN"
                  size="small"
                  sx={{ bgcolor: 'rgba(5,150,105,0.2)', color: '#6ee7b7', fontSize: '0.7rem', mr: 1 }}
                />
              )}
              <Chip label="● Live" size="small" sx={{ bgcolor: 'rgba(34,197,94,0.2)', color: '#86efac', fontSize: '0.7rem', mr: 1 }} />
            </Toolbar>
          </AppBar>

          <Container maxWidth="xl" sx={{ py: 3, flex: 1 }}>
            {/* Stats Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
              {statCards.map((s) => (
                <Card key={s.label} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '16px !important' }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                      {s.icon}
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {s.label}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#0f172a' }}>{s.value}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {/* USER MANAGEMENT TAB */}
            {tab === 'users' && isAdmin && (
              <>
                <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    placeholder="Search by username, email or role..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'grey.400' }} /></InputAdornment>) } }}
                    sx={{ width: 320, bgcolor: 'white', borderRadius: 2 }}
                  />
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title="Refresh">
                    <IconButton onClick={fetchUsers} size="small"><RefreshIcon /></IconButton>
                  </Tooltip>
                </Box>
                <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Username</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredUsers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                              <ManageAccountsIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>No users found</Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        {filteredUsers.map((u) => (
                          <TableRow key={u.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                            <TableCell><Chip label={`#${u.id}`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontSize: '0.7rem' }} /></TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: u.role === 'ADMIN' ? '#059669' : '#1d4ed8', fontSize: '0.8rem', fontWeight: 700 }}>
                                  {u.username.charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{u.username}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell><Typography variant="body2" color="text.secondary">{u.email}</Typography></TableCell>
                            <TableCell>
                              <Chip
                                label={u.role}
                                size="small"
                                sx={{
                                  bgcolor: u.role === 'ADMIN' ? '#f0fdf4' : '#eff6ff',
                                  color: u.role === 'ADMIN' ? '#059669' : '#1d4ed8',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Change Role">
                                <IconButton
                                  size="small"
                                  sx={{ color: '#059669', mr: 0.5 }}
                                  onClick={() => {
                                    setSelectedUserId(u.id);
                                    setSelectedRole(u.role);
                                    setRoleDialogOpen(true);
                                  }}
                                >
                                  <AdminPanelSettingsIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete User">
                                <IconButton
                                  size="small"
                                  sx={{ color: 'error.main' }}
                                  disabled={u.username === currentUser?.username}
                                  onClick={() => { setDeleteUserId(u.id); setDeleteUserDialogOpen(true); }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </>
            )}

            {/* ANALYTICS TAB */}
            {tab === 'analytics' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, color: '#0f172a' }}>Monthly Revenue</Typography>
                  {monthlyRevenue.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No data yet.</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 180 }}>
                      {monthlyRevenue.map(([month, value]) => (
                        <Box key={month} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 0.5 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#1d4ed8', fontWeight: 700 }}>
                            ${(value / 1000).toFixed(1)}k
                          </Typography>
                          <Box sx={{
                            width: '100%',
                            height: Math.max(8, (value / maxRevenue) * 150),
                            bgcolor: '#1d4ed8',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.3s',
                            '&:hover': { bgcolor: '#3b82f6' },
                          }} />
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#64748b' }}>{month}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Paper>

                <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, color: '#0f172a' }}>Order Status Distribution</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                    {statusCounts.map(({ status, count }) => {
                      const colorMap: Record<string, { bg: string; color: string }> = {
                        PENDING:   { bg: '#fffbeb', color: '#d97706' },
                        SHIPPED:   { bg: '#eff6ff', color: '#1d4ed8' },
                        DELIVERED: { bg: '#f0fdf4', color: '#16a34a' },
                        CANCELLED: { bg: '#fef2f2', color: '#dc2626' },
                      };
                      const c = colorMap[status];
                      return (
                        <Box key={status} sx={{ p: 2, bgcolor: c.bg, borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="h4" sx={{ fontWeight: 800, color: c.color }}>{count}</Typography>
                          <Typography variant="caption" sx={{ color: c.color, fontWeight: 600, fontSize: '0.75rem' }}>{status}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Paper>

                <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#0f172a' }}>Top Products by Revenue</Typography>
                  {(() => {
                    const productMap: Record<string, number> = {};
                    orders.forEach(o => { productMap[o.productName] = (productMap[o.productName] ?? 0) + o.price * o.quantity; });
                    const top = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
                    const maxVal = Math.max(...top.map(([, v]) => v), 1);
                    return top.map(([name, value]) => (
                      <Box key={name} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>
                          <Typography variant="body2" color="text.secondary">{value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography>
                        </Box>
                        <Box sx={{ height: 6, bgcolor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <Box sx={{ height: '100%', width: `${(value / maxVal) * 100}%`, bgcolor: '#1d4ed8', borderRadius: 3 }} />
                        </Box>
                      </Box>
                    ));
                  })()}
                </Paper>
              </Box>
            )}

            {/* AI AGENT TAB */}
            {tab === 'ai' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 280px)', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {QUICK_QUESTIONS.map((q) => (
                    <Chip
                      key={q}
                      label={q}
                      clickable
                      onClick={() => sendMessage(q)}
                      icon={<SmartToyIcon sx={{ fontSize: '14px !important' }} />}
                      sx={{ bgcolor: '#f5f3ff', color: '#7c3aed', border: '1px solid #e9d5ff', fontWeight: 500, fontSize: '0.8rem', '&:hover': { bgcolor: '#ede9fe' } }}
                    />
                  ))}
                </Box>
                <Paper elevation={0} sx={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 2, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: '#fafafa' }}>
                  {chatMessages.length === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 1 }}>
                      <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <SmartToyIcon sx={{ fontSize: 28, color: '#7c3aed' }} />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>AI Agent hazır</Typography>
                      <Typography variant="caption" color="text.secondary">Müşteri ve sipariş verileriniz hakkında sorular sorabilirsiniz</Typography>
                    </Box>
                  )}
                  {chatMessages.map((msg, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <Box sx={{
                        maxWidth: '75%', px: 2, py: 1.2,
                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        bgcolor: msg.role === 'user' ? '#1d4ed8' : '#ffffff',
                        color: msg.role === 'user' ? 'white' : '#1e293b',
                        border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                        boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                      }}>
                        <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                      </Box>
                    </Box>
                  ))}
                  {chatLoading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} sx={{ color: '#7c3aed' }} />
                      <Typography variant="caption" color="text.secondary">AI düşünüyor...</Typography>
                    </Box>
                  )}
                </Paper>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth size="small"
                    placeholder="Bir soru sor... (örn: En pahalı siparişi kim verdi?)"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); } }}
                    disabled={chatLoading}
                    sx={{ bgcolor: 'white', borderRadius: 2 }}
                  />
                  <Button variant="contained" onClick={() => sendMessage(chatInput)} disabled={chatLoading || !chatInput.trim()} disableElevation
                    sx={{ borderRadius: 2, minWidth: 48, px: 2, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}>
                    <SendIcon fontSize="small" />
                  </Button>
                </Box>
              </Box>
            )}

            {/* CUSTOMERS & ORDERS TABS */}
            {(tab === 'customers' || tab === 'orders') && (
              <>
                <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                  {tab === 'customers' ? (
                    <TextField
                      size="small"
                      placeholder="Search by name, email or phone..."
                      value={custSearch}
                      onChange={(e) => { setCustSearch(e.target.value); setCustPage(0); }}
                      slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'grey.400' }} /></InputAdornment>) } }}
                      sx={{ width: 320, bgcolor: 'white', borderRadius: 2 }}
                    />
                  ) : (
                    <TextField
                      size="small"
                      placeholder="Search by product, status or customer ID..."
                      value={ordSearch}
                      onChange={(e) => { setOrdSearch(e.target.value); setOrdPage(0); }}
                      slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'grey.400' }} /></InputAdornment>) } }}
                      sx={{ width: 320, bgcolor: 'white', borderRadius: 2 }}
                    />
                  )}
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title="Export CSV">
                    <IconButton onClick={() => exportCSV(tab)} size="small">
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Refresh">
                    <IconButton onClick={() => tab === 'customers' ? fetchCustomers() : fetchOrders()} size="small">
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                  {tab === 'customers' && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} disableElevation sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                      New Customer
                    </Button>
                  )}
                  {tab === 'orders' && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openAddOrder} disableElevation sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                      New Order
                    </Button>
                  )}
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress color="primary" /></Box>
                ) : (
                  <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            {tab === 'customers' ? (
                              <>
                                <TableCell>ID</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Phone</TableCell>
                                <TableCell align="right">Actions</TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell>ID</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Product</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Unit Price</TableCell>
                                <TableCell>Qty</TableCell>
                                <TableCell>Total</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell align="right">Actions</TableCell>
                              </>
                            )}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {tab === 'customers' && filteredCustomers.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                <PeopleIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>No customers found</Typography>
                                <Typography variant="caption" color="text.secondary">{custSearch ? 'Try a different search term' : 'Add your first customer to get started'}</Typography>
                              </TableCell>
                            </TableRow>
                          )}
                          {tab === 'orders' && filteredOrders.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                <ShoppingCartIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>No orders found</Typography>
                                <Typography variant="caption" color="text.secondary">{ordSearch ? 'Try a different search term' : 'Add your first order to get started'}</Typography>
                              </TableCell>
                            </TableRow>
                          )}
                          {tab === 'customers'
                            ? filteredCustomers
                                .slice(custPage * custRowsPerPage, custPage * custRowsPerPage + custRowsPerPage)
                                .map((c) => (
                                <TableRow key={c.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                  <TableCell><Chip label={`#${c.id}`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontSize: '0.7rem' }} /></TableCell>
                                  <TableCell>{customerTypeChip(c)}</TableCell>
                                  <TableCell sx={{ cursor: 'pointer' }} onClick={() => setDrawerCustomer(c)}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: '0.8rem' }}>
                                        {(c.firstName ?? '?')[0]}{(c.lastName ?? '?')[0]}
                                      </Avatar>
                                      <Typography variant="body2" sx={{ fontWeight: 600, '&:hover': { color: 'primary.main', textDecoration: 'underline' } }}>{c.firstName} {c.lastName}</Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell><Typography variant="body2" color="text.secondary">{c.email}</Typography></TableCell>
                                  <TableCell><Typography variant="body2" color="text.secondary">{c.phone}</Typography></TableCell>
                                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                    <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(c)} sx={{ color: 'primary.main', mr: 0.5 }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                                    <Tooltip title="Delete"><IconButton size="small" onClick={() => openDelete(c.id)} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                                  </TableCell>
                                </TableRow>
                              ))
                            : filteredOrders
                                .slice(ordPage * ordRowsPerPage, ordPage * ordRowsPerPage + ordRowsPerPage)
                                .map((o) => (
                                <TableRow key={o.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                  <TableCell><Chip label={`#${o.id}`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontSize: '0.7rem' }} /></TableCell>
                                  <TableCell>
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                      <Select
                                        value={o.status ?? 'PENDING'}
                                        onChange={(e) => { e.stopPropagation(); updateOrderStatus(o.id, e.target.value); }}
                                        renderValue={(v) => statusChip(v)}
                                        sx={{ '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, '& .MuiSelect-select': { p: 0 } }}
                                      >
                                        {ORDER_STATUSES.map(s => <MenuItem key={s} value={s}>{statusChip(s)}</MenuItem>)}
                                      </Select>
                                    </FormControl>
                                  </TableCell>
                                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{o.productName}</Typography></TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.65rem', bgcolor: '#e0e7ff', color: '#4338ca' }}>{getCustomerName(o.customerId)[0]}</Avatar>
                                      <Typography variant="body2" color="text.secondary">{getCustomerName(o.customerId)}</Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell><Typography variant="body2">{o.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography></TableCell>
                                  <TableCell><Chip label={`${o.quantity} pcs`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontSize: '0.7rem' }} /></TableCell>
                                  <TableCell>
                                    <Chip label={(o.price * o.quantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} size="small"
                                      sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 700, fontSize: '0.75rem' }} />
                                  </TableCell>
                                  <TableCell><Typography variant="body2" color="text.secondary">{formatDate(o.date)}</Typography></TableCell>
                                  <TableCell align="right">
                                    <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditOrder(o)} sx={{ color: 'primary.main', mr: 0.5 }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                                    <Tooltip title="Delete"><IconButton size="small" onClick={() => openDeleteOrder(o.id)} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                                  </TableCell>
                                </TableRow>
                              ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      component="div"
                      count={tab === 'customers' ? filteredCustomers.length : filteredOrders.length}
                      page={tab === 'customers' ? custPage : ordPage}
                      onPageChange={(_, p) => tab === 'customers' ? setCustPage(p) : setOrdPage(p)}
                      rowsPerPage={tab === 'customers' ? custRowsPerPage : ordRowsPerPage}
                      onRowsPerPageChange={(e) => {
                        if (tab === 'customers') { setCustRowsPerPage(parseInt(e.target.value)); setCustPage(0); }
                        else { setOrdRowsPerPage(parseInt(e.target.value)); setOrdPage(0); }
                      }}
                      rowsPerPageOptions={[5, 10, 25, 50]}
                    />
                  </Paper>
                )}
              </>
            )}
          </Container>
        </Box>

        {/* Customer Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{isEditing ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Customer Type</InputLabel>
                <Select value={customerType} label="Customer Type" onChange={(e) => {
                  setCustomerType(e.target.value as CustomerType);
                  setFormErrors({});
                  if (e.target.value === 'company') setEditCustomer((prev) => ({ ...prev, lastName: '' }));
                }}>
                  <MenuItem value="individual">Individual (Person)</MenuItem>
                  <MenuItem value="company">Company / Organization</MenuItem>
                </Select>
              </FormControl>
              {customerType === 'individual' ? (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField label="First Name *" fullWidth size="small" value={editCustomer.firstName || ''}
                    onChange={(e) => { setEditCustomer({ ...editCustomer, firstName: e.target.value }); setFormErrors((p) => ({ ...p, firstName: '' })); }}
                    error={!!formErrors.firstName} helperText={formErrors.firstName} />
                  <TextField label="Last Name *" fullWidth size="small" value={editCustomer.lastName || ''}
                    onChange={(e) => { setEditCustomer({ ...editCustomer, lastName: e.target.value }); setFormErrors((p) => ({ ...p, lastName: '' })); }}
                    error={!!formErrors.lastName} helperText={formErrors.lastName} />
                </Box>
              ) : (
                <TextField label="Company Name *" fullWidth size="small" value={editCustomer.firstName || ''}
                  onChange={(e) => { setEditCustomer({ ...editCustomer, firstName: e.target.value }); setFormErrors((p) => ({ ...p, firstName: '' })); }}
                  error={!!formErrors.firstName} helperText={formErrors.firstName} />
              )}
              <TextField label={`Email${!editCustomer.phone?.trim() ? ' *' : ''}`} fullWidth size="small" value={editCustomer.email || ''}
                onChange={(e) => { setEditCustomer({ ...editCustomer, email: e.target.value }); setFormErrors((p) => ({ ...p, email: '', phone: '' })); }}
                error={!!formErrors.email} helperText={formErrors.email || 'Email or phone — at least one required'} />
              <TextField label={`Phone${!editCustomer.email?.trim() ? ' *' : ''}`} fullWidth size="small" value={editCustomer.phone || ''}
                onChange={(e) => { setEditCustomer({ ...editCustomer, phone: e.target.value }); setFormErrors((p) => ({ ...p, email: '', phone: '' })); }}
                error={!!formErrors.phone} helperText={formErrors.phone} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
              {isEditing ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Customer Delete Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Delete Customer</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">Are you sure you want to delete this customer? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDelete} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>Delete</Button>
          </DialogActions>
        </Dialog>

        {/* Order Add/Edit Dialog */}
        <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{isEditingOrder ? 'Edit Order' : 'Add New Order'}</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select value={editOrder.customerId} label="Customer" onChange={(e) => setEditOrder({ ...editOrder, customerId: e.target.value })}>
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id.toString()}>{c.firstName} {c.lastName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField label="Product Name" fullWidth size="small" value={editOrder.productName}
                onChange={(e) => setEditOrder({ ...editOrder, productName: e.target.value })} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Price" type="number" fullWidth size="small" value={editOrder.price}
                  onChange={(e) => setEditOrder({ ...editOrder, price: e.target.value })} />
                <TextField label="Quantity" type="number" fullWidth size="small" value={editOrder.quantity}
                  onChange={(e) => setEditOrder({ ...editOrder, quantity: e.target.value })} />
              </Box>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={editOrder.status} label="Status" onChange={(e) => setEditOrder({ ...editOrder, status: e.target.value })}>
                  {ORDER_STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOrderDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveOrder} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
              {isEditingOrder ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Order Delete Dialog */}
        <Dialog open={orderDeleteDialogOpen} onClose={() => setOrderDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Delete Order</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">Are you sure you want to delete this order? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOrderDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDeleteOrder} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>Delete</Button>
          </DialogActions>
        </Dialog>

        {/* User Delete Dialog */}
        <Dialog open={deleteUserDialogOpen} onClose={() => setDeleteUserDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Delete User</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">Are you sure you want to delete this user? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteUserDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDeleteUser} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>Delete</Button>
          </DialogActions>
        </Dialog>

        {/* Role Change Dialog */}
        <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Change Role</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Role</InputLabel>
              <Select value={selectedRole} label="Role" onChange={(e) => setSelectedRole(e.target.value)}>
                <MenuItem value="USER">USER</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setRoleDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdateRole} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>Update</Button>
          </DialogActions>
        </Dialog>

        {/* Customer Detail Dialog */}
        <Dialog open={!!drawerCustomer} onClose={() => setDrawerCustomer(null)} maxWidth="sm" fullWidth>
          {drawerCustomer && (() => {
            const custOrders = orders.filter(o => o.customerId === drawerCustomer.id);
            const custRevenue = custOrders.reduce((s, o) => s + o.price * o.quantity, 0);
            return (
              <>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
                  Customer Detail
                  <IconButton size="small" onClick={() => setDrawerCustomer(null)}><CloseIcon /></IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Avatar sx={{ width: 52, height: 52, bgcolor: 'primary.main', fontSize: '1.1rem' }}>
                      {(drawerCustomer.firstName ?? '?')[0]}{(drawerCustomer.lastName ?? '')[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{drawerCustomer.firstName} {drawerCustomer.lastName}</Typography>
                      {customerTypeChip(drawerCustomer)}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                    {drawerCustomer.email && <Box sx={{ display: 'flex', gap: 1 }}><Typography variant="caption" color="text.secondary" sx={{ width: 60, pt: 0.2 }}>Email</Typography><Typography variant="body2">{drawerCustomer.email}</Typography></Box>}
                    {drawerCustomer.phone && <Box sx={{ display: 'flex', gap: 1 }}><Typography variant="caption" color="text.secondary" sx={{ width: 60, pt: 0.2 }}>Phone</Typography><Typography variant="body2">{drawerCustomer.phone}</Typography></Box>}
                    <Box sx={{ display: 'flex', gap: 1 }}><Typography variant="caption" color="text.secondary" sx={{ width: 60, pt: 0.2 }}>ID</Typography><Typography variant="body2">#{drawerCustomer.id}</Typography></Box>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 3 }}>
                    <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#1d4ed8' }}>{custOrders.length}</Typography>
                      <Typography variant="caption" color="text.secondary">Total Orders</Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#16a34a' }}>{custRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography>
                      <Typography variant="caption" color="text.secondary">Total Spent</Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Order History</Typography>
                  {custOrders.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No orders yet</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {custOrders.map(o => (
                        <Box key={o.id} sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.productName}</Typography>
                            <Typography variant="caption" color="text.secondary">{formatDate(o.date)} · {o.quantity} pcs</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>
                              {(o.price * o.quantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            </Typography>
                            {statusChip(o.status)}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                  <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => { openDelete(drawerCustomer.id); setDrawerCustomer(null); }} sx={{ textTransform: 'none' }}>Delete</Button>
                  <Button fullWidth variant="contained" startIcon={<EditIcon />} onClick={() => { openEdit(drawerCustomer); setDrawerCustomer(null); }} disableElevation sx={{ textTransform: 'none' }}>Edit</Button>
                </DialogActions>
              </>
            );
          })()}
        </Dialog>

        {/* Snackbar */}
        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}