import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="text-xl sm:text-2xl font-bold text-primary-600">
              Impact Gift
            </Link>
          </div>

          {/* Desktop Navigation - hidden on mobile */}
          <div className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <Link to="/dashboard" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
                  Dashboard
                </Link>
                {user.charity_page_slug && (
                  <Link to={`/charity/${user.charity_page_slug}`} className="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
                    My Charity Page
                  </Link>
                )}
                <Link to="/commitments" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
                  Commitments
                </Link>
                <Link to="/profile" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
                  Profile
                </Link>
                <Link to="/create-event" className="btn btn-primary btn-sm">
                  Create Event
                </Link>
                <button onClick={handleLogout} className="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
                  Login
                </Link>
                <Link to="/signup" className="btn btn-primary btn-sm">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn-icon"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel - animated slide down */}
      <div
        className={`md:hidden border-t border-neutral-200 transition-all duration-200 overflow-hidden ${
          mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 py-4 space-y-2 bg-white">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="block px-4 py-3 rounded-lg text-neutral-900 hover:bg-neutral-100 font-medium transition-colors"
                onClick={closeMobileMenu}
              >
                Dashboard
              </Link>
              {user.charity_page_slug && (
                <Link
                  to={`/charity/${user.charity_page_slug}`}
                  className="block px-4 py-3 rounded-lg text-neutral-900 hover:bg-neutral-100 font-medium transition-colors"
                  onClick={closeMobileMenu}
                >
                  My Charity Page
                </Link>
              )}
              <Link
                to="/commitments"
                className="block px-4 py-3 rounded-lg text-neutral-900 hover:bg-neutral-100 font-medium transition-colors"
                onClick={closeMobileMenu}
              >
                Commitments
              </Link>
              <Link
                to="/profile"
                className="block px-4 py-3 rounded-lg text-neutral-900 hover:bg-neutral-100 font-medium transition-colors"
                onClick={closeMobileMenu}
              >
                Profile
              </Link>
              <Link
                to="/create-event"
                className="block btn btn-primary w-full text-center mt-2"
                onClick={closeMobileMenu}
              >
                Create Event
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-3 rounded-lg text-neutral-900 hover:bg-neutral-100 font-medium transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="block px-4 py-3 rounded-lg text-neutral-900 hover:bg-neutral-100 font-medium transition-colors"
                onClick={closeMobileMenu}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="block btn btn-primary w-full text-center"
                onClick={closeMobileMenu}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
