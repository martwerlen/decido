'use client';

import { useEffect, useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import CloseIcon from '@mui/icons-material/Close';
import CreateIcon from '@mui/icons-material/Create';
import EditIcon from '@mui/icons-material/Edit';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import CommentIcon from '@mui/icons-material/Comment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FeedbackIcon from '@mui/icons-material/Feedback';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HistoryLog {
  id: string;
  eventType: string;
  message: string;
  createdAt: string;
  actorId: string | null;
  actorName: string;
}

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
  organizationSlug: string;
  decisionId: string;
}

// Fonction pour obtenir l'icône selon le type d'événement
function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'CREATED':
      return <CreateIcon />;
    case 'TITLE_UPDATED':
    case 'DESCRIPTION_UPDATED':
    case 'CONTEXT_UPDATED':
    case 'DEADLINE_UPDATED':
    case 'PROPOSAL_AMENDED':
      return <EditIcon />;
    case 'VOTE_RECORDED':
    case 'VOTE_UPDATED':
      return <HowToVoteIcon />;
    case 'COMMENT_ADDED':
      return <CommentIcon />;
    case 'OPINION_SUBMITTED':
    case 'OPINION_UPDATED':
    case 'FINAL_DECISION_MADE':
      return <FeedbackIcon />;
    case 'CLOSED':
    case 'STATUS_CHANGED':
      return <CheckCircleIcon />;
    case 'PARTICIPANT_ADDED':
    case 'PARTICIPANT_REMOVED':
      return <PersonAddIcon />;
    default:
      return <CreateIcon />;
  }
}

// Fonction pour obtenir la couleur selon le type d'événement
function getEventColor(eventType: string): 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'grey' {
  switch (eventType) {
    case 'CREATED':
      return 'primary';
    case 'TITLE_UPDATED':
    case 'DESCRIPTION_UPDATED':
    case 'CONTEXT_UPDATED':
    case 'DEADLINE_UPDATED':
    case 'PROPOSAL_AMENDED':
      return 'info';
    case 'VOTE_RECORDED':
    case 'VOTE_UPDATED':
      return 'success';
    case 'COMMENT_ADDED':
      return 'secondary';
    case 'OPINION_SUBMITTED':
    case 'OPINION_UPDATED':
      return 'info';
    case 'FINAL_DECISION_MADE':
      return 'success';
    case 'CLOSED':
      return 'warning';
    case 'STATUS_CHANGED':
      return 'info';
    case 'PARTICIPANT_ADDED':
    case 'PARTICIPANT_REMOVED':
      return 'grey';
    default:
      return 'grey';
  }
}

export default function HistoryPanel({
  open,
  onClose,
  organizationSlug,
  decisionId,
}: HistoryPanelProps) {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, organizationSlug, decisionId]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/organizations/${organizationSlug}/decisions/${decisionId}/history`
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de l\'historique');
      }

      const data = await response.json();
      setLogs(data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 400, md: 500 },
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" component="h2">
            Historique
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Timeline */}
        {!loading && !error && logs.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Aucun événement dans l&apos;historique
          </Typography>
        )}

        {!loading && !error && logs.length > 0 && (
          <Timeline position="right" sx={{ p: 0, m: 0 }}>
            {logs.map((log, index) => (
              <TimelineItem key={log.id}>
                <TimelineOppositeContent
                  sx={{ flex: 0.3, py: 2, px: 1 }}
                  color="text.secondary"
                  variant="caption"
                >
                  {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color={getEventColor(log.eventType)}>
                    {getEventIcon(log.eventType)}
                  </TimelineDot>
                  {index < logs.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent sx={{ py: 2, px: 2 }}>
                  <Typography variant="body2">{log.message}</Typography>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </Box>
    </Drawer>
  );
}
