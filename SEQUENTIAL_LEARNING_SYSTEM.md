# Sequential Course Material and Progress Tracking System

## Overview
This system implements a sequential learning approach where courses are delivered through classes, each containing multiple materials. Materials unlock progressively as students complete them.

## Architecture

### Database Models

#### 1. Class Model (`class.model.js`)
- Represents a class/module within a course
- **Fields:**
  - `courseID`: Reference to parent course
  - `title`: Class name
  - `description`: Class description
  - `order`: Sequential order (0, 1, 2, ...)
  - `isFinalExam`: Boolean flag for final exam class
  - `isEnabled`: Boolean - final exams start disabled, instructor enables when ready
  - `createdBy`: Instructor who created the class

#### 2. Material Model (Updated)
- **New Fields:**
  - `classID`: Reference to parent class (required)
  - `order`: Sequential order within the class (0, 1, 2, ...)
  - `title`: Now required
  - `description`: Now has default empty string
- **Existing Fields:** All previous material types (text, video, audio, image, mcq)

#### 3. Progress Model (Updated)
- **New Fields:**
  - `classID`: Reference to the class containing the material
  - `completedAt`: Timestamp when material was completed
- **Enhanced Indexes:** For efficient querying by course, learner, class, and material

### Locking Logic

#### Material Unlocking Rules:
1. **First material in first class**: Always unlocked
2. **Next material in same class**: Unlocks when previous material is completed
3. **First material in next class**: Unlocks when ALL materials in previous class are completed

#### Class Unlocking Rules:
1. **First class**: Always unlocked
2. **Subsequent classes**: Unlock when ALL materials in previous class are completed
3. **Final exam class**: Starts disabled (`isEnabled: false`), instructor must manually enable it

#### Completion Criteria:
- **Text/Image/Audio**: Mark as completed when student clicks "Mark as Completed"
- **Video**: Auto-completes when 80% watched
- **MCQ Exam**: Completes when submitted (one attempt only)

## Backend API

### Class Management Endpoints

#### POST `/api/v1/class/add`
Create a new class in a course
```json
{
  "courseID": "...",
  "title": "Introduction to React",
  "description": "Learn React basics",
  "isFinalExam": false
}
```

#### GET `/api/v1/class/course/:courseID`
Get all classes for a course (sorted by order)

#### PATCH `/api/v1/class/:classID`
Update class details
```json
{
  "title": "Updated Title",
  "description": "Updated Description",
  "isEnabled": true
}
```

#### DELETE `/api/v1/class/:classID`
Delete a class and all its materials

#### PATCH `/api/v1/class/enable-final/:classID`
Enable final exam (instructor only)

#### POST `/api/v1/class/reorder`
Reorder classes
```json
{
  "courseID": "...",
  "classOrders": [
    { "classID": "...", "order": 0 },
    { "classID": "...", "order": 1 }
  ]
}
```

### Material Management (Updated)

#### POST `/api/v1/course/contentUpload`
Now requires `classID` in addition to `courseID`
```json
{
  "courseID": "...",
  "classID": "...",
  "title": "Material Title",
  "description": "Optional description",
  "materialType": "video|text|audio|image|mcq",
  // ... other material-specific fields
}
```

### Progress Tracking Endpoints

#### GET `/api/v1/course/structure/:courseID`
Get complete course structure with lock status for current learner
**Returns:**
```json
{
  "structure": [
    {
      "_id": "classID",
      "title": "Class 1",
      "order": 0,
      "isUnlocked": true,
      "isCompleted": false,
      "isFinalExam": false,
      "materials": [
        {
          "_id": "materialID",
          "title": "Material 1",
          "materialType": "video",
          "order": 0,
          "isUnlocked": true,
          "isCompleted": false,
          "progress": { /* progress details */ },
          "examResult": null,
          // Material content (only if unlocked)
          "video": [...],
          "text": "...",
          // etc.
        }
      ]
    }
  ],
  "overallProgress": 45.5,
  "enrollment": { /* enrollment details */ }
}
```

#### POST `/api/v1/course/updateProgress`
Update progress for video/audio/text/image materials
```json
{
  "courseID": "...",
  "classID": "...",
  "materialID": "...",
  "watchedSeconds": 120,  // For videos
  "videoUrl": "..."       // For videos
}
```

#### POST `/api/v1/course/submitExam`
Submit MCQ exam (checks if material is unlocked)
```json
{
  "courseID": "...",
  "materialID": "...",
  "answers": [
    { "questionIndex": 0, "selectedAnswer": "Option A" }
  ],
  "timeTaken": 180
}
```

#### GET `/api/v1/course/learnerProgress/:courseID`
Get detailed progress for a learner

## Frontend Components

### CourseLearning.jsx (Rebuilt)
**Features:**
- Displays course structure with collapsible classes
- Shows lock/unlock status with icons:
  - 🔒 Locked (gray)
  - 🔓 Unlocked (blue)
  - ✓ Completed (green)
  - 🏆 Final Exam (yellow trophy)
- Progress bar showing overall completion
- Material viewer with type-specific rendering
- Timer for MCQ exams
- Auto-unlock next material/class on completion
- Prevents access to locked materials

### ManageCourseMaterials.jsx (New)
**For Instructors:**
- View all classes in a course
- Add/delete classes
- Add materials to specific classes
- Enable final exam when ready
- See material order within each class

## Usage Flow

### For Instructors:
1. Create course
2. Add classes (e.g., "Class 1: Introduction", "Class 2: Advanced Topics", "Final Exam")
3. Add materials to each class in desired order
4. Materials are auto-ordered (0, 1, 2...) as added
5. When students complete all regular classes, enable final exam

### For Students:
1. Enroll in course
2. Start with first material of first class
3. Complete materials sequentially
4. Watch next material/class unlock automatically
5. See overall progress bar
6. Complete final exam when enabled
7. Earn certificate upon 100% completion

## Key Helper Functions

### `checkMaterialUnlocked(courseID, materialID, learnerID)`
Determines if a material should be accessible:
1. Checks if parent class is enabled
2. Verifies all previous classes are completed
3. Verifies all previous materials in current class are completed

### `isClassCompleted(classID, learnerID)`
Checks if all materials in a class are completed

### `isMaterialCompleted(materialID, learnerID)`
Checks if a specific material is completed (handles MCQ vs other types)

### `updateCourseProgress(courseID, learnerID)`
Calculates overall course completion percentage and updates enrollment

## Testing Checklist

### Backend Testing:
- [ ] Create multiple classes in a course
- [ ] Add materials to different classes
- [ ] Verify material order within classes
- [ ] Test class deletion (should delete materials)
- [ ] Enable/disable final exam
- [ ] Get course structure with unlock status
- [ ] Submit progress updates
- [ ] Verify locking logic

### Frontend Testing:
- [ ] View course structure
- [ ] Verify locked materials are not accessible
- [ ] Complete materials and verify unlock
- [ ] Complete class and verify next class unlocks
- [ ] Test video progress tracking
- [ ] Test MCQ exam submission
- [ ] Test final exam enabling
- [ ] Verify progress bar updates

## Migration Notes

### Existing Data:
- Old materials without `classID` will need migration
- Create a default class for existing materials
- Set `order` for existing materials

### Breaking Changes:
- Material creation now requires `classID`
- Material creation now requires `title`
- Old progress API still exists but new structure API preferred

## Security Considerations

1. **Material Access Control**: Backend verifies unlock status before serving material content
2. **One-Time Exams**: MCQ exams can only be submitted once per learner
3. **Progress Validation**: All progress updates verify enrollment status
4. **Instructor Permissions**: Only course owner or admin can manage classes/materials

## Performance Optimizations

1. **Indexes**: Added compound indexes on (courseID, learnerID, materialID)
2. **Populated Queries**: Efficient population of class and material data
3. **Caching Opportunity**: Course structure can be cached with learner-specific unlock status
4. **Pagination**: For courses with many classes, consider pagination

## Future Enhancements

1. **Drag-and-Drop Reordering**: UI for reordering classes and materials
2. **Prerequisites**: Allow specific class dependencies beyond sequential
3. **Time Locks**: Unlock materials at specific dates/times
4. **Conditional Unlocking**: Based on exam scores (e.g., 70% to proceed)
5. **Learning Paths**: Multiple paths through content
6. **Analytics Dashboard**: Track where students get stuck
7. **Bulk Operations**: Import course structure from JSON/CSV
8. **Material Duplication**: Copy materials between classes
