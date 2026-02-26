import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { certificateAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FaSpinner, FaCertificate, FaDownload, FaMedal, FaStar, FaCheckCircle } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Certificate = () => {
  const { certificateID } = useParams();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const certificateRef = useRef(null);

  useEffect(() => {
    fetchCertificate();
  }, [certificateID]);

  const fetchCertificate = async () => {
    try {
      const response = await certificateAPI.getCertificate(certificateID);
      setCertificate(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching certificate:', error);
      toast.error(error.response?.data?.message || 'Failed to load certificate');
      navigate('/my-courses');
    }
  };

  const downloadCertificate = async () => {
    if (!certificateRef.current) return;
    
    setDownloading(true);
    try {
      const element = certificateRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificate-${certificate.certificateCode}.pdf`);
      
      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    } finally {
      setDownloading(false);
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

  if (!certificate) {
    return null;
  }

  const issueDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8">
        {/* Download Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={downloadCertificate}
            disabled={downloading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <FaDownload />
            {downloading ? 'Downloading...' : 'Download PDF'}
          </button>
        </div>

        {/* Certificate */}
        <div 
          ref={certificateRef}
          className="bg-white p-8 shadow-2xl"
          style={{
            aspectRatio: '1.414',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-x-32 -translate-y-32"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full translate-x-48 translate-y-48"></div>
          <div className="absolute top-1/4 right-10 w-32 h-32 bg-yellow-300 opacity-20 rounded-full"></div>
          
          {/* Border */}
          <div className="absolute inset-8 border-4 border-white opacity-50 rounded-lg"></div>
          <div className="absolute inset-12 border-2 border-white opacity-30 rounded-lg"></div>
          
          {/* Content */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white">
            {/* Badge */}
            <div className="mb-4">
              <div className="relative">
                <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center shadow-2xl">
                  <FaMedal className="text-5xl text-yellow-600" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white">
                    <FaCheckCircle className="text-white text-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-5xl font-extrabold mb-3 tracking-wide">
              CERTIFICATE
            </h1>
            <p className="text-xl mb-4 font-light tracking-wider">
              OF COMPLETION
            </p>

            {/* Divider */}
            <div className="w-24 h-1 bg-yellow-400 mb-4"></div>

            {/* Recipient */}
            <p className="text-lg mb-2 font-light">This is to certify that</p>
            <h2 className="text-4xl font-bold mb-4 tracking-wide">
              {certificate.learnerID?.FullName}
            </h2>

            {/* Course */}
            <p className="text-lg mb-2 font-light">has successfully completed the course</p>
            <h3 className="text-3xl font-bold mb-4 text-yellow-300">
              {certificate.courseID?.title}
            </h3>

            {/* Performance */}
            <div className="flex items-center gap-6 mb-4">
              <div className="flex items-center gap-2">
                <FaStar className="text-yellow-400 text-xl" />
                <div className="text-left">
                  <p className="text-xs font-light">Final Exam Score</p>
                  <p className="text-2xl font-bold">{certificate.averageScore.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* Instructor */}
            <div className="mb-3">
              <p className="text-xs font-light mb-1">Instructed by</p>
              <p className="text-xl font-semibold">
                {certificate.courseID?.owner?.FullName || 'Course Instructor'}
              </p>
            </div>

            {/* Date and Code */}
            <div className="flex items-center gap-6 text-xs">
              <div>
                <p className="font-light">Issue Date</p>
                <p className="font-semibold text-base">{issueDate}</p>
              </div>
              <div className="w-px h-10 bg-white opacity-30"></div>
              <div>
                <p className="font-light">Certificate Code</p>
                <p className="font-mono font-semibold text-base tracking-wider">
                  {certificate.certificateCode}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Info */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Certificate Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Learner Name:</p>
              <p className="font-semibold text-gray-900">{certificate.learnerID?.FullName}</p>
            </div>
            <div>
              <p className="text-gray-600">Course Title:</p>
              <p className="font-semibold text-gray-900">{certificate.courseID?.title}</p>
            </div>
            <div>
              <p className="text-gray-600">Final Exam Score:</p>
              <p className="font-semibold text-gray-900">{certificate.averageScore.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-gray-600">Issue Date:</p>
              <p className="font-semibold text-gray-900">{issueDate}</p>
            </div>
            <div>
              <p className="text-gray-600">Certificate Code:</p>
              <p className="font-mono font-semibold text-gray-900">{certificate.certificateCode}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Certificate;
