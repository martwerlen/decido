"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import { usePathname } from "next/navigation";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  organizationSlug?: string;
}

export default function FeedbackModal({
  open,
  onClose,
  organizationSlug,
}: FeedbackModalProps) {
  const pathname = usePathname();
  const [page, setPage] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill page field with current URL when modal opens
  useEffect(() => {
    if (open) {
      const fullUrl = window.location.href;
      setPage(fullUrl);
      setMessage("");
      setError("");
      setSuccess(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError("Veuillez saisir un message");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page,
          message,
          organizationSlug,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'envoi");
      }

      setSuccess(true);

      // Close modal after 1 second
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Error sending feedback:", err);
      setError("Erreur lors de l'envoi du feedback. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight="semibold">
          Bugs & Feedback
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Aidez-nous à améliorer l'application
        </Typography>
      </DialogTitle>

      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            Message bien envoyé
          </Alert>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Page concernée"
              value={page}
              onChange={(e) => setPage(e.target.value)}
              fullWidth
              size="small"
              helperText="URL de la page (vous pouvez la modifier)"
            />

            <TextField
              label="Partagez nous un feedbacks ou un bug rencontré"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              multiline
              rows={6}
              fullWidth
              required
              error={error !== "" && !message.trim()}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      {!success && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !message.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? "Envoi..." : "Envoyer"}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
