import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Turn Celebrations into Impact
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Instead of receiving gifts you don't need, invite your friends and family to donate
            to the causes you care about. Make your birthday, wedding, or any celebration
            meaningful.
          </p>

          <div className="flex justify-center gap-4 mb-16">
            {user ? (
              <Link to="/create-event" className="btn btn-primary text-lg px-8 py-3">
                Create Your Event
              </Link>
            ) : (
              <>
                <Link to="/signup" className="btn btn-primary text-lg px-8 py-3">
                  Get Started
                </Link>
                <Link to="/login" className="btn btn-secondary text-lg px-8 py-3">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="card text-center">
            <div className="text-4xl mb-4">🎂</div>
            <h3 className="text-xl font-bold mb-2">Create an Event</h3>
            <p className="text-gray-600">
              Set up your birthday, wedding, or any celebration in minutes. Choose the charity
              you want to support.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">💝</div>
            <h3 className="text-xl font-bold mb-2">Share with Friends</h3>
            <p className="text-gray-600">
              Get a unique link to share with friends and family. They can donate instead of
              buying gifts.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">🌟</div>
            <h3 className="text-xl font-bold mb-2">Make an Impact</h3>
            <p className="text-gray-600">
              Watch the donations grow and know you're making a real difference in the world.
            </p>
          </div>
        </div>

        <div className="mt-16 bg-primary-50 rounded-lg p-8">
          <h2 className="text-3xl font-bold text-center mb-8">Why Impact Gift?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-lg mb-2">For You</h3>
              <ul className="space-y-2 text-gray-700">
                <li>✓ No more unwanted gifts cluttering your home</li>
                <li>✓ Support causes that matter to you</li>
                <li>✓ Easy to set up and share</li>
                <li>✓ Track donations and thank donors</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">For Your Friends</h3>
              <ul className="space-y-2 text-gray-700">
                <li>✓ Know exactly what you want</li>
                <li>✓ Make a meaningful contribution</li>
                <li>✓ No stress about choosing the perfect gift</li>
                <li>✓ Quick and easy donation process</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
