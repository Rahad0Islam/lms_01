import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { adminAPI, courseAPI, authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FaCheckCircle, FaMoneyBillWave, FaSpinner } from 'react-icons/fa';

const ApproveCourses = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    fetchPendingCourses();
  }, []);

  const fetchPendingCourses = async () => {
    try {
      const response = await courseAPI.getPendingCourses();
      setCourses(response.data.data || []);
      setFetchLoading(false);
    } catch (error) {
      console.error('Error fetching pending courses:', error);
      toast.error('Failed to load pending courses');
      setFetchLoading(false);
    }
  };

  const handleApprove = async (course) => {
    const payment = prompt('Enter course launch payment amount:');
    if (!payment || parseFloat(payment) <= 0) {
      toast.error('Invalid payment amount');
      return;
    }

    setLoading(true);
    try {
      await adminAPI.approveCourse({
        courseID: course._id,
        courseLanchPayment: parseFloat(payment),
      });
      toast.success('Course approved successfully!');
      
      // Fetch updated user profile to reflect balance changes
      try {
        const userResponse = await authAPI.getUserProfile(user._id);
        updateUser(userResponse.data.data);
      } catch (error) {
        console.error('Failed to update user profile:', error);
      }
      
      // Refresh the list
      fetchPendingCourses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve course');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
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
          Approve Courses
        </h1>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course) => (
              <div key={course._id} className="card">
                <img
                  src={course.courseImage}
                  alt={course.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {course.title}
                </h3>
                <p className="text-gray-600 mb-4">{course.description}</p>
                <p className="text-primary-600 font-bold text-xl mb-2">
                  ৳{course.price}
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  Instructor: {course.owner?.FullName || 'Unknown'}
                </p>
                <button
                  onClick={() => handleApprove(course)}
                  disabled={loading}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {loading ? (
                    <FaSpinner className="inline mr-2 animate-spin" />
                  ) : (
                    <FaCheckCircle className="inline mr-2" />
                  )}
                  Approve & Pay Instructor
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-500 text-xl">No pending courses</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ApproveCourses;
