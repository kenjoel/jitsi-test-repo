import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  SelectChangeEvent,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { Service, ServiceRequest } from '../../types';

interface ServiceRequestFormProps {
  serviceId: string;
  onRequestSubmitted?: () => void;
}

const ServiceRequestForm: React.FC<ServiceRequestFormProps> = ({
  serviceId,
  onRequestSubmitted,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [message, setMessage] = useState<string>('');
  const [requestType, setRequestType] = useState<'now' | 'scheduled'>('now');

  useEffect(() => {
    const fetchService = async () => {
      if (!serviceId) {
        setError('Invalid service ID');
        setLoading(false);
        return;
      }

      try {
        const serviceDoc = doc(firestore, 'services', serviceId);
        const serviceSnapshot = await getDoc(serviceDoc);

        if (!serviceSnapshot.exists()) {
          setError('Service not found');
          setLoading(false);
          return;
        }

        const serviceData = serviceSnapshot.data() as Service;
        setService(serviceData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching service:', error);
        setError('Failed to load service details');
        setLoading(false);
      }
    };

    fetchService();
  }, [serviceId]);

  const handleRequestTypeChange = (event: SelectChangeEvent) => {
    setRequestType(event.target.value as 'now' | 'scheduled');
  };

  const handleDateTimeChange = (newValue: Date | null) => {
    setScheduledTime(newValue);
  };

  const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentUser || !userProfile || !service) {
      setError('You must be logged in to request a service');
      return;
    }

    if (requestType === 'scheduled' && !scheduledTime) {
      setError('Please select a scheduled time');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create service request
      const serviceRequest: Partial<ServiceRequest> = {
        serviceId,
        requesterId: currentUser.uid,
        providerId: service.providerId,
        status: 'pending',
        requestedTime: new Date(),
        scheduledTime: requestType === 'scheduled' ? scheduledTime || undefined : undefined,
        message: message || undefined,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };

      await addDoc(collection(firestore, 'serviceRequests'), serviceRequest);

      setSubmitting(false);
      setSuccess(true);
      
      // Reset form
      setMessage('');
      setScheduledTime(null);
      setRequestType('now');
      
      if (onRequestSubmitted) {
        onRequestSubmitted();
      }
    } catch (error) {
      console.error('Error submitting service request:', error);
      setError('Failed to submit service request');
      setSubmitting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !service) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Request Service
      </Typography>
      
      {service && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1">{service.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {service.description}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Price: {service.price} {service.currency}
          </Typography>
        </Box>
      )}

      <form onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="request-type-label">Request Type</InputLabel>
          <Select
            labelId="request-type-label"
            id="request-type"
            value={requestType}
            label="Request Type"
            onChange={handleRequestTypeChange}
          >
            <MenuItem value="now">Request Now</MenuItem>
            <MenuItem value="scheduled">Schedule for Later</MenuItem>
          </Select>
        </FormControl>

        {requestType === 'scheduled' && (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="Scheduled Time"
              value={scheduledTime}
              onChange={handleDateTimeChange}
              sx={{ mb: 2, width: '100%' }}
              disablePast
            />
          </LocalizationProvider>
        )}

        <TextField
          fullWidth
          id="message"
          label="Message to Service Provider"
          multiline
          rows={4}
          value={message}
          onChange={handleMessageChange}
          sx={{ mb: 3 }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={20} /> : null}
        >
          {submitting ? 'Submitting...' : 'Submit Request'}
        </Button>
      </form>

      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message="Service request submitted successfully"
      />
    </Paper>
  );
};

export default ServiceRequestForm;
