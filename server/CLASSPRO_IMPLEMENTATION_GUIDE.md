# ClassPro-Inspired Features Implementation Guide

## Overview
This guide documents the implementation of ClassPro-inspired features for S2 Class Portal, including timetable generation, attendance prediction, and calendar integration.

## Completed Components

### 1. Timetable Generator Utility (`client/src/utils/timetableGenerator.ts`)

**Features:**
- Intelligent timetable generation from class schedules
- Time conflict detection
- Free period identification
- Color-coded slots by subject
- iCal export for calendar integration
- Timetable statistics and analysis

**Key Functions:**
- `generateTimetable(slots)` - Creates optimized timetable
- `getFreeSlotsForDay(day)` - Identifies free time
- `optimizeTimetable(slots)` - Minimizes gaps
- `getTimetableStats(timetable)` - Get analytics
- `exportTimetableToICal()` - Calendar export

### 2. Attendance Prediction Utility (`client/src/utils/attendancePrediction.ts`)

**Features:**
- Predicts final attendance percentage
- Calculates recommended classes to attend
- Determines risk levels (High/Medium/Low)
- Tracks attendance trends
- Batch processing for multiple courses
- Detailed analysis generation

**Key Functions:**
- `predictAttendance()` - Single course prediction
- `predictBatchAttendance()` - Multiple courses
- `getAttendanceTrend()` - Trend analysis
- `calculateMissingClassesImpact()` - Impact analysis
- `generateAttendanceReport()` - Report generation

## API Endpoints Required

### Backend Routes to Create

```
# Timetable Endpoints
GET  /api/timetable/generate - Generate timetable
GET  /api/timetable/slots - Get raw slot data
GET  /api/timetable/conflicts - Get scheduling conflicts
GET  /api/timetable/export?format=ical - Export calendar

# Attendance Endpoints  
GET  /api/attendance/predict - Get attendance predictions
GET  /api/attendance/trends - Get attendance trends
GET  /api/attendance/analysis/:courseCode - Detailed analysis
GET  /api/attendance/report - Generate report
POST /api/attendance/leave - Record leave days

# Analytics Endpoints
GET  /api/analytics/course-stats - Course statistics
GET  /api/analytics/dashboard - Dashboard data
```

## Database Schema Additions

### Tables to Add/Modify

```sql
-- Timetable Slots
CREATE TABLE timetable_slots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  course_code VARCHAR(20),
  course_name VARCHAR(100),
  instructor VARCHAR(100),
  venue VARCHAR(50),
  start_time TIME,
  end_time TIME,
  day_of_week INT, -- 0-5 (Monday-Saturday)
  slot_type ENUM('Lecture', 'Lab', 'Tutorial'),
  credits INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Predictions
CREATE TABLE attendance_predictions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  course_code VARCHAR(20),
  current_attendance DECIMAL(5,2),
  predicted_attendance DECIMAL(5,2),
  status ENUM('At Risk', 'On Track', 'Excellent'),
  recommended_classes INT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave Records
CREATE TABLE leave_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  course_code VARCHAR(20),
  leave_date DATE,
  reason VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Frontend Component Integration

### New Components to Create

1. **TimetableView.tsx** - Display generated timetable
   - Interactive day view
   - Conflict warnings
   - Export buttons

2. **AttendanceDashboard.tsx** - Attendance predictions
   - Course-wise predictions
   - Risk indicators
   - Trending charts

3. **LeavePredictor.tsx** - Calculate attendance impact
   - Input leave days
   - Show impact visualization
   - Recommendations

4. **TimetableBuilder.tsx** - Timetable editor
   - Add/remove slots
   - Adjust timings
   - Optimize scheduling

## Implementation Steps

### Phase 1: Setup (Days 1-2)
1. Create database tables
2. Set up API routes structure
3. Create route handlers

### Phase 2: Backend (Days 3-5)
1. Implement timetable API endpoints
2. Implement attendance API endpoints
3. Add analytics endpoints
4. Create database queries

### Phase 3: Frontend (Days 6-8)
1. Create UI components
2. Integrate utilities
3. Add API calls
4. Style components

### Phase 4: Testing (Days 9-10)
1. Unit tests for utilities
2. API endpoint testing
3. UI/UX testing
4. Bug fixes

## Usage Examples

### Using Timetable Generator

```typescript
import { generateTimetable, getTimetableStats } from '@/utils/timetableGenerator';

const slots = [
  {
    courseCode: 'CS101',
    courseName: 'Data Structures',
    instructor: 'Dr. Smith',
    venue: 'Room 101',
    startTime: '09:00',
    endTime: '10:30',
    dayOfWeek: 0,
    slotType: 'Lecture',
    credits: 3
  },
  // ... more slots
];

const timetable = generateTimetable(slots);
const stats = getTimetableStats(timetable);
console.log(stats); // { totalSlots: 15, busyDays: 5, conflicts: 0, ... }
```

### Using Attendance Prediction

```typescript
import { predictAttendance } from '@/utils/attendancePrediction';

const record = {
  courseCode: 'CS101',
  courseName: 'Data Structures',
  classesHeld: 30,
  classesAttended: 20,
  currentAttendance: 66.67
};

const prediction = predictAttendance(record, 3, 10); // 3 leave days, 10 future classes
console.log(prediction);
// { predictedAttendance: 70.27, status: 'On Track', recommendedClasses: 4, ... }
```

## Testing Checklist

- [ ] Timetable generation works with various slot configurations
- [ ] Conflict detection correctly identifies overlapping classes
- [ ] Attendance prediction calculates correctly
- [ ] API endpoints return expected data structures
- [ ] Components render without errors
- [ ] Calendar export generates valid iCal files
- [ ] Batch processing handles large datasets
- [ ] Error handling for edge cases

## Performance Considerations

- Cache timetable data for frequently accessed students
- Batch attendance predictions to reduce computation
- Implement pagination for large datasets
- Use indexed queries for student data
- Optimize calendar export generation

## Future Enhancements

1. **AI-based Scheduling** - Automatically suggest optimal timetables
2. **Predictive Analytics** - Forecast academic performance
3. **Mobile Notifications** - Push alerts for attendance thresholds
4. **Calendar Integration** - Sync with Google Calendar, Outlook
5. **Smart Recommendations** - Suggest courses based on schedule
6. **Real-time Updates** - Live attendance tracking
7. **Export Formats** - PDF, Excel reports
8. **Multi-language Support** - Support regional languages

## Troubleshooting

### Issue: Timetable not generating
- Check that all required fields are present
- Verify time format is HH:MM
- Ensure dayOfWeek is 0-5

### Issue: Attendance prediction incorrect
- Verify classesAttended <= classesHeld
- Check currentAttendance is 0-100
- Ensure expectedLeaveDays is reasonable

### Issue: API errors
- Check database connection
- Verify student_id exists
- Check request parameters

## Contact & Support

For questions or issues:
- Create an issue in GitHub
- Contact development team
- Check documentation wiki
