'use client';
import { Box, Typography, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Avatar, Divider, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { type Customer, type CustomerType, statusChip, customerTypeChip, formatDate } from '../model';
import type { Dispatch, SetStateAction } from 'react';

import type { TFn, Order } from '../model';
import type { Lang } from '../translations';

interface CustomerDialogsProps {
  t: TFn;
  lang: Lang;
  isAdmin: boolean;
  orders: Order[];
  dialogOpen: boolean;
  setDialogOpen: Dispatch<SetStateAction<boolean>>;
  isEditing: boolean;
  editCustomer: Partial<Customer>;
  setEditCustomer: Dispatch<SetStateAction<Partial<Customer>>>;
  customerType: CustomerType;
  setCustomerType: Dispatch<SetStateAction<CustomerType>>;
  formErrors: Record<string, string>;
  setFormErrors: Dispatch<SetStateAction<Record<string, string>>>;
  handleSave: () => void | Promise<void>;
  busy?: boolean;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: Dispatch<SetStateAction<boolean>>;
  handleDelete: () => void | Promise<void>;
  drawerCustomer: Customer | null;
  setDrawerCustomer: Dispatch<SetStateAction<Customer | null>>;
  openEdit: (c: Customer) => void;
  openDelete: (id: number) => void;
}

export function CustomerDialogs({ t, lang, isAdmin, orders, dialogOpen, setDialogOpen, isEditing, editCustomer, setEditCustomer, customerType, setCustomerType, formErrors, setFormErrors, handleSave, busy, deleteDialogOpen, setDeleteDialogOpen, handleDelete, drawerCustomer, setDrawerCustomer, openEdit, openDelete }: CustomerDialogsProps) {
  return (
    <>
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
                <TextField label={`${t('companyName')} *`} fullWidth size="small" value={editCustomer.firstName || ''} onChange={e => { setEditCustomer({ ...editCustomer, firstName: e.target.value }); setFormErrors(p => ({ ...p, firstName: '' })); }} error={!!formErrors.firstName} helperText={formErrors.firstName} />
              )}
              <TextField label={`${t('email')}${!editCustomer.phone?.trim() ? ' *' : ''}`} fullWidth size="small" value={editCustomer.email || ''} onChange={e => { setEditCustomer({ ...editCustomer, email: e.target.value }); setFormErrors(p => ({ ...p, email: '', phone: '' })); }} error={!!formErrors.email} helperText={formErrors.email || t('emailOrPhoneHint')} />
              <TextField label={`${t('phone')}${!editCustomer.email?.trim() ? ' *' : ''}`} fullWidth size="small" value={editCustomer.phone || ''} onChange={e => { setEditCustomer({ ...editCustomer, phone: e.target.value }); setFormErrors(p => ({ ...p, email: '', phone: '' })); }} error={!!formErrors.phone} helperText={formErrors.phone} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>{ t('cancel') }</Button>
            <Button variant="contained" onClick={handleSave} disabled={busy} disableElevation sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{isEditing ? t('update') : t('addCustomer')}</Button>
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
    </>
  );
}
