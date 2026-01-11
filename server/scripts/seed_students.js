const db = require('../db');

const seed = () => {

    const students = [
        { reg: 'RA2511026010869', name: 'VARNIKA JAIN' },
        { reg: 'RA2511026010870', name: 'KONDA VEERAVENKATAGANESH' },
        { reg: 'RA2511026010871', name: 'Y HARSHITHA' },
        { reg: 'RA2511026010872', name: 'ESAKI KESAVAN V' },
        { reg: 'RA2511026010874', name: 'KAVI PRIYA M' },
        { reg: 'RA2511026010875', name: 'SAMRIDDHI SINGH' },
        { reg: 'RA2511026010876', name: 'SATVIK SAHU' },
        { reg: 'RA2511026010877', name: 'MOHAMMED UBAID UL NAFEY' },
        { reg: 'RA2511026010878', name: 'ADITYA SHUBHANKAR' },
        { reg: 'RA2511026010879', name: 'PARUL TEKADE' },
        { reg: 'RA2511026010880', name: 'SIDDHARTHA MAJUMDER' },
        { reg: 'RA2511026010881', name: 'KEVIN K SHIBU' },
        { reg: 'RA2511026010882', name: 'BOBBALA MANJUNATH REDDY' },
        { reg: 'RA2511026010883', name: 'AARYA JAIN' },
        { reg: 'RA2511026010884', name: 'HARSHITHA GUNTUR VENKATESWARLU' },
        { reg: 'RA2511026010885', name: 'L NAGA ABHIESH REDDY' },
        { reg: 'RA2511026010886', name: 'SHARMISTHA MOHAPATRA' },
        { reg: 'RA2511026010887', name: 'VENKATA SAI TEJEESH CH' },
        { reg: 'RA2511026010888', name: 'ARYA G A' },
        { reg: 'RA2511026010889', name: 'MIHIR SINHA' },
        { reg: 'RA2511026010890', name: 'PRANAV SINGH' },
        { reg: 'RA2511026010891', name: 'AMRITHA H' },
        { reg: 'RA2511026010892', name: 'A SAI SANZANA RREDDY' },
        { reg: 'RA2511026010893', name: 'ARTH PARETA' },
        { reg: 'RA2511026010894', name: 'ARPIT SINGH' },
        { reg: 'RA2511026010895', name: 'SHARON NILUPHA J' },
        { reg: 'RA2511026010896', name: 'ADUTIYA AGARWAL' },
        { reg: 'RA2511026010897', name: 'TEG SINGH GILL' },
        { reg: 'RA2511026010898', name: 'DHANUSH KUMAR S' },
        { reg: 'RA2511026010899', name: 'ADIBOINA DIGVIJAY' },
        { reg: 'RA2511026010900', name: 'DARSHIL JOSHI' },
        { reg: 'RA2511026010901', name: 'RACHIT JHA' },
        { reg: 'RA2511026010902', name: 'TAYDEN J' },
        { reg: 'RA2511026010903', name: 'MANNI HARSHINI CHOWDARY' },
        { reg: 'RA2511026010904', name: 'EISHIT JAIN' },
        { reg: 'RA2511026010905', name: 'MALIK MOHMMAD AUSAIB' },
        { reg: 'RA2511026010906', name: 'VOOKA SAI SIDDHARTH' },
        { reg: 'RA2511026010907', name: 'SHUBHANG DARSHAN' },
        { reg: 'RA2511026010908', name: 'SRI VAISHNAVIMEENA LA' },
        { reg: 'RA2511026010909', name: 'ANURAG PRASAD' },
        { reg: 'RA2511026010910', name: 'DONALD ABISHAI FERNANDO A' },
        { reg: 'RA2511026010911', name: 'HARIHARAN R' },
        { reg: 'RA2511026010912', name: 'PANDIPRAJIN S' },
        { reg: 'RA2511026010913', name: 'VISHNUVARDHAN RAMPRABU' },
        { reg: 'RA2511026010914', name: 'S AHAMED THALHA' },
        { reg: 'RA2511026010915', name: 'PARTH SINGH' },
        { reg: 'RA2511026010916', name: 'THIRISHA M' },
        { reg: 'RA2511026010917', name: 'MOHITHA SK' },
        { reg: 'RA2511026010918', name: 'SHAGUN' },
        { reg: 'RA2511026010919', name: 'AARON LOW' },
        { reg: 'RA2511026010920', name: 'KRISH SHARMA' },
        { reg: 'RA2511026010921', name: 'M SARVESH' },
        { reg: 'RA2511026010922', name: 'KUNSH KAKKAR' },
        { reg: 'RA2511026010923', name: 'PASALA GHANA CHARAN NARAYANA' },
        { reg: 'RA2511026010924', name: 'DIKSHA GULATI' },
        { reg: 'RA2511026010925', name: 'NOORUL ARFIN S' },
        { reg: 'RA2511026010926', name: 'ARNAV SINGH' },
        { reg: 'RA2511026010927', name: 'M MANUSREE' },
        { reg: 'RA2511026010928', name: 'SHAURYA SINGLA' },
        { reg: 'RA2511026010929', name: 'SUBHANKAR BISWAL' },
        { reg: 'RA2511026010930', name: 'DHANUNJAY DAS' },
        { reg: 'RA2511026010931', name: 'AANJNAY SAROHA' },
        { reg: 'RA2511026010932', name: 'NAGULESH R' },
        { reg: 'RA2511026010933', name: 'EPURI NITHIN' },
        { reg: 'RA2511026010934', name: 'SAYED AYESHA' },
        { reg: 'RA2511026010935', name: 'K ARAVIND' },
        { reg: 'RA2511026010936', name: 'DEVA PRIYA DARSINI PINNAMANENI' },
        { reg: 'RA2511026010937', name: 'KATEPALLI RAJESH' },
        { reg: 'RA2511026010938', name: 'GOLI THANMAYE' },
        { reg: 'RA2511026010939', name: 'YALLAPU VIHAS' },
        { reg: 'RA2511026010940', name: 'AQIB SHAFEEQUE' },
        { reg: 'RA2511026011603', name: 'YESHVANTH Y' }
    ];

    // DO NOT DELETE to avoid FK constraint errors with marks table
    // db.prepare('DELETE FROM students_list').run();

    const insert = db.prepare('INSERT OR IGNORE INTO students_list (register_number, name) VALUES (?, ?)');

    const insertMany = db.transaction((rows) => {
        for (const row of rows) insert.run(row.reg.toUpperCase(), row.name);
    });

    insertMany(students);

    console.log('Seeded students successfully');

    insertMany(students);
    console.log(`Seeded ${students.length} students.`);
};

if (require.main === module) {
    seed();
}

module.exports = seed;
