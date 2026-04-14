import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';

// Eagerly load critical pages for optimal performance
import EventPage from './pages/EventPage';
import PublicCharityPage from './pages/PublicCharityPage';
import Dashboard from './pages/Dashboard';
import ManageEvent from './pages/ManageEvent';
import MyCommitments from './pages/MyCommitments';

// Lazy load less critical pages
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const CreateEvent = lazy(() => import('./pages/CreateEvent'));
const Receipt = lazy(() => import('./pages/Receipt'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminCharityRequests = lazy(() => import('./pages/AdminCharityRequests'));
const AcceptCoHostInvitation = lazy(() => import('./pages/AcceptCoHostInvitation'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
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
            <Suspense fallback={
              <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading...</p>
                </div>
              </div>
            }>
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
              <Route
                path="/commitments"
                element={
                  <PrivateRoute>
                    <MyCommitments />
                  </PrivateRoute>
                }
              />
              <Route path="/events/:slug/co-host/accept" element={<AcceptCoHostInvitation />} />
              <Route path="/event/:slug" element={<EventPage />} />
              <Route
                path="/event/:slug/manage"
                element={
                  <PrivateRoute>
                    <ManageEvent />
                  </PrivateRoute>
                }
              />
              <Route path="/receipt/:donationId" element={<Receipt />} />
              <Route path="/charity/:slug" element={<PublicCharityPage />} />
              <Route
                path="/admin/charity-requests"
                element={
                  <PrivateRoute>
                    <AdminCharityRequests />
                  </PrivateRoute>
                }
              />
              {/* 404 Catch-all route - must be last */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </div>
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
