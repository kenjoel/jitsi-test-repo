import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { firestore } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { MeetingAnalytics as MeetingAnalyticsType, ParticipantAnalytics } from '../../types';

const MeetingAnalytics: React.FC = () => {
  const { userProfile } = useAuth();
  const [analytics, setAnalytics] = useState<MeetingAnalyticsType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<string>('all');

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!userProfile) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Query analytics for meetings hosted by the current user
        const analyticsQuery = query(
          collection(firestore, 'meetingAnalytics'),
          where('hostId', '==', userProfile.id),
          orderBy('startTime', 'desc')
        );
        const analyticsSnapshot = await getDocs(analyticsQuery);
        const analyticsData = analyticsSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as MeetingAnalyticsType)
        );

        setAnalytics(analyticsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setError('Failed to load meeting analytics');
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [userProfile]);

  const handleMeetingChange = (event: SelectChangeEvent) => {
    setSelectedMeeting(event.target.value);
  };

  // Filter analytics based on selected meeting
  const filteredAnalytics = selectedMeeting === 'all'
    ? analytics
    : analytics.filter((a) => a.id === selectedMeeting);

  // Calculate total participants and average duration
  const totalParticipants = filteredAnalytics.reduce((sum, a) => sum + a.participantCount, 0);
  const averageDuration = filteredAnalytics.length > 0
    ? Math.round(filteredAnalytics.reduce((sum, a) => sum + a.averageDuration, 0) / filteredAnalytics.length / 60)
    : 0;

  // Format duration in minutes and seconds
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
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

  if (analytics.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Meeting Analytics
        </Typography>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No analytics data available yet.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Analytics will appear here after you host meetings.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Meeting Analytics
      </Typography>

      <Box sx={{ mb: 4 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="meeting-select-label">Meeting</InputLabel>
          <Select
            labelId="meeting-select-label"
            id="meeting-select"
            value={selectedMeeting}
            label="Meeting"
            onChange={handleMeetingChange}
          >
            <MenuItem value="all">All Meetings</MenuItem>
            {analytics.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {new Date(a.startTime).toLocaleDateString()} - {a.participantCount} participants
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Card sx={{ flex: '1 1 30%', minWidth: '250px' }}>
          <CardHeader title="Total Meetings" />
          <CardContent>
            <Typography variant="h3" align="center">
              {filteredAnalytics.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 30%', minWidth: '250px' }}>
          <CardHeader title="Total Participants" />
          <CardContent>
            <Typography variant="h3" align="center">
              {totalParticipants}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 30%', minWidth: '250px' }}>
          <CardHeader title="Average Duration" />
          <CardContent>
            <Typography variant="h3" align="center">
              {averageDuration} min
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Meeting Statistics Table */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Meeting Statistics
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Participants</TableCell>
                <TableCell>Peak Participants</TableCell>
                <TableCell>Average Duration</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>End Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAnalytics.map((analytics) => (
                <TableRow key={analytics.id}>
                  <TableCell>{new Date(analytics.startTime).toLocaleDateString()}</TableCell>
                  <TableCell>{analytics.participantCount}</TableCell>
                  <TableCell>{analytics.peakParticipants}</TableCell>
                  <TableCell>{formatDuration(analytics.averageDuration)}</TableCell>
                  <TableCell>{new Date(analytics.startTime).toLocaleTimeString()}</TableCell>
                  <TableCell>{new Date(analytics.endTime).toLocaleTimeString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Role Distribution Table */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Participant Role Distribution
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Role</TableCell>
                <TableCell>Count</TableCell>
                <TableCell>Percentage</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(() => {
                const roles: Record<string, number> = {};
                let total = 0;
                
                filteredAnalytics.forEach((a) => {
                  a.participants.forEach((p) => {
                    roles[p.role] = (roles[p.role] || 0) + 1;
                    total++;
                  });
                });
                
                return Object.entries(roles).map(([role, count]) => (
                  <TableRow key={role}>
                    <TableCell>{role}</TableCell>
                    <TableCell>{count}</TableCell>
                    <TableCell>{total > 0 ? `${Math.round((count / total) * 100)}%` : '0%'}</TableCell>
                  </TableRow>
                ));
              })()}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Participant Details Table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Participant Details
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Join Time</TableCell>
                <TableCell>Leave Time</TableCell>
                <TableCell>Duration</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAnalytics.flatMap((a) =>
                a.participants.map((p, index) => (
                  <TableRow key={`${a.id}-${index}`}>
                    <TableCell>{p.displayName}</TableCell>
                    <TableCell>{p.role}</TableCell>
                    <TableCell>{new Date(p.joinTime).toLocaleString()}</TableCell>
                    <TableCell>
                      {p.leaveTime ? new Date(p.leaveTime).toLocaleString() : 'Still in meeting'}
                    </TableCell>
                    <TableCell>
                      {p.duration ? formatDuration(p.duration) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default MeetingAnalytics;
