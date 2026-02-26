import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { FaCertificate, FaCheck, FaTimes, FaHourglassHalf, FaUser, FaBook, FaStar, FaCalendarAlt, FaSpinner } from 'react-icons/fa';
import { certificateAPI } from '../../services/api';
import toast from 'react-hot-toast';

const IssueCertificates = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'
  const [processing, setProcessing] = useState({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      if (filter === 'pending') {
        const response = await certificateAPI.getPendingRequests();
        setPendingRequests(response.data.data || []);
      } else {
        const params = filter === 'all' ? {} : { status: filter };
        const response = await certificateAPI.getAllRequests(params);
        setAllRequests(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching certificate requests:', error);
      toast.error('Failed to load certificate requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (certificateID) => {
    try {
      setProcessing({ ...processing, [certificateID]: true });
      await certificateAPI.approveCertificate(certificateID);
      toast.success('Certificate approved successfully');
      await fetchRequests();
    } catch (error) {
      console.error('Error approving certificate:', error);
      toast.error(error.response?.data?.message || 'Failed to approve certificate');
    } finally {
      setProcessing({ ...processing, [certificateID]: false });
    }
  };

  const handleRejectClick = (certificate) => {
    setSelectedCertificate(certificate);
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!selectedCertificate) return;

    try {
      setProcessing({ ...processing, [selectedCertificate._id]: true });
      await certificateAPI.rejectCertificate(selectedCertificate._id, rejectionReason);
      toast.success('Certificate request rejected');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedCertificate(null);
      await fetchRequests();
    } catch (error) {
      console.error('Error rejecting certificate:', error);
      toast.error(error.response?.data?.message || 'Failed to reject certificate');
    } finally {
      setProcessing({ ...processing, [selectedCertificate._id]: false });
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300'
    };
    const icons = {
      pending: <FaHourglassHalf />,
      approved: <FaCheck />,
      rejected: <FaTimes />
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${badges[status]}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const requests = filter === 'pending' ? pendingRequests : allRequests;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <FaCertificate className="text-purple-600" />
            Certificate Requests
          </h1>
          <p className="text-gray-600">
            Review and approve certificate requests from students
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {['pending', 'approved', 'rejected', 'all'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === filterOption
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <FaSpinner className="animate-spin text-5xl text-purple-600" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FaCertificate className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-xl">
              No {filter !== 'all' ? filter : ''} certificate requests found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {requests.map((cert) => (
              <div
                key={cert._id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Course Image */}
                    <div className="flex-shrink-0">
                      <div className="w-full md:w-48 h-32 rounded-lg overflow-hidden bg-gradient-to-br from-purple-600 to-violet-700">
                        {cert.courseID?.courseImage ? (
                          <img
                            src={cert.courseID.courseImage}
                            alt={cert.courseID.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FaCertificate className="text-5xl text-white opacity-50" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Certificate Details */}
                    <div className="flex-grow">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-800 mb-2">
                            {cert.courseID?.title || 'Course Title'}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <FaUser className="text-purple-600" />
                              <span className="font-medium">{cert.learnerID?.FullName}</span>
                              <span className="text-gray-400">({cert.learnerID?.Email})</span>
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(cert.status)}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                          <div className="flex items-center gap-2 mb-1">
                            <FaStar className="text-green-600" />
                            <div className="text-xs text-green-700 font-medium">Final Exam Score</div>
                          </div>
                          <div className="text-2xl font-bold text-green-800">
                            {cert.averageScore?.toFixed(1)}%
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                          <div className="flex items-center gap-2 mb-1">
                            <FaCalendarAlt className="text-purple-600" />
                            <div className="text-xs text-purple-700 font-medium">Requested</div>
                          </div>
                          <div className="text-sm font-bold text-purple-800">
                            {new Date(cert.requestedAt || cert.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center gap-2 mb-1">
                            <FaCertificate className="text-gray-600" />
                            <div className="text-xs text-gray-700 font-medium">Cert Code</div>
                          </div>
                          <div className="text-xs font-mono font-bold text-gray-800 truncate">
                            {cert.certificateCode}
                          </div>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <FaBook className="text-purple-600" />
                          <span>Instructor: {cert.courseID?.owner?.FullName || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Rejection Reason (if rejected) */}
                      {cert.status === 'rejected' && cert.rejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                          <div className="text-xs text-red-700 font-medium mb-1">Rejection Reason:</div>
                          <div className="text-sm text-red-800">{cert.rejectionReason}</div>
                        </div>
                      )}

                      {/* Approval Info (if approved) */}
                      {cert.status === 'approved' && cert.issuedAt && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                          <div className="text-xs text-green-700 font-medium mb-1">Issued On:</div>
                          <div className="text-sm text-green-800">
                            {new Date(cert.issuedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                            {cert.approvedBy?.FullName && ` by ${cert.approvedBy.FullName}`}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons (only for pending) */}
                      {cert.status === 'pending' && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(cert._id)}
                            disabled={processing[cert._id]}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FaCheck />
                            {processing[cert._id] ? 'Approving...' : 'Approve Certificate'}
                          </button>
                          <button
                            onClick={() => handleRejectClick(cert)}
                            disabled={processing[cert._id]}
                            className="flex-1 bg-gradient-to-r from-red-600 to-rose-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-red-700 hover:to-rose-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FaTimes />
                            {processing[cert._id] ? 'Rejecting...' : 'Reject Request'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Reject Certificate Request</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this certificate request:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedCertificate(null);
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processing[selectedCertificate?._id]}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing[selectedCertificate?._id] ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default IssueCertificates;
