import React, { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Avatar,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';

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

const UserProfile: React.FC = () => {
  const { userProfile, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState<string>(userProfile?.displayName || '');
  const [photoURL, setPhotoURL] = useState<string>(userProfile?.photoURL || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName) {
      setError('Display name is required');
      return;
    }
    
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);
      
      // Update user profile
      await updateUserProfile(displayName, photoURL);
      
      setSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile) {
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

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
          <Avatar
            src={userProfile.photoURL || undefined}
            alt={userProfile.displayName}
            sx={{ width: 80, height: 80, mr: 3 }}
          >
            {userProfile.displayName?.charAt(0) || 'U'}
          </Avatar>
          <Box>
            <Typography variant="h4" gutterBottom>
              User Profile
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your account information
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="displayName"
            label="Display Name"
            name="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="normal"
            fullWidth
            id="photoURL"
            label="Profile Photo URL"
            name="photoURL"
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            disabled={loading}
            helperText="Enter a URL to an image for your profile picture"
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{ mb: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Update Profile'}
          </Button>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box>
          <Typography variant="h6" gutterBottom>
            Account Information
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1">{userProfile.email}</Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Role
            </Typography>
            <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
              {userProfile.role}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Account Created
            </Typography>
            <Typography variant="body1">
              {convertTimestamp(userProfile.createdAt)?.toLocaleDateString() || 'N/A'}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default UserProfile;
