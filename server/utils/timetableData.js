// Master Data for Dynamic Timetable

// Mapping of Slot Codes to Subject Details
// Derived from User's Registration Image
const SUBJECT_MAP = {
    'A': { code: 'TBD', name: 'Technical Elective / Free', type: 'Theory', staff: 'TBD' },
    'B': { code: '21PYB102J', name: 'Semiconductor Physics', type: 'Theory', staff: 'Dr. Arul Varman' },
    'C': { code: '21EES101T', name: 'Electrical & Electronics', type: 'Theory', staff: 'Dr. R. Senthilkumar' },
    'D': { code: '21MAB102T', name: 'Advanced Calculus', type: 'Theory', staff: 'Dr. G. Vijayalakshmi' },
    'E': { code: '21MES102L', name: 'Engineering Graphics (Theory)', type: 'Theory', staff: 'Mr. P. Udayakumar' }, // Often linked
    'F': { code: '21LEH101T', name: 'Communicative English', type: 'Theory', staff: 'Dr. Roland Rencewigg' },
    'G': { code: '21CSC101T', name: 'Object Oriented Design', type: 'Theory', staff: 'Shreya Jaiswal' },

    // LABS & PRACTICALS
    'P_PHY': { code: '21PYB102J', name: 'Semiconductor Physics Lab', type: 'Lab', staff: 'Dr. Arul Varman' },
    'P_EG': { code: '21MES102L', name: 'Engg. Graphics Lab', type: 'Lab', staff: 'Mr. P. Udayakumar' },
    'P_CS': { code: '21CSC101T', name: 'OODP Lab', type: 'Lab', staff: 'Shreya Jaiswal' },
    'P_WP': { code: '21WPS101L', name: 'Workshop Practice', type: 'Lab', staff: 'Faculty' },

    // ONLINE / MANDATORY
    'ENV': { code: '21CYM101T', name: 'Environmental Science', type: 'Online', staff: 'Dr. R. Jeyalakshmi' },
    'COI': { code: '21LEM101T', name: 'Constitution of India', type: 'Online', staff: 'Dr. Devi K' }
};

// Batch 1 Schedule (Day 1-5, Periods 1-10)
// Assuming Standard Rotation
const BATCH_1_SCHEDULE = {
    1: ['A', 'A', 'F', 'F', 'G', 'G', 'LUNCH', 'P_PHY', 'P_PHY', 'P_PHY'],
    2: ['B', 'B', 'G', 'G', 'A', 'A', 'LUNCH', 'P_EG', 'P_EG', 'P_EG'],
    3: ['C', 'C', 'A', 'A', 'D', 'D', 'LUNCH', 'P_CS', 'P_CS', 'P_CS'],
    4: ['D', 'D', 'B', 'B', 'E', 'E', 'LUNCH', 'A', 'A', 'G'],
    5: ['E', 'E', 'C', 'C', 'F', 'F', 'LUNCH', 'D', 'D', 'B']
};

// Batch 2 Schedule (Often swaps Lab/Theory slots or has offset)
const BATCH_2_SCHEDULE = {
    1: ['P_PHY', 'P_PHY', 'P_PHY', 'A', 'A', 'F', 'LUNCH', 'F', 'G', 'G'],
    2: ['P_EG', 'P_EG', 'P_EG', 'B', 'B', 'A', 'LUNCH', 'G', 'A', 'A'],
    3: ['P_CS', 'P_CS', 'P_CS', 'C', 'C', 'D', 'LUNCH', 'A', 'D', 'D'],
    4: ['A', 'A', 'G', 'D', 'D', 'E', 'LUNCH', 'B', 'B', 'E'],
    5: ['D', 'D', 'B', 'E', 'E', 'F', 'LUNCH', 'C', 'C', 'F']
};

// Time Ranges for Periods
const TIME_SLOTS = [
    '08:00 - 08:50', '08:50 - 09:40', '09:45 - 10:35', '10:40 - 11:30',
    '11:35 - 12:25', '12:30 - 01:20', '01:25 - 02:15', '02:20 - 03:10',
    '03:10 - 04:00', '04:00 - 04:50'
];

module.exports = { SUBJECT_MAP, BATCH_1_SCHEDULE, BATCH_2_SCHEDULE, TIME_SLOTS };
