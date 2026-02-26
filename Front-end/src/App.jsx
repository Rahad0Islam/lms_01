import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Home from './pages/Home';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Common Pages
import Dashboard from './pages/Dashboard';
import BankSetup from './pages/BankSetup';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import CourseLearning from './pages/CourseLearning';

// Instructor Pages
import AddCourse from './pages/instructor/AddCourse';
import ManageCourses from './pages/instructor/ManageCourses';
import CourseMaterials from './pages/instructor/CourseMaterials';

// Admin Pages
import ApproveEnrollments from './pages/admin/ApproveEnrollments';
import ApproveCourses from './pages/admin/ApproveCourses';
import IssueCertificates from './pages/admin/IssueCertificates';

// Placeholder Pages
import MyCourses from './pages/MyCourses';
import Certificates from './pages/Certificates';
import Certificate from './pages/Certificate';
import Profile from './pages/Profile';
import Unauthorized from './pages/Unauthorized';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bank-setup"
        element={
          <ProtectedRoute>
            <BankSetup />
          </ProtectedRoute>
        }
      />

      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <Courses />
          </ProtectedRoute>
        }
      />

      <Route
        path="/course/:id"
        element={
          <ProtectedRoute>
            <CourseDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/course/:id/learn"
        element={
          <ProtectedRoute allowedRoles={['learner']}>
            <CourseLearning />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-courses"
        element={
          <ProtectedRoute>
            <MyCourses />
          </ProtectedRoute>
        }
      />

      <Route
        path="/certificates"
        element={
          <ProtectedRoute allowedRoles={['learner']}>
            <Certificates />
          </ProtectedRoute>
        }
      />

      <Route
        path="/certificate/:certificateID"
        element={
          <ProtectedRoute>
            <Certificate />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile/:id"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Instructor Routes */}
      <Route
        path="/instructor/add-course"
        element={
          <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <AddCourse />
          </ProtectedRoute>
        }
      />

      <Route
        path="/instructor/my-courses"
        element={
          <ProtectedRoute allowedRoles={['instructor']}>
            <ManageCourses />
          </ProtectedRoute>
        }
      />

      <Route
        path="/instructor/course/:courseId/materials"
        element={
          <ProtectedRoute allowedRoles={['instructor']}>
            <CourseMaterials />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/approve-courses"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ApproveCourses />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/approve-enrollments"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ApproveEnrollments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/issue-certificates"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <IssueCertificates />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/courses"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Courses />
          </ProtectedRoute>
        }
      />

      {/* Default Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
