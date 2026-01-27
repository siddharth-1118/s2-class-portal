// Timetable Generator Utility - Inspired by ClassPro
// This utility generates optimized timetables from class schedules

export interface TimeSlot {
  courseCode: string;
  courseName: string;
  instructor: string;
  venue: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number; // 0-6, 0 = Monday
  slotType: 'Lecture' | 'Lab' | 'Tutorial';
  credits?: number;
  color?: string;
}

export interface DaySchedule {
  dayIndex: number;
  dayName: string;
  slots: TimeSlot[];
}

export interface GeneratedTimetable {
  week: DaySchedule[];
  totalCredits: number;
  freePeriods: { day: string; time: string }[];
  conflictCount: number;
}

// Generate color for different course types
const generateColorForSlot = (index: number, slotType: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#ABEBC6'
  ];
  return colors[index % colors.length];
};

// Check for time conflicts between two slots
const hasTimeConflict = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
  if (slot1.dayOfWeek !== slot2.dayOfWeek) return false;
  
  const [start1, end1] = [slot1.startTime.split(':'), slot1.endTime.split(':')];
  const [start2, end2] = [slot2.startTime.split(':'), slot2.endTime.split(':')];
  
  const slot1Start = parseInt(start1[0]) * 60 + parseInt(start1[1]);
  const slot1End = parseInt(end1[0]) * 60 + parseInt(end1[1]);
  const slot2Start = parseInt(start2[0]) * 60 + parseInt(start2[1]);
  const slot2End = parseInt(end2[0]) * 60 + parseInt(end2[1]);
  
  return !(slot1End <= slot2Start || slot2End <= slot1Start);
};

// Sort slots by time
const sortSlotsByTime = (slots: TimeSlot[]): TimeSlot[] => {
  return [...slots].sort((a, b) => {
    const dayDiff = a.dayOfWeek - b.dayOfWeek;
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });
};

// Generate timetable from raw slot data
export const generateTimetable = (slots: TimeSlot[]): GeneratedTimetable => {
  const sortedSlots = sortSlotsByTime(slots);
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Initialize week structure
  const week: DaySchedule[] = dayNames.map((name, index) => ({
    dayIndex: index,
    dayName: name,
    slots: []
  }));
  
  // Assign slots to days and add colors
  sortedSlots.forEach((slot, index) => {
    const daySchedule = week[slot.dayOfWeek];
    daySchedule.slots.push({
      ...slot,
      color: generateColorForSlot(index, slot.slotType)
    });
  });
  
  // Check for conflicts
  let conflictCount = 0;
  for (let i = 0; i < sortedSlots.length; i++) {
    for (let j = i + 1; j < sortedSlots.length; j++) {
      if (hasTimeConflict(sortedSlots[i], sortedSlots[j])) {
        conflictCount++;
      }
    }
  }
  
  // Calculate free periods
  const freePeriods: { day: string; time: string }[] = [];
  week.forEach(day => {
    if (day.slots.length === 0) {
      freePeriods.push({ day: day.dayName, time: 'Full day' });
    } else if (day.slots.length < 4) {
      freePeriods.push({ day: day.dayName, time: 'Partial day' });
    }
  });
  
  // Calculate total credits
  const totalCredits = sortedSlots.reduce((sum, slot) => sum + (slot.credits || 0), 0);
  
  return {
    week,
    totalCredits,
    freePeriods,
    conflictCount
  };
};

// Get free time slots for a specific day
export const getFreeSlotsForDay = (day: DaySchedule, workingHours = { start: '08:00', end: '17:00' }): string[] => {
  const slots = day.slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  const freeSlots: string[] = [];
  
  if (slots.length === 0) {
    return [`${workingHours.start} - ${workingHours.end}`];
  }
  
  // Find gaps between classes
  for (let i = 0; i < slots.length - 1; i++) {
    freeSlots.push(`${slots[i].endTime} - ${slots[i + 1].startTime}`);
  }
  
  return freeSlots;
};

// Optimize timetable by minimizing gaps and conflicts
export const optimizeTimetable = (slots: TimeSlot[]): TimeSlot[] => {
  return slots.sort((a, b) => {
    // Sort by day first, then by time
    const dayDiff = a.dayOfWeek - b.dayOfWeek;
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });
};

// Get timetable statistics
export const getTimetableStats = (timetable: GeneratedTimetable) => {
  const totalSlots = timetable.week.reduce((sum, day) => sum + day.slots.length, 0);
  const busyDays = timetable.week.filter(day => day.slots.length > 0).length;
  const avgClassesPerDay = totalSlots / busyDays || 0;
  
  return {
    totalSlots,
    busyDays,
    freeDays: 6 - busyDays,
    avgClassesPerDay: avgClassesPerDay.toFixed(2),
    conflictCount: timetable.conflictCount,
    totalCredits: timetable.totalCredits
  };
};

// Export timetable as iCal format (for calendar integration)
export const exportTimetableToICal = (timetable: GeneratedTimetable, studentName: string): string => {
  let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//S2 Class Portal//EN
CALSCALE:GREGORIAN
`;
  
  timetable.week.forEach(day => {
    day.slots.forEach(slot => {
      const startTime = slot.startTime.replace(':', '');
      const endTime = slot.endTime.replace(':', '');
      
      ical += `BEGIN:VEVENT
SUMMARY:${slot.courseName} (${slot.slotType})
DESCRIPTION:${slot.courseCode} - ${slot.instructor}
LOCATION:${slot.venue}
DTSTART:${startTime}
DTEND:${endTime}
END:VEVENT
`;
    });
  });
  
  ical += `END:VCALENDAR`;
  return ical;
};
