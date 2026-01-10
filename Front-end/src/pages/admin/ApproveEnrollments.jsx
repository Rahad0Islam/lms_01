import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { adminAPI, authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FaCheckCircle, FaMoneyBillWave, FaSpinner, FaUser, FaBook } from 'react-icons/fa';

const ApproveEnrollments = () => {
  const { user, updateUser } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetchPendingEnrollments();
  }, []);

  const fetchPendingEnrollments = async () => {
    try {
      const response = await adminAPI.getPendingEnrollments();
      setEnrollments(response.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pending enrollments:', error);
      toast.error('Failed to load pending enrollments');
      setLoading(false);
    }
  };

  const handleApprove = async (enrollment) => {
    const learnerName = enrollment.learnerID?.FullName || 'this student';
    if (!window.confirm(`Approve enrollment for ${learnerName}?`)) {
      return;
    }

    setApproving(true);
    try {
      await adminAPI.approveEnrollment({
        courseID: enrollment.courseID._id,
        learnerID: enrollment.learnerID._id,
        transactionID: enrollment.transactionID,
      });
      toast.success('Enrollment approved successfully!');
      
      // Fetch updated user profile to reflect balance changes
      try {
        const userResponse = await authAPI.getUserProfile(user._id);
        updateUser(userResponse.data.data);
      } catch (error) {
        console.error('Failed to update user profile:', error);
      }
      
      // Refresh the list
      fetchPendingEnrollments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve enrollment');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <FaSpinner className="animate-spin text-5xl text-primary-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Approve Enrollments
        </h1>

        {enrollments.length > 0 ? (
          <div className="space-y-4">
            {enrollments.map((enrollment) => (
              <div key={enrollment._id} className="card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      {enrollment.courseID?.courseImage && (
                        <img 
                          src={enrollment.courseID.courseImage} 
                          alt={enrollment.courseID.title}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
                          <FaBook className="mr-2 text-primary-500" />
                          {enrollment.courseID?.title || 'Unknown Course'}
                        </h3>
                        <p className="text-gray-600 flex items-center mb-2">
                          <FaUser className="mr-2 text-secondary-500" />
                          Student: {enrollment.learnerID?.FullName || 'Unknown'} 
                          <span className="text-sm text-gray-500 ml-2">
                            ({enrollment.learnerID?.Email || 'N/A'})
                          </span>
                        </p>
                        <p className="text-gray-600 flex items-center">
                          <FaMoneyBillWave className="mr-2 text-green-500" />
                          Amount: <span className="font-bold ml-1">৳{enrollment.courseID?.price || 0}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Enrolled: {new Date(enrollment.enrollAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApprove(enrollment)}
                    disabled={approving}
                    className="btn-primary disabled:opacity-50 whitespace-nowrap"
                  >
                    {approving ? (
                      <>
                        <FaSpinner className="inline mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle className="inline mr-2" />
                        Approve
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <FaCheckCircle className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-xl">No pending enrollments</p>
            <p className="text-gray-400 mt-2">All enrollments have been processed</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ApproveEnrollments;
