'use client';
import { Button, MenuItem, TableCell, TableSortLabel, TextField, type TableCellProps } from '@mui/material';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import type { ReactNode } from 'react';

import type { SortState } from '../../lib/listSort';
import type { TFn } from '../model';

/** A table header cell you can click to sort by that column (the arrow shows the direction, aria-sort tells screen readers). */
export function SortCell({ label, sortKey, sort, onSort, ...cell }: {
  label: ReactNode; sortKey: string; sort: SortState | null; onSort: (key: string) => void;
} & Omit<TableCellProps, 'sortDirection' | 'onClick' | 'children'>) {
  const dir = sort && sort.key === sortKey ? sort.dir : undefined;
  return (
    <TableCell {...cell} sortDirection={dir ?? false}>
      <TableSortLabel active={dir !== undefined} direction={dir ?? 'asc'} onClick={() => onSort(sortKey)}>{label}</TableSortLabel>
    </TableCell>
  );
}

export function FilterSelect({ t, label, value, onChange, options, width = 160 }: {
  t: TFn; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; width?: number;
}) {
  return (
    <TextField select size="small" label={label} value={value} onChange={(e) => onChange(e.target.value)}
      sx={{ width: { xs: '100%', sm: width }, '& .MuiOutlinedInput-root': { bgcolor: 'var(--surface)', borderRadius: 2 } }}>
      <MenuItem value="">{t('filterAll')}</MenuItem>
      {options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
    </TextField>
  );
}

export function FilterDate({ label, value, onChange, error, helperText }: {
  label: string; value: string; onChange: (v: string) => void; error?: boolean; helperText?: string;
}) {
  return (
    <TextField size="small" type="date" label={label} value={value} onChange={(e) => onChange(e.target.value)}
      slotProps={{ inputLabel: { shrink: true } }} error={error} helperText={helperText}
      sx={{ width: { xs: '100%', sm: 160 }, '& .MuiOutlinedInput-root': { bgcolor: 'var(--surface)', borderRadius: 2 } }} />
  );
}

export function ClearFilters({ t, onClick }: { t: TFn; onClick: () => void }) {
  return (
    <Button size="small" startIcon={<FilterAltOffIcon />} onClick={onClick} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
      {t('filterClear')}
    </Button>
  );
}
