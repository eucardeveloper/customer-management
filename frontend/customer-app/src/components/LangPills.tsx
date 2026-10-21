'use client';

import { Box } from '@mui/material';
import type { Lang } from '@/app/translations';

const LANGS: Lang[] = ['en', 'tr', 'de'];

/** EN / TR / DE switch, same look as the one in the app header; used on the sign-in and registration pages. */
export function LangPills({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <Box sx={{ display: 'flex', borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.35)', bgcolor: 'rgba(255,255,255,0.12)' }}>
      {LANGS.map((l) => (
        <Box
          key={l}
          role="button"
          tabIndex={0}
          aria-pressed={lang === l}
          onClick={() => onChange(l)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(l); } }}
          sx={{ px: 1.4, py: 0.5, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', color: lang === l ? '#1d4ed8' : '#fff', bgcolor: lang === l ? '#fff' : 'transparent', transition: 'all 0.15s', '&:hover': { bgcolor: lang === l ? '#fff' : 'rgba(255,255,255,0.2)' } }}
        >
          {l.toUpperCase()}
        </Box>
      ))}
    </Box>
  );
}
