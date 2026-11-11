'use client';
import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, IconButton, Chip, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';

import { api } from '@/lib/api';
import { parseServerUtc } from '@/lib/auditTime';
import type { TFn } from '../model';

interface AuditRow {
  id: number;
  orderId: number;
  action: string;
  actor: string;
  oldStatus: string | null;
  newStatus: string | null;
  details: string | null;
  createdAt: string;
}

interface AuditPage {
  items: AuditRow[];
  page: number;
  size: number;
  total: number;
}

const ACTION_KEYS: Record<string, string> = {
  CREATE: 'auditCreate',
  UPDATE: 'auditUpdate',
  DELETE: 'auditDelete',
  UNDO_CREATE: 'auditUndoCreate',
  UNDO_REASSIGN: 'auditUndoReassign',
};

/** Who changed which order and when, newest first, one server page at a time (ADMIN only). */
export function AuditTab({ t }: { t: TFn }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [reload, setReload] = useState(0);
  const key = `${page}:${rowsPerPage}:${reload}`;
  // The result remembers which request it answers, so "loading" is simply "the latest result is for another request".
  const [result, setResult] = useState<{ key: string; data?: AuditPage; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<AuditPage>(`/api/orders/audit?page=${page}&size=${rowsPerPage}`)
      .then((data) => { if (!cancelled) setResult({ key, data }); })
      .catch((e: unknown) => { if (!cancelled) setResult({ key, error: e instanceof Error ? e.message : 'error' }); });
    return () => { cancelled = true; };
  }, [key, page, rowsPerPage]);

  const loading = !result || result.key !== key;
  const data = result?.data;
  const rows = data?.items ?? [];

  return (
    <Paper elevation={0} sx={{ flex: '0 1 auto', minHeight: 0, minWidth: 0, border: '1px solid var(--border)', borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid var(--surface-2)', bgcolor: 'var(--surface)' }}>
        <Typography variant="body2" color="text.secondary">{t('auditHint')}</Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={t('refresh')}>
          <IconButton size="small" aria-label={t('refresh')} onClick={() => setReload((n) => n + 1)} sx={{ color: '#64748b' }}><RefreshIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Box>
      <TableContainer sx={{ flex: '0 1 auto', overflow: 'auto', maxHeight: 'calc(100vh - 300px)', minHeight: 0 }}>
        <Table stickyHeader size="small" sx={{ tableLayout: 'auto', minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('auditWhen')}</TableCell>
              <TableCell>{t('auditWho')}</TableCell>
              <TableCell>{t('auditAction')}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('auditOrder')}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('auditStatusChange')}</TableCell>
              <TableCell>{t('auditDetails')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result?.error && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="error">{result.error}</Typography>
              </TableCell></TableRow>
            )}
            {!loading && !result?.error && rows.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                <HistoryIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1, display: 'block', mx: 'auto' }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{t('noAudit')}</Typography>
              </TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{parseServerUtc(r.createdAt).toLocaleString()}</TableCell>
                <TableCell>{r.actor}</TableCell>
                <TableCell><Chip size="small" label={ACTION_KEYS[r.action] ? t(ACTION_KEYS[r.action]) : r.action} /></TableCell>
                <TableCell>#{r.orderId}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.oldStatus || r.newStatus ? `${r.oldStatus ?? '—'} → ${r.newStatus ?? '—'}` : '—'}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{r.details ?? ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={data?.total ?? 0}
        page={data ? Math.min(page, Math.max(0, Math.ceil(data.total / rowsPerPage) - 1)) : 0}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[10, 20, 50]}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        labelRowsPerPage={t('rowsPerPage')}
      />
    </Paper>
  );
}
