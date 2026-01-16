# Migration Guide: Sequential Learning System

## Overview
This guide helps you migrate from the old flat material structure to the new class-based sequential system.

## Database Migration Script

Create a migration script to handle existing data:

```javascript
// migration-script.js
import mongoose from 'mongoose';
import { Course } from './src/Models/Course.model.js';
import { Material } from './src/Models/material.model.js';
import { Class } from './src/Models/class.model.js';
import { Progress } from './src/Models/progress.model.js';

async function migrateToSequentialSystem() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Get all courses
    const courses = await Course.find({});
    console.log(`Found ${courses.length} courses to migrate`);

    for (const course of courses) {
      console.log(`\nMigrating course: ${course.title}`);
      
      // Check if course already has classes
      const existingClasses = await Class.find({ courseID: course._id });
      if (existingClasses.length > 0) {
        console.log(`  Course already has ${existingClasses.length} classes, skipping`);
        continue;
      }

      // Get all materials for this course without classID
      const oldMaterials = await Material.find({ 
        courseID: course._id,
        classID: { $exists: false }
      });

      if (oldMaterials.length === 0) {
        console.log('  No old materials to migrate');
        continue;
      }

      console.log(`  Found ${oldMaterials.length} materials to migrate`);

      // Create a default class for existing materials
      const defaultClass = await Class.create({
        courseID: course._id,
        title: 'Main Content',
        description: 'All course materials',
        order: 0,
        isFinalExam: false,
        isEnabled: true,
        createdBy: course.owner
      });

      console.log(`  Created default class: ${defaultClass._id}`);

      // Update all materials to belong to this class
      let materialOrder = 0;
      for (const material of oldMaterials) {
        // Add classID and order to material
        material.classID = defaultClass._id;
        material.order = materialOrder;
        
        // Ensure title exists
        if (!material.title || material.title.trim() === '') {
          material.title = `Material ${materialOrder + 1}`;
        }
        
        // Ensure description exists
        if (!material.description) {
          material.description = '';
        }

        await material.save({ validateBeforeSave: false });
        materialOrder++;
        console.log(`    Updated material ${materialOrder}: ${material.title}`);
      }

      // Update progress records to include classID
      const progressRecords = await Progress.find({ courseID: course._id });
      for (const progress of progressRecords) {
        if (!progress.classID && progress.materialID) {
          const material = await Material.findById(progress.materialID);
          if (material && material.classID) {
            progress.classID = material.classID;
            await progress.save({ validateBeforeSave: false });
          }
        }
      }

      console.log(`  ✓ Successfully migrated course: ${course.title}`);
    }

    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateToSequentialSystem();
```

## Running the Migration

1. **Backup your database first!**
   ```bash
   mongodump --uri="your_mongodb_uri" --out=./backup
   ```

2. **Create the migration script:**
   ```bash
   cd Back-end
   touch migrate-sequential-system.js
   # Copy the script above into this file
   ```

3. **Run the migration:**
   ```bash
   node migrate-sequential-system.js
   ```

4. **Verify the migration:**
   - Check that all materials now have `classID` and `order`
   - Verify classes were created for each course
   - Confirm progress records updated

## Manual Migration Steps (Alternative)

If you prefer manual migration or have a small dataset:

### Step 1: For Each Course

1. **View materials:**
   ```javascript
   db.materials.find({ courseID: ObjectId("your_course_id") })
   ```

2. **Create a default class:**
   ```javascript
   db.classes.insertOne({
     courseID: ObjectId("your_course_id"),
     title: "Main Content",
     description: "",
     order: 0,
     isFinalExam: false,
     isEnabled: true,
     createdBy: ObjectId("instructor_id"),
     createdAt: new Date(),
     updatedAt: new Date()
   })
   ```

3. **Update materials:**
   ```javascript
   db.materials.updateMany(
     { 
       courseID: ObjectId("your_course_id"),
       classID: { $exists: false }
     },
     {
       $set: { 
         classID: ObjectId("class_id_from_step_2"),
         order: 0  // Update individually with correct order
       }
     }
   )
   ```

### Step 2: Fix Missing Titles

```javascript
// Find materials without titles
db.materials.find({ 
  $or: [
    { title: { $exists: false } },
    { title: "" },
    { title: null }
  ]
})

// Update them
db.materials.updateMany(
  { title: { $exists: false } },
  { $set: { title: "Untitled Material" } }
)
```

### Step 3: Update Progress Records

```javascript
// Add classID to existing progress records
const progressRecords = db.progress.find({}).toArray();

progressRecords.forEach(progress => {
  if (!progress.classID && progress.materialID) {
    const material = db.materials.findOne({ _id: progress.materialID });
    if (material && material.classID) {
      db.progress.updateOne(
        { _id: progress._id },
        { $set: { classID: material.classID } }
      );
    }
  }
});
```

## Post-Migration Checklist

- [ ] All materials have `classID` field
- [ ] All materials have `order` field
- [ ] All materials have non-empty `title`
- [ ] All courses have at least one class
- [ ] All progress records have `classID`
- [ ] No duplicate orders within same class
- [ ] Test frontend displays correctly
- [ ] Test material unlocking logic
- [ ] Test progress tracking

## Rollback Plan

If migration fails:

1. **Restore from backup:**
   ```bash
   mongorestore --uri="your_mongodb_uri" --drop ./backup
   ```

2. **Remove new schema fields:**
   ```javascript
   db.materials.updateMany({}, { $unset: { classID: "", order: "" } })
   db.progress.updateMany({}, { $unset: { classID: "", completedAt: "" } })
   db.classes.drop()
   ```

3. **Revert code:**
   ```bash
   git checkout HEAD~1  # or specific commit before migration
   ```

## Testing After Migration

### 1. Backend Tests

```bash
# Test class endpoints
curl -X GET http://localhost:8002/api/v1/class/course/COURSE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test structure endpoint
curl -X GET http://localhost:8002/api/v1/course/structure/COURSE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Frontend Tests

1. Navigate to a migrated course
2. Verify all materials display correctly
3. Check that first material is unlocked
4. Complete first material and verify second unlocks
5. Test video progress tracking
6. Test MCQ submission

### 3. Database Verification

```javascript
// Verify all materials have required fields
db.materials.find({
  $or: [
    { classID: { $exists: false } },
    { order: { $exists: false } },
    { title: { $exists: false } }
  ]
}).count()
// Should return 0

// Check for duplicate orders in same class
db.materials.aggregate([
  {
    $group: {
      _id: { classID: "$classID", order: "$order" },
      count: { $sum: 1 }
    }
  },
  { $match: { count: { $gt: 1 } } }
])
// Should return empty array
```

## Common Issues and Solutions

### Issue 1: Materials without classID
**Solution:** Run the migration script again, it will only process materials without classID

### Issue 2: Duplicate order numbers
**Solution:** Run order fix script:
```javascript
const classes = await Class.find({});
for (const classDoc of classes) {
  const materials = await Material.find({ classID: classDoc._id }).sort({ order: 1 });
  for (let i = 0; i < materials.length; i++) {
    materials[i].order = i;
    await materials[i].save({ validateBeforeSave: false });
  }
}
```

### Issue 3: Progress not updating
**Solution:** Clear progress cache and re-fetch:
```javascript
// In backend controller
const enrollment = await Enroll.findOne({ courseID, learnerID });
await updateCourseProgress(courseID, learnerID);
```

## New Course Creation

After migration, instructors should:

1. **Create courses with class structure from start:**
   - Add course
   - Add classes (Class 1, Class 2, etc.)
   - Add materials to each class
   - Optionally add final exam class

2. **Organize existing courses:**
   - Review migrated default class
   - Split into multiple classes if needed
   - Add final exam if applicable

## Support and Troubleshooting

If you encounter issues:

1. Check [SEQUENTIAL_LEARNING_SYSTEM.md](./SEQUENTIAL_LEARNING_SYSTEM.md) for system documentation
2. Review backend logs for error messages
3. Use MongoDB Compass to inspect data structure
4. Test with a single course before migrating all
5. Keep backup until migration is verified successful

## Timeline

Recommended migration timeline:

1. **Day 1:** Backup database, deploy code without running migration
2. **Day 2:** Run migration on staging/test environment
3. **Day 3:** Verify and test thoroughly
4. **Day 4:** Run migration on production (low-traffic time)
5. **Day 5:** Monitor and fix any issues

Total estimated time: 2-4 hours for small datasets, longer for large datasets.
