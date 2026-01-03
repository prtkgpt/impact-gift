import { useState, useEffect } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, isPast } from 'date-fns';

interface EventCountdownProps {
  eventDate: string;
  eventTitle: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const EventCountdown: React.FC<EventCountdownProps> = ({ eventDate, eventTitle }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isEventPast, setIsEventPast] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const eventDateTime = new Date(eventDate);
      const now = new Date();

      if (isPast(eventDateTime)) {
        setIsEventPast(true);
        return;
      }

      const totalSeconds = differenceInSeconds(eventDateTime, now);
      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [eventDate]);

  if (isEventPast) {
    return (
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg p-6 text-center">
        <h3 className="text-xl font-bold text-gray-700 mb-2">Event Has Passed</h3>
        <p className="text-gray-600">Thank you to everyone who contributed!</p>
        <p className="text-sm text-gray-500 mt-2">Donations are still accepted</p>
      </div>
    );
  }

  const isUrgent = timeLeft.days === 0;
  const isVerySoon = timeLeft.days <= 3;

  return (
    <div className={`rounded-lg p-6 ${
      isUrgent
        ? 'bg-gradient-to-r from-red-500 to-orange-500'
        : isVerySoon
        ? 'bg-gradient-to-r from-orange-400 to-yellow-400'
        : 'bg-gradient-to-r from-primary-500 to-primary-700'
    } text-white shadow-lg`}>
      <h3 className="text-lg font-bold mb-4 text-center">
        {isUrgent ? '🔥 Event is TODAY!' : isVerySoon ? '⚡ Event Coming Soon!' : '📅 Time Until Event'}
      </h3>

      <div className="grid grid-cols-4 gap-3">
        <div className="text-center">
          <div className="bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-3xl font-bold">{timeLeft.days}</div>
            <div className="text-xs uppercase mt-1 opacity-90">Day{timeLeft.days !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div className="text-center">
          <div className="bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-3xl font-bold">{timeLeft.hours}</div>
            <div className="text-xs uppercase mt-1 opacity-90">Hour{timeLeft.hours !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div className="text-center">
          <div className="bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-3xl font-bold">{timeLeft.minutes}</div>
            <div className="text-xs uppercase mt-1 opacity-90">Min{timeLeft.minutes !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div className="text-center">
          <div className="bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-3xl font-bold">{timeLeft.seconds}</div>
            <div className="text-xs uppercase mt-1 opacity-90">Sec{timeLeft.seconds !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      {isUrgent && (
        <p className="text-center mt-4 font-bold text-sm animate-pulse">
          Last chance to donate before the event!
        </p>
      )}

      {isVerySoon && !isUrgent && (
        <p className="text-center mt-4 text-sm">
          Make your donation count before the big day!
        </p>
      )}
    </div>
  );
};

export default EventCountdown;
