import React, { useState, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import useJitsi from '../../hooks/useJitsi';
import { startRecording, stopRecording } from '../../services/jitsi';
import { useAuth } from '../../context/AuthContext';

interface JitsiContainerProps {
  roomName: string;
  isHost?: boolean;
  onMeetingEnd?: () => void;
}

const JitsiContainer: React.FC<JitsiContainerProps> = ({
  roomName,
  isHost = false,
  onMeetingEnd,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const { userProfile } = useAuth();

  // Handle participant joined event
  const handleParticipantJoined = useCallback((participant: any) => {
    console.log('Participant joined:', participant);
    setParticipants((prev) => [...prev, participant]);
  }, []);

  // Handle participant left event
  const handleParticipantLeft = useCallback((participant: any) => {
    console.log('Participant left:', participant);
    setParticipants((prev) => prev.filter((p) => p.id !== participant.id));
  }, []);

  // Handle video conference joined event
  const handleVideoConferenceJoined = useCallback((participant: any) => {
    console.log('Video conference joined:', participant);
  }, []);

  // Handle video conference left event
  const handleVideoConferenceLeft = useCallback(() => {
    console.log('Video conference left');
    if (onMeetingEnd) {
      onMeetingEnd();
    }
  }, [onMeetingEnd]);

  // Initialize Jitsi
  const { jitsiAPI, isLoading, error, containerRef } = useJitsi({
    roomName,
    isHost,
    onParticipantJoined: handleParticipantJoined,
    onParticipantLeft: handleParticipantLeft,
    onVideoConferenceJoined: handleVideoConferenceJoined,
    onVideoConferenceLeft: handleVideoConferenceLeft,
  });

  // Handle recording start
  const handleStartRecording = async () => {
    if (!jitsiAPI) return;

    try {
      setRecordingError(null);
      await startRecording(jitsiAPI);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setRecordingError(
        error instanceof Error ? error.message : 'Failed to start recording'
      );
    }
  };

  // Handle recording stop
  const handleStopRecording = async () => {
    if (!jitsiAPI) return;

    try {
      setRecordingError(null);
      await stopRecording(jitsiAPI);
      setIsRecording(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
      setRecordingError(
        error instanceof Error ? error.message : 'Failed to stop recording'
      );
    }
  };

  // Handle meeting end
  const handleEndMeeting = () => {
    if (jitsiAPI) {
      jitsiAPI.executeCommand('hangup');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* DEBUG INFO */}
      <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Debug Info:</strong><br />
          roomName: {roomName}<br />
          isHost: {String(isHost)}<br />
          isLoading: {String(isLoading)}<br />
          error: {error ? error.message : 'none'}<br />
          userProfile: {userProfile ? JSON.stringify(userProfile) : 'none'}
        </Typography>
      </Box>
      {/* Meeting controls */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6">{roomName}</Typography>
        <Box>
          {isHost && (
            <>
              {isRecording ? (
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleStopRecording}
                  sx={{ mr: 1 }}
                >
                  Stop Recording
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleStartRecording}
                  sx={{ mr: 1 }}
                >
                  Start Recording
                </Button>
              )}
            </>
          )}
          <Button variant="outlined" color="error" onClick={handleEndMeeting}>
            End Meeting
          </Button>
        </Box>
      </Box>

      {/* Recording error alert */}
      {recordingError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {recordingError}
        </Alert>
      )}

      {/* Jitsi container */}
      {isLoading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexGrow: 1,
          }}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexGrow: 1,
          }}
        >
          <Alert severity="error">
            {error.message || 'Failed to load meeting room'}
          </Alert>
        </Box>
      ) : (
        <Box
          ref={containerRef}
          sx={{
            flexGrow: 1,
            '& iframe': {
              width: '100%',
              height: '100%',
              border: 'none',
            },
          }}
        />
      )}

      {/* Participants list */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle1">
          Participants ({participants.length + (userProfile ? 1 : 0)})
        </Typography>
        {userProfile && (
          <Typography variant="body2">
            {userProfile.displayName} (You)
            {isHost ? ' - Host' : ''}
          </Typography>
        )}
        {participants.map((participant) => (
          <Typography key={participant.id} variant="body2">
            {participant.displayName}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

export default JitsiContainer;
