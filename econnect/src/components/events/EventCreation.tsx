import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

const EventCreation: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [startTime, setStartTime] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [endTime, setEndTime] = useState<string>(
    new Date(new Date().getTime() + 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userProfile) {
      setError('You must be logged in to create an event');
      return;
    }

    if (!title || !description || !startTime || !endTime) {
      setError('Please fill in all required fields');
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (startDate >= endDate) {
      setError('End time must be after start time');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Generate a unique room name for Jitsi
      const roomName = `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Create the event in Firestore
      const eventData = {
        title,
        description,
        startTime: startDate,
        endTime: endDate,
        createdBy: userProfile.id,
        isPublic,
        maxParticipants: maxParticipants || null,
        participants: [userProfile.id], // Creator is automatically a participant
        jitsiRoomName: roomName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const eventRef = await addDoc(collection(firestore, 'events'), eventData);

      // Navigate to the event details page
      navigate(`/events/${eventRef.id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      setError('Failed to create event. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create New Event
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="title"
            label="Event Title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            id="description"
            label="Event Description"
            name="description"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="startTime"
              label="Start Time"
              name="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={loading}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ flex: 1 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="endTime"
              label="End Time"
              name="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={loading}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ flex: 1 }}
            />
          </Box>

          <TextField
            margin="normal"
            fullWidth
            id="maxParticipants"
            label="Maximum Participants (Optional)"
            name="maxParticipants"
            type="number"
            InputProps={{
              inputProps: { min: 1 },
              startAdornment: <InputAdornment position="start">Max</InputAdornment>,
            }}
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value === '' ? '' : parseInt(e.target.value))}
            disabled={loading}
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={loading}
              />
            }
            label="Public Event (Anyone can join)"
            sx={{ mb: 3, display: 'block' }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ flex: 1 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Create Event'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/events')}
              disabled={loading}
              sx={{ flex: 1 }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default EventCreation;
