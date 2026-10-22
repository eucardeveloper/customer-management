'use client';
import { Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import type { Dispatch, SetStateAction } from 'react';

import type { TFn, NewUserForm, PwDialogState, PwFormState } from '../model';

interface UserDialogsProps {
  t: TFn;
  deleteUserDialogOpen: boolean;
  setDeleteUserDialogOpen: Dispatch<SetStateAction<boolean>>;
  handleDeleteUser: () => void | Promise<void>;
  addUserDialogOpen: boolean;
  setAddUserDialogOpen: Dispatch<SetStateAction<boolean>>;
  newUser: NewUserForm;
  setNewUser: Dispatch<SetStateAction<NewUserForm>>;
  handleAddUser: () => void | Promise<void>;
  pwDialog: PwDialogState;
  setPwDialog: Dispatch<SetStateAction<PwDialogState>>;
  pwForm: PwFormState;
  setPwForm: Dispatch<SetStateAction<PwFormState>>;
  pwError: string;
  pwBusy: boolean;
  submitPassword: () => void | Promise<void>;
  roleDialogOpen: boolean;
  setRoleDialogOpen: Dispatch<SetStateAction<boolean>>;
  selectedRole: string;
  setSelectedRole: Dispatch<SetStateAction<string>>;
  handleUpdateRole: () => void | Promise<void>;
}

export function UserDialogs({ t, deleteUserDialogOpen, setDeleteUserDialogOpen, handleDeleteUser, addUserDialogOpen, setAddUserDialogOpen, newUser, setNewUser, handleAddUser, pwDialog, setPwDialog, pwForm, setPwForm, pwError, pwBusy, submitPassword, roleDialogOpen, setRoleDialogOpen, selectedRole, setSelectedRole, handleUpdateRole }: UserDialogsProps) {
  return (
    <>
        {/* User Delete */}
        <Dialog open={addUserDialogOpen} onClose={() => setAddUserDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>{t('addUser')}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
            <TextField label={t('username')} autoComplete="off" fullWidth size="small" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
            <TextField label={t('email')} autoComplete="off" fullWidth size="small" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
            <TextField label={t('password')} type="password" autoComplete="new-password" fullWidth size="small" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
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

    </>
  );
}
