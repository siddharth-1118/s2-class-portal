// Attendance Prediction Utility - Inspired by ClassPro
// Predicts attendance percentage based on leave days and course patterns

export interface AttendanceRecord {
  courseCode: string;
  courseName: string;
  classesHeld: number;
  classesAttended: number;
  currentAttendance: number; // percentage
}

export interface AttendancePrediction {
  courseCode: string;
  courseName: string;
  currentAttendance: number;
  predictedAttendance: number;
  requiredAttendance: number;
  recommendedClasses: number;
  risk: 'High' | 'Medium' | 'Low';
  status: 'At Risk' | 'On Track' | 'Excellent';
}

const MINIMUM_ATTENDANCE = 75; // SRM Academia typically requires 75%

// Calculate predicted attendance based on leave days
export const predictAttendance = (
  currentAttendance: AttendanceRecord,
  expectedLeaveDays: number = 0,
  futureClasses: number = 0
): AttendancePrediction => {
  const totalFutureClasses = currentAttendance.classesHeld + futureClasses - expectedLeaveDays;
  const totalAttended = currentAttendance.classesAttended + (futureClasses - expectedLeaveDays);
  
  const predictedPercentage = totalFutureClasses > 0 
    ? (totalAttended / totalFutureClasses) * 100 
    : currentAttendance.currentAttendance;
  
  // Calculate classes needed to reach 75%
  const requiredAttendancePercentage = MINIMUM_ATTENDANCE;
  let recommendedClasses = 0;
  
  if (predictedPercentage < requiredAttendancePercentage) {
    // Need x more classes: (attended + x) / (total + x) >= 75%
    // Solving: attended + x >= 0.75 * (total + x)
    const attended = currentAttendance.classesAttended;
    const held = currentAttendance.classesHeld;
    
    recommendedClasses = Math.ceil(
      (requiredAttendancePercentage * held - 100 * attended) / 
      (100 - requiredAttendancePercentage)
    );
  }
  
  // Determine risk level
  let risk: 'High' | 'Medium' | 'Low';
  let status: 'At Risk' | 'On Track' | 'Excellent';
  
  if (predictedPercentage < MINIMUM_ATTENDANCE - 10) {
    risk = 'High';
    status = 'At Risk';
  } else if (predictedPercentage < MINIMUM_ATTENDANCE) {
    risk = 'Medium';
    status = 'On Track';
  } else {
    risk = 'Low';
    status = 'Excellent';
  }
  
  return {
    courseCode: currentAttendance.courseCode,
    courseName: currentAttendance.courseName,
    currentAttendance: currentAttendance.currentAttendance,
    predictedAttendance: Math.round(predictedPercentage * 100) / 100,
    requiredAttendance: MINIMUM_ATTENDANCE,
    recommendedClasses: Math.max(0, recommendedClasses),
    risk,
    status
  };
};

// Batch predict attendance for multiple courses
export const predictBatchAttendance = (
  courses: AttendanceRecord[],
  expectedLeaveDays: number[],
  futureClasses: number[] = []
): AttendancePrediction[] => {
  return courses.map((course, index) => {
    const leaves = expectedLeaveDays[index] || 0;
    const future = futureClasses[index] || 0;
    return predictAttendance(course, leaves, future);
  });
};

// Get attendance trend (improving, declining, stable)
export const getAttendanceTrend = (
  records: AttendanceRecord[],
  windowSize: number = 3
): { trend: 'Improving' | 'Declining' | 'Stable'; percentage: number } => {
  if (records.length < 2) {
    return { trend: 'Stable', percentage: records[0]?.currentAttendance || 0 };
  }
  
  const recentAvg = records
    .slice(-windowSize)
    .reduce((sum, r) => sum + r.currentAttendance, 0) / Math.min(windowSize, records.length);
  
  const olderAvg = records
    .slice(0, -windowSize)
    .reduce((sum, r) => sum + r.currentAttendance, 0) / Math.max(1, records.length - windowSize);
  
  const diff = recentAvg - olderAvg;
  const threshold = 2; // 2% difference threshold
  
  let trend: 'Improving' | 'Declining' | 'Stable';
  if (Math.abs(diff) <= threshold) {
    trend = 'Stable';
  } else if (diff > threshold) {
    trend = 'Improving';
  } else {
    trend = 'Declining';
  }
  
  return { trend, percentage: Math.round(recentAvg * 100) / 100 };
};

// Calculate the impact of missing classes
export const calculateMissingClassesImpact = (
  currentAttendance: number,
  classesHeld: number,
  classesToMiss: number
): { newAttendance: number; impactPercentage: number } => {
  const attended = (currentAttendance / 100) * classesHeld;
  const newAttended = attended;
  const newTotal = classesHeld + classesToMiss;
  
  const newAttendancePercent = (newAttended / newTotal) * 100;
  const impactPercentage = currentAttendance - newAttendancePercent;
  
  return {
    newAttendance: Math.round(newAttendancePercent * 100) / 100,
    impactPercentage: Math.round(impactPercentage * 100) / 100
  };
};

// Get detailed analysis for course
export const getDetailedAnalysis = (prediction: AttendancePrediction): string => {
  let analysis = `${prediction.courseName} (${prediction.courseCode})\n`;
  analysis += `Current Attendance: ${prediction.currentAttendance}%\n`;
  analysis += `Predicted Attendance: ${prediction.predictedAttendance}%\n`;
  analysis += `Minimum Required: ${prediction.requiredAttendance}%\n\n`;
  
  if (prediction.status === 'At Risk') {
    analysis += `WARNING: You are at risk of attendance shortage!\n`;
    analysis += `You need to attend ${prediction.recommendedClasses} more classes to reach ${prediction.requiredAttendance}%.\n`;
  } else if (prediction.status === 'On Track') {
    analysis += `You are on track. Please maintain consistent attendance.\n`;
    analysis += `Attend ${Math.max(1, prediction.recommendedClasses)} more classes to be safe.\n`;
  } else {
    analysis += `Excellent attendance! Keep up the good work.\n`;
  }
  
  return analysis;
};

// Export attendance report
export const generateAttendanceReport = (predictions: AttendancePrediction[]): string => {
  let report = 'ATTENDANCE PREDICTION REPORT\n';
  report += '='.repeat(50) + '\n\n';
  
  const atRisk = predictions.filter(p => p.status === 'At Risk').length;
  const onTrack = predictions.filter(p => p.status === 'On Track').length;
  const excellent = predictions.filter(p => p.status === 'Excellent').length;
  
  report += `Total Courses: ${predictions.length}\n`;
  report += `At Risk: ${atRisk} | On Track: ${onTrack} | Excellent: ${excellent}\n\n`;
  
  predictions.forEach(pred => {
    report += `${pred.courseName}\n`;
    report += `  Status: ${pred.status} (${pred.risk} Risk)\n`;
    report += `  Predicted: ${pred.predictedAttendance}% | Required: ${pred.requiredAttendance}%\n\n`;
  });
  
  return report;
};
