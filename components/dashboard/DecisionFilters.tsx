'use client';

import { useState } from 'react';
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material';

interface DecisionFiltersProps {
  onFilterChange: (filters: { showDrafts: boolean; showActive: boolean; showClosed: boolean }) => void;
}

export default function DecisionFilters({ onFilterChange }: DecisionFiltersProps) {
  const [showDrafts, setShowDrafts] = useState(false);
  const [showActive, setShowActive] = useState(true); // Par défaut : En cours uniquement
  const [showClosed, setShowClosed] = useState(false);

  const handleChange = (filter: 'drafts' | 'active' | 'closed', checked: boolean) => {
    const newFilters = {
      showDrafts: filter === 'drafts' ? checked : showDrafts,
      showActive: filter === 'active' ? checked : showActive,
      showClosed: filter === 'closed' ? checked : showClosed,
    };

    if (filter === 'drafts') setShowDrafts(checked);
    if (filter === 'active') setShowActive(checked);
    if (filter === 'closed') setShowClosed(checked);

    onFilterChange(newFilters);
  };

  return (
    <div className="mb-6 p-4 bg-white border rounded-lg">
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
        Filtrer les décisions
      </h3>
      <FormGroup row>
        <FormControlLabel
          control={
            <Checkbox
              checked={showDrafts}
              onChange={(e) => handleChange('drafts', e.target.checked)}
              sx={{
                color: 'var(--color-primary)',
                '&.Mui-checked': {
                  color: 'var(--color-primary)',
                },
              }}
            />
          }
          label="Brouillons"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={showActive}
              onChange={(e) => handleChange('active', e.target.checked)}
              sx={{
                color: 'var(--color-primary)',
                '&.Mui-checked': {
                  color: 'var(--color-primary)',
                },
              }}
            />
          }
          label="En cours"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={showClosed}
              onChange={(e) => handleChange('closed', e.target.checked)}
              sx={{
                color: 'var(--color-primary)',
                '&.Mui-checked': {
                  color: 'var(--color-primary)',
                },
              }}
            />
          }
          label="Terminées"
        />
      </FormGroup>
    </div>
  );
}
