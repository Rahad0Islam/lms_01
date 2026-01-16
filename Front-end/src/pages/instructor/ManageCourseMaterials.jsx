import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { classAPI, materialAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaLock,
  FaUnlock,
  FaVideo,
  FaFileAlt,
  FaImage,
  FaMusic,
  FaQuestionCircle,
  FaTrophy,
  FaChevronUp,
  FaChevronDown
} from 'react-icons/fa';

const ManageCourseMaterials = () => {
  const { courseID } = useParams();
  const navigate = useNavigate();
  
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  
  // Form states
  const [classForm, setClassForm] = useState({
    title: '',
    description: '',
    isFinalExam: false
  });
  
  const [materialForm, setMaterialForm] = useState({
    classID: '',
    title: '',
    description: '',
    materialType: 'text',
    text: '',
    mcq: '',
    mcqDuration: 5,
    video: null,
    audio: null,
    picture: null
  });

  useEffect(() => {
    fetchClasses();
  }, [courseID]);

  const fetchClasses = async () => {
    try {
      const response = await classAPI.getClassesByCourse(courseID);
      setClasses(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
      setLoading(false);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    
    try {
      await classAPI.addClass({
        courseID,
        ...classForm
      });
      
      toast.success('Class added successfully!');
      setShowAddClass(false);
      setClassForm({ title: '', description: '', isFinalExam: false });
      fetchClasses();
    } catch (error) {
      console.error('Error adding class:', error);
      toast.error(error.response?.data?.message || 'Failed to add class');
    }
  };

  const handleDeleteClass = async (classID) => {
    if (!window.confirm('Are you sure? This will delete the class and all its materials.')) {
      return;
    }
    
    try {
      await classAPI.deleteClass(classID);
      toast.success('Class deleted successfully!');
      fetchClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error(error.response?.data?.message || 'Failed to delete class');
    }
  };

  const handleEnableFinalExam = async (classID) => {
    try {
      await classAPI.enableFinalExam(classID);
      toast.success('Final exam enabled successfully!');
      fetchClasses();
    } catch (error) {
      console.error('Error enabling final exam:', error);
      toast.error(error.response?.data?.message || 'Failed to enable final exam');
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('courseID', courseID);
    formData.append('classID', materialForm.classID);
    formData.append('title', materialForm.title);
    formData.append('description', materialForm.description);
    formData.append('materialType', materialForm.materialType);
    
    if (materialForm.materialType === 'text') {
      formData.append('text', materialForm.text);
    } else if (materialForm.materialType === 'mcq') {
      formData.append('mcq', materialForm.mcq);
      formData.append('mcqDuration', materialForm.mcqDuration);
    } else if (materialForm.materialType === 'video' && materialForm.video) {
      Array.from(materialForm.video).forEach(file => {
        formData.append('video', file);
      });
    } else if (materialForm.materialType === 'audio' && materialForm.audio) {
      Array.from(materialForm.audio).forEach(file => {
        formData.append('audio', file);
      });
    } else if (materialForm.materialType === 'image' && materialForm.picture) {
      Array.from(materialForm.picture).forEach(file => {
        formData.append('picture', file);
      });
    }
    
    try {
      await materialAPI.uploadMaterial(formData);
      toast.success('Material added successfully!');
      setShowAddMaterial(false);
      setMaterialForm({
        classID: '',
        title: '',
        description: '',
        materialType: 'text',
        text: '',
        mcq: '',
        mcqDuration: 5,
        video: null,
        audio: null,
        picture: null
      });
      fetchClasses();
    } catch (error) {
      console.error('Error adding material:', error);
      toast.error(error.response?.data?.message || 'Failed to add material');
    }
  };

  const getMaterialIcon = (type) => {
    switch (type) {
      case 'text': return <FaFileAlt className="text-blue-600" />;
      case 'video': return <FaVideo className="text-red-600" />;
      case 'image': return <FaImage className="text-green-600" />;
      case 'audio': return <FaMusic className="text-purple-600" />;
      case 'mcq': return <FaQuestionCircle className="text-orange-600" />;
      default: return <FaFileAlt />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/instructor/courses')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
            >
              <FaArrowLeft /> Back to My Courses
            </button>
            
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Manage Course Structure</h1>
              <button
                onClick={() => setShowAddClass(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FaPlus /> Add Class
              </button>
            </div>
          </div>

          {/* Classes List */}
          <div className="space-y-4">
            {classes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500 text-lg mb-4">No classes yet</p>
                <button
                  onClick={() => setShowAddClass(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Your First Class
                </button>
              </div>
            ) : (
              classes.map((classDoc, index) => (
                <div key={classDoc._id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                          Class {index + 1}
                        </span>
                        {classDoc.isFinalExam && (
                          <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 text-sm font-semibold px-3 py-1 rounded-full">
                            <FaTrophy /> Final Exam
                          </span>
                        )}
                        {classDoc.isEnabled ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <FaUnlock /> Enabled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400 text-sm">
                            <FaLock /> Disabled
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mt-2">{classDoc.title}</h3>
                      {classDoc.description && (
                        <p className="text-gray-600 mt-1">{classDoc.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {classDoc.isFinalExam && !classDoc.isEnabled && (
                        <button
                          onClick={() => handleEnableFinalExam(classDoc._id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Enable Final Exam
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteClass(classDoc._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>

                  {/* Materials in this class */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-700">Materials</h4>
                      <button
                        onClick={() => {
                          setMaterialForm({ ...materialForm, classID: classDoc._id });
                          setShowAddMaterial(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded hover:bg-blue-100"
                      >
                        <FaPlus /> Add Material
                      </button>
                    </div>
                    
                    {classDoc.materials && classDoc.materials.length > 0 ? (
                      <div className="space-y-2">
                        {classDoc.materials.map((material, mIndex) => (
                          <div
                            key={material._id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                          >
                            <span className="text-gray-400 text-sm font-mono">#{mIndex + 1}</span>
                            {getMaterialIcon(material.materialType)}
                            <div className="flex-1">
                              <p className="font-medium">{material.title}</p>
                              <p className="text-xs text-gray-500 capitalize">{material.materialType}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No materials yet</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Class Modal */}
          {showAddClass && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h2 className="text-2xl font-bold mb-4">Add New Class</h2>
                <form onSubmit={handleAddClass}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Class Title *</label>
                      <input
                        type="text"
                        value={classForm.title}
                        onChange={(e) => setClassForm({ ...classForm, title: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={classForm.description}
                        onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows="3"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isFinalExam"
                        checked={classForm.isFinalExam}
                        onChange={(e) => setClassForm({ ...classForm, isFinalExam: e.target.checked })}
                        className="rounded"
                      />
                      <label htmlFor="isFinalExam" className="text-sm">
                        This is a final exam (will be disabled by default)
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddClass(false);
                        setClassForm({ title: '', description: '', isFinalExam: false });
                      }}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Class
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Material Modal */}
          {showAddMaterial && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
                <h2 className="text-2xl font-bold mb-4">Add New Material</h2>
                <form onSubmit={handleAddMaterial}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Material Title *</label>
                      <input
                        type="text"
                        value={materialForm.title}
                        onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={materialForm.description}
                        onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows="2"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Material Type *</label>
                      <select
                        value={materialForm.materialType}
                        onChange={(e) => setMaterialForm({ ...materialForm, materialType: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="text">Text</option>
                        <option value="video">Video</option>
                        <option value="audio">Audio</option>
                        <option value="image">Image</option>
                        <option value="mcq">MCQ Exam</option>
                      </select>
                    </div>
                    
                    {/* Conditional content based on material type */}
                    {materialForm.materialType === 'text' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Text Content *</label>
                        <textarea
                          value={materialForm.text}
                          onChange={(e) => setMaterialForm({ ...materialForm, text: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows="6"
                          required
                        />
                      </div>
                    )}
                    
                    {materialForm.materialType === 'video' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Upload Video(s) *</label>
                        <input
                          type="file"
                          accept="video/*"
                          multiple
                          onChange={(e) => setMaterialForm({ ...materialForm, video: e.target.files })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    )}
                    
                    {materialForm.materialType === 'audio' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Upload Audio(s) *</label>
                        <input
                          type="file"
                          accept="audio/*"
                          multiple
                          onChange={(e) => setMaterialForm({ ...materialForm, audio: e.target.files })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    )}
                    
                    {materialForm.materialType === 'image' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Upload Image(s) *</label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => setMaterialForm({ ...materialForm, picture: e.target.files })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    )}
                    
                    {materialForm.materialType === 'mcq' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">Duration (minutes) *</label>
                          <input
                            type="number"
                            min="1"
                            value={materialForm.mcqDuration}
                            onChange={(e) => setMaterialForm({ ...materialForm, mcqDuration: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">MCQ Questions (JSON) *</label>
                          <textarea
                            value={materialForm.mcq}
                            onChange={(e) => setMaterialForm({ ...materialForm, mcq: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            rows="8"
                            placeholder='[{"question":"What is 2+2?","options":["3","4","5","6"],"answer":"4"}]'
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Format: Array of objects with question, options array, and answer
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMaterial(false);
                        setMaterialForm({
                          classID: '',
                          title: '',
                          description: '',
                          materialType: 'text',
                          text: '',
                          mcq: '',
                          mcqDuration: 5,
                          video: null,
                          audio: null,
                          picture: null
                        });
                      }}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Material
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ManageCourseMaterials;
