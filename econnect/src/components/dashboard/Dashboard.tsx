import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { firestore } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { Event, Meeting, Recording } from '../../types';

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

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userProfile || !userProfile.id) {
        console.error('User profile or user ID is missing');
        setError('User profile information is incomplete');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch upcoming events
        const now = new Date();
        const eventsQuery = query(
          collection(firestore, 'events'),
          where('participants', 'array-contains-any', [userProfile.id, { userId: userProfile.id }]),
          where('startTime', '>=', now),
          orderBy('startTime'),
          limit(5)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsData = eventsSnapshot.docs.map((doc) => {
          const data = doc.data();
          // Convert Firestore timestamps to JavaScript Date objects
          return {
            id: doc.id,
            ...data,
            startTime: convertTimestamp(data.startTime) || new Date(),
            endTime: convertTimestamp(data.endTime) || new Date(),
            createdAt: convertTimestamp(data.createdAt) || new Date(),
            updatedAt: convertTimestamp(data.updatedAt) || new Date()
          } as Event;
        });
        setUpcomingEvents(eventsData);

        // Fetch recent meetings
        const meetingsQuery = query(
          collection(firestore, 'meetings'),
          where('participants', 'array-contains-any', [{ userId: userProfile.id }, userProfile.id]),
          orderBy('startTime', 'desc'),
          limit(5)
        );
        const meetingsSnapshot = await getDocs(meetingsQuery);
        const meetingsData = meetingsSnapshot.docs.map((doc) => {
          const data = doc.data();
          // Convert Firestore timestamps to JavaScript Date objects
          return {
            id: doc.id,
            ...data,
            startTime: convertTimestamp(data.startTime) || new Date(),
            endTime: convertTimestamp(data.endTime) || new Date(),
            createdAt: convertTimestamp(data.createdAt) || new Date(),
            updatedAt: convertTimestamp(data.updatedAt) || new Date(),
            recordingStarted: convertTimestamp(data.recordingStarted),
            recordingEnded: convertTimestamp(data.recordingEnded),
            participants: Array.isArray(data.participants) ? data.participants.map((p: any) => ({
              ...p,
              joinTime: convertTimestamp(p.joinTime) || new Date(),
              leaveTime: convertTimestamp(p.leaveTime)
            })) : []
          } as Meeting;
        });
        setRecentMeetings(meetingsData);

        // Fetch recordings
        const recordingsQuery = query(
          collection(firestore, 'recordings'),
          where('ownerId', '==', userProfile.id),
          orderBy('startTime', 'desc'),
          limit(5)
        );
        const recordingsSnapshot = await getDocs(recordingsQuery);
        const recordingsData = recordingsSnapshot.docs.map((doc) => {
          const data = doc.data();
          // Convert Firestore timestamps to JavaScript Date objects
          return {
            id: doc.id,
            ...data,
            startTime: convertTimestamp(data.startTime) || new Date(),
            endTime: convertTimestamp(data.endTime),
            createdAt: convertTimestamp(data.createdAt) || new Date(),
            updatedAt: convertTimestamp(data.updatedAt) || new Date()
          } as Recording;
        });
        setRecordings(recordingsData);

        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        // Provide more specific error message for debugging
        const errorMessage = error.message 
          ? `Failed to load dashboard data: ${error.message}` 
          : 'Failed to load dashboard data';
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userProfile]);

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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {userProfile?.displayName || 'User'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's an overview of your eConnect activities
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 4 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Upcoming Events
            </Typography>
            {upcomingEvents.length > 0 ? (
              <List>
                {upcomingEvents.map((event) => (
                  <React.Fragment key={event.id}>
                    <ListItem>
                      <ListItemText
                        primary={event.title}
                        secondary={`${new Date(event.startTime).toLocaleDateString()} at ${new Date(
                          event.startTime
                        ).toLocaleTimeString()}`}
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No upcoming events
              </Typography>
            )}
          </CardContent>
          <CardActions>
            <Button size="small" component={Link} to="/events">
              View All Events
            </Button>
            <Button size="small" component={Link} to="/events/create">
              Create Event
            </Button>
          </CardActions>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Meetings
            </Typography>
            {recentMeetings.length > 0 ? (
              <List>
                {recentMeetings.map((meeting) => (
                  <React.Fragment key={meeting.id}>
                    <ListItem>
                      <ListItemText
                        primary={meeting.title}
                        secondary={`${new Date(meeting.startTime).toLocaleDateString()} at ${new Date(
                          meeting.startTime
                        ).toLocaleTimeString()}`}
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No recent meetings
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Your Recordings
        </Typography>
        {recordings.length > 0 ? (
          <List>
            {recordings.map((recording) => (
              <React.Fragment key={recording.id}>
                <ListItem>
                  <ListItemText
                    primary={`Recording from ${new Date(recording.startTime).toLocaleDateString()}`}
                    secondary={`Duration: ${
                      recording.duration
                        ? `${Math.floor(recording.duration / 60)}m ${recording.duration % 60}s`
                        : 'N/A'
                    }`}
                  />
                  <Button size="small" href={recording.url} target="_blank" rel="noopener noreferrer">
                    View
                  </Button>
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No recordings available
          </Typography>
        )}
      </Paper>
    </Container>
  );
};

export default Dashboard;
