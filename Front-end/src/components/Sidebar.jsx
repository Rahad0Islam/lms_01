import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaHome,
  FaBook,
  FaWallet,
  FaChartLine,
  FaUserGraduate,
  FaCog,
  FaPlus,
  FaCheckCircle,
  FaCertificate,
  FaUsers,
} from 'react-icons/fa';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const learnerLinks = [
    { path: '/', icon: FaHome, label: 'Home' },
    { path: '/dashboard', icon: FaChartLine, label: 'Dashboard' },
    { path: '/courses', icon: FaBook, label: 'Browse Courses' },
    { path: '/my-courses', icon: FaUserGraduate, label: 'My Courses' },
    { path: '/bank-setup', icon: FaWallet, label: 'Bank Setup' },
    { path: '/certificates', icon: FaCertificate, label: 'Certificates' },
  ];

  const instructorLinks = [
    { path: '/', icon: FaHome, label: 'Home' },
    { path: '/dashboard', icon: FaChartLine, label: 'Dashboard' },
    { path: '/courses', icon: FaBook, label: 'Browse Courses' },
    { path: '/my-courses', icon: FaUserGraduate, label: 'My Courses' },
    { path: '/instructor/add-course', icon: FaPlus, label: 'Add Course' },
    { path: '/instructor/my-courses', icon: FaCog, label: 'Manage Courses' },
    { path: '/bank-setup', icon: FaWallet, label: 'Bank Setup' },
  ];

  const adminLinks = [
    { path: '/', icon: FaHome, label: 'Home' },
    { path: '/dashboard', icon: FaChartLine, label: 'Dashboard' },
    { path: '/admin/courses', icon: FaBook, label: 'All Courses' },
    { path: '/instructor/add-course', icon: FaPlus, label: 'Add Course' },
    { path: '/admin/approve-courses', icon: FaCheckCircle, label: 'Approve Courses' },
    { path: '/admin/approve-enrollments', icon: FaUsers, label: 'Approve Enrollments' },
    { path: '/admin/issue-certificates', icon: FaCertificate, label: 'Issue Certificates' },
    { path: '/bank-setup', icon: FaWallet, label: 'Bank Setup' },
  ];

  let links = learnerLinks;
  if (user?.Role === 'instructor') links = instructorLinks;
  if (user?.Role === 'admin') links = adminLinks;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-gradient-to-b from-primary-600 to-primary-800 text-white w-64 transform transition-transform duration-300 z-40 overflow-hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-6 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-primary-400 scrollbar-track-primary-700 hover:scrollbar-thumb-primary-300">
          <div className="mb-8">
            <h3 className="text-xl font-bold">{user?.FullName}</h3>
            <p className="text-primary-200 text-sm capitalize">{user?.Role}</p>
            <p className="text-primary-200 text-sm mt-2">
              Balance: ৳{user?.balance || 0}
            </p>
          </div>

          <nav className="space-y-2 pb-4">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive(link.path)
                      ? 'bg-white text-primary-700 shadow-lg'
                      : 'hover:bg-primary-700 text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
