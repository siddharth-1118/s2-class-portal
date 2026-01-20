// Master Data for Dynamic Timetable

// Mapping of Slot Codes to Subject Details
// Derived from User's Registration Image
const SUBJECT_MAP = {
    'A': { code: 'TBD', name: 'Free Slot', type: 'Theory', staff: '-' },
    'B': { code: '21PYB102J', name: 'Semiconductor Physics and Computational Methods', type: 'Theory', staff: 'Dr. Arul Varman' },
    'C': { code: '21EES101T', name: 'Electrical and Electronics Engineering', type: 'Theory', staff: 'Dr. R. Senthilkumar' },
    'D': { code: '21MAB102T', name: 'Advanced Calculus and Complex Analysis', type: 'Theory', staff: 'Dr. G. Vijayalakshmi' },
    'E': { code: '21MES102L', name: 'Engineering Graphics and Design', type: 'Theory', staff: 'Mr. P. Udayakumar' },
    'F': { code: '21LEH101T', name: 'Communicative English', type: 'Theory', staff: 'Dr. Roland Rencewigg' },
    'G': { code: '21CSC101T', name: 'Object Oriented Design and Programming', type: 'Theory', staff: 'Shreya Jaiswal' },

    // LABS & PRACTICALS
    'P_PHY': { code: '21PYB102J', name: 'Semiconductor Physics Lab', type: 'Lab', staff: 'Dr. Arul Varman' },
    'P_EG': { code: '21MES102L', name: 'Engg. Graphics Lab', type: 'Lab', staff: 'Mr. P. Udayakumar' },
    'P_CS': { code: '21CSC101T', name: 'OODP Lab', type: 'Lab', staff: 'Shreya Jaiswal' },
    'P_WP': { code: '21WPS101L', name: 'Workshop Practice', type: 'Lab', staff: 'Faculty' },

    // ONLINE / MANDATORY
    'ENV': { code: '21CYM101T', name: 'Environmental Science', type: 'Online', staff: 'Dr. R. Jeyalakshmi' },
    'COI': { code: '21LEM101T', name: 'Constitution of India', type: 'Online', staff: 'Dr. Devi K' }
};

// Group 1 (Register Nos: 869 - 906)
// Using the transcribed schedule data for now (to be updated if different)
const GROUP_1_SCHEDULE = {
    1: ['B', 'B', 'G', 'G', 'A', 'A', 'A', 'A', 'A', 'A'],
    2: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'F', 'F', 'G'],
    3: ['A', 'A', 'P_PHY', 'P_PHY', 'A', 'C', 'C', 'A', 'D', 'B'],
    4: ['D', 'D', 'B', 'A', 'C', 'A', 'P_EG', 'P_EG', 'P_EG', 'P_EG'],
    5: ['A', 'ENV', 'COI', 'A', 'A', 'A', 'A', 'C', 'F', 'D']
};

// Group 2 (Register Nos: 907 - 940 & 603)
// Currently identical to Group 1
const GROUP_2_SCHEDULE = {
    1: ['B', 'B', 'G', 'G', 'A', 'A', 'A', 'A', 'A', 'A'],
    2: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'F', 'F', 'G'],
    3: ['A', 'A', 'P_PHY', 'P_PHY', 'A', 'C', 'C', 'A', 'D', 'B'],
    4: ['D', 'D', 'B', 'A', 'C', 'A', 'P_EG', 'P_EG', 'P_EG', 'P_EG'],
    5: ['A', 'ENV', 'COI', 'A', 'A', 'A', 'A', 'C', 'F', 'D']
};

// Time Ranges for Periods
const TIME_SLOTS = [
    '08:00 - 08:50', '08:50 - 09:40', '09:45 - 10:35', '10:40 - 11:30',
    '11:35 - 12:25', '12:30 - 01:20', '01:25 - 02:15', '02:20 - 03:10',
    '03:10 - 04:00', '04:00 - 04:50'
];

module.exports = { SUBJECT_MAP, GROUP_1_SCHEDULE, GROUP_2_SCHEDULE, TIME_SLOTS };
