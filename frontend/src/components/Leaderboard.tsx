import { Donation, Event } from '../types';
import { format, differenceInDays } from 'date-fns';

interface LeaderboardProps {
  donations: Donation[];
  event: Event;
}

interface Badge {
  icon: string;
  label: string;
  color: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ donations, event }) => {
  const getBadges = (donation: Donation, index: number): Badge[] => {
    const badges: Badge[] = [];

    // Ranking badges
    if (index === 0 && donations.length > 0) {
      badges.push({ icon: '🏆', label: 'Top Donor', color: 'bg-yellow-100 text-yellow-800' });
    } else if (index === 1) {
      badges.push({ icon: '🥈', label: '2nd Place', color: 'bg-gray-100 text-gray-800' });
    } else if (index === 2) {
      badges.push({ icon: '🥉', label: '3rd Place', color: 'bg-orange-100 text-orange-800' });
    }

    // First donor badge
    if (index === donations.length - 1) {
      badges.push({ icon: '⭐', label: 'First Supporter', color: 'bg-blue-100 text-blue-800' });
    }

    // Early bird badge - donated in first 24 hours
    const eventCreated = new Date(event.created_at || event.event_date);
    const donationDate = new Date(donation.created_at);
    const daysSinceEvent = differenceInDays(donationDate, eventCreated);

    if (daysSinceEvent <= 1 && donations.length > 3) {
      badges.push({ icon: '🐦', label: 'Early Bird', color: 'bg-purple-100 text-purple-800' });
    }

    // Generous donor badge - $100+
    if (Number(donation.amount) >= 100) {
      badges.push({ icon: '💎', label: 'Generous Donor', color: 'bg-indigo-100 text-indigo-800' });
    }

    // Super supporter - $250+
    if (Number(donation.amount) >= 250) {
      badges.push({ icon: '⚡', label: 'Super Supporter', color: 'bg-pink-100 text-pink-800' });
    }

    // Employer match badge
    if (donation.has_employer_match) {
      badges.push({ icon: '💼', label: 'Employer Match', color: 'bg-green-100 text-green-800' });
    }

    return badges;
  };

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  if (donations.length === 0) {
    return (
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">🏆 Top Donors</h2>
        <p className="text-gray-600 text-center py-8">Be the first to donate and claim the top spot!</p>
      </div>
    );
  }

  const topDonors = donations.slice(0, 10);

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6">🏆 Leaderboard</h2>

      <div className="space-y-3">
        {topDonors.map((donation, index) => {
          const badges = getBadges(donation, index);
          const isTopThree = index < 3;

          return (
            <div
              key={donation.id}
              className={`relative rounded-lg p-4 transition-all ${
                isTopThree
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 shadow-md'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Rank */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                    isTopThree
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg'
                      : 'bg-white text-gray-600 border-2 border-gray-300'
                  }`}
                >
                  {getMedalEmoji(index)}
                </div>

                {/* Donor info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h3 className={`font-bold ${isTopThree ? 'text-lg' : 'text-base'}`}>
                        {donation.donor_name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {format(new Date(donation.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${isTopThree ? 'text-2xl' : 'text-xl'} text-primary-600`}>
                        ${Number(donation.amount).toFixed(2)}
                      </div>
                      {donation.has_employer_match && (
                        <p className="text-xs text-green-600 font-medium">
                          +${Number(donation.amount).toFixed(2)} match
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {badges.map((badge, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
                        >
                          <span>{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Message */}
                  {donation.message && (
                    <p className="text-sm text-gray-700 italic bg-white bg-opacity-50 p-2 rounded">
                      "{donation.message}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {donations.length > 10 && (
        <p className="text-center text-gray-500 text-sm mt-4">
          Showing top 10 of {donations.length} donors
        </p>
      )}

      {/* Milestones */}
      {event.goal_amount && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-bold text-gray-700 mb-3">🎯 Milestone Progress</h3>
          <div className="space-y-2">
            {[25, 50, 75, 100].map((percent) => {
              const milestoneAmount = (Number(event.goal_amount) * percent) / 100;
              const currentAmount = Number(event.total_raised || 0);
              const achieved = currentAmount >= milestoneAmount;

              return (
                <div key={percent} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    achieved ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {achieved ? '✓' : percent}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">
                      <span className={achieved ? 'text-green-700 font-medium' : 'text-gray-600'}>
                        {percent}% - ${Number(milestoneAmount).toFixed(2)}
                      </span>
                      {achieved && <span className="ml-2 text-green-600">🎉 Achieved!</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
