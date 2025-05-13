import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { firestore } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { Service } from '../../types';
import ServiceRequestForm from './ServiceRequestForm';

const ServiceList: React.FC = () => {
  const { userProfile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        setError(null);

        // Query active services
        const servicesQuery = query(
          collection(firestore, 'services'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        );
        const servicesSnapshot = await getDocs(servicesQuery);
        const servicesData = servicesSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Service)
        );

        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(servicesData.map((service) => service.category))
        );

        setServices(servicesData);
        setFilteredServices(servicesData);
        setCategories(uniqueCategories);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching services:', error);
        setError('Failed to load services');
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  useEffect(() => {
    // Filter services based on search term and selected category
    let filtered = services;

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (service) =>
          service.title.toLowerCase().includes(lowerCaseSearchTerm) ||
          service.description.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((service) => service.category === selectedCategory);
    }

    setFilteredServices(filtered);
  }, [searchTerm, selectedCategory, services]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  const handleRequestService = (service: Service) => {
    setSelectedService(service);
    setRequestDialogOpen(true);
  };

  const handleCloseRequestDialog = () => {
    setRequestDialogOpen(false);
  };

  const handleRequestSubmitted = () => {
    setRequestDialogOpen(false);
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
      <Typography variant="h4" gutterBottom>
        Available Services
      </Typography>

      {/* Search and Filter */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search services..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {categories.map((category) => (
            <Chip
              key={category}
              label={category}
              onClick={() => handleCategoryClick(category)}
              color={selectedCategory === category ? 'primary' : 'default'}
              variant={selectedCategory === category ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Box>

      {/* Services List */}
      {filteredServices.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No services found matching your criteria.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {filteredServices.map((service) => (
            <Card key={service.id} sx={{ width: '100%', maxWidth: 345 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {service.title}
                </Typography>
                <Chip
                  label={service.category}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {service.description}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {service.price} {service.currency}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Available: {service.availability.days.join(', ')}, {service.availability.startTime} - {service.availability.endTime}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={() => handleRequestService(service)}
                  disabled={!userProfile}
                >
                  Request Service
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Request Service Dialog */}
      <Dialog
        open={requestDialogOpen}
        onClose={handleCloseRequestDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Request Service</DialogTitle>
        <DialogContent>
          {selectedService && (
            <ServiceRequestForm
              serviceId={selectedService.id}
              onRequestSubmitted={handleRequestSubmitted}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Login Prompt */}
      {!userProfile && (
        <Paper sx={{ p: 3, mt: 4, textAlign: 'center' }}>
          <Typography variant="body1" gutterBottom>
            Please log in to request services.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            href="/login"
            sx={{ mt: 1 }}
          >
            Log In
          </Button>
        </Paper>
      )}
    </Container>
  );
};

export default ServiceList;
