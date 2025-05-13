import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import VirtualTables from './VirtualTables';
import JitsiContainer from '../meetings/JitsiContainer';
import { Event } from '../../types';

// Helper function to convert Firestore timestamp to JavaScript Date
const convertTimestamp = (timestamp: any): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
};

const VirtualSpace: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [isHost, setIsHost] = useState<boolean>(false);
  
  console.log("We get to this compoennt")

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId || !userProfile) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch event details
        const eventDoc = doc(firestore, 'events', eventId);
        const eventSnapshot = await getDoc(eventDoc);

        if (!eventSnapshot.exists()) {
          setError('Event not found');
          setLoading(false);
          return;
        }

        const data = eventSnapshot.data();
        // Convert Firestore timestamps to JavaScript Date objects
        const eventData = {
          ...data,
          startTime: convertTimestamp(data.startTime) || new Date(),
          endTime: convertTimestamp(data.endTime) || new Date(),
          createdAt: convertTimestamp(data.createdAt) || new Date(),
          updatedAt: convertTimestamp(data.updatedAt) || new Date()
        } as Event;
        setEvent(eventData);
        
        // Check if user is the host
        setIsHost(eventData.createdBy === userProfile.id);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching event details:', error);
        setError('Failed to load event details');
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId, userProfile]);

  const handleBroadcastStart = () => {
    setIsBroadcasting(true);
  };

  const handleBroadcastEnd = () => {
    setIsBroadcasting(false);
  };

  const handleBackToEvent = () => {
    navigate(`/events/${eventId}`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
      </Container>
    );
  }

  if (error || !event) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Failed to load event details'}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/events')}
        >
          Back to Events
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToEvent}
            sx={{ mb: 1 }}
          >
            Back to Event
          </Button>
          <Typography variant="h4">{event.title} - Virtual Space</Typography>
        </Box>
      </Box>

      <Paper
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 180px)',
          overflow: 'hidden',
        }}
      >
        {isBroadcasting ? (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: 'background.paper',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="h6">Event Broadcast</Typography>
              {isHost && (
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleBroadcastEnd}
                >
                  End Broadcast
                </Button>
              )}
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <JitsiContainer
                roomName={`${eventId}-broadcast`}
                isHost={isHost}
              />
            </Box>
          </Box>
        ) : (
          <VirtualTables
            eventId={eventId || ''}
            isHost={isHost}
            onBroadcastStart={isHost ? handleBroadcastStart : undefined}
          />
        )}
      </Paper>
    </Container>
  );
};

export default VirtualSpace;
