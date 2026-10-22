'use client';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Button, IconButton, TextField, Chip, Avatar, CircularProgress, InputAdornment, Tooltip, Select, MenuItem, FormControl } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { ORDER_STATUSES, statusChip, formatDate } from '../model';
import type { Dispatch, SetStateAction } from 'react';

import type { TFn, Order } from '../model';
import type { Lang } from '../translations';

interface OrdersTabProps {
  t: TFn;
  lang: Lang;
  isAdmin: boolean;
  loading: boolean;
  ordSearch: string;
  setOrdSearch: Dispatch<SetStateAction<string>>;
  setOrdPage: Dispatch<SetStateAction<number>>;
  ordPageSafe: number;
  ordRowsPerPage: number;
  setOrdRowsPerPage: Dispatch<SetStateAction<number>>;
  filteredOrders: Order[];
  fetchOrders: () => void | Promise<void>;
  exportExcel: (type: 'customers' | 'orders') => void | Promise<void>;
  getCustomerName: (id: number) => string;
  openAddOrder: () => void;
  openEditOrder: (o: Order) => void;
  openDeleteOrder: (id: number) => void;
  updateOrderStatus: (orderId: number, newStatus: string) => void | Promise<void>;
}

export function OrdersTab({ t, lang, isAdmin, loading, ordSearch, setOrdSearch, setOrdPage, ordPageSafe, ordRowsPerPage, setOrdRowsPerPage, filteredOrders, fetchOrders, exportExcel, getCustomerName, openAddOrder, openEditOrder, openDeleteOrder, updateOrderStatus }: OrdersTabProps) {
  return (
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
                      <Table stickyHeader size="small" sx={{ tableLayout: 'auto', minWidth: { xs: 0, md: isAdmin ? 1100 : 800 } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, width: '1%', whiteSpace: 'nowrap' }}>{t('id')}</TableCell>
                            <TableCell align="center" sx={{ width: '1%', whiteSpace: 'nowrap', px: { xs: 0.75, md: 2 } }}>{t('status')}</TableCell>
                            <TableCell sx={{ width: { xs: '100%', md: '30%' } }}>{t('product')}</TableCell>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, width: '26%' }}>{t('customer')}</TableCell>
                            {isAdmin && <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' }, width: '1%', whiteSpace: 'nowrap' }}>{t('unitPrice')}</TableCell>}
                            <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' }, width: '1%', whiteSpace: 'nowrap' }}>{t('qty')}</TableCell>
                            {isAdmin && <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' }, width: '1%', whiteSpace: 'nowrap' }}>{t('totalCol')}</TableCell>}
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, width: '1%', whiteSpace: 'nowrap' }}>{t('date')}</TableCell>
                            {isAdmin && <TableCell align="right" sx={{ width: '1%', whiteSpace: 'nowrap', px: { xs: 0.5, md: 2 } }}>{t('actions')}</TableCell>}
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
                              <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' }, }}><Chip label={`#${o.id}`} size="small" sx={{ bgcolor: 'var(--surface-2)', color: '#64748b', fontSize: '0.68rem', height: 20 }} /></TableCell>
                              <TableCell align="center" sx={{ px: { xs: 0.75, md: 2 } }}>
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
                              <TableCell sx={{ maxWidth: { xs: 0, md: 'none' }, px: { xs: 1, md: 2 } }}><Box sx={{ width: { xs: '100%', md: 'min(100%, 200px)' }, mx: 'auto', textAlign: 'left' }}>
                                <Typography title={o.productName} sx={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: { xs: 'normal', md: 'nowrap' }, overflowWrap: 'break-word' }}>{o.productName}</Typography>
                                {/* Customer, quantity and date columns are hidden below the desktop width; they move under the product. */}
                                <Typography variant="caption" sx={{ display: { xs: 'block', md: 'none' }, color: '#64748b', lineHeight: 1.35, overflowWrap: 'break-word' }}>{getCustomerName(o.customerId)}</Typography>
                                <Typography variant="caption" sx={{ display: { xs: 'block', md: 'none' }, color: '#64748b', lineHeight: 1.35, overflowWrap: 'break-word' }}>{o.quantity}× · {formatDate(o.date, lang)}</Typography>
                                {isAdmin && <Typography variant="caption" sx={{ display: { xs: 'block', md: 'none' }, color: '#16a34a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{(o.price * o.quantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography>}
                              </Box></TableCell>
                              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 'min(100%, 190px)', mx: 'auto', textAlign: 'left' }}>
                                  <Avatar sx={{ width: 22, height: 22, fontSize: '0.6rem', bgcolor: 'var(--blue-bg)', color: 'var(--blue-tx)' }}>{getCustomerName(o.customerId)[0]}</Avatar>
                                  <Typography noWrap sx={{ color: '#64748b', fontSize: '0.85rem' }}>{getCustomerName(o.customerId)}</Typography>
                                </Box>
                              </TableCell>
                              {isAdmin && <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' }, whiteSpace: 'nowrap' }}><Typography sx={{ fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>{o.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography></TableCell>}
                              <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' }, }}><Chip label={`${o.quantity}x`} size="small" sx={{ bgcolor: 'var(--surface-2)', color: 'var(--text2)', fontSize: '0.68rem', height: 20 }} /></TableCell>
                              {isAdmin && (
                                <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' }, whiteSpace: 'nowrap' }}>
                                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                                    {(o.price * o.quantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                  </Typography>
                                </TableCell>
                              )}
                              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, whiteSpace: 'nowrap' }}><Typography noWrap sx={{ color: '#64748b', fontSize: '0.82rem' }}>{formatDate(o.date, lang)}</Typography></TableCell>
                              {isAdmin && (
                                <TableCell align="right" sx={{ whiteSpace: 'nowrap', px: { xs: 0.5, md: 2 } }}>
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
  );
}
