import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../utils/api';
import { parseLocalDate } from '../utils/dateUtils';
import toast from 'react-hot-toast';

interface ReceiptData {
  id: number;
  donor_name: string;
  donor_email?: string;
  amount: number;
  message?: string;
  has_employer_match?: boolean;
  employer_name?: string;
  created_at: string;
  event_title: string;
  event_date: string;
  charity_name: string;
  charity_description: string;
  charity_website?: string;
  first_name: string;
  last_name: string;
}

const Receipt = () => {
  const { donationId } = useParams<{ donationId: string }>();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReceipt();
  }, [donationId]);

  const fetchReceipt = async () => {
    try {
      const response = await api.get<ReceiptData>(`/donations/receipt/${donationId}`);
      setReceipt(response.data);
    } catch (error) {
      toast.error('Receipt not found');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!receipt) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Receipt not found</h2>
          <p className="text-gray-600">This receipt may not exist or the donation is still processing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none">
          {/* Header */}
          <div className="text-center border-b pb-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Donation Receipt</h1>
            <p className="text-gray-600">Thank you for your generous contribution!</p>
          </div>

          {/* Receipt Details */}
          <div className="space-y-6">
            {/* Donation Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Receipt Number</p>
                <p className="font-semibold">#{receipt.id.toString().padStart(6, '0')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Date</p>
                <p className="font-semibold">{format(new Date(receipt.created_at), 'MMMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Donor Name</p>
                <p className="font-semibold">{receipt.donor_name}</p>
              </div>
              {receipt.donor_email && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <p className="font-semibold">{receipt.donor_email}</p>
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-6 text-center">
              <p className="text-sm text-primary-700 mb-1">Donation Amount</p>
              <p className="text-4xl font-bold text-primary-600">${Number(receipt.amount).toFixed(2)}</p>
              {receipt.has_employer_match && receipt.employer_name && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  💼 {receipt.employer_name} matching eligible
                </div>
              )}
            </div>

            {/* Event Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Event Details</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Event</p>
                  <p className="font-semibold">{receipt.event_title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Event Date</p>
                  <p className="font-semibold">{format(parseLocalDate(receipt.event_date), 'MMMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Organized by</p>
                  <p className="font-semibold">{receipt.first_name} {receipt.last_name}</p>
                </div>
              </div>
            </div>

            {/* Charity Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Beneficiary Charity</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Charity Name</p>
                  <p className="font-semibold">{receipt.charity_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-gray-700">{receipt.charity_description}</p>
                </div>
                {receipt.charity_website && (
                  <div>
                    <p className="text-sm text-gray-500">Website</p>
                    <a href={receipt.charity_website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                      {receipt.charity_website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Message */}
            {receipt.message && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Your Message</h3>
                <p className="text-gray-700 italic bg-gray-50 p-4 rounded-lg">"{receipt.message}"</p>
              </div>
            )}

            {/* Tax Notice */}
            <div className="border-t pt-6">
              <p className="text-xs text-gray-500">
                <strong>Tax Deduction Notice:</strong> This receipt serves as a record of your charitable contribution.
                Please consult with a tax professional regarding the deductibility of this donation. Impact Gift is a
                fundraising platform and does not provide tax advice. Donations are made directly to the beneficiary charity.
              </p>
            </div>
          </div>

          {/* Print Button */}
          <div className="mt-8 text-center print:hidden">
            <button
              onClick={handlePrint}
              className="btn btn-primary px-8"
            >
              🖨️ Print Receipt
            </button>
            <p className="text-sm text-gray-500 mt-4">
              Please save or print this receipt for your records
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Receipt;
