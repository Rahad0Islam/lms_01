import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { courseAPI, certificateAPI, authAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  FaBook,
  FaClock,
  FaUsers,
  FaMoneyBillWave,
  FaStar,
  FaCheckCircle,
  FaLock,
  FaCertificate,
} from 'react-icons/fa';

const CourseDetail = () => {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [review, setReview] = useState('');
  const [certificateEligibility, setCertificateEligibility] = useState(null);
  const [generatingCertificate, setGeneratingCertificate] = useState(false);

  const ADMIN_ID = '693a58d93cb728332626f9a2'; // From constant.js in backend

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const response = await courseAPI.getCourseById(id);
      const data = response.data.data;
      
      setCourse(data.course);
      setEnrollmentStatus(data.enrollmentStatus);
      
      // Fetch user's rating if enrolled
      if (data.enrollmentStatus?.paymentStatus === 'paid' && user?.Role === 'learner') {
        try {
          const ratingRes = await courseAPI.getCourseRating(id);
          if (ratingRes.data.data) {
            setUserRating(ratingRes.data.data.rating);
            setReview(ratingRes.data.data.review || '');
          }
        } catch (err) {
          // No rating yet, that's fine
        }

        // Check certificate eligibility
        try {
          const certRes = await certificateAPI.checkEligibility(id);
          setCertificateEligibility(certRes.data.data);
        } catch (err) {
          console.error('Error checking certificate eligibility:', err);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error(error.response?.data?.message || 'Failed to load course');
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user?.accountNumber) {
      toast.error('Please set up your bank account first');
      navigate('/bank-setup');
      return;
    }

    if (user?.balance < course.price) {
      toast.error('Insufficient balance. Please add funds to your account.');
      navigate('/bank-setup');
      return;
    }

    setShowEnrollModal(true);
  };

  const confirmEnroll = async (e) => {
    e.preventDefault();
    setEnrolling(true);

    try {
      await courseAPI.enrollCourse({
        courseID: course._id,
        price: course.price,
        adminID: ADMIN_ID,
        secretKey: secretKey,
      });

      toast.success('Enrollment request submitted! Waiting for admin approval.');
      setShowEnrollModal(false);
      setSecretKey('');
      
      // Fetch updated user profile to reflect the new balance
      try {
        const userResponse = await authAPI.getUserProfile(user._id);
        updateUser(userResponse.data.data);
      } catch (error) {
        console.error('Failed to update user profile:', error);
      }
      
      // Navigate to my courses after a delay
      setTimeout(() => {
        navigate('/my-courses');
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (userRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      await courseAPI.rateCourse({
        courseID: id,
        rating: userRating,
        review: review
      });
      toast.success('Rating submitted successfully!');
      setShowRatingModal(false);
      fetchCourse(); // Refresh to get updated average rating
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit rating');
    }
  };

  const handleGenerateCertificate = async () => {
    setGeneratingCertificate(true);
    try {
      const response = await certificateAPI.generateCertificate({ courseID: id });
      const certificate = response.data.data;
      toast.success('Certificate generated successfully!');
      navigate(`/certificate/${certificate._id}`);
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error(error.response?.data?.message || 'Failed to generate certificate');
    } finally {
      setGeneratingCertificate(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="text-center py-16">
          <p className="text-gray-500 text-xl">Course not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Course Header */}
        <div className="card mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image */}
            <div className="relative h-80 rounded-lg overflow-hidden">
              <img
                src={course.courseImage}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-gray-900">{course.title}</h1>
              
              <p className="text-gray-600 text-lg">{course.description}</p>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <FaUsers className="mr-2 text-primary-500" />
                  <span>{course.totalEnrolled || 0} students enrolled</span>
                </div>
                <div className="flex items-center text-gray-600">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      className={`${
                        star <= Math.round(course.averageRating || 5)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2">
                    {(course.averageRating || 5).toFixed(1)} 
                    {course.totalRatings === 0 && ' (Default)'}
                    {course.totalRatings > 0 && ` (${course.totalRatings} rating${course.totalRatings > 1 ? 's' : ''})`}
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <FaClock className="mr-2 text-primary-500" />
                  <span>Self-paced</span>
                </div>
              </div>

              {/* Instructor Info */}
              {course.owner && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600">
                    Instructor: <span className="font-semibold text-gray-900">{course.owner.FullName}</span>
                  </p>
                </div>
              )}

              {/* Price */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl font-bold text-primary-600 flex items-center">
                    <FaMoneyBillWave className="mr-3" />
                    ৳{course.price}
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full font-semibold ${
                      course.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {course.isActive ? 'Available' : 'Pending'}
                  </span>
                </div>

                {/* Enrollment Status and Actions */}
                {user?.Role === 'learner' && course.isActive && (
                  <>
                    {enrollmentStatus?.isEnrolled ? (
                      <div className="space-y-3">
                        {enrollmentStatus.paymentStatus === 'pending' && (
                          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                            <p className="text-yellow-800 font-semibold">
                              ⏳ Enrollment Pending
                            </p>
                            <p className="text-yellow-600 text-sm mt-1">
                              Waiting for admin approval to access course materials
                            </p>
                          </div>
                        )}
                        {enrollmentStatus.paymentStatus === 'paid' && (
                          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                            <p className="text-green-800 font-semibold flex items-center">
                              <FaCheckCircle className="mr-2" />
                              ✓ Enrolled - Access Granted
                            </p>
                            <p className="text-green-600 text-sm mt-1">
                              Progress: {enrollmentStatus.progress}%
                            </p>
                            <button 
                              onClick={() => navigate(`/course/${id}/learn`)}
                              className="mt-3 w-full btn-primary"
                            >
                              <FaBook className="inline mr-2" />
                              Continue Learning
                            </button>
                            <button 
                              onClick={() => setShowRatingModal(true)}
                              className="mt-2 w-full btn-secondary border-2 border-primary-500 text-primary-600 hover:bg-primary-50"
                            >
                              <FaStar className="inline mr-2" />
                              Rate this Course
                            </button>

                            {/* Certificate Section */}
                            {certificateEligibility && (
                              <div className="mt-4">
                                {certificateEligibility.certificateIssued ? (
                                  <button
                                    onClick={() => navigate(`/certificate/${certificateEligibility.certificate._id}`)}
                                    className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-semibold py-3 rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all shadow-lg"
                                  >
                                    <FaCertificate className="inline mr-2" />
                                    View Certificate
                                  </button>
                                ) : certificateEligibility.eligible ? (
                                  <button
                                    onClick={handleGenerateCertificate}
                                    disabled={generatingCertificate}
                                    className="w-full bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold py-3 rounded-lg hover:from-green-500 hover:to-green-700 transition-all shadow-lg disabled:opacity-50"
                                  >
                                    <FaCertificate className="inline mr-2" />
                                    {generatingCertificate ? 'Generating...' : 'Generate Certificate'}
                                  </button>
                                ) : (
                                  <div className="bg-yellow-50 border border-yellow-300 p-3 rounded-lg">
                                    <p className="text-yellow-800 font-semibold text-sm mb-2">
                                      📜 Certificate Requirements:
                                    </p>
                                    <ul className="text-yellow-700 text-xs space-y-1">
                                      <li className="flex items-center">
                                        {certificateEligibility.videoRequirementMet ? '✅' : '❌'}
                                        <span className="ml-2">
                                          Watch 80% of videos ({certificateEligibility.videoCompletionPercentage.toFixed(1)}% completed)
                                        </span>
                                      </li>
                                      <li className="flex items-center">
                                        {certificateEligibility.allMcqsCompleted ? '✅' : '❌'}
                                        <span className="ml-2">
                                          Complete all MCQs ({certificateEligibility.completedMcqs}/{certificateEligibility.totalMcqs})
                                        </span>
                                      </li>
                                      <li className="flex items-center">
                                        {certificateEligibility.mcqRequirementMet ? '✅' : '❌'}
                                        <span className="ml-2">
                                          Score 60% average ({certificateEligibility.averageScore.toFixed(1)}%)
                                        </span>
                                      </li>
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button onClick={handleEnroll} className="w-full btn-primary">
                        <FaCheckCircle className="inline mr-2" />
                        Enroll Now
                      </button>
                    )}
                  </>
                )}

                {user?.Role !== 'learner' && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-blue-700 text-sm">
                      <FaLock className="inline mr-2" />
                      Only learners can enroll in courses
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Course Content Overview */}
        {enrollmentStatus?.paymentStatus === 'paid' ? (
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Course Materials
            </h2>
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg text-center">
              <FaBook className="text-5xl text-blue-500 mx-auto mb-4" />
              <p className="text-gray-700 mb-4">
                You have access to this course!
              </p>
              <button 
                onClick={() => navigate(`/course/${id}/learn`)}
                className="btn-primary"
              >
                <FaBook className="inline mr-2" />
                Start Learning
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              What you'll learn
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Build real-world projects',
              'Master modern technologies',
              'Get certificate upon completion',
              'Learn at your own pace',
              'Access to course materials',
              'Video tutorials and exercises',
            ].map((item, index) => (
              <div key={index} className="flex items-start space-x-3">
                <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Enrollment Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Confirm Enrollment
            </h2>
            
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Course:</span>
                <span className="font-semibold">{course.title}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Price:</span>
                <span className="font-semibold">৳{course.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Your Balance:</span>
                <span className="font-semibold">৳{user?.balance}</span>
              </div>
            </div>

            <form onSubmit={confirmEnroll} className="space-y-5">
              <div>
                <label className="label">
                  <FaLock className="inline mr-2" />
                  Enter Secret Key to Confirm
                </label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="input-field"
                  placeholder="Your bank secret key"
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={enrolling}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {enrolling ? 'Processing...' : 'Confirm & Pay'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setSecretKey('');
                  }}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Rate this Course
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Your Rating
              </label>
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar
                    key={star}
                    className={`text-4xl cursor-pointer transition-colors ${
                      star <= (hoverRating || userRating)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}
                    onClick={() => setUserRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  />
                ))}
              </div>
              <p className="text-center text-gray-600 font-semibold">
                {userRating === 0 && 'Select a rating'}
                {userRating === 1 && 'Poor'}
                {userRating === 2 && 'Fair'}
                {userRating === 3 && 'Good'}
                {userRating === 4 && 'Very Good'}
                {userRating === 5 && 'Excellent'}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review (Optional)
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className="input-field min-h-[120px] resize-none"
                placeholder="Share your experience with this course..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleRatingSubmit}
                disabled={userRating === 0}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Rating
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRatingModal(false);
                  setHoverRating(0);
                }}
                className="flex-1 btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CourseDetail;
