import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { FaCertificate, FaDownload, FaEye, FaCalendarAlt, FaChalkboardTeacher, FaClock, FaCheckCircle, FaHourglassHalf } from 'react-icons/fa';
import { certificateAPI, courseAPI } from '../services/api';
import toast from 'react-hot-toast';

const Certificates = () => {
  const navigate = useNavigate();
  const [approvedCertificates, setApprovedCertificates] = useState([]);
  const [pendingCertificates, setPendingCertificates] = useState([]);
  const [eligibleCourses, setEligibleCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch approved certificates
      const approvedRes = await certificateAPI.getMyCertificates('approved');
      setApprovedCertificates(approvedRes.data.data || []);

      // Fetch pending certificates
      const pendingRes = await certificateAPI.getMyCertificates('pending');
      setPendingCertificates(pendingRes.data.data || []);

      // Fetch enrolled courses to check eligibility
      const coursesRes = await courseAPI.getEnrolledCourses();
      const enrolledCourses = coursesRes.data.data || [];

      // Check eligibility for each course
      const eligible = [];
      for (const course of enrolledCourses) {
        try {
          const eligibilityRes = await certificateAPI.checkEligibility(course._id);
          const eligibilityData = eligibilityRes.data.data;
          
          if (eligibilityData && eligibilityData.eligible) {
            eligible.push({
              ...course,
              eligibility: eligibilityData
            });
          }
        } catch (error) {
          // Silently skip courses that fail eligibility check
          console.log(`Skipping eligibility check for course ${course._id}`);
        }
      }
      setEligibleCourses(eligible);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCertificate = async (courseID) => {
    try {
      setRequesting({ ...requesting, [courseID]: true });
      await certificateAPI.requestCertificate(courseID);
      toast.success('Certificate requested successfully! Please wait for admin approval.');
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error requesting certificate:', error);
      toast.error(error.response?.data?.message || 'Failed to request certificate');
    } finally {
      setRequesting({ ...requesting, [courseID]: false });
    }
  };

  const handleViewCertificate = (certificateID) => {
    navigate(`/certificate/${certificateID}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-gray-600">Loading certificates...</div>
        </div>
      </Layout>
    );
  }

  const hasAnyCertificateContent = 
    approvedCertificates.length > 0 || 
    pendingCertificates.length > 0 || 
    eligibleCourses.length > 0;

  if (!hasAnyCertificateContent) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">My Certificates</h1>

          <div className="card text-center py-16">
            <FaCertificate className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-xl mb-4">No certificates available yet</p>
            <p className="text-gray-400">
              Complete courses with final exams to earn certificates
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <FaCertificate className="text-purple-600" />
            My Certificates
          </h1>
          <p className="text-gray-600">
            Manage your course certificates and requests
          </p>
        </div>

        {/* Eligible Courses - Can Request Certificate */}
        {eligibleCourses.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaCheckCircle className="text-green-600" />
              Ready to Request Certificate
            </h2>
            <p className="text-gray-600 mb-4">
              You've completed the requirements for these courses. Request your certificate!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eligibleCourses.map((course) => (
                <div
                  key={course._id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-green-200"
                >
                  {/* Course Image */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600">
                    {course.courseImage ? (
                      <img
                        src={course.courseImage}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaCertificate className="text-6xl text-white opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-white font-bold text-lg line-clamp-2">
                        {course.title}
                      </h3>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        Eligible
                      </span>
                    </div>
                  </div>

                  {/* Course Details */}
                  <div className="p-5">
                    <div className="space-y-2 mb-4">
                      {/* Instructor */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FaChalkboardTeacher className="text-purple-600" />
                        <span className="font-medium">
                          {course.owner?.FullName || 'Instructor'}
                        </span>
                      </div>

                      {/* Requirements Met */}
                      {course.eligibility?.requirements && (
                        <div className="bg-green-50 rounded-lg p-3 mt-3">
                          <div className="text-xs text-green-700 font-semibold mb-2">Requirements Met ✓</div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span>✅ Final exam completed</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Request Button */}
                    <button
                      onClick={() => handleRequestCertificate(course._id)}
                      disabled={requesting[course._id]}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-700 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaCertificate />
                      {requesting[course._id] ? 'Requesting...' : 'Request Certificate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Certificate Requests */}
        {pendingCertificates.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaHourglassHalf className="text-yellow-600" />
              Pending Approval
            </h2>
            <p className="text-gray-600 mb-4">
              Your certificate requests are being reviewed by the admin
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingCertificates.map((cert) => (
                <div
                  key={cert._id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-yellow-200"
                >
                  {/* Course Image */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-yellow-500 to-orange-600">
                    {cert.courseID?.courseImage ? (
                      <img
                        src={cert.courseID.courseImage}
                        alt={cert.courseID.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaCertificate className="text-6xl text-white opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-white font-bold text-lg line-clamp-2">
                        {cert.courseID?.title || 'Course'}
                      </h3>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <FaClock /> Pending
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-5">
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FaCalendarAlt className="text-yellow-600" />
                        <span>
                          Requested: {new Date(cert.requestedAt || cert.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="bg-yellow-50 rounded-lg p-3">
                        <div className="text-xs text-yellow-700 font-semibold mb-2">Your Scores</div>
                        <div className="text-xs">
                          <div>
                            <div className="text-yellow-600">Final Exam Score:</div>
                            <div className="font-bold">{cert.averageScore?.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 text-center">
                      <div className="text-yellow-700 text-sm font-medium">
                        ⏳ Waiting for admin approval
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved Certificates */}
        {approvedCertificates.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaCertificate className="text-purple-600" />
              My Certificates
            </h2>
            <p className="text-gray-600 mb-4">
              You have earned {approvedCertificates.length} certificate{approvedCertificates.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedCertificates.map((cert) => (
                <div
                  key={cert._id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-purple-100"
                >
                  {/* Course Image */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-purple-600 to-violet-700">
                    {cert.courseID?.courseImage ? (
                      <img
                        src={cert.courseID.courseImage}
                        alt={cert.courseID.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaCertificate className="text-6xl text-white opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-white font-bold text-lg line-clamp-2">
                        {cert.courseID?.title || 'Course'}
                      </h3>
                    </div>
                  </div>

                  {/* Certificate Details */}
                  <div className="p-5">
                    <div className="space-y-3 mb-4">
                      {/* Instructor */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FaChalkboardTeacher className="text-purple-600" />
                        <span className="font-medium">
                          {cert.courseID?.owner?.FullName || 'Instructor'}
                        </span>
                      </div>

                      {/* Issue Date */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FaCalendarAlt className="text-purple-600" />
                        <span>
                          Issued: {new Date(cert.issuedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>

                      {/* Scores */}
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                          <div className="text-xs text-green-700 font-medium mb-1">Final Exam Score</div>
                          <div className="text-2xl font-bold text-green-800">
                            {cert.averageScore?.toFixed(1) || 0}%
                          </div>
                        </div>
                      </div>

                      {/* Certificate Code */}
                      <div className="bg-gray-50 rounded-lg p-2 mt-3">
                        <div className="text-xs text-gray-500 mb-1">Certificate Code</div>
                        <div className="text-xs font-mono text-gray-700 break-all">
                          {cert.certificateCode}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewCertificate(cert._id)}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-2.5 rounded-lg font-semibold hover:from-purple-700 hover:to-violet-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                      >
                        <FaEye />
                        View
                      </button>
                      <button
                        onClick={() => handleViewCertificate(cert._id)}
                        className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-2.5 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                      >
                        <FaDownload />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Certificates;
