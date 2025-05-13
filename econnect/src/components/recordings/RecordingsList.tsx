import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { firestore } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { getRecordingDownloadUrl, deleteRecording } from '../../services/aws';
import { Recording } from '../../types';

const RecordingsList: React.FC = () => {
  const { userProfile } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchRecordings = async () => {
      if (!userProfile) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Query recordings for the current user
        const recordingsQuery = query(
          collection(firestore, 'recordings'),
          where('userId', '==', userProfile.id)
        );
        const recordingsSnapshot = await getDocs(recordingsQuery);
        const recordingsData = recordingsSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Recording)
        );

        // Sort by start time (newest first)
        recordingsData.sort((a, b) => {
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        });

        setRecordings(recordingsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching recordings:', error);
        setError('Failed to load recordings');
        setLoading(false);
      }
    };

    fetchRecordings();
  }, [userProfile]);

  const handlePlayRecording = async (recording: Recording) => {
    try {
      setSelectedRecording(recording);
      
      // Get a pre-signed URL for the recording
      const downloadUrl = await getRecordingDownloadUrl(recording.s3Key);
      
      // Open the recording in a dialog
      setIsPlaying(true);
      
      // You could also open in a new window/tab
      // window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Error playing recording:', error);
      setError('Failed to play recording');
    }
  };

  const handleDownloadRecording = async (recording: Recording) => {
    try {
      // Get a pre-signed URL for the recording
      const downloadUrl = await getRecordingDownloadUrl(recording.s3Key);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `recording-${recording.id}.mp4`; // Assuming MP4 format
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading recording:', error);
      setError('Failed to download recording');
    }
  };

  const handleDeleteClick = (recording: Recording) => {
    setSelectedRecording(recording);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteRecording = async () => {
    if (!selectedRecording) return;

    try {
      setIsDeleting(true);
      
      // Delete from S3
      await deleteRecording(selectedRecording.s3Key);
      
      // Delete from Firestore
      await deleteDoc(doc(firestore, 'recordings', selectedRecording.id));
      
      // Update state
      setRecordings(recordings.filter((r) => r.id !== selectedRecording.id));
      setDeleteConfirmOpen(false);
      setSelectedRecording(null);
      setIsDeleting(false);
    } catch (error) {
      console.error('Error deleting recording:', error);
      setError('Failed to delete recording');
      setIsDeleting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return [
      hours > 0 ? hours : null,
      minutes.toString().padStart(2, '0'),
      remainingSeconds.toString().padStart(2, '0'),
    ]
      .filter(Boolean)
      .join(':');
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Recordings
      </Typography>

      {recordings.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            You don't have any recordings yet.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Recordings will appear here when you record your meetings.
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {recordings.map((recording) => (
              <ListItem key={recording.id} divider>
                <ListItemText
                  primary={recording.title || `Recording from ${formatDate(recording.startTime)}`}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        Duration: {formatDuration(recording.duration || 0)}
                      </Typography>
                      <br />
                      {`Recorded on ${formatDate(recording.startTime)}`}
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="play"
                    onClick={() => handlePlayRecording(recording)}
                    sx={{ mr: 1 }}
                  >
                    <PlayIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="download"
                    onClick={() => handleDownloadRecording(recording)}
                    sx={{ mr: 1 }}
                  >
                    <DownloadIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleDeleteClick(recording)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Video Player Dialog */}
      <Dialog
        open={isPlaying}
        onClose={() => setIsPlaying(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedRecording
            ? selectedRecording.title || `Recording from ${formatDate(selectedRecording.startTime)}`
            : 'Recording'}
        </DialogTitle>
        <DialogContent>
          {selectedRecording && (
            <Box sx={{ width: '100%', height: '400px' }}>
              <video
                src={selectedRecording.url}
                controls
                autoPlay
                style={{ width: '100%', height: '100%' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPlaying(false)}>Close</Button>
          {selectedRecording && (
            <Button
              onClick={() => handleDownloadRecording(selectedRecording)}
              startIcon={<DownloadIcon />}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !isDeleting && setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this recording? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteRecording}
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RecordingsList;
