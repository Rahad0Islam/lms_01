# Certificate System - Quick Setup Checklist

## ✅ Files Created/Modified

### Backend Files:
- [x] `Back-end/src/Models/certificate.model.js` - Updated with status tracking
- [x] `Back-end/src/Controllers/certificate.controller.js` - NEW FILE - Complete certificate logic
- [x] `Back-end/src/Routes/course.Route.js` - Added certificate routes

### Frontend Files:
- [x] `Front-end/src/services/api.js` - Updated with certificate API methods
- [x] `Front-end/src/pages/Certificates.jsx` - Complete redesign with 3 sections
- [x] `Front-end/src/pages/admin/IssueCertificates.jsx` - Complete redesign for admin

### Documentation:
- [x] `CERTIFICATE_SYSTEM_GUIDE.md` - Complete implementation guide

---

## 🚀 Installation Steps

### 1. Install Frontend Dependencies (if not already installed)
```bash
cd Front-end
npm install html2canvas jspdf
```

### 2. Restart Backend Server
```bash
cd Back-end
npm run dev
# or
npm start
```

### 3. Restart Frontend Server
```bash
cd Front-end
npm run dev
# or
npm start
```

---

## 🧪 Quick Test Guide

### Test 1: Check API Endpoints
Use Postman or Thunder Client to test:

1. **Check Eligibility** (Student)
   ```
   GET http://localhost:5000/api/course/certificateEligibility/:courseID
   Headers: Authorization: Bearer <student_token>
   ```

2. **Request Certificate** (Student)
   ```
   POST http://localhost:5000/api/course/requestCertificate
   Headers: Authorization: Bearer <student_token>
   Body: { "courseID": "course_id_here" }
   ```

3. **Get Pending Requests** (Admin)
   ```
   GET http://localhost:5000/api/course/pendingCertificates
   Headers: Authorization: Bearer <admin_token>
   ```

4. **Approve Certificate** (Admin)
   ```
   PATCH http://localhost:5000/api/course/approveCertificate/:certificateID
   Headers: Authorization: Bearer <admin_token>
   ```

### Test 2: Frontend Flow

**Student Flow:**
1. Login as student
2. Navigate to "My Certificates" page
3. Check if any courses show in "Ready to Request Certificate" section
4. Click "Request Certificate"
5. Check "Pending Approval" section

**Admin Flow:**
1. Login as admin
2. Navigate to "Issue Certificates" page (from admin dashboard)
3. Click "Pending" tab
4. Review student request
5. Click "Approve Certificate" or "Reject Request"

**Student Verification:**
1. Refresh "My Certificates" page
2. Check "My Certificates" section for approved certificate
3. Click "View" to see certificate
4. Click "Download" to save as PDF

---

## 🔍 Verification Checklist

### Database:
- [ ] Certificate model has new fields (status, requestedAt, issuedAt, approvedBy, rejectionReason)
- [ ] Enrollment model has certificateIssued and certificateID fields

### Backend:
- [ ] All certificate routes are registered
- [ ] Certificate controller exports all functions
- [ ] No compilation errors in backend

### Frontend:
- [ ] No compilation errors in frontend
- [ ] Certificates page loads without errors
- [ ] Admin certificate page loads without errors
- [ ] API service has all certificate methods

---

## 🎯 Expected Behavior

### When Student Requests Certificate:
1. Status shows as "Pending"
2. Course moves to "Pending Approval" section
3. Admin sees request in pending tab
4. Student cannot request again for same course

### When Admin Approves:
1. Certificate status changes to "approved"
2. issuedAt date is set
3. Enrollment.certificateIssued becomes true
4. Student sees certificate in "My Certificates"
5. Student can view and download PDF

### When Admin Rejects:
1. Certificate status changes to "rejected"
2. Rejection reason is saved
3. Student cannot see certificate
4. Student would need to contact admin

---

## 🐛 Troubleshooting

### Backend Issues:

**Error: "Certificate model not found"**
- Check if certificate.model.js is in Models folder
- Verify export statement: `export const Certificate = ...`

**Error: "Certificate controller function not found"**
- Check if certificate.controller.js exports the function
- Verify import in course.Route.js

**Error: "Route not found"**
- Check if routes are registered in course.Route.js
- Verify route paths match API calls

### Frontend Issues:

**Certificates page not loading:**
- Check browser console for errors
- Verify API endpoints are correct
- Check if user is authenticated

**Request certificate fails:**
- Check if courseID is being passed correctly
- Verify eligibility first using checkEligibility endpoint
- Check backend logs for validation errors

**PDF download not working:**
- Ensure html2canvas and jspdf are installed
- Check browser console for errors
- Try simpler HTML first (remove gradients/complex CSS)

---

## 📊 Database Queries for Testing

### Check Certificate Records:
```javascript
// In MongoDB shell or Compass
db.certificates.find()

// Find pending certificates
db.certificates.find({ status: "pending" })

// Find approved certificates for a student
db.certificates.find({ 
  learnerID: ObjectId("student_id"),
  status: "approved"
})
```

### Manually Create Test Data (if needed):
```javascript
// Create a test certificate request
db.certificates.insertOne({
  courseID: ObjectId("your_course_id"),
  learnerID: ObjectId("your_student_id"),
  averageScore: 75.5,
  videoCompletionPercentage: 85.0,
  status: "pending",
  requestedAt: new Date(),
  certificateCode: "CERT-TEST-123456"
})
```

---

## 🎨 UI Components Overview

### Student Certificates Page (/certificates):
- **Section 1:** Eligible Courses (Green theme)
- **Section 2:** Pending Requests (Yellow theme)
- **Section 3:** Approved Certificates (Purple theme)

### Admin Certificate Management (/admin/issue-certificates):
- **Filter Tabs:** Pending, Approved, Rejected, All
- **Request Cards:** Show student info and scores
- **Action Buttons:** Approve (Green) / Reject (Red)
- **Rejection Modal:** Input for rejection reason

---

## 📝 Important Notes

1. **Final Exam Requirement:**
   - Student MUST complete the final exam before requesting
   - Final exam is identified by `isFinalExam: true` in Material model

2. **Eligibility Criteria:**
   - Video completion >= 80%
   - Average exam score >= 60%
   - Final exam score >= 60%

3. **One Certificate Per Course:**
   - Students can only get one certificate per course
   - Duplicate requests are prevented

4. **Admin Authorization:**
   - Only users with Role="admin" can approve/reject
   - Student endpoints verify ownership

5. **PDF Generation:**
   - Uses html2canvas to capture certificate
   - Converts to PDF using jsPDF
   - Downloads automatically to user's device

---

## 🎉 You're All Set!

Your certificate system is fully implemented and ready to use. The system includes:

✅ Student certificate request workflow
✅ Admin approval/rejection system
✅ Certificate viewing and PDF download
✅ Proper status tracking and validation
✅ Clean, responsive UI
✅ Complete error handling

For detailed information, refer to `CERTIFICATE_SYSTEM_GUIDE.md`

Happy Learning! 🎓
