import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';

// Layout Components
import Layout from './components/common/Layout';

// Dashboard Components
import Dashboard from './components/dashboard/Dashboard';
import UserProfile from './components/dashboard/UserProfile';

// Event Components
import EventList from './components/events/EventList';
import EventDetails from './components/events/EventDetails';
import EventCreation from './components/events/EventCreation';

// Meeting Components
import MeetingRoom from './components/meetings/MeetingRoom';

// Virtual Space Components
import VirtualSpace from './components/virtualSpace/VirtualSpace';

// Service Components
import ServiceList from './components/services/ServiceList';
// import ServiceDetails from './components/services/ServiceDetails';
import ServiceRequest from './components/services/ServiceCreation';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if user is authenticated
  const isAuthenticated = localStorage.getItem('user') !== null;
  
  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

// Theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              {/* Dashboard Routes */}
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<UserProfile />} />
              
              {/* Event Routes */}
              <Route path="events" element={<EventList />} />
              <Route path="events/create" element={<EventCreation />} />
              <Route path="events/:eventId" element={<EventDetails />} />
              
              {/* Meeting Routes */}
              <Route path="meetings/:meetingId" element={<MeetingRoom />} />
              
              {/* Virtual Space Routes */}
              <Route path="virtual-space" element={<VirtualSpace />} />
              <Route path="virtual-space/:eventId" element={<VirtualSpace />} />
              
              {/* Service Routes */}
              <Route path="services" element={<ServiceList />} />
              {/* <Route path="services/:serviceId" element={<ServiceDetails />} /> */}
              <Route path="services/request" element={<ServiceRequest />} />
            </Route>
            
            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
