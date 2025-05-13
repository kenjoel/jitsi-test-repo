import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import JitsiContainer from './JitsiContainer';
import { Meeting } from '../../types';

const MeetingRoom: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);

  useEffect(() => {
    const fetchMeeting = async () => {
      if (!meetingId || !currentUser) {
        setError('Invalid meeting ID or user not authenticated');
        setLoading(false);
        return;
      }

      try {
        const meetingDoc = doc(firestore, 'meetings', meetingId);
        const meetingSnapshot = await getDoc(meetingDoc);

        if (!meetingSnapshot.exists()) {
          setError('Meeting not found');
          setLoading(false);
          return;
        }

        const meetingData = meetingSnapshot.data() as Meeting;
        setMeeting(meetingData);
        
        // Check if the current user is the host
        setIsHost(meetingData.hostId === currentUser.uid);

        // Update participant list if not already in the meeting
        const participantExists = meetingData.participants.some(
          (p) => p.userId === currentUser.uid
        );

        if (!participantExists) {
          const newParticipant = {
            userId: currentUser.uid,
            displayName: userProfile?.displayName || currentUser.email || 'Anonymous',
            role: meetingData.hostId === currentUser.uid ? 'moderator' : 'viewer',
            joinTime: new Date(),
          };

          await updateDoc(meetingDoc, {
            participants: [...meetingData.participants, newParticipant],
            updatedAt: serverTimestamp(),
          });
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching meeting:', error);
        setError('Failed to load meeting details');
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [meetingId, currentUser, userProfile]);

  const handleMeetingEnd = async () => {
    if (!meetingId || !currentUser) return;

    try {
      // Update participant leave time
      const meetingDoc = doc(firestore, 'meetings', meetingId);
      const meetingSnapshot = await getDoc(meetingDoc);

      if (meetingSnapshot.exists()) {
        const meetingData = meetingSnapshot.data() as Meeting;
        const updatedParticipants = meetingData.participants.map((p) => {
          if (p.userId === currentUser.uid) {
            return { ...p, leaveTime: new Date() };
          }
          return p;
        });

        await updateDoc(meetingDoc, {
          participants: updatedParticipants,
          ...(isHost ? { endTime: new Date() } : {}),
          updatedAt: serverTimestamp(),
        });
      }

      // Navigate back to the events page
      navigate('/events');
    } catch (error) {
      console.error('Error updating meeting end:', error);
    }
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

  if (error || !meeting) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Failed to load meeting'}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/events')}>
          Back to Events
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 120px)',
          overflow: 'hidden',
        }}
      >
        <JitsiContainer
          roomName={meeting.jitsiRoomName}
          isHost={isHost}
          onMeetingEnd={handleMeetingEnd}
        />
      </Paper>
    </Container>
  );
};

export default MeetingRoom;
