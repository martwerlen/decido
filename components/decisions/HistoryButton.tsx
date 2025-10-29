'use client';

import { IconButton, Tooltip } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';

interface HistoryButtonProps {
  onClick: () => void;
}

export default function HistoryButton({ onClick }: HistoryButtonProps) {
  return (
    <Tooltip title="Historique">
      <IconButton
        onClick={onClick}
        sx={{
          bgcolor: 'background.paper',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <HistoryIcon />
      </IconButton>
    </Tooltip>
  );
}
