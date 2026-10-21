import { createTheme } from '@mui/material';
import type { ThemeOptions } from '@mui/material/styles';

export const DRAWER_WIDTH = 256;

export const SIDEBAR_BG = '#0b1f3a';
export const SIDEBAR_HOVER = 'rgba(255,255,255,0.06)';
export const SIDEBAR_ACTIVE = 'rgba(37,99,235,0.18)';
export const HEADER_BG = 'var(--surface)';

export const LIGHT_VARS = {
  '--page': '#f1f5f9', '--surface': '#ffffff', '--surface-2': '#f1f5f9', '--text': '#0f172a', '--text2': '#475569', '--border': '#e2e8f0', '--grid': '#e9eef5', '--icon': '#94a3b8', '--head-tx': '#475569',
  '--blue-bg': '#eff6ff', '--blue-bd': '#bfdbfe', '--blue-tx': '#1d4ed8',
  '--green-bg': '#f0fdf4', '--green-bd': '#bbf7d0', '--green-tx': '#15803d',
  '--amber-bg': '#fffbeb', '--amber-bd': '#fde68a', '--amber-tx': '#b45309',
  '--red-bg': '#fef2f2', '--red-bd': '#fecaca', '--red-tx': '#dc2626',
  '--sky-bg': '#f0f9ff', '--sky-bd': '#bae6fd', '--violet-bg': '#faf5ff', '--violet-bd': '#e9d5ff',
};
export const DARK_VARS = {
  '--page': '#0b1220', '--surface': '#111c2e', '--surface-2': '#17243a', '--text': '#e5edf8', '--text2': '#cbd5e1', '--border': '#263449', '--grid': '#1e2c43', '--icon': '#7c8ca5', '--head-tx': '#a8b8d0',
  '--blue-bg': 'rgba(59,130,246,0.16)', '--blue-bd': 'rgba(59,130,246,0.40)', '--blue-tx': '#93c5fd',
  '--green-bg': 'rgba(16,185,129,0.16)', '--green-bd': 'rgba(16,185,129,0.40)', '--green-tx': '#6ee7b7',
  '--amber-bg': 'rgba(245,158,11,0.16)', '--amber-bd': 'rgba(245,158,11,0.40)', '--amber-tx': '#fcd34d',
  '--red-bg': 'rgba(239,68,68,0.16)', '--red-bd': 'rgba(239,68,68,0.40)', '--red-tx': '#fca5a5',
  '--sky-bg': 'rgba(14,165,233,0.16)', '--sky-bd': 'rgba(14,165,233,0.40)', '--violet-bg': 'rgba(139,92,246,0.16)', '--violet-bd': 'rgba(139,92,246,0.40)',
};

export const baseThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: { main: '#2563eb', dark: '#1d4ed8', light: '#60a5fa' },
    secondary: { main: '#0ea5e9' },
    background: { default: 'var(--surface-2)', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h6: { fontWeight: 700, letterSpacing: '-0.02em' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: HEADER_BG,
          backgroundImage: 'none',
          color: 'var(--text)',
          boxShadow: 'none',
          borderBottom: '1px solid var(--border)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: SIDEBAR_BG,
          color: 'white',
          borderRight: 'none',
          boxShadow: '2px 0 20px rgba(0,0,0,0.15)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: 'var(--surface-2)',
            fontWeight: 700,
            color: 'var(--head-tx)',
            fontSize: '0.72rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            borderTop: 'none',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: 'var(--surface-2)' },
          '& .MuiTableCell-body': { height: 54 },
          transition: 'background-color 0.12s',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid var(--grid)', padding: '10px 20px', fontVariantNumeric: 'tabular-nums',
          // one alignment rule: every column (header and cells, Actions included) is centred; text columns keep their text left-aligned inside a block that is centred in the column (see the textBlock wrappers)
          textAlign: 'center',
          '&.MuiTableCell-alignRight': { textAlign: 'center' },
          '&.MuiTableCell-alignLeft': { textAlign: 'center' },
          // visible vertical divider between columns, header included
          '&:not(:last-child)': { borderRight: '1px solid var(--border)' },
          // screens narrower than the widest table: keep the Actions column (last) pinned so it stays reachable while the table scrolls sideways
          '@media (max-width:1600px)': { '&:last-child': { position: 'sticky', right: 0, backgroundColor: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 1 } },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '-0.01em',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
};

export const theme = createTheme(baseThemeOptions);
export const darkTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    ...baseThemeOptions.palette,
    mode: 'dark',
    background: { default: '#0b1220', paper: '#111c2e' },
  },
});
