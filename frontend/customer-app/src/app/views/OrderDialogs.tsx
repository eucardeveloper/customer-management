'use client';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Divider, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { ORDER_STATUSES, statusText } from '../model';
import type { Dispatch, SetStateAction } from 'react';

import type { TFn, Customer, OrderForm } from '../model';

interface OrderDialogsProps {
  t: TFn;
  customers: Customer[];
  orderDialogOpen: boolean;
  setOrderDialogOpen: Dispatch<SetStateAction<boolean>>;
  isEditingOrder: boolean;
  editOrder: OrderForm;
  setEditOrder: Dispatch<SetStateAction<OrderForm>>;
  handleSaveOrder: () => void | Promise<void>;
  busy?: boolean;
  orderDeleteDialogOpen: boolean;
  setOrderDeleteDialogOpen: Dispatch<SetStateAction<boolean>>;
  handleDeleteOrder: () => void | Promise<void>;
}

export function OrderDialogs({ t, customers, orderDialogOpen, setOrderDialogOpen, isEditingOrder, editOrder, setEditOrder, handleSaveOrder, busy, orderDeleteDialogOpen, setOrderDeleteDialogOpen, handleDeleteOrder }: OrderDialogsProps) {
  return (
    <>
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
            <Button variant="contained" onClick={handleSaveOrder} disabled={busy} disableElevation sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{isEditingOrder ? t('update') : t('addOrder')}</Button>
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

    </>
  );
}
