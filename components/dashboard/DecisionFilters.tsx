'use client';

import { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  SelectChangeEvent,
  Box,
} from '@mui/material';

interface Team {
  id: string;
  name: string;
}

export interface DecisionFiltersType {
  statusFilter: string; // 'ALL', 'DRAFT', 'OPEN', 'CLOSED'
  scopeFilter: string; // 'ALL', 'MY_TEAMS', 'ME', or team ID
  typeFilter: string[]; // 'ADVICE_SOLICITATION', 'CONSENSUS', 'CONSENT', 'MAJORITY', 'NUANCED_VOTE'
}

interface DecisionFiltersProps {
  userTeams: Team[];
  filters: DecisionFiltersType;
  onFilterChange: (filters: DecisionFiltersType) => void;
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

export default function DecisionFilters({ userTeams, filters, onFilterChange }: DecisionFiltersProps) {
  const { statusFilter, scopeFilter, typeFilter } = filters;

  const handleStatusChange = (event: SelectChangeEvent) => {
    onFilterChange({ ...filters, statusFilter: event.target.value });
  };

  const handleScopeChange = (event: SelectChangeEvent) => {
    onFilterChange({ ...filters, scopeFilter: event.target.value });
  };

  const handleTypeChange = (event: SelectChangeEvent<typeof typeFilter>) => {
    const value = event.target.value;
    const newTypeFilter = typeof value === 'string' ? value.split(',') : value;
    onFilterChange({ ...filters, typeFilter: newTypeFilter });
  };

  return (
    <Box sx={{ mb: 2, p: 2, backgroundColor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
        Filtrer les décisions
      </h3>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        {/* Filtre 1: Statut */}
        <FormControl sx={{ minWidth: { xs: '100%', md: 200 }, flex: { xs: '0 0 auto', md: '1 1 200px' } }} size="small">
          <InputLabel id="status-filter-label">Statut</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            value={statusFilter}
            onChange={handleStatusChange}
            label="Statut"
          >
            <MenuItem value="ALL" sx={{ fontSize: '0.875rem' }}>Tous</MenuItem>
            <MenuItem value="DRAFT" sx={{ fontSize: '0.875rem' }}>Brouillon</MenuItem>
            <MenuItem value="OPEN" sx={{ fontSize: '0.875rem' }}>En cours</MenuItem>
            <MenuItem value="CLOSED" sx={{ fontSize: '0.875rem' }}>Terminé</MenuItem>
          </Select>
        </FormControl>

        {/* Filtre 2: Périmètre */}
        <FormControl sx={{ minWidth: { xs: '100%', md: 200 }, flex: { xs: '0 0 auto', md: '1 1 200px' } }} size="small">
          <InputLabel id="scope-filter-label">Périmètre</InputLabel>
          <Select
            labelId="scope-filter-label"
            id="scope-filter"
            value={scopeFilter}
            onChange={handleScopeChange}
            label="Périmètre"
          >
            <MenuItem value="ALL" sx={{ fontSize: '0.875rem' }}>Toute l&apos;organisation</MenuItem>
            {userTeams.map((team) => (
              <MenuItem key={team.id} value={team.id} sx={{ fontSize: '0.875rem' }}>
                {team.name}
              </MenuItem>
            ))}
            <MenuItem value="ME" sx={{ fontSize: '0.875rem' }}>Moi</MenuItem>
          </Select>
        </FormControl>

        {/* Filtre 3: Type de décision */}
        <FormControl sx={{ minWidth: { xs: '100%', md: 200 }, flex: { xs: '0 0 auto', md: '1 1 200px' } }} size="small">
          <InputLabel id="type-filter-label">Type</InputLabel>
          <Select
            labelId="type-filter-label"
            id="type-filter"
            multiple
            value={typeFilter}
            onChange={handleTypeChange}
            input={<OutlinedInput label="Type" />}
            renderValue={(selected) => {
              const labels: Record<string, string> = {
                ADVICE_SOLICITATION: 'Sollicitation d\'avis',
                CONSENSUS: 'Consensus',
                CONSENT: 'Consentement',
                MAJORITY: 'Majorité',
                NUANCED_VOTE: 'Vote nuancé',
              };
              return selected.map((s) => labels[s]).join(', ');
            }}
            MenuProps={MenuProps}
          >
            <MenuItem value="ADVICE_SOLICITATION" sx={{ fontSize: '0.875rem' }}>
              <Checkbox checked={typeFilter.indexOf('ADVICE_SOLICITATION') > -1} />
              <ListItemText primary="Sollicitation d&apos;avis" primaryTypographyProps={{ fontSize: '0.875rem' }} />
            </MenuItem>
            <MenuItem value="CONSENSUS" sx={{ fontSize: '0.875rem' }}>
              <Checkbox checked={typeFilter.indexOf('CONSENSUS') > -1} />
              <ListItemText primary="Consensus" primaryTypographyProps={{ fontSize: '0.875rem' }} />
            </MenuItem>
            <MenuItem value="CONSENT" sx={{ fontSize: '0.875rem' }}>
              <Checkbox checked={typeFilter.indexOf('CONSENT') > -1} />
              <ListItemText primary="Consentement" primaryTypographyProps={{ fontSize: '0.875rem' }} />
            </MenuItem>
            <MenuItem value="MAJORITY" sx={{ fontSize: '0.875rem' }}>
              <Checkbox checked={typeFilter.indexOf('MAJORITY') > -1} />
              <ListItemText primary="Majorité" primaryTypographyProps={{ fontSize: '0.875rem' }} />
            </MenuItem>
            <MenuItem value="NUANCED_VOTE" sx={{ fontSize: '0.875rem' }}>
              <Checkbox checked={typeFilter.indexOf('NUANCED_VOTE') > -1} />
              <ListItemText primary="Vote nuancé" primaryTypographyProps={{ fontSize: '0.875rem' }} />
            </MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
}
