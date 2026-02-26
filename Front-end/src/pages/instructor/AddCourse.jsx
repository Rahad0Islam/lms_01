import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { courseAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FaBook, FaImage, FaMoneyBillWave, FaFileAlt } from 'react-icons/fa';

const AddCourse = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    courseImage: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setFormData({ ...formData, courseImage: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.courseImage) {
      toast.error('Course image is required');
      return;
    }

    if (parseFloat(formData.price) <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    setLoading(true);

    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('price', formData.price);
    data.append('courseImage', formData.courseImage);

    try {
      const response = await courseAPI.addCourse(data);
      toast.success('Course created successfully! Waiting for admin approval.');
      // Redirect based on user role
      if (user?.Role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/instructor/my-courses');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Create New Course</h1>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="label">
                <FaBook className="inline mr-2" />
                Course Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Web Development Bootcamp"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="label">
                <FaFileAlt className="inline mr-2" />
                Course Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input-field"
                rows="5"
                placeholder="Describe what students will learn in this course..."
                required
              />
            </div>

            {/* Price */}
            <div>
              <label className="label">
                <FaMoneyBillWave className="inline mr-2" />
                Course Price (৳)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="input-field"
                placeholder="5000"
                min="1"
                step="0.01"
                required
              />
            </div>

            {/* Course Image */}
            <div>
              <label className="label">
                <FaImage className="inline mr-2" />
                Course Image
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex-1 cursor-pointer">
                  <div className="input-field flex items-center justify-center">
                    <span className="text-gray-500">
                      {formData.courseImage ? formData.courseImage.name : 'Choose an image...'}
                    </span>
                  </div>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                    required
                  />
                </label>
                {preview && (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-32 h-32 rounded-lg object-cover border-2 border-primary-300"
                  />
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <p className="text-blue-700 text-sm">
                {user?.Role === 'admin' ? (
                  <>
                    <strong>Note:</strong> As an admin, courses you create will be available to all instructors. 
                    When students enroll, you'll receive the full payment. Instructors who add materials will receive a lump sum amount.
                  </>
                ) : (
                  <>
                    <strong>Note:</strong> Your course will be pending approval. Once approved by an admin,
                    you'll receive payment and can start adding materials.
                  </>
                )}
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Course...
                  </span>
                ) : (
                  'Create Course'
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(user?.Role === 'admin' ? '/dashboard' : '/instructor/my-courses')}
                className="flex-1 btn-outline"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default AddCourse;
