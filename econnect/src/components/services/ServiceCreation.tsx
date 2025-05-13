import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  CircularProgress,
  Alert,
  Snackbar,
  SelectChangeEvent,
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { Service } from '../../types';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const CATEGORIES = [
  'Consulting',
  'Design',
  'Development',
  'Marketing',
  'Writing',
  'Translation',
  'Tutoring',
  'Other',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'];

const ServiceCreation: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(
    new Date(new Date().setHours(9, 0, 0, 0))
  );
  const [endTime, setEndTime] = useState<Date | null>(
    new Date(new Date().setHours(17, 0, 0, 0))
  );
  const [isActive, setIsActive] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(event.target.value);
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value);
  };

  const handlePriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and decimal point
    const value = event.target.value.replace(/[^0-9.]/g, '');
    setPrice(value);
  };

  const handleCurrencyChange = (event: SelectChangeEvent) => {
    setCurrency(event.target.value);
  };

  const handleDayToggle = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day]
    );
  };

  const handleStartTimeChange = (newValue: Date | null) => {
    setStartTime(newValue);
  };

  const handleEndTimeChange = (newValue: Date | null) => {
    setEndTime(newValue);
  };

  const handleActiveChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsActive(event.target.checked);
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentUser || !userProfile) {
      setError('You must be logged in to create a service');
      return;
    }

    if (!title || !description || !category || !price || selectedDays.length === 0 || !startTime || !endTime) {
      setError('Please fill in all required fields');
      return;
    }

    if (startTime && endTime && startTime >= endTime) {
      setError('Start time must be before end time');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create service
      const serviceData: Partial<Service> = {
        providerId: currentUser.uid,
        title,
        description,
        category,
        price: parseFloat(price),
        currency,
        availability: {
          days: selectedDays,
          startTime: formatTime(startTime),
          endTime: formatTime(endTime),
        },
        isActive,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };

      await addDoc(collection(firestore, 'services'), serviceData);

      setSubmitting(false);
      setSuccess(true);
      
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('');
      setPrice('');
      setCurrency('USD');
      setSelectedDays([]);
      setStartTime(new Date(new Date().setHours(9, 0, 0, 0)));
      setEndTime(new Date(new Date().setHours(17, 0, 0, 0)));
      setIsActive(true);
    } catch (error) {
      console.error('Error creating service:', error);
      setError('Failed to create service');
      setSubmitting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(false);
  };

  // Check if user is a service provider
  if (userProfile && userProfile.role !== 'service-provider' && userProfile.role !== 'admin') {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">
          You need to be registered as a service provider to create services.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Create a New Service
      </Typography>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Service Title"
            value={title}
            onChange={handleTitleChange}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={handleDescriptionChange}
            margin="normal"
            multiline
            rows={4}
            required
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel id="category-label">Category</InputLabel>
            <Select
              labelId="category-label"
              id="category"
              value={category}
              label="Category"
              onChange={handleCategoryChange}
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              label="Price"
              value={price}
              onChange={handlePriceChange}
              margin="normal"
              required
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />

            <FormControl sx={{ flex: 1, mt: 2 }} required>
              <InputLabel id="currency-label">Currency</InputLabel>
              <Select
                labelId="currency-label"
                id="currency"
                value={currency}
                label="Currency"
                onChange={handleCurrencyChange}
              >
                {CURRENCIES.map((curr) => (
                  <MenuItem key={curr} value={curr}>
                    {curr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Availability
          </Typography>

          <FormGroup row sx={{ mb: 2 }}>
            {DAYS_OF_WEEK.map((day) => (
              <FormControlLabel
                key={day}
                control={
                  <Checkbox
                    checked={selectedDays.includes(day)}
                    onChange={() => handleDayToggle(day)}
                  />
                }
                label={day}
              />
            ))}
          </FormGroup>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TimePicker
                label="Start Time"
                value={startTime}
                onChange={handleStartTimeChange}
                sx={{ flex: 1 }}
              />
              <TimePicker
                label="End Time"
                value={endTime}
                onChange={handleEndTimeChange}
                sx={{ flex: 1 }}
              />
            </Box>
          </LocalizationProvider>

          <FormControlLabel
            control={
              <Checkbox
                checked={isActive}
                onChange={handleActiveChange}
              />
            }
            label="Service is active and available for booking"
            sx={{ mt: 2 }}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={submitting}
            sx={{ mt: 3 }}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {submitting ? 'Creating...' : 'Create Service'}
          </Button>
        </form>
      </Paper>

      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message="Service created successfully"
      />
    </Container>
  );
};

export default ServiceCreation;
