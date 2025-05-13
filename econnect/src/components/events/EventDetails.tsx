import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Event as EventIcon,
  AccessTime as AccessTimeIcon,
  People as PeopleIcon,
  VideoCall as VideoCallIcon,
} from "@mui/icons-material";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { Event, User } from "../../types";

const EventDetails: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isParticipant, setIsParticipant] = useState<boolean>(false);
  const [isHost, setIsHost] = useState<boolean>(false);

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
        const eventDoc = doc(firestore, "events", eventId);
        const eventSnapshot = await getDoc(eventDoc);

        if (!eventSnapshot.exists()) {
          setError("Event not found");
          setLoading(false);
          return;
        }

        const eventData = eventSnapshot.data() as Event;
        // Normalize Firestore Timestamp to JS Date or ISO string
        const normalizeDate = (d: any) =>
          d && typeof d.toDate === "function" ? d.toDate().toISOString() : d;
        setEvent({
          ...eventData,
          startTime: normalizeDate(eventData.startTime),
          endTime: normalizeDate(eventData.endTime),
        });

        // Check if user is a participant
        setIsParticipant(eventData.participants.includes(userProfile.id));

        // Check if user is the host
        setIsHost(eventData.createdBy === userProfile.id);

        // Fetch participant details
        const participantPromises = eventData.participants.map(
          async (userId) => {
            const userDoc = doc(firestore, "users", userId);
            const userSnapshot = await getDoc(userDoc);
            return userSnapshot.exists() ? (userSnapshot.data() as User) : null;
          }
        );

        const participantData = await Promise.all(participantPromises);
        setParticipants(
          participantData.filter((user): user is User => user !== null)
        );

        setLoading(false);
      } catch (error) {
        console.error("Error fetching event details:", error);
        setError("Failed to load event details");
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId, userProfile]);

  const handleJoinEvent = async () => {
    if (!event || !userProfile || !eventId) return;

    try {
      // Add user to participants
      await updateDoc(doc(firestore, "events", eventId), {
        participants: arrayUnion(userProfile.id),
        updatedAt: serverTimestamp(),
      });

      setIsParticipant(true);
      setEvent({
        ...event,
        participants: [...event.participants, userProfile.id],
      });
    } catch (error) {
      console.error("Error joining event:", error);
      setError("Failed to join event");
    }
  };

  const handleLeaveEvent = async () => {
    if (!event || !userProfile || !eventId) return;

    try {
      // Remove user from participants
      await updateDoc(doc(firestore, "events", eventId), {
        participants: arrayRemove(userProfile.id),
        updatedAt: serverTimestamp(),
      });

      setIsParticipant(false);
      setEvent({
        ...event,
        participants: event.participants.filter((id) => id !== userProfile.id),
      });
    } catch (error) {
      console.error("Error leaving event:", error);
      setError("Failed to leave event");
    }
  };

  const handleJoinMeeting = () => {
    if (!event) return;
    navigate(`/meetings/${event.jitsiRoomName}`);
  };

  const handleJoinVirtualSpace = () => {
    if (!eventId) return;
    navigate(`/virtual-space/${eventId}`);
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
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error || "Failed to load event details"}
      </Alert>
    );
  }

  const eventStarted = new Date() >= new Date(event.startTime);
  const eventEnded = new Date() >= new Date(event.endTime);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            {event.title}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <EventIcon sx={{ mr: 1 }} color="action" />
            <Typography variant="body1">{formatEventDate(event)}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <PeopleIcon sx={{ mr: 1 }} color="action" />
            <Typography variant="body1">
              {event.participants.length} participants
              {event.maxParticipants && ` (max: ${event.maxParticipants})`}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
            {isHost && <Chip label="You are the host" color="primary" />}
            {event.isPublic ? (
              <Chip label="Public Event" color="success" />
            ) : (
              <Chip label="Private Event" color="default" />
            )}
          </Box>
          <Typography variant="body1">{event.description}</Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Event Actions
          </Typography>
          {/* DEBUG INFO */}
          <Box sx={{ mb: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Debug Info:</strong>
              <br />
              event.startTime: {String(event.startTime)}
              <br />
              event.endTime: {String(event.endTime)}
              <br />
              isParticipant: {String(isParticipant)}
              <br />
              eventStarted: {String(eventStarted)}
              <br />
              eventEnded: {String(eventEnded)}
              <br />
              userProfile.id: {userProfile?.id}
              <br />
              event.participants: {event.participants.join(", ")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            {!isParticipant && !eventEnded && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleJoinEvent}
              >
                Join Event
              </Button>
            )}
            {isParticipant && !eventEnded && (
              <>
                {eventStarted && (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleJoinMeeting}
                    >
                      Join Meeting
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={handleJoinVirtualSpace}
                    >
                      Join Virtual Space
                    </Button>
                  </>
                )}
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleLeaveEvent}
                >
                  Leave Event
                </Button>
              </>
            )}
            {eventEnded && (
              <Typography variant="body1" color="text.secondary">
                This event has ended
              </Typography>
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box>
          <Typography variant="h6" gutterBottom>
            Participants ({participants.length})
          </Typography>
          <List>
            {participants.map((participant) => (
              <ListItem key={participant.id}>
                <ListItemAvatar>
                  <Avatar src={participant.photoURL || undefined}>
                    {participant.displayName.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={participant.displayName}
                  secondary={
                    participant.id === event.createdBy ? "Host" : "Participant"
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Paper>
    </Container>
  );
};

export default EventDetails;
