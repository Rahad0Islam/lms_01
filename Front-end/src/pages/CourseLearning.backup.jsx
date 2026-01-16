import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { courseAPI, materialAPI, progressAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  FaSpinner, 
  FaBook, 
  FaArrowLeft, 
  FaFileAlt, 
  FaVideo, 
  FaImage, 
  FaMusic, 
  FaQuestionCircle,
  FaCheckCircle,
  FaChevronRight,
  FaTimes,
  FaClock
} from 'react-icons/fa';

const MaterialType = {
  TEXT: 'text',
  VIDEO: 'video',
  IMAGE: 'image',
  AUDIO: 'audio',
  MCQ: 'mcq'
};

const CourseLearning = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [showResults, setShowResults] = useState({});
  const [examStarted, setExamStarted] = useState({});
  const [timeRemaining, setTimeRemaining] = useState({});
  const [timerIntervals, setTimerIntervals] = useState({});
  const [examResults, setExamResults] = useState({}); // Store previously taken exam results
  const [submittingExam, setSubmittingExam] = useState(false);

  useEffect(() => {
    fetchCourseAndMaterials();
    
    // Cleanup timers on unmount
    return () => {
      Object.values(timerIntervals).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, [id]);

  const startExam = (materialId, duration) => {
    setExamStarted({
      ...examStarted,
      [materialId]: true
    });
    
    const durationInSeconds = duration * 60;
    setTimeRemaining({
      ...timeRemaining,
      [materialId]: durationInSeconds
    });
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = (prev[materialId] || 0) - 1;
        
        if (newTime <= 0) {
          clearInterval(interval);
          // Auto-submit when time runs out
          const material = materials.find(m => m._id === materialId);
          if (material) {
            checkMcqAnswers(materialId, material);
          }
          toast.error('Time is up! Exam submitted automatically.');
          return { ...prev, [materialId]: 0 };
        }
        
        return { ...prev, [materialId]: newTime };
      });
    }, 1000);
    
    setTimerIntervals({
      ...timerIntervals,
      [materialId]: interval
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchCourseAndMaterials = async () => {
    try {
      const [courseRes, materialsRes] = await Promise.all([
        courseAPI.getCourseById(id),
        materialAPI.getMaterialsByCourse(id)
      ]);
      
      const courseData = courseRes.data.data.course;
      const enrollmentStatus = courseRes.data.data.enrollmentStatus;
      
      // Check if user has access
      if (!enrollmentStatus?.isEnrolled || enrollmentStatus?.paymentStatus !== 'paid') {
        toast.error('You do not have access to this course');
        navigate(`/course/${id}`);
        return;
      }
      
      setCourse(courseData);
      const materialsData = materialsRes.data.data || [];
      setMaterials(materialsData);
      
      // Fetch exam results for MCQ materials
      const mcqMaterials = materialsData.filter(m => m.materialType === 'mcq');
      const resultPromises = mcqMaterials.map(material => 
        progressAPI.getExamResult(material._id).catch(() => ({ data: { data: null } }))
      );
      
      const results = await Promise.all(resultPromises);
      const examResultsMap = {};
      
      results.forEach((res, index) => {
        if (res.data.data) {
          examResultsMap[mcqMaterials[index]._id] = res.data.data;
        }
      });
      
      setExamResults(examResultsMap);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error(error.response?.data?.message || 'Failed to load course materials');
      navigate(`/course/${id}`);
    }
  };

  const handleMcqAnswer = (materialId, questionIndex, answerIndex) => {
    setMcqAnswers({
      ...mcqAnswers,
      [`${materialId}-${questionIndex}`]: answerIndex
    });
  };

  const checkMcqAnswers = async (materialId, material) => {
    // Prevent submission if already taken
    if (examResults[materialId]) {
      toast.error('You have already taken this exam!');
      return;
    }

    if (submittingExam) {
      return; // Prevent double submission
    }

    // Stop the timer
    if (timerIntervals[materialId]) {
      clearInterval(timerIntervals[materialId]);
    }
    
    setSubmittingExam(true);
    
    try {
      // Prepare answers array
      const answers = material.questions.map((question, qIndex) => ({
        questionIndex: qIndex,
        selectedAnswer: mcqAnswers[`${materialId}-${qIndex}`] !== undefined 
          ? material.questions[qIndex].options[mcqAnswers[`${materialId}-${qIndex}`]]
          : ''
      }));

      // Calculate time taken
      const duration = material.mcqDuration || 5;
      const totalSeconds = duration * 60;
      const timeTaken = totalSeconds - (timeRemaining[materialId] || 0);

      // Submit exam to backend
      const response = await progressAPI.submitExam({
        courseID: id,
        materialID: materialId,
        answers,
        timeTaken
      });

      const examResult = response.data.data;
      
      // Update local exam results
      setExamResults({
        ...examResults,
        [materialId]: examResult
      });

      // Show success message
      toast.success(`Exam submitted! Score: ${examResult.correctAnswers}/${examResult.totalQuestions} (${examResult.score.toFixed(1)}%)`);
      
      // Refresh course materials to update progress
      fetchCourseAndMaterials();
      
    } catch (error) {
      console.error('Error submitting exam:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit exam';
      toast.error(errorMessage);
      
      // If already taken, fetch the result
      if (error.response?.status === 400 && errorMessage.includes('already taken')) {
        try {
          const resultRes = await progressAPI.getExamResult(materialId);
          if (resultRes.data.data) {
            setExamResults({
              ...examResults,
              [materialId]: resultRes.data.data
            });
          }
        } catch (fetchError) {
          console.error('Error fetching exam result:', fetchError);
        }
      }
    } finally {
      setSubmittingExam(false);
    }
  };

  const handleNextMaterial = () => {
    if (currentMaterialIndex < materials.length - 1) {
      setCurrentMaterialIndex(currentMaterialIndex + 1);
    }
  };

  const handlePreviousMaterial = () => {
    if (currentMaterialIndex > 0) {
      setCurrentMaterialIndex(currentMaterialIndex - 1);
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

  const renderMaterialContent = (material) => {
    const materialType = material.materialType;

    switch (materialType) {
      case MaterialType.TEXT:
        return (
          <div className="prose max-w-none">
            <div className="bg-white p-6 rounded-lg whitespace-pre-wrap">
              {material.text}
            </div>
          </div>
        );

      case MaterialType.VIDEO:
        return (
          <div className="space-y-4">
            {material.video?.map((vid, index) => (
              <div key={index} className="bg-black rounded-lg overflow-hidden">
                <video 
                  controls 
                  className="w-full"
                  src={vid.url}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ))}
          </div>
        );

      case MaterialType.IMAGE:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {material.picture?.map((img, index) => (
              <div key={index} className="rounded-lg overflow-hidden">
                <img 
                  src={img.url} 
                  alt={`${material.title} - ${index + 1}`}
                  className="w-full h-auto"
                />
              </div>
            ))}
          </div>
        );

      case MaterialType.AUDIO:
        return (
          <div className="space-y-4">
            {material.audio?.map((aud, index) => (
              <div key={index} className="bg-gray-100 p-4 rounded-lg">
                <audio 
                  controls 
                  className="w-full"
                  src={aud.url}
                >
                  Your browser does not support the audio tag.
                </audio>
              </div>
            ))}
          </div>
        );

      case MaterialType.MCQ:
        if (!material.questions || material.questions.length === 0) {
          return <p className="text-gray-500">No questions available</p>;
        }
        
        const existingResult = examResults[material._id];
        const isExamStarted = examStarted[material._id];
        const timeLeft = timeRemaining[material._id];
        const duration = material.mcqDuration || material.questions.length;
        
        // Show exam result if already taken
        if (existingResult) {
          return (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-lg border-2 border-green-300">
                <div className="flex items-center justify-center mb-4">
                  <FaCheckCircle className="text-6xl text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-center text-gray-900 mb-4">
                  Exam Completed
                </h3>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="bg-white p-4 rounded-lg text-center">
                    <p className="text-gray-600 text-sm mb-1">Score</p>
                    <p className="text-3xl font-bold text-green-600">
                      {existingResult.score.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-center">
                    <p className="text-gray-600 text-sm mb-1">Correct Answers</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {existingResult.correctAnswers}/{existingResult.totalQuestions}
                    </p>
                  </div>
                </div>
                <p className="text-center text-gray-600 mt-4">
                  Completed on: {new Date(existingResult.completedAt).toLocaleString()}
                </p>
                <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg mt-6">
                  <p className="text-yellow-800 text-center font-semibold">
                    ℹ️ You can only take this exam once. Your result has been saved.
                  </p>
                </div>
              </div>
              
              {/* Show questions with answers for review */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h4 className="text-xl font-bold text-gray-900 mb-4">Review Your Answers</h4>
                <div className="space-y-6">
                  {material.questions.map((question, qIndex) => {
                    const userAnswerObj = existingResult.answers.find(a => a.questionIndex === qIndex);
                    const correctAnswer = question.answer;
                    
                    return (
                      <div key={qIndex} className="border-b border-gray-200 pb-4 last:border-b-0">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold">
                            {qIndex + 1}
                          </span>
                          <h5 className="text-lg font-semibold text-gray-900 flex-1">
                            {question.question}
                          </h5>
                          {userAnswerObj?.isCorrect ? (
                            <FaCheckCircle className="text-green-600 text-2xl" />
                          ) : (
                            <FaTimes className="text-red-600 text-2xl" />
                          )}
                        </div>
                        
                        <div className="ml-11 space-y-2">
                          {question.options?.map((option, optIndex) => {
                            const isCorrect = option === correctAnswer;
                            const isUserAnswer = option === userAnswerObj?.selectedAnswer;
                            
                            let optionClass = 'bg-gray-50 border-gray-300';
                            if (isCorrect) {
                              optionClass = 'bg-green-100 border-green-500 font-semibold';
                            } else if (isUserAnswer && !isCorrect) {
                              optionClass = 'bg-red-100 border-red-500';
                            }
                            
                            return (
                              <div
                                key={optIndex}
                                className={`flex items-center p-3 border rounded-lg ${optionClass}`}
                              >
                                <span className="flex-1">{option}</span>
                                {isCorrect && (
                                  <span className="text-green-600 text-sm ml-2">✓ Correct Answer</span>
                                )}
                                {isUserAnswer && !isCorrect && (
                                  <span className="text-red-600 text-sm ml-2">✗ Your Answer</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }
        
        // Show Start Exam button if exam hasn't started
        if (!isExamStarted) {
          return (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-lg text-center">
              <FaQuestionCircle className="text-6xl text-blue-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">MCQ Exam</h3>
              <p className="text-gray-600 mb-2">
                Questions: {material.questions.length}
              </p>
              <p className="text-gray-600 mb-6">
                Duration: {duration} minutes
              </p>
              <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg mb-6">
                <p className="text-yellow-800 font-semibold">⚠️ Important Instructions:</p>
                <ul className="text-left text-yellow-700 mt-2 space-y-1">
                  <li>• Once started, the timer will begin automatically</li>
                  <li>• You can only take this exam ONCE</li>
                  <li>• The exam will auto-submit when time expires</li>
                  <li>• Your answers will be saved permanently</li>
                  <li>• Make sure you have a stable internet connection</li>
                </ul>
              </div>
              <button
                onClick={() => startExam(material._id, duration)}
                className="btn-primary text-lg px-8 py-3"
              >
                Start Exam
              </button>
            </div>
          );
        }
        
        return (
          <div className="space-y-6">
            {/* Timer Display - Sticky on right */}
            {isExamStarted && (
              <div className="fixed top-24 right-8 z-50">
                <div className={`p-4 rounded-lg shadow-lg ${
                  timeLeft <= 60 ? 'bg-red-100 border-2 border-red-500 animate-pulse' : 'bg-white border-2 border-blue-500'
                }`}>
                  <p className="text-sm text-gray-600 mb-1">Time Remaining</p>
                  <p className={`text-3xl font-bold ${
                    timeLeft <= 60 ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {formatTime(timeLeft)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {timeLeft <= 60 ? 'Hurry up!' : 'Keep going!'}
                  </p>
                </div>
              </div>
            )}
            
            {material.questions.map((question, qIndex) => {
              const userAnswer = mcqAnswers[`${material._id}-${qIndex}`];
              
              return (
                <div key={qIndex} className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold">
                      {qIndex + 1}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 flex-1">
                      {question.question}
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {question.options?.map((option, optIndex) => {
                      const isSelected = userAnswer === optIndex;
                      const optionClass = isSelected 
                        ? 'bg-blue-100 border-blue-500' 
                        : 'bg-gray-50 border-gray-300 hover:bg-gray-100';
                      
                      return (
                        <label
                          key={optIndex}
                          className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${optionClass}`}
                        >
                          <input
                            type="radio"
                            name={`mcq-${material._id}-${qIndex}`}
                            value={optIndex}
                            checked={isSelected}
                            onChange={() => handleMcqAnswer(material._id, qIndex, optIndex)}
                            className="mr-3"
                          />
                          <span className="flex-1">{option}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            <button
              onClick={() => checkMcqAnswers(material._id, material)}
              disabled={submittingExam}
              className="btn-primary w-full disabled:opacity-50"
            >
              {submittingExam ? 'Submitting...' : 'Submit Answers'}
            </button>
          </div>
        );

      default:
        return <p className="text-gray-500">Unsupported material type</p>;
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

  if (materials.length === 0) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate(`/course/${id}`)}
            className="text-primary-600 hover:text-primary-700 mb-4 flex items-center"
          >
            <FaArrowLeft className="mr-2" />
            Back to Course
          </button>
          <div className="card text-center py-12">
            <FaBook className="text-6xl text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Materials Yet</h2>
            <p className="text-gray-500">The instructor hasn't added any materials to this course yet.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const currentMaterial = materials[currentMaterialIndex];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate(`/course/${id}`)}
          className="text-primary-600 hover:text-primary-700 mb-4 flex items-center"
        >
          <FaArrowLeft className="mr-2" />
          Back to Course
        </button>

        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {course?.title}
          </h1>
          <p className="text-gray-600">
            Material {currentMaterialIndex + 1} of {materials.length}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Material List */}
          <div className="lg:col-span-1">
            <div className="card sticky top-4">
              <h3 className="font-bold text-gray-900 mb-4">Course Content</h3>
              <div className="space-y-2">
                {materials.map((material, index) => (
                  <button
                    key={material._id}
                    onClick={() => setCurrentMaterialIndex(index)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-center ${
                      index === currentMaterialIndex
                        ? 'bg-primary-100 text-primary-700 font-semibold'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="text-xl mr-3">
                      {getMaterialIcon(material.materialType)}
                    </span>
                    <span className="flex-1 text-sm">{material.title}</span>
                    {index === currentMaterialIndex && (
                      <FaChevronRight className="ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="card">
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-3">
                    {getMaterialIcon(currentMaterial.materialType)}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentMaterial.title}
                  </h2>
                </div>
                {currentMaterial.description && (
                  <p className="text-gray-600">{currentMaterial.description}</p>
                )}
              </div>

              {/* Material Content */}
              <div className="mb-6">
                {renderMaterialContent(currentMaterial)}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center pt-6 border-t">
                <button
                  onClick={handlePreviousMaterial}
                  disabled={currentMaterialIndex === 0}
                  className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaArrowLeft className="inline mr-2" />
                  Previous
                </button>
                <span className="text-gray-600">
                  {currentMaterialIndex + 1} / {materials.length}
                </span>
                <button
                  onClick={handleNextMaterial}
                  disabled={currentMaterialIndex === materials.length - 1}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <FaChevronRight className="inline ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CourseLearning;
