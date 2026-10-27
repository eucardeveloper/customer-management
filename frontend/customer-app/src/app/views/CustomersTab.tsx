'use client';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Button, IconButton, TextField, Avatar, CircularProgress, InputAdornment, Tooltip } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { customerTypeChip } from '../model';
import type { Dispatch, SetStateAction } from 'react';

import type { TFn, Customer } from '../model';
import { customerFullName } from '../../lib/customerName';

interface CustomersTabProps {
  t: TFn;
  isAdmin: boolean;
  loading: boolean;
  custSearch: string;
  setCustSearch: Dispatch<SetStateAction<string>>;
  setCustPage: Dispatch<SetStateAction<number>>;
  custPageSafe: number;
  custRowsPerPage: number;
  setCustRowsPerPage: Dispatch<SetStateAction<number>>;
  filteredCustomers: Customer[];
  fetchCustomers: () => void | Promise<void>;
  exportExcel: (type: 'customers' | 'orders') => void | Promise<void>;
  openAdd: () => void;
  openEdit: (c: Customer) => void;
  openDelete: (id: number) => void;
  setDrawerCustomer: Dispatch<SetStateAction<Customer | null>>;
}

export function CustomersTab({ t, isAdmin, loading, custSearch, setCustSearch, setCustPage, custPageSafe, custRowsPerPage, setCustRowsPerPage, filteredCustomers, fetchCustomers, exportExcel, openAdd, openEdit, openDelete, setDrawerCustomer }: CustomersTabProps) {
  return (
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
                      <Table stickyHeader size="small" sx={{ tableLayout: 'auto', minWidth: { xs: 0, md: 900 } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, width: '1%', whiteSpace: 'nowrap' }}>{t('id')}</TableCell>
                            <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, width: '1%', whiteSpace: 'nowrap' }}>{t('type')}</TableCell>
                            <TableCell sx={{ width: { xs: '100%', md: '30%' } }}>{t('customer')}</TableCell>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, width: '34%' }}>{t('email')}</TableCell>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, width: '18%', whiteSpace: 'nowrap' }}>{t('phone')}</TableCell>
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
                              <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' }, }}><Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>#{c.id}</Typography></TableCell>
                              <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{customerTypeChip(c, t)}</TableCell>
                              <TableCell sx={{ cursor: 'pointer', maxWidth: { xs: 0, md: 'none' } }} onClick={() => setDrawerCustomer(c)}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: 'min(100%, 230px)', mx: 'auto', textAlign: 'left' }}>
                                  <Avatar sx={{ width: 30, height: 30, bgcolor: 'var(--blue-bg)', color: 'var(--blue-tx)', fontSize: '0.72rem', fontWeight: 700 }}>
                                    {(c.firstName ?? '?')[0]}{(c.lastName ?? '')[0]}
                                  </Avatar>
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: { xs: 'normal', md: 'nowrap' }, overflowWrap: 'break-word', '&:hover': { color: '#2563eb' } }}>{customerFullName(c)}</Typography>
                                    {/* Phones and tablets hide the e-mail, phone and type columns; they move under the name instead. */}
                                    <Box sx={{ display: { xs: 'block', md: 'none' }, minWidth: 0 }}>
                                      <Typography noWrap variant="caption" sx={{ display: 'block', color: '#64748b' }}>{c.email}</Typography>
                                      <Typography noWrap variant="caption" sx={{ display: 'block', color: '#64748b' }}>{c.phone}</Typography>
                                      <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.5 }}>{customerTypeChip(c, t)}</Box>
                                    </Box>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, }}><Box sx={{ width: 'min(100%, 260px)', mx: 'auto', textAlign: 'left' }}><Typography noWrap title={c.email} sx={{ color: '#64748b', fontSize: '0.85rem' }}>{c.email}</Typography></Box></TableCell>
                              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, whiteSpace: 'nowrap' }}><Box sx={{ width: 'min(100%, 150px)', mx: 'auto', textAlign: 'left' }}><Typography noWrap sx={{ color: '#64748b', fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>{c.phone}</Typography></Box></TableCell>
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
  );
}
