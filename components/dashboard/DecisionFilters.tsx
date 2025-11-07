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
  statusFilter: string[]; // 'DRAFT', 'OPEN', 'CLOSED'
  scopeFilter: string; // 'ALL', 'MY_TEAMS', 'ME', or team ID
  typeFilter: string[]; // 'ADVICE_SOLICITATION', 'CONSENSUS', 'MAJORITY', 'NUANCED_VOTE'
}

interface DecisionFiltersProps {
  userTeams: Team[];
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

export default function DecisionFilters({ userTeams, onFilterChange }: DecisionFiltersProps) {
  // Filtre 1: Statut (multi-sélection) - Par défaut: "En cours"
  const [statusFilter, setStatusFilter] = useState<string[]>(['OPEN']);

  // Filtre 2: Périmètre (sélection simple) - Par défaut: "Toute l'organisation"
  const [scopeFilter, setScopeFilter] = useState<string>('ALL');

  // Filtre 3: Type (multi-sélection) - Par défaut: tous cochés
  const [typeFilter, setTypeFilter] = useState<string[]>([
    'ADVICE_SOLICITATION',
    'CONSENSUS',
    'MAJORITY',
    'NUANCED_VOTE',
  ]);

  // Appeler onFilterChange à chaque changement
  useEffect(() => {
    onFilterChange({ statusFilter, scopeFilter, typeFilter });
  }, [statusFilter, scopeFilter, typeFilter, onFilterChange]);

  const handleStatusChange = (event: SelectChangeEvent<typeof statusFilter>) => {
    const value = event.target.value;
    setStatusFilter(typeof value === 'string' ? value.split(',') : value);
  };

  const handleScopeChange = (event: SelectChangeEvent) => {
    setScopeFilter(event.target.value);
  };

  const handleTypeChange = (event: SelectChangeEvent<typeof typeFilter>) => {
    const value = event.target.value;
    setTypeFilter(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <Box className="mb-6 p-4 bg-white border rounded-lg">
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
        Filtrer les décisions
      </h3>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {/* Filtre 1: Statut */}
        <FormControl sx={{ minWidth: 200, flex: '1 1 200px' }} size="small">
          <InputLabel id="status-filter-label">Statut</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            multiple
            value={statusFilter}
            onChange={handleStatusChange}
            input={<OutlinedInput label="Statut" />}
            renderValue={(selected) => {
              const labels: Record<string, string> = {
                DRAFT: 'Brouillon',
                OPEN: 'En cours',
                CLOSED: 'Terminé',
              };
              return selected.map((s) => labels[s]).join(', ');
            }}
            MenuProps={MenuProps}
          >
            <MenuItem value="DRAFT">
              <Checkbox checked={statusFilter.indexOf('DRAFT') > -1} />
              <ListItemText primary="Brouillon" />
            </MenuItem>
            <MenuItem value="OPEN">
              <Checkbox checked={statusFilter.indexOf('OPEN') > -1} />
              <ListItemText primary="En cours" />
            </MenuItem>
            <MenuItem value="CLOSED">
              <Checkbox checked={statusFilter.indexOf('CLOSED') > -1} />
              <ListItemText primary="Terminé" />
            </MenuItem>
          </Select>
        </FormControl>

        {/* Filtre 2: Périmètre */}
        <FormControl sx={{ minWidth: 200, flex: '1 1 200px' }} size="small">
          <InputLabel id="scope-filter-label">Périmètre</InputLabel>
          <Select
            labelId="scope-filter-label"
            id="scope-filter"
            value={scopeFilter}
            onChange={handleScopeChange}
            label="Périmètre"
          >
            <MenuItem value="ALL">Toute l'organisation</MenuItem>
            {userTeams.map((team) => (
              <MenuItem key={team.id} value={team.id}>
                {team.name}
              </MenuItem>
            ))}
            <MenuItem value="ME">Moi</MenuItem>
          </Select>
        </FormControl>

        {/* Filtre 3: Type de décision */}
        <FormControl sx={{ minWidth: 200, flex: '1 1 200px' }} size="small">
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
                MAJORITY: 'Majorité',
                NUANCED_VOTE: 'Vote nuancé',
              };
              return selected.map((s) => labels[s]).join(', ');
            }}
            MenuProps={MenuProps}
          >
            <MenuItem value="ADVICE_SOLICITATION">
              <Checkbox checked={typeFilter.indexOf('ADVICE_SOLICITATION') > -1} />
              <ListItemText primary="Sollicitation d'avis" />
            </MenuItem>
            <MenuItem value="CONSENSUS">
              <Checkbox checked={typeFilter.indexOf('CONSENSUS') > -1} />
              <ListItemText primary="Consensus" />
            </MenuItem>
            <MenuItem value="MAJORITY">
              <Checkbox checked={typeFilter.indexOf('MAJORITY') > -1} />
              <ListItemText primary="Majorité" />
            </MenuItem>
            <MenuItem value="NUANCED_VOTE">
              <Checkbox checked={typeFilter.indexOf('NUANCED_VOTE') > -1} />
              <ListItemText primary="Vote nuancé" />
            </MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
}
