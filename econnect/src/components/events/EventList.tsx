import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { firestore } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`event-tabpanel-${index}`}
      aria-labelledby={`event-tab-${index}`}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const EventList: React.FC = () => {
  const [tabValue, setTabValue] = useState<number>(0);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      if (!userProfile || !userProfile.id) {
        console.error('User profile or user ID is missing');
        setError('User profile information is incomplete');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const now = new Date();
        
        // Fetch upcoming events
        const upcomingQuery = query(
          collection(firestore, 'events'),
          where('participants', 'array-contains-any', [userProfile.id, { userId: userProfile.id }]),
          where('startTime', '>=', now),
          orderBy('startTime')
        );
        const upcomingSnapshot = await getDocs(upcomingQuery);
        const upcomingData = upcomingSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            startTime: convertTimestamp(data.startTime) || new Date(),
            endTime: convertTimestamp(data.endTime) || new Date(),
            createdAt: convertTimestamp(data.createdAt) || new Date(),
            updatedAt: convertTimestamp(data.updatedAt) || new Date()
          } as Event;
        });
        setUpcomingEvents(upcomingData);

        // Fetch past events
        const pastQuery = query(
          collection(firestore, 'events'),
          where('participants', 'array-contains-any', [userProfile.id, { userId: userProfile.id }]),
          where('startTime', '<', now),
          orderBy('startTime', 'desc')
        );
        const pastSnapshot = await getDocs(pastQuery);
        const pastData = pastSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            startTime: convertTimestamp(data.startTime) || new Date(),
            endTime: convertTimestamp(data.endTime) || new Date(),
            createdAt: convertTimestamp(data.createdAt) || new Date(),
            updatedAt: convertTimestamp(data.updatedAt) || new Date()
          } as Event;
        });
        setPastEvents(pastData);

        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching events:', error);
        const errorMessage = error.message 
          ? `Failed to load events: ${error.message}` 
          : 'Failed to load events';
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchEvents();
  }, [userProfile]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatEventDate = (event: Event) => {
    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);
    
    const sameDay = startDate.toDateString() === endDate.toDateString();
    
    if (sameDay) {
      return `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}`;
    } else {
      return `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()} - ${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString()}`;
    }
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Events</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/events/create')}
        >
          Create Event
        </Button>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Upcoming Events" />
          <Tab label="Past Events" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {upcomingEvents.length > 0 ? (
            <List>
              {upcomingEvents.map((event) => (
                <React.Fragment key={event.id}>
                  <ListItem
                    component={Link}
                    to={`/events/${event.id}`}
                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                  >
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ListItemText
                        primary={event.title}
                        secondary={formatEventDate(event)}
                      />
                      <Box>
                        {event.createdBy === userProfile?.id && (
                          <Chip label="Host" color="primary" size="small" sx={{ mr: 1 }} />
                        )}
                        {event.isPublic ? (
                          <Chip label="Public" color="success" size="small" />
                        ) : (
                          <Chip label="Private" color="default" size="small" />
                        )}
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {event.description.length > 100
                        ? `${event.description.substring(0, 100)}...`
                        : event.description}
                    </Typography>
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No upcoming events
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => navigate('/events/create')}
                sx={{ mt: 2 }}
              >
                Create an Event
              </Button>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {pastEvents.length > 0 ? (
            <List>
              {pastEvents.map((event) => (
                <React.Fragment key={event.id}>
                  <ListItem
                    component={Link}
                    to={`/events/${event.id}`}
                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                  >
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ListItemText
                        primary={event.title}
                        secondary={formatEventDate(event)}
                      />
                      <Box>
                        {event.createdBy === userProfile?.id && (
                          <Chip label="Host" color="primary" size="small" sx={{ mr: 1 }} />
                        )}
                        {event.isPublic ? (
                          <Chip label="Public" color="success" size="small" />
                        ) : (
                          <Chip label="Private" color="default" size="small" />
                        )}
                      </Box>
                    </Box>
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No past events
              </Typography>
            </Box>
          )}
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default EventList;
