'use client';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, IconButton, TextField, Chip, Avatar, InputAdornment, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LockResetIcon from '@mui/icons-material/LockReset';
import type { Dispatch, SetStateAction } from 'react';

import type { TFn, SessionUser, UserItem } from '../model';

interface UsersTabProps {
  t: TFn;
  currentUser: SessionUser;
  userSearch: string;
  setUserSearch: Dispatch<SetStateAction<string>>;
  filteredUsers: UserItem[];
  fetchUsers: () => void | Promise<void>;
  openPwDialog: (d: { mode: 'self' | 'reset'; userId?: number; username?: string }) => void;
  setAddUserDialogOpen: Dispatch<SetStateAction<boolean>>;
  setDeleteUserDialogOpen: Dispatch<SetStateAction<boolean>>;
  setDeleteUserId: Dispatch<SetStateAction<number | null>>;
  setRoleDialogOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedRole: Dispatch<SetStateAction<string>>;
  setSelectedUserId: Dispatch<SetStateAction<number | null>>;
}

export function UsersTab({ t, currentUser, userSearch, setUserSearch, filteredUsers, fetchUsers, openPwDialog, setAddUserDialogOpen, setDeleteUserDialogOpen, setDeleteUserId, setRoleDialogOpen, setSelectedRole, setSelectedUserId }: UsersTabProps) {
  return (
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
                  <Table stickyHeader size="small" sx={{ tableLayout: 'auto', minWidth: { xs: 0, md: 760 } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, width: '1%', whiteSpace: 'nowrap' }}>{t('id')}</TableCell>
                        <TableCell sx={{ width: '34%' }}>{t('username')}</TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, width: '44%' }}>{t('email')}</TableCell>
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
                          <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' }, }}><Chip label={`#${u.id}`} size="small" sx={{ bgcolor: 'var(--surface-2)', color: '#64748b', fontSize: '0.68rem', height: 20 }} /></TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: { xs: '100%', md: 'min(100%, 170px)' }, mx: 'auto', textAlign: 'left' }}>
                              <Avatar sx={{ width: 30, height: 30, bgcolor: u.role === 'ADMIN' ? '#7c3aed' : '#16a34a', fontSize: '0.75rem', fontWeight: 700 }}>{u.username.charAt(0).toUpperCase()}</Avatar>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography noWrap title={u.username} sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.username}</Typography>
                                <Typography noWrap variant="caption" sx={{ display: { xs: 'block', md: 'none' }, color: '#64748b' }}>{u.email}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, }}><Box sx={{ width: 'min(100%, 260px)', mx: 'auto', textAlign: 'left' }}><Typography noWrap title={u.email} sx={{ color: '#64748b', fontSize: '0.85rem' }}>{u.email}</Typography></Box></TableCell>
                          <TableCell align="center">
                            <Chip label={u.role} size="small" sx={{ bgcolor: u.role === 'ADMIN' ? 'rgba(124,58,237,0.12)' : 'rgba(22,163,74,0.12)', color: u.role === 'ADMIN' ? '#7c3aed' : '#16a34a', border: `1px solid ${u.role === 'ADMIN' ? 'rgba(124,58,237,0.30)' : 'rgba(22,163,74,0.30)'}`, fontWeight: 700, fontSize: '0.68rem' }} />
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
  );
}
