import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import CreateEvent from './pages/CreateEvent';
import EditEvent from './pages/EditEvent';
import EventPage from './pages/EventPage';
import Receipt from './pages/Receipt';
import Profile from './pages/Profile';
import ManageEvent from './pages/ManageEvent';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Toaster position="top-right" />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-event"
                element={
                  <PrivateRoute>
                    <CreateEvent />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
              <Route path="/event/:slug" element={<EventPage />} />
              <Route
                path="/event/:slug/manage"
                element={
                  <PrivateRoute>
                    <ManageEvent />
                  </PrivateRoute>
                }
              />
              <Route
                path="/event/:slug/edit"
                element={
                  <PrivateRoute>
                    <EditEvent />
                  </PrivateRoute>
                }
              />
              <Route path="/receipt/:donationId" element={<Receipt />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
