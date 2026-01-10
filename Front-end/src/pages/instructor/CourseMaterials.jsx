import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { courseAPI, materialAPI, authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FaSpinner, FaPlus, FaUpload, FaTrash, FaEdit, FaTimes, FaFileAlt, FaVideo, FaImage, FaMusic, FaQuestionCircle, FaArrowLeft } from 'react-icons/fa';

const MaterialType = {
  TEXT: 'text',
  VIDEO: 'video',
  IMAGE: 'image',
  AUDIO: 'audio',
  MCQ: 'mcq'
};

const CourseMaterials = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: MaterialType.TEXT,
    content: '',
    file: null,
    mcqData: [
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0
      },
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0
      },
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0
      },
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0
      },
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0
      }
    ],
    mcqDuration: 5 // Default 5 minutes
  });

  useEffect(() => {
    fetchCourseAndMaterials();
  }, [courseId]);

  const fetchCourseAndMaterials = async () => {
    try {
      const courseRes = await courseAPI.getCourseById(courseId);
      setCourse(courseRes.data.data.course);
      
      // Fetch materials for this course
      const materialsRes = await materialAPI.getMaterialsByCourse(courseId);
      setMaterials(materialsRes.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file });
    }
  };

  const handleMcqOptionChange = (questionIndex, optionIndex, value) => {
    const newMcqData = [...formData.mcqData];
    newMcqData[questionIndex].options[optionIndex] = value;
    setFormData({ ...formData, mcqData: newMcqData });
  };

  const handleMcqQuestionChange = (questionIndex, value) => {
    const newMcqData = [...formData.mcqData];
    newMcqData[questionIndex].question = value;
    setFormData({ ...formData, mcqData: newMcqData });
  };

  const handleMcqCorrectAnswerChange = (questionIndex, optionIndex) => {
    const newMcqData = [...formData.mcqData];
    newMcqData[questionIndex].correctAnswer = optionIndex;
    setFormData({ ...formData, mcqData: newMcqData });
  };

  const addMcqQuestion = () => {
    if (formData.mcqData.length < 20) {
      setFormData({
        ...formData,
        mcqData: [...formData.mcqData, {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0
        }]
      });
    } else {
      toast.error('Maximum 20 questions allowed');
    }
  };

  const removeMcqQuestion = (questionIndex) => {
    if (formData.mcqData.length > 5) {
      const newMcqData = formData.mcqData.filter((_, index) => index !== questionIndex);
      setFormData({ ...formData, mcqData: newMcqData });
    } else {
      toast.error('Minimum 5 questions required');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: MaterialType.TEXT,
      content: '',
      file: null,
      mcqData: [
        {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0
        },
        {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0
        },
        {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0
        },
        {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0
        },
        {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0
        }
      ],
      mcqDuration: 5
    });
    setCurrentMaterial(null);
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title || !formData.description) {
      toast.error('Title and description are required');
      return;
    }

    if (formData.type === MaterialType.TEXT && !formData.content) {
      toast.error('Content is required for text materials');
      return;
    }

    if (formData.type === MaterialType.MCQ) {
      const validQuestions = formData.mcqData.filter(q => 
        q.question.trim() && q.options.every(opt => opt.trim())
      );
      
      if (validQuestions.length < 5) {
        toast.error('Please provide at least 5 complete MCQ questions');
        return;
      }
      
      if (validQuestions.length > 20) {
        toast.error('Maximum 20 MCQ questions allowed');
        return;
      }
    }

    if ([MaterialType.VIDEO, MaterialType.IMAGE, MaterialType.AUDIO].includes(formData.type) && !formData.file && !currentMaterial) {
      toast.error(`Please upload a ${formData.type} file`);
      return;
    }

    setUploading(true);
    
    try {
      const submitData = new FormData();
      submitData.append('courseID', courseId);
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('materialType', formData.type);
      
      if (formData.type === MaterialType.TEXT) {
        submitData.append('text', formData.content);
      } else if (formData.type === MaterialType.MCQ) {
        // Filter out empty questions and format for backend
        const validQuestions = formData.mcqData
          .filter(q => q.question.trim() && q.options.every(opt => opt.trim()))
          .map(q => ({
            question: q.question,
            options: q.options,
            answer: q.options[q.correctAnswer] // Save the actual option text, not the index
          }));
        submitData.append('mcq', JSON.stringify(validQuestions));
        submitData.append('mcqDuration', formData.mcqDuration || 5);
      } else if (formData.file) {
        // Send file with the correct field name based on type
        if (formData.type === MaterialType.VIDEO) {
          submitData.append('video', formData.file);
        } else if (formData.type === MaterialType.IMAGE) {
          submitData.append('picture', formData.file);
        } else if (formData.type === MaterialType.AUDIO) {
          submitData.append('audio', formData.file);
        }
      }

      if (currentMaterial) {
        await materialAPI.updateMaterial(currentMaterial._id, submitData);
        toast.success('Material updated successfully!');
      } else {
        await materialAPI.uploadMaterial(submitData);
        toast.success('Material uploaded successfully!');
      }
      
      // Fetch updated user profile to reflect balance changes
      try {
        const userResponse = await authAPI.getUserProfile(user._id);
        updateUser(userResponse.data.data);
      } catch (error) {
        console.error('Failed to update user profile:', error);
      }
      
      resetForm();
      fetchCourseAndMaterials();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save material');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (material) => {
    setCurrentMaterial(material);
    
    // Extract MCQ data from questions array if exists
    let mcqData = Array(5).fill(null).map(() => ({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    }));
    
    if (material.questions && material.questions.length > 0) {
      mcqData = material.questions.map(q => {
        // Find the index of the correct answer in options
        const correctAnswerIndex = q.options?.indexOf(q.answer) || 0;
        return {
          question: q.question || '',
          options: q.options || ['', '', '', ''],
          correctAnswer: correctAnswerIndex >= 0 ? correctAnswerIndex : 0
        };
      });
      
      // Ensure at least 5 question slots
      while (mcqData.length < 5) {
        mcqData.push({
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0
        });
      }
    }
    
    setFormData({
      title: material.title || '',
      description: material.description || '',
      type: material.materialType || MaterialType.TEXT,
      content: material.text || '',
      file: null,
      mcqData: mcqData,
      mcqDuration: material.mcqDuration || material.questions?.length || 5
    });
    setShowModal(true);
  };

  const handleDelete = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this material?')) {
      return;
    }

    try {
      await materialAPI.deleteMaterial(materialId);
      toast.success('Material deleted successfully!');
      fetchCourseAndMaterials();
    } catch (error) {
      toast.error('Failed to delete material');
    }
  };

  const getMaterialIcon = (type) => {
    switch (type) {
      case MaterialType.TEXT:
        return <FaFileAlt className="text-blue-500" />;
      case MaterialType.VIDEO:
        return <FaVideo className="text-red-500" />;
      case MaterialType.IMAGE:
        return <FaImage className="text-green-500" />;
      case MaterialType.AUDIO:
        return <FaMusic className="text-purple-500" />;
      case MaterialType.MCQ:
        return <FaQuestionCircle className="text-orange-500" />;
      default:
        return <FaFileAlt />;
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
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/instructor/my-courses')}
            className="text-primary-600 hover:text-primary-700 mb-4 flex items-center"
          >
            <FaArrowLeft className="mr-2" />
            Back to Manage Courses
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {course?.title}
              </h1>
              <p className="text-gray-600">Manage course materials</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary"
            >
              <FaPlus className="inline mr-2" />
              Add Material
            </button>
          </div>
        </div>

        {/* Materials List */}
        {materials.length === 0 ? (
          <div className="card text-center py-12">
            <FaFileAlt className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-xl">No materials added yet</p>
            <p className="text-gray-400 mt-2">Click "Add Material" to upload course content</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {materials.map((material) => (
              <div key={material._id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="text-3xl mt-1">
                      {getMaterialIcon(material.materialType)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {material.title}
                      </h3>
                      <p className="text-gray-600 mb-2">{material.description}</p>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {material.materialType?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(material)}
                      className="btn-outline text-sm"
                    >
                      <FaEdit className="inline mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(material._id)}
                      className="btn-outline text-red-600 hover:bg-red-50 text-sm"
                    >
                      <FaTrash className="inline mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentMaterial ? 'Edit Material' : 'Add New Material'}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FaTimes size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Enter material title"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="input-field"
                      rows="3"
                      placeholder="Enter material description"
                      required
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Material Type *
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="input-field"
                      required
                    >
                      <option value={MaterialType.TEXT}>Text</option>
                      <option value={MaterialType.VIDEO}>Video</option>
                      <option value={MaterialType.IMAGE}>Image</option>
                      <option value={MaterialType.AUDIO}>Audio</option>
                      <option value={MaterialType.MCQ}>MCQ</option>
                    </select>
                  </div>

                  {/* Text Content */}
                  {formData.type === MaterialType.TEXT && (
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">
                        Content *
                      </label>
                      <textarea
                        name="content"
                        value={formData.content}
                        onChange={handleInputChange}
                        className="input-field"
                        rows="6"
                        placeholder="Enter text content"
                        required
                      />
                    </div>
                  )}

                  {/* File Upload */}
                  {[MaterialType.VIDEO, MaterialType.IMAGE, MaterialType.AUDIO].includes(formData.type) && (
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">
                        Upload File {!currentMaterial && '*'}
                      </label>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="input-field"
                        accept={
                          formData.type === MaterialType.VIDEO
                            ? 'video/*'
                            : formData.type === MaterialType.IMAGE
                            ? 'image/*'
                            : 'audio/*'
                        }
                        required={!currentMaterial}
                      />
                      {currentMaterial && (
                        <p className="text-sm text-gray-500 mt-1">
                          Leave empty to keep existing file
                        </p>
                      )}
                    </div>
                  )}

                  {/* MCQ Fields */}
                  {formData.type === MaterialType.MCQ && (
                    <div className="space-y-6">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                          Please provide 5-20 questions. Each question must have 4 options.
                        </p>
                      </div>
                      
                      {/* MCQ Duration */}
                      <div>
                        <label className="block text-gray-700 font-semibold mb-2">
                          Exam Duration (minutes) *
                        </label>
                        <input
                          type="number"
                          name="mcqDuration"
                          value={formData.mcqDuration}
                          onChange={handleInputChange}
                          className="input-field"
                          min="1"
                          max="180"
                          placeholder="Enter duration in minutes"
                          required
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Default is {formData.mcqData.filter(q => q.question.trim()).length} minutes (1 minute per question)
                        </p>
                      </div>
                      
                      {formData.mcqData.map((mcq, qIndex) => (
                        <div key={qIndex} className="border border-gray-200 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-gray-900">Question {qIndex + 1}</h4>
                            {formData.mcqData.length > 5 && (
                              <button
                                type="button"
                                onClick={() => removeMcqQuestion(qIndex)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                <FaTimes className="inline mr-1" />
                                Remove
                              </button>
                            )}
                          </div>
                          
                          <div className="mb-3">
                            <label className="block text-gray-700 font-semibold mb-2">
                              Question Text *
                            </label>
                            <textarea
                              value={mcq.question}
                              onChange={(e) => handleMcqQuestionChange(qIndex, e.target.value)}
                              className="input-field"
                              rows="2"
                              placeholder="Enter question"
                              required={qIndex < 5}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-gray-700 font-semibold mb-2">
                              Options * (Select the correct answer)
                            </label>
                            {mcq.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2 mb-2">
                                <input
                                  type="radio"
                                  name={`correctAnswer-${qIndex}`}
                                  checked={mcq.correctAnswer === optIndex}
                                  onChange={() => handleMcqCorrectAnswerChange(qIndex, optIndex)}
                                  className="w-4 h-4 text-primary-600"
                                />
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => handleMcqOptionChange(qIndex, optIndex, e.target.value)}
                                  className="input-field flex-1"
                                  placeholder={`Option ${optIndex + 1}`}
                                  required={qIndex < 5}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      {formData.mcqData.length < 20 && (
                        <button
                          type="button"
                          onClick={addMcqQuestion}
                          className="btn-outline w-full"
                        >
                          <FaPlus className="inline mr-2" />
                          Add Question ({formData.mcqData.length}/20)
                        </button>
                      )}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn-outline flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="btn-primary flex-1 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <FaSpinner className="inline mr-2 animate-spin" />
                          {currentMaterial ? 'Updating...' : 'Uploading...'}
                        </>
                      ) : (
                        <>
                          <FaUpload className="inline mr-2" />
                          {currentMaterial ? 'Update' : 'Upload'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CourseMaterials;
