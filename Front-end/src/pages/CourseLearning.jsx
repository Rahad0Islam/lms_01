import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { progressAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  FaSpinner, 
  FaBook, 
  FaArrowLeft, 
  FaFileAlt, 
  FaFilePdf,
  FaVideo, 
  FaImage, 
  FaMusic, 
  FaQuestionCircle,
  FaCheckCircle,
  FaChevronRight,
  FaChevronDown,
  FaTimes,
  FaClock,
  FaLock,
  FaUnlock,
  FaTrophy
} from 'react-icons/fa';

const MaterialType = {
  TEXT: 'text',
  VIDEO: 'video',
  IMAGE: 'image',
  AUDIO: 'audio',
  MCQ: 'mcq',
  PDF: 'pdf'
};

const CourseLearning = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [courseStructure, setCourseStructure] = useState([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [expandedClasses, setExpandedClasses] = useState({});
  
  // MCQ state
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [examStarted, setExamStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [submittingExam, setSubmittingExam] = useState(false);
  
  // Video state
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
  const [videoProgress, setVideoProgress] = useState({});

  useEffect(() => {
    fetchCourseStructure();
    
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [id]);

  const fetchCourseStructure = async () => {
    try {
      const response = await progressAPI.getCourseStructure(id);
      const data = response.data.data;
      
      setCourseStructure(data.structure);
      setOverallProgress(data.overallProgress);
      
      // Auto-expand first unlocked class
      if (data.structure.length > 0) {
        const firstUnlocked = data.structure.find(c => c.isUnlocked);
        if (firstUnlocked) {
          setExpandedClasses({ [firstUnlocked._id]: true });
          setSelectedClass(firstUnlocked);
          
          // Auto-select first unlocked material
          const firstUnlockedMaterial = firstUnlocked.materials.find(m => m.isUnlocked);
          if (firstUnlockedMaterial) {
            setSelectedMaterial(firstUnlockedMaterial);
          }
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching course structure:', error);
      toast.error(error.response?.data?.message || 'Failed to load course');
      navigate(`/course/${id}`);
    }
  };

  const toggleClassExpansion = (classId) => {
    setExpandedClasses(prev => ({
      ...prev,
      [classId]: !prev[classId]
    }));
  };

  const selectMaterial = (classDoc, material) => {
    if (!material.isUnlocked) {
      toast.error('This material is locked. Complete previous materials first.');
      return;
    }
    
    setSelectedClass(classDoc);
    setSelectedMaterial(material);
    setMcqAnswers({});
    setExamStarted(false);
    
    if (material.materialType === MaterialType.VIDEO && material.video?.length > 0) {
      setCurrentVideoUrl(material.video[0].url);
    }
  };

  const startExam = () => {
    if (!selectedMaterial || selectedMaterial.materialType !== MaterialType.MCQ) return;
    
    setExamStarted(true);
    const durationInSeconds = (selectedMaterial.mcqDuration || 5) * 60;
    setTimeRemaining(durationInSeconds);
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam();
          toast.error('Time is up! Exam submitted automatically.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimerInterval(interval);
  };

  const handleMcqAnswer = (questionIndex, answerIndex) => {
    setMcqAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const handleSubmitExam = async () => {
    if (!selectedMaterial || submittingExam) return;
    
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    setSubmittingExam(true);
    
    try {
      const answers = selectedMaterial.questions.map((question, qIndex) => ({
        questionIndex: qIndex,
        selectedAnswer: mcqAnswers[qIndex] !== undefined 
          ? selectedMaterial.questions[qIndex].options[mcqAnswers[qIndex]]
          : ''
      }));

      const duration = selectedMaterial.mcqDuration || 5;
      const totalSeconds = duration * 60;
      const timeTaken = totalSeconds - timeRemaining;

      await progressAPI.submitExam({
        courseID: id,
        materialID: selectedMaterial._id,
        answers,
        timeTaken
      });

      toast.success('Exam submitted successfully!');
      
      // Refresh course structure to update unlock status
      await fetchCourseStructure();
      
      setExamStarted(false);
      setMcqAnswers({});
    } catch (error) {
      console.error('Error submitting exam:', error);
      toast.error(error.response?.data?.message || 'Failed to submit exam');
    } finally {
      setSubmittingExam(false);
    }
  };

  const handleVideoProgress = async (videoElement) => {
    if (!selectedMaterial || !currentVideoUrl) return;
    
    const watchedSeconds = Math.floor(videoElement.currentTime);
    
    // Update every 5 seconds
    if (watchedSeconds % 5 === 0 && watchedSeconds > 0) {
      try {
        await progressAPI.updateProgress({
          courseID: id,
          classID: selectedClass._id,
          materialID: selectedMaterial._id,
          watchedSeconds,
          videoUrl: currentVideoUrl
        });
        
        // Refresh structure if video is completed (80%)
        const duration = videoElement.duration;
        if (duration && (watchedSeconds / duration) >= 0.8) {
          await fetchCourseStructure();
        }
      } catch (error) {
        console.error('Error updating video progress:', error);
      }
    }
  };

  const markAsCompleted = async (materialType) => {
    if (!selectedMaterial) return;
    
    try {
      await progressAPI.updateProgress({
        courseID: id,
        classID: selectedClass._id,
        materialID: selectedMaterial._id
      });
      
      toast.success('Material marked as completed!');
      await fetchCourseStructure();
    } catch (error) {
      console.error('Error marking as completed:', error);
      toast.error(error.response?.data?.message || 'Failed to update progress');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getMaterialIcon = (type) => {
    switch (type) {
      case MaterialType.TEXT: return <FaFileAlt />;
      case MaterialType.VIDEO: return <FaVideo />;
      case MaterialType.IMAGE: return <FaImage />;
      case MaterialType.AUDIO: return <FaMusic />;
      case MaterialType.MCQ: return <FaQuestionCircle />;
      case MaterialType.PDF: return <FaFilePdf />;
      default: return <FaBook />;
    }
  };

  const renderMaterialContent = () => {
    if (!selectedMaterial) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <FaBook className="text-6xl mb-4" />
          <p className="text-xl">Select a material to start learning</p>
        </div>
      );
    }

    if (!selectedMaterial.isUnlocked) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <FaLock className="text-6xl mb-4" />
          <p className="text-xl">This material is locked</p>
          <p className="text-sm mt-2">Complete previous materials to unlock</p>
        </div>
      );
    }

    const { materialType, text, video, audio, picture, pdf, questions, examResult } = selectedMaterial;

    switch (materialType) {
      case MaterialType.TEXT:
        return (
          <div className="prose max-w-none">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold">{selectedMaterial.title}</h2>
              {selectedMaterial.isFinalExam && (
                <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-semibold">
                  🏆 FINAL EXAM
                </span>
              )}
            </div>
            {selectedMaterial.description && (
              <p className="text-gray-600 mb-4">{selectedMaterial.description}</p>
            )}
            <div className="whitespace-pre-wrap">{text}</div>
            {!selectedMaterial.isCompleted && (
              <button
                onClick={() => markAsCompleted(MaterialType.TEXT)}
                className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Mark as Completed
              </button>
            )}
          </div>
        );

      case MaterialType.VIDEO:
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold">{selectedMaterial.title}</h2>
              {selectedMaterial.isFinalExam && (
                <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-semibold">
                  🏆 FINAL EXAM
                </span>
              )}
            </div>
            {selectedMaterial.description && (
              <p className="text-gray-600 mb-4">{selectedMaterial.description}</p>
            )}
            {video && video.length > 0 && (
              <div className="space-y-4">
                {video.map((vid, index) => (
                  <div key={index} className="bg-black rounded-lg overflow-hidden">
                    <video
                      controls
                      className="w-full"
                      src={vid.url}
                      onTimeUpdate={(e) => handleVideoProgress(e.target)}
                      onEnded={() => handleVideoProgress({ currentTime: vid.duration, duration: vid.duration })}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ))}
              </div>
            )}
            {!selectedMaterial.isCompleted && (
              <button
                onClick={() => markAsCompleted(MaterialType.VIDEO)}
                className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Mark as Completed
              </button>
            )}
          </div>
        );

      case MaterialType.AUDIO:
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold">{selectedMaterial.title}</h2>
              {selectedMaterial.isFinalExam && (
                <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-semibold">
                  🏆 FINAL EXAM
                </span>
              )}
            </div>
            {selectedMaterial.description && (
              <p className="text-gray-600 mb-4">{selectedMaterial.description}</p>
            )}
            {audio && audio.length > 0 && (
              <div className="space-y-4">
                {audio.map((aud, index) => (
                  <audio key={index} controls className="w-full" src={aud.url}>
                    Your browser does not support the audio tag.
                  </audio>
                ))}
              </div>
            )}
            {!selectedMaterial.isCompleted && (
              <button
                onClick={() => markAsCompleted(MaterialType.AUDIO)}
                className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Mark as Completed
              </button>
            )}
          </div>
        );

      case MaterialType.PDF:
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold">{selectedMaterial.title}</h2>
              {selectedMaterial.isFinalExam && (
                <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-semibold">
                  🏆 FINAL EXAM
                </span>
              )}
            </div>
            {selectedMaterial.description && (
              <p className="text-gray-600 mb-4">{selectedMaterial.description}</p>
            )}
            {selectedMaterial.pdf && selectedMaterial.pdf.length > 0 && (
              <div className="space-y-4">
                {selectedMaterial.pdf.map((pdfFile, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <iframe
                      src={pdfFile.url}
                      className="w-full"
                      style={{ height: '600px' }}
                      title={`PDF ${index + 1}`}
                    >
                      Your browser does not support PDF viewing.
                    </iframe>
                    <div className="p-3 bg-gray-50 border-t">
                      <a
                        href={pdfFile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Open PDF in new tab
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!selectedMaterial.isCompleted && (
              <button
                onClick={() => markAsCompleted(MaterialType.PDF)}
                className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Mark as Completed
              </button>
            )}
          </div>
        );

      case MaterialType.IMAGE:
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold">{selectedMaterial.title}</h2>
              {selectedMaterial.isFinalExam && (
                <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-semibold">
                  🏆 FINAL EXAM
                </span>
              )}
            </div>
            {selectedMaterial.description && (
              <p className="text-gray-600 mb-4">{selectedMaterial.description}</p>
            )}
            {picture && picture.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {picture.map((pic, index) => (
                  <img 
                    key={index} 
                    src={pic.url} 
                    alt={`Content ${index + 1}`}
                    className="w-full rounded-lg shadow-lg"
                  />
                ))}
              </div>
            )}
            {!selectedMaterial.isCompleted && (
              <button
                onClick={() => markAsCompleted(MaterialType.IMAGE)}
                className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Mark as Completed
              </button>
            )}
          </div>
        );

      case MaterialType.MCQ:
        if (examResult) {
          return (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold">{selectedMaterial.title}</h2>
                {selectedMaterial.isFinalExam && (
                  <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-semibold">
                    🏆 FINAL EXAM
                  </span>
                )}
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <FaCheckCircle className="text-green-600 text-3xl" />
                  <div>
                    <h3 className="text-xl font-bold text-green-800">Exam Completed</h3>
                    <p className="text-green-600">You have already taken this exam</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600">Score</p>
                    <p className="text-2xl font-bold text-green-600">{examResult.score.toFixed(1)}%</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600">Correct Answers</p>
                    <p className="text-2xl font-bold text-green-600">
                      {examResult.correctAnswers}/{examResult.totalQuestions}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (!examStarted) {
          return (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold">{selectedMaterial.title}</h2>
                {selectedMaterial.isFinalExam && (
                  <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-semibold">
                    🏆 FINAL EXAM
                  </span>
                )}
              </div>
              {selectedMaterial.description && (
                <p className="text-gray-600 mb-4">{selectedMaterial.description}</p>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">Exam Instructions</h3>
                <ul className="list-disc list-inside space-y-2 mb-6">
                  <li>Total Questions: {questions?.length || 0}</li>
                  <li>Duration: {selectedMaterial.mcqDuration || 5} minutes</li>
                  <li>You can only attempt this exam once</li>
                  <li>Make sure you have a stable internet connection</li>
                </ul>
                <button
                  onClick={startExam}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Start Exam
                </button>
              </div>
            </div>
          );
        }

        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{selectedMaterial.title}</h2>
                {selectedMaterial.isFinalExam && (
                  <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-semibold">
                    🏆 FINAL EXAM
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg">
                <FaClock />
                <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
              </div>
            </div>
            
            <div className="space-y-6">
              {questions?.map((question, qIndex) => (
                <div key={qIndex} className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold mb-4">
                    {qIndex + 1}. {question.question}
                  </h3>
                  <div className="space-y-2">
                    {question.options.map((option, oIndex) => (
                      <label
                        key={oIndex}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                          mcqAnswers[qIndex] === oIndex
                            ? 'bg-blue-50 border-blue-500'
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${qIndex}`}
                          checked={mcqAnswers[qIndex] === oIndex}
                          onChange={() => handleMcqAnswer(qIndex, oIndex)}
                          className="mr-3"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={handleSubmitExam}
              disabled={submittingExam}
              className="mt-6 w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
            >
              {submittingExam ? 'Submitting...' : 'Submit Exam'}
            </button>
          </div>
        );

      case MaterialType.PDF:
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold">{selectedMaterial.title}</h2>
              {selectedMaterial.isFinalExam && (
                <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-semibold">
                  🏆 FINAL EXAM
                </span>
              )}
            </div>
            {selectedMaterial.description && (
              <p className="text-gray-600 mb-4">{selectedMaterial.description}</p>
            )}
            {pdf && pdf.length > 0 && (
              <div className="space-y-4">
                {pdf.map((pdfFile, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 p-3 flex justify-between items-center">
                      <span className="font-medium">PDF Document {index + 1}</span>
                      <a
                        href={pdfFile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Open in New Tab →
                      </a>
                    </div>
                    <iframe
                      src={pdfFile.url}
                      className="w-full h-[600px]"
                      title={`PDF ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}
            {!selectedMaterial.isCompleted && (
              <button
                onClick={() => markAsCompleted(MaterialType.PDF)}
                className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Mark as Completed
              </button>
            )}
          </div>
        );

      default:
        return <p>Unsupported material type</p>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <FaSpinner className="animate-spin text-4xl text-blue-600" />
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
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
            >
              <FaArrowLeft /> Back to Course
            </button>
            
            {/* Progress Bar */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Overall Progress</h3>
                <span className="text-sm font-bold text-blue-600">{overallProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar - Class and Material List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Course Content</h2>
                
                <div className="space-y-2">
                  {courseStructure.map((classDoc) => (
                    <div key={classDoc._id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Class Header */}
                      <button
                        onClick={() => toggleClassExpansion(classDoc._id)}
                        className={`w-full flex items-center justify-between p-3 transition-colors ${
                          !classDoc.isUnlocked 
                            ? 'bg-gray-100 cursor-not-allowed'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                        disabled={!classDoc.isUnlocked}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {classDoc.isUnlocked ? (
                            classDoc.isCompleted ? (
                              <FaCheckCircle className="text-green-600 flex-shrink-0" />
                            ) : (
                              <FaUnlock className="text-blue-600 flex-shrink-0" />
                            )
                          ) : (
                            <FaLock className="text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 text-left">
                            <p className={`font-semibold text-sm ${!classDoc.isUnlocked ? 'text-gray-400' : ''}`}>
                              {classDoc.title}
                              {classDoc.isFinalExam && (
                                <FaTrophy className="inline ml-2 text-yellow-500" />
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {classDoc.materials.length} materials
                            </p>
                          </div>
                        </div>
                        {expandedClasses[classDoc._id] ? <FaChevronDown /> : <FaChevronRight />}
                      </button>
                      
                      {/* Materials List */}
                      {expandedClasses[classDoc._id] && (
                        <div className="border-t border-gray-200 bg-gray-50">
                          {classDoc.materials.map((material) => (
                            <button
                              key={material._id}
                              onClick={() => selectMaterial(classDoc, material)}
                              disabled={!material.isUnlocked}
                              className={`w-full flex items-center gap-3 p-3 border-b border-gray-200 last:border-b-0 transition-colors ${
                                !material.isUnlocked
                                  ? 'cursor-not-allowed opacity-50'
                                  : selectedMaterial?._id === material._id
                                  ? 'bg-blue-50 border-l-4 border-l-blue-600'
                                  : 'hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex-shrink-0">
                                {material.isCompleted ? (
                                  <FaCheckCircle className="text-green-600" />
                                ) : material.isUnlocked ? (
                                  getMaterialIcon(material.materialType)
                                ) : (
                                  <FaLock className="text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{material.title}</p>
                                  {material.isFinalExam && (
                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-semibold">
                                      🏆 FINAL
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 capitalize">{material.materialType}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6 min-h-[600px]">
                {renderMaterialContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CourseLearning;
