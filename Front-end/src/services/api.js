import axios from 'axios';

const API_BASE_URL = 'http://localhost:8002/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          console.log('No refresh token found, redirecting to login');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        console.log('Attempting to refresh access token...');
        const response = await axios.post(`${API_BASE_URL}/users/renewaccestoken`, {
          RefreshToken: refreshToken,
        }, {
          withCredentials: true
        });

        const { AccessToken } = response.data.data;
        localStorage.setItem('accessToken', AccessToken);
        console.log('Access token refreshed successfully');

        originalRequest.headers.Authorization = `Bearer ${AccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.log('Token refresh failed:', refreshError.response?.data?.message || refreshError.message);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (formData) => api.post('/users/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  login: (credentials) => api.post('/users/login', credentials),
  logout: () => api.post('/users/logout'),
  changePassword: (data) => api.post('/users/changepassword', data),
  updateProfilePic: (formData) => api.patch('/users/UpdateProfilePicture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getUserProfile: (id) => api.get(`/users/profile/${id}`),
};

// Bank APIs
export const bankAPI = {
  addBankAccount: (data) => api.post('/users/addbankaccount', data),
  addBalance: (data) => api.post('/users/addBalance', data),
  getTransactions: () => api.get('/users/transactions'),
};

// Course APIs
export const courseAPI = {
  addCourse: (formData) => api.post('/course/addcourse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAllCourses: () => api.get('/course/allCourses'),
  getAvailableCourses: () => api.get('/course/availableCourses'),
  getPendingCourses: () => api.get('/course/pendingCourses'),
  getEnrolledCourses: () => api.get('/course/enrolledCourses'),
  getInstructorCourses: () => api.get('/course/instructorCourses'),
  getInstructorPendingEnrollments: () => api.get('/course/instructorPendingEnrollments'),
  getCourseById: (id) => api.get(`/course/${id}`),
  enrollCourse: (data) => api.post('/course/courseEnroll', data),
  rateCourse: (data) => api.post('/course/rateCourse', data),
  getCourseRating: (courseID) => api.get(`/course/rating/${courseID}`),
};

// Material APIs
export const materialAPI = {
  uploadMaterial: (formData) => api.post('/course/contentUpload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMaterialsByCourse: (courseID) => api.post('/course/getAllmaterialList', { courseID }),
  updateMaterial: (materialId, formData) => api.patch(`/course/material/${materialId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteMaterial: (materialId) => api.delete(`/course/material/${materialId}`),
};

// Admin APIs
export const adminAPI = {
  approveEnrollment: (data) => api.post('/course/approvedEnroll', data),
  approveCourse: (data) => api.post('/course/approvedCourse', data),
  issueCertificate: (data) => api.post('/course/issueCertificate', data),
  getPendingEnrollments: () => api.get('/course/pendingEnrollments'),
};

// Progress API
export const progressAPI = {
  getCourseStructure: (courseID) => api.get(`/course/structure/${courseID}`),
  getLearnerProgress: (courseID) => api.get(`/course/learnerProgress/${courseID}`),
  updateProgress: (data) => api.post('/course/updateProgress', data),
  submitExam: (data) => api.post('/course/submitExam', data),
  getExamResult: (materialID) => api.get(`/course/examResult/${materialID}`),
};

// Class API
export const classAPI = {
  addClass: (data) => api.post('/class/add', data),
  getClassesByCourse: (courseID) => api.get(`/class/course/${courseID}`),
  updateClass: (classID, data) => api.patch(`/class/${classID}`, data),
  deleteClass: (classID) => api.delete(`/class/${classID}`),
  reorderClasses: (data) => api.post('/class/reorder', data),
  enableFinalExam: (classID) => api.patch(`/class/enable-final/${classID}`),
};

// Certificate API
export const certificateAPI = {
  checkEligibility: (courseID) => api.get(`/course/certificateEligibility/${courseID}`),
  generateCertificate: (data) => api.post('/course/generateCertificate', data),
  getCertificate: (certificateID) => api.get(`/course/certificate/${certificateID}`),
  getMyCertificates: () => api.get('/course/myCertificates'),
};

export default api;
