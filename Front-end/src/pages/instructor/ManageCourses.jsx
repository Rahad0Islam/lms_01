import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { courseAPI, adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FaBook, FaSpinner, FaCheckCircle, FaUsers, FaUpload, FaEdit, FaEye, FaUser } from 'react-icons/fa';

const ManageCourses = () => {
  const [courses, setCourses] = useState([]);
  const [pendingEnrollments, setPendingEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' or 'enrollments'
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, enrollmentsRes] = await Promise.all([
        courseAPI.getInstructorCourses(),
        courseAPI.getInstructorPendingEnrollments()
      ]);
      
      setCourses(coursesRes.data.data || []);
      setPendingEnrollments(enrollmentsRes.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load courses');
      setLoading(false);
    }
  };

  const handleApproveEnrollment = async (enrollment) => {
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
      // Refresh the list
      fetchData();
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
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Manage Courses
        </h1>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('courses')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'courses'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaBook className="inline mr-2" />
              My Courses ({courses.length})
            </button>
            <button
              onClick={() => setActiveTab('enrollments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'enrollments'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaUsers className="inline mr-2" />
              Pending Enrollments ({pendingEnrollments.length})
            </button>
          </nav>
        </div>

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div>
            {courses.length === 0 ? (
              <div className="card text-center py-12">
                <FaBook className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-xl">No courses created yet</p>
                <button
                  onClick={() => navigate('/instructor/add-course')}
                  className="mt-4 btn-primary"
                >
                  Create Your First Course
                </button>
              </div>
            ) : (
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
                    {course.isAdminCourse && (
                      <div className="mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Admin Course - Add materials to earn
                        </span>
                      </div>
                    )}
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-primary-600 font-bold text-2xl">
                        ৳{course.price}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          course.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {course.isActive ? 'Active' : 'Pending Approval'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/course/${course._id}`)}
                        className="flex-1 btn-outline text-sm"
                      >
                        <FaEye className="inline mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/instructor/course/${course._id}/materials`)}
                        className="flex-1 btn-primary text-sm"
                      >
                        <FaUpload className="inline mr-1" />
                        Materials
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Enrollments Tab */}
        {activeTab === 'enrollments' && (
          <div>
            {pendingEnrollments.length === 0 ? (
              <div className="card text-center py-12">
                <FaCheckCircle className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-xl">No pending enrollments</p>
                <p className="text-gray-400 mt-2">All enrollments have been processed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingEnrollments.map((enrollment) => (
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
                              <span className="font-bold">৳{enrollment.courseID?.price || 0}</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              Enrolled: {new Date(enrollment.enrollAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleApproveEnrollment(enrollment)}
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
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ManageCourses;
