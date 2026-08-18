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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
const CUSTOMERS_URL = 'https://customer-service-app.up.railway.app/api/customers';
const ORDERS_URL = 'https://orderservice-api.up.railway.app/api/orders';

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
}

interface Order {
  id: number;
  customerId: number;
  productName: string;
  price: number;
  quantity: number;
  date: string;
}

const emptyCustomer: Omit<Customer, 'id'> = { firstName: '', lastName: '', email: '', phone: '' };
const emptyOrder = { customerId: '', productName: '', price: '', quantity: '' };

export default function Home() {
  const [tab, setTab] = useState<'customers' | 'orders'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Customer dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Partial<Customer>>(emptyCustomer);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Order dialog state
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderDeleteDialogOpen, setOrderDeleteDialogOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<typeof emptyOrder>(emptyOrder);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editOrderId, setEditOrderId] = useState<number | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(CUSTOMERS_URL);
      const data = await res.json();
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
      const res = await fetch(ORDERS_URL);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      showSnackbar('Failed to load orders.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'customers') fetchCustomers();
    else { fetchOrders(); fetchCustomers(); }
  }, [tab, fetchCustomers, fetchOrders]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // Customer CRUD
  const handleSave = async () => {
    try {
      if (isEditing && editCustomer.id) {
        await fetch(`${CUSTOMERS_URL}/${editCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editCustomer),
        });
        showSnackbar('Customer updated.', 'success');
      } else {
        await fetch(CUSTOMERS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editCustomer),
        });
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
      await fetch(`${CUSTOMERS_URL}/${deleteId}`, { method: 'DELETE' });
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
      };
      if (isEditingOrder && editOrderId) {
        await fetch(`${ORDERS_URL}/${editOrderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        showSnackbar('Order updated.', 'success');
      } else {
        await fetch(ORDERS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
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
      await fetch(`${ORDERS_URL}/${deleteOrderId}`, { method: 'DELETE' });
      showSnackbar('Order deleted.', 'success');
      setOrderDeleteDialogOpen(false);
      fetchOrders();
    } catch {
      showSnackbar('Delete failed.', 'error');
    }
  };

  const openAdd = () => {
    setEditCustomer(emptyCustomer);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const openDelete = (id: number) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

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
    });
    setIsEditingOrder(true);
    setEditOrderId(o.id);
    setOrderDialogOpen(true);
  };

  const openDeleteOrder = (id: number) => {
    setDeleteOrderId(id);
    setOrderDeleteDialogOpen(true);
  };

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.firstName ?? '').toLowerCase().includes(q) ||
      (c.lastName ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q)
    );
  });

  const getCustomerName = (id: number) => {
    const c = customers.find((c) => c.id === id);
    return c ? `${c.firstName} ${c.lastName}` : `ID: ${id}`;
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
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="white">
                  Customer Management
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>
                  Microservices · Railway
                </Typography>
              </Box>
            </Box>
          </Box>
          <List sx={{ px: 1, pt: 2 }}>
            {[
              { key: 'customers', label: 'Customers', icon: <PeopleIcon /> },
              { key: 'orders', label: 'Orders', icon: <ShoppingCartIcon /> },
            ].map((item) => (
              <ListItem key={item.key} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={tab === item.key}
                  onClick={() => setTab(item.key as 'customers' | 'orders')}
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
                  <ListItemText primary={item.label} slotProps={{ primary: { style: { fontSize: "0.875rem", fontWeight: 500 } } }} />
                  {item.key === 'customers' && (
                    <Chip label={customers.length} size="small" sx={{ bgcolor: 'rgba(59,130,246,0.3)', color: '#93c5fd', fontSize: '0.7rem', height: 20 }} />
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
              <Typography variant="h6" sx={{ fontWeight: 700, flex: 1, fontSize: '1rem' }}>
                {tab === 'customers' ? 'Customers' : 'Orders'}
              </Typography>
              <Chip
                label="● Live"
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
                placeholder={tab === 'customers' ? 'Search by name or email...' : 'Search product...'}
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
              <Tooltip title="Refresh">
                <IconButton onClick={() => tab === 'customers' ? fetchCustomers() : fetchOrders()} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              {tab === 'customers' && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openAdd}
                  disableElevation
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  New Customer
                </Button>
              )}
              {tab === 'orders' && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openAddOrder}
                  disableElevation
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  New Order
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
                      {tab === 'customers' ? (
                        <>
                          <TableCell>Customer</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Phone</TableCell>
                          <TableCell>ID</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>Product</TableCell>
                          <TableCell>Customer</TableCell>
                          <TableCell>Price</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tab === 'customers'
                      ? filteredCustomers.map((c) => (
                          <TableRow key={c.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: '0.8rem' }}>
                                  {(c.firstName ?? '?')[0]}{(c.lastName ?? '?')[0]}
                                </Avatar>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {c.firstName} {c.lastName}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">{c.email}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">{c.phone}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={`#${c.id}`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontSize: '0.7rem' }} />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => openEdit(c)} sx={{ color: 'primary.main', mr: 0.5 }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" onClick={() => openDelete(c.id)} sx={{ color: 'error.main' }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      : orders
                          .filter((o) => (o.productName ?? '').toLowerCase().includes(search.toLowerCase()))
                          .map((o) => (
                            <TableRow key={o.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.productName}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">{getCustomerName(o.customerId)}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={`${o.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`}
                                  size="small"
                                  sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 600, fontSize: '0.75rem' }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{o.quantity} pcs</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(o.date).toLocaleDateString('en-US')}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => openEditOrder(o)} sx={{ color: 'primary.main', mr: 0.5 }}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton size="small" onClick={() => openDeleteOrder(o.id)} sx={{ color: 'error.main' }}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Container>
        </Box>

        {/* Customer Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {isEditing ? 'Edit Customer' : 'Add New Customer'}
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="First Name"
                  fullWidth
                  size="small"
                  value={editCustomer.firstName || ''}
                  onChange={(e) => setEditCustomer({ ...editCustomer, firstName: e.target.value })}
                />
                <TextField
                  label="Last Name"
                  fullWidth
                  size="small"
                  value={editCustomer.lastName || ''}
                  onChange={(e) => setEditCustomer({ ...editCustomer, lastName: e.target.value })}
                />
              </Box>
              <TextField
                label="Email"
                fullWidth
                size="small"
                value={editCustomer.email || ''}
                onChange={(e) => setEditCustomer({ ...editCustomer, email: e.target.value })}
              />
              <TextField
                label="Phone"
                fullWidth
                size="small"
                value={editCustomer.phone || ''}
                onChange={(e) => setEditCustomer({ ...editCustomer, phone: e.target.value })}
              />
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
            <Typography variant="body2" color="text.secondary">
              Are you sure you want to delete this customer? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDelete} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Order Add/Edit Dialog */}
        <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {isEditingOrder ? 'Edit Order' : 'Add New Order'}
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select
                  value={editOrder.customerId}
                  label="Customer"
                  onChange={(e) => setEditOrder({ ...editOrder, customerId: e.target.value })}
                >
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id.toString()}>
                      {c.firstName} {c.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Product Name"
                fullWidth
                size="small"
                value={editOrder.productName}
                onChange={(e) => setEditOrder({ ...editOrder, productName: e.target.value })}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Price"
                  type="number"
                  fullWidth
                  size="small"
                  value={editOrder.price}
                  onChange={(e) => setEditOrder({ ...editOrder, price: e.target.value })}
                />
                <TextField
                  label="Quantity"
                  type="number"
                  fullWidth
                  size="small"
                  value={editOrder.quantity}
                  onChange={(e) => setEditOrder({ ...editOrder, quantity: e.target.value })}
                />
              </Box>
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
            <Typography variant="body2" color="text.secondary">
              Are you sure you want to delete this order? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOrderDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDeleteOrder} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
              Delete
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