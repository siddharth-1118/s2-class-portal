// Native JS Date Logic - YEAR 2026
// Jan 1, 2026 is THURSDAY.

const SPECIAL_DATES = {
    // JANUARY 2026
    '2026-01-01': { desc: "New Year's Day", type: 'holiday', day_order: '-' },
    '2026-01-05': { desc: "Enrollment Day - B.Tech - II,III,IV / M.Tech (int)", type: 'regular', day_order: '-' },
    '2026-01-06': { desc: "Enrollment Day - B.Tech - II,III,IV / M.Tech (int)", type: 'regular' },
    '2026-01-07': { desc: "Enrollment Day / Registration", type: 'regular' },
    '2026-01-08': { desc: "Commencement of Classes", type: 'regular' }, // Thu - Start of Day Orders

    // Pongal Holidays
    '2026-01-15': { desc: "Pongal", type: 'holiday', day_order: '-' },
    '2026-01-16': { desc: "Thiruvalluvar Day", type: 'holiday', day_order: '-' },
    '2026-01-17': { desc: "Uzhavar Thirunal", type: 'holiday', day_order: '-' },
    '2026-01-26': { desc: "Republic Day", type: 'holiday', day_order: '-' },

    // FEBRUARY 2026
    '2026-02-01': { desc: "Thaipusam", type: 'holiday', day_order: '-' }, // Sunday

    // MARCH 2026
    '2026-03-04': { desc: "Holi", type: 'regular' }, // Wed - Regular Class usually in south, modify if holiday wanted
    '2026-03-19': { desc: "Telugu New Year's Day (Ugadi)", type: 'holiday', day_order: '-' }, // Thu
    '2026-03-20': { desc: "Ramzan (Id-ul-Fitr)", type: 'holiday', day_order: '-' }, // Fri
    '2026-03-31': { desc: "Mahaveer Jayanthi", type: 'holiday', day_order: '-' }, // Tue

    // APRIL 2026
    '2026-04-03': { desc: "Good Friday", type: 'holiday', day_order: '-' }, // Fri
    '2026-04-14': { desc: "Tamil New Year's Day / Dr. B.R. Ambedkar Birthday", type: 'holiday', day_order: '-' }, // Tue

    // MAY 2026
    '2026-05-01': { desc: "May Day", type: 'holiday', day_order: '-' }, // Fri
    '2026-05-07': { desc: "Last Working Day", type: 'regular' },

    // JUNE 2026
    '2026-06-27': { desc: "Muharram", type: 'holiday', day_order: '-' }, // Approx
};

// Generate Full Calendar 2026
const generateCalendar2026 = () => {
    const events = [];
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-06-30');
    let dayOrderCycle = 1;

    // Helper to format YYYY-MM-DD
    const fmt = (d) => d.toISOString().split('T')[0];

    // Day Order 1 starts Jan 8, 2026 (Thursday)
    const dayOrderStartDate = new Date('2026-01-08');

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = fmt(d);
        const dayOfWeek = d.getDay(); // 0 Sun, 6 Sat
        const special = SPECIAL_DATES[dateStr];

        let shouldIncrement = false;
        let dayOrder = null;
        let type = 'regular';
        let desc = '';
        let noOrder = false;

        // Determine Type & Description
        if (special) {
            desc = special.desc;
            type = special.type;
            if (type === 'holiday' || special.day_order === '-') noOrder = true;
        } else {
            // Default Logic
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                type = 'holiday';
                desc = dayOfWeek === 0 ? 'Sunday - Holiday' : 'Saturday - Holiday';
                noOrder = true;
            } else {
                type = 'regular';
                desc = 'Regular Class';
            }
        }

        // GLOBAL SAFEGUARD: If it's Sunday, it MUST be a holiday and NO ORDER.
        if (dayOfWeek === 0) {
            type = 'holiday';
            noOrder = true;
            if (!desc || desc === 'Regular Class' || desc === '-') desc = 'Sunday - Holiday';
        }

        // Apply Day Order Logic
        // Start Cycle from Jan 8
        if (d >= dayOrderStartDate && !noOrder && type !== 'holiday') {
            shouldIncrement = true;
        }

        if (shouldIncrement) {
            dayOrder = dayOrderCycle;
            dayOrderCycle = (dayOrderCycle % 5) + 1;

            if (desc === 'Regular Class' || desc === '-') desc = `Day Order ${dayOrder}`;
            else desc += ` (Day Order ${dayOrder})`;
        }

        events.push({
            date: dateStr,
            day: d.toLocaleDateString('en-US', { weekday: 'short' }),
            description: desc,
            type: type,
            day_order: dayOrder
        });
    }
    return events;
};

const CALENDAR_EVENTS = generateCalendar2026();

module.exports = { CALENDAR_EVENTS };
