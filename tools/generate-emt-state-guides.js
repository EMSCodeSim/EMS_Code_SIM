'use strict';

/**
 * Generates the State-by-State “How to Become an EMT” hub and individual guides.
 * Run: node tools/generate-emt-state-guides.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'become-an-emt', 'states');
const REVIEWED = 'August 25, 2026';
const LASTMOD = '2026-08-25';

const STATES = [
  {
    slug: 'texas',
    name: 'Texas',
    code: 'TX',
    featured: true,
    agency: 'Texas Department of State Health Services (DSHS) — EMS & Trauma Systems',
    agencyUrl: 'https://www.dshs.texas.gov/dshs-ems-trauma-systems/ems-personnel-certification-licensure',
    initialUrl: 'https://www.dshs.texas.gov/dshs-ems-trauma-systems/ems-personnel-certification-licensure/initial-certification-licensure',
    feesUrl: 'https://www.dshs.texas.gov/dshs-ems-trauma-systems/ems-application-fees',
    reciprocityUrl: 'https://www.dshs.texas.gov/dshs-ems-trauma-systems/ems-personnel-certification-licensure',
    programsNote: 'Complete an EMS education program recognized for Texas EMS personnel certification, then follow DSHS initial certification steps.',
    nremtVsState: 'Texas requires current National Registry certification at the EMT level and a separate DSHS state application (including fingerprint/background requirements). NREMT alone does not authorize practice in Texas.',
    requirements: [
      'Complete an approved EMT education pathway that qualifies you for National Registry EMT testing.',
      'Earn current NREMT EMT certification (cognitive exam through NREMT / Pearson VUE as directed by NREMT).',
      'Apply to Texas DSHS for EMS personnel certification/licensure and complete fingerprint-based background screening.',
      'Keep CPR and any employer credentialing current before you staff a unit.'
    ],
    costs: [
      { label: 'Texas EMT initial application fee', value: '$64 (DSHS published fee schedule — verify before applying)' },
      { label: 'Texas reciprocity application (all levels)', value: '$126 (DSHS published fee schedule)' },
      { label: 'NREMT EMT cognitive exam', value: 'Paid directly to NREMT (confirm current amount on nremt.org)' },
      { label: 'Program tuition & supplies', value: 'Varies widely by school — use the Program Cost planner before you enroll' }
    ],
    reciprocity: 'Out-of-state EMTs typically use Texas reciprocity/endorsement pathways when they hold current NREMT (and meet DSHS documentation and background rules). Confirm the current reciprocity packet on the DSHS EMS certification pages before you move or apply.',
    tips: [
      'Treat NREMT and DSHS as two separate applications with separate fees and timelines.',
      'Ask every school to show how graduates complete Texas DSHS certification—not only NREMT.',
      'Budget for fingerprints, CPR, uniforms, clinical travel, and unpaid study time—not tuition alone.'
    ],
    searchBlurb: 'Texas EMT requirements, DSHS fees, NREMT vs state license, approved programs, and reciprocity.',
    tags: ['Texas EMT', 'DSHS', 'how to become an EMT in Texas', 'Texas EMS reciprocity', 'NREMT Texas']
  },
  {
    slug: 'california',
    name: 'California',
    code: 'CA',
    agency: 'California EMS Authority (EMSA) + Local EMS Agencies (LEMSAs)',
    agencyUrl: 'https://emsa.ca.gov/',
    initialUrl: 'https://emsa.ca.gov/',
    feesUrl: 'https://emsa.ca.gov/',
    reciprocityUrl: 'https://emsa.ca.gov/',
    programsNote: 'Complete an EMT course from a California-approved training program. Certification is issued by a Local EMS Agency (LEMSA), not by EMSA directly for most applicants.',
    nremtVsState: 'First-time California EMT applicants generally must pass the NREMT EMT exam (or hold current NREMT) and then apply to one LEMSA for a California EMT certificate. NREMT alone is not a California practice credential. Once certified in California, routine renewal is through your LEMSA and does not require maintaining NREMT for most renewals—confirm with your certifying entity.',
    requirements: [
      'Graduate from an approved California EMT training program (apply within the timeframe your LEMSA requires—often within two years of course completion).',
      'Pass NREMT EMT cognitive testing as required for initial certification.',
      'Apply to one California LEMSA (certifying entity) with ID, CPR, Live Scan / background results, skills verification forms, and fees.',
      'Meet any local accreditation or expanded-scope cards your employer’s county requires (for example ambulance attendant cards).'
    ],
    costs: [
      { label: 'State EMT certification fee component', value: 'Often cited around $75 at the state level — LEMSA adds local fees (examples commonly total ~$150–$200+)' },
      { label: 'LEMSA / county fees', value: 'Vary by county — confirm with your certifying LEMSA before you apply' },
      { label: 'Live Scan background check', value: 'Paid to Live Scan provider (varies by location)' },
      { label: 'Program tuition & supplies', value: 'Varies by school — use the Program Cost planner' }
    ],
    reciprocity: 'California does not treat another state’s EMT card as automatic authority to work. Out-of-state providers typically need current NREMT (or an accepted pathway) and must obtain California certification through a LEMSA. Always confirm the current out-of-state / challenge pathway with the LEMSA where you will apply.',
    tips: [
      'Pick your certifying LEMSA carefully—fees and forms differ by county even though the certificate is statewide.',
      'Ask employers which local accreditation cards are required in addition to the California EMT certificate.',
      'If your CA certificate lapses for a long period, NREMT may again be required for reinstatement—verify Title 22 / LEMSA rules.'
    ],
    searchBlurb: 'California EMT certification via LEMSAs, NREMT exam, county fees, and out-of-state pathways.',
    tags: ['California EMT', 'LEMSA', 'EMSA', 'how to become an EMT in California', 'NREMT California']
  },
  {
    slug: 'florida',
    name: 'Florida',
    code: 'FL',
    agency: 'Florida Department of Health — EMT & Paramedic Certification',
    agencyUrl: 'https://www.floridahealth.gov/licensing-regulations/regulated-professions/emergency-medical-technicians-and-paramedics/',
    initialUrl: 'https://www.floridahealth.gov/licensing-regulations/regulated-professions/emergency-medical-technicians-and-paramedics/',
    feesUrl: 'https://www.floridahealth.gov/licensing-regulations/regulated-professions/emergency-medical-technicians-and-paramedics/',
    reciprocityUrl: 'https://www.floridahealth.gov/licensing-regulations/regulated-professions/emergency-medical-technicians-and-paramedics/frequently-asked-questions/',
    programsNote: 'Florida-trained applicants complete a Florida DOH-approved EMT program. Out-of-state / military-trained applicants follow the NREMT-based pathway described by DOH.',
    nremtVsState: 'Florida uses the NREMT cognitive exam for EMT candidates. Florida-trained applicants must pass NREMT to become eligible for state certification. Out-of-state or military-trained applicants generally need current NREMT certification. Florida certification is still a separate DOH credential—NREMT alone is not Florida authorization to practice.',
    requirements: [
      'Complete a Florida-approved EMT program (in-state) or document out-of-state/military training as DOH requires.',
      'Hold required professional rescuer CPR (AHA BLS or Red Cross Professional Rescuer / DOH-accepted equivalent).',
      'Pass NREMT EMT cognitive testing (Florida-trained) or hold current NREMT (out-of-state/military pathway).',
      'Submit the Florida EMT certification application and fee to the Department of Health.'
    ],
    costs: [
      { label: 'Florida EMT certification application fee', value: '$35 (DOH published schedule — verify before applying)' },
      { label: 'NREMT EMT exam fee', value: 'About $80 payable to NREMT (confirm current amount)' },
      { label: 'Program tuition & supplies', value: 'Varies by school — use the Program Cost planner' }
    ],
    reciprocity: 'Florida DOH states there is no state-to-state reciprocity. Out-of-state trained applicants typically qualify with current NREMT certification and a complete Florida application—not by transferring another state’s card alone.',
    tips: [
      'Pass the exam within the timeframe DOH ties to course completion (commonly within two years for Florida-trained applicants).',
      'Do not confuse NREMT registration with Florida certification—finish the DOH application.',
      'Use DOH’s FAQ if you trained out of state or in the military.'
    ],
    searchBlurb: 'Florida EMT certification fees, NREMT exam rules, DOH application, and out-of-state pathway.',
    tags: ['Florida EMT', 'Florida DOH', 'how to become an EMT in Florida', 'NREMT Florida', 'EMT reciprocity Florida']
  },
  {
    slug: 'new-york',
    name: 'New York',
    code: 'NY',
    agency: 'New York State Department of Health — Bureau of EMS',
    agencyUrl: 'https://www.health.ny.gov/professionals/ems/',
    initialUrl: 'https://regs.health.ny.gov/content/section-8006-initial-certification-requirements',
    feesUrl: 'https://www.health.ny.gov/professionals/ems/certification/exam_registration.htm',
    reciprocityUrl: 'https://www.health.ny.gov/professionals/ems/',
    programsNote: 'Complete a New York State-approved EMT course through a state-approved course sponsor.',
    nremtVsState: 'New York issues its own EMS certification after a state-approved course plus practical and cognitive testing. NREMT is not required to practice as a New York EMT, though some course sponsors offer an NREMT alternative exam pathway—NYS certification still requires a separate state application. Many providers keep NREMT voluntarily for portability.',
    requirements: [
      'Be at least 17 by the end of the course month (see 10 NYCRR §800.6).',
      'File the NYS EMS certification application (for example DOH-65) as directed by your course sponsor.',
      'Complete a state-approved EMT course, including practical skills evaluation.',
      'Pass the New York State cognitive exam (PSI) or an accepted alternative pathway your sponsor documents, within two years of the course end date.'
    ],
    costs: [
      { label: 'NYS written exam (PSI)', value: 'Vendor fee — often cited near $31; confirm on NYS exam registration pages' },
      { label: 'Course tuition', value: 'Varies; some agency members train at reduced or no tuition through approved sponsors' },
      { label: 'Optional NREMT', value: 'Separate fee if you choose the National Registry pathway for portability' }
    ],
    reciprocity: 'Moving into New York usually means following Bureau of EMS out-of-state / reciprocity instructions rather than assuming another state card is valid. Contact the Bureau of EMS for the current endorsement or reciprocity process before you relocate.',
    tips: [
      'Track your end-of-course date—exam eligibility is time-limited.',
      'Ask your course sponsor whether you will test via the NYS PSI exam or an NREMT alternative pathway.',
      'Agency membership sometimes changes tuition—get that in writing before you enroll.'
    ],
    searchBlurb: 'New York EMT certification, Bureau of EMS course requirements, PSI exam, and NREMT option.',
    tags: ['New York EMT', 'NYS DOH EMS', 'how to become an EMT in New York', 'PSI EMT exam']
  },
  {
    slug: 'pennsylvania',
    name: 'Pennsylvania',
    code: 'PA',
    agency: 'Pennsylvania Department of Health — Bureau of EMS',
    agencyUrl: 'https://www.health.pa.gov/topics/EMS/Pages/EMS.aspx',
    initialUrl: 'https://ems.health.pa.gov/',
    feesUrl: 'https://ems.health.pa.gov/',
    reciprocityUrl: 'https://ems.health.pa.gov/',
    programsNote: 'Complete an EMT course at a Pennsylvania Department of Health-accredited educational institute, then test through the PA EMS Registry process.',
    nremtVsState: 'Pennsylvania EMT students typically complete PA-accredited education and pass the NREMT EMT cognitive exam plus the Pennsylvania (NREMT) psychomotor examination pathway used by the Bureau of EMS. State certification is issued through the PA EMS Registry—NREMT registration alone is not a Pennsylvania practice credential.',
    requirements: [
      'Enroll in a PA DOH-accredited EMT educational institute and complete the electronic PA EMS Registry application with your class number.',
      'Hold a current PA-approved CPR credential.',
      'Pass the required cognitive and psychomotor examinations for EMT certification.',
      'Complete identity verification at a Regional EMS Council as directed for final processing.'
    ],
    costs: [
      { label: 'Exam & registry fees', value: 'Confirm current NREMT and regional practical exam fees with your institute' },
      { label: 'Background clearances', value: 'State and FBI checks are commonly required for endorsement and often for employment' },
      { label: 'Program tuition & supplies', value: 'Varies — use the Program Cost planner' }
    ],
    reciprocity: 'Out-of-state EMTs use Certification by Endorsement in the PA EMS Registry. Expect out-of-state verification forms, current NREMT and/or state cards, PA-approved CPR, and state/FBI clearances. Follow the Bureau’s current endorsement job aid exactly.',
    tips: [
      'Under-18 applicants have additional consent uploads in the registry—start those early.',
      'Endorsement applications often cannot be saved mid-upload—prepare PDFs before you begin.',
      'Ask which Regional EMS Council will verify your identity for card issuance.'
    ],
    searchBlurb: 'Pennsylvania EMT certification, PA EMS Registry, NREMT exams, and endorsement from other states.',
    tags: ['Pennsylvania EMT', 'PA EMS Registry', 'how to become an EMT in Pennsylvania', 'EMT endorsement PA']
  },
  {
    slug: 'ohio',
    name: 'Ohio',
    code: 'OH',
    agency: 'Ohio Department of Public Safety — Division of EMS',
    agencyUrl: 'https://ems.ohio.gov/',
    initialUrl: 'https://ems.ohio.gov/',
    feesUrl: 'https://ems.ohio.gov/',
    reciprocityUrl: 'https://codes.ohio.gov/ohio-administrative-code/rule-4765-8-15',
    programsNote: 'Complete an Ohio-approved EMT education program that meets Division of EMS curriculum standards.',
    nremtVsState: 'Ohio issues a certificate to practice through the Division of EMS. National Registry certification is commonly part of initial and reciprocity pathways, but Ohio authorization to practice is a separate state certificate. Confirm current initial-certification steps on ems.ohio.gov.',
    requirements: [
      'Complete an Ohio-approved EMT course of instruction.',
      'Meet age, background, and application requirements published by the Division of EMS.',
      'Pass required National Registry / board examinations for the EMT level.',
      'Hold a current Ohio certificate to practice before staffing an EMS unit.'
    ],
    costs: [
      { label: 'Reciprocity application fee (OAC reference)', value: 'Often cited at $75 for reciprocity applicants — verify current Division fee schedule' },
      { label: 'NREMT exam fee', value: 'Paid to NREMT — confirm current amount' },
      { label: 'Program tuition & supplies', value: 'Varies — use the Program Cost planner' }
    ],
    reciprocity: 'Ohio reciprocity (OAC 4765-8-15) generally requires a valid out-of-state or military EMS credential in good standing, training substantially similar to Ohio standards, and current NREMT at the level sought (or above), plus a complete application. Read the current rule and Division instructions before you apply.',
    tips: [
      'Use ems.ohio.gov—not third-party blogs—for forms and fee updates.',
      'If you trained in a state that required agency affiliation, ask Ohio whether documentation without that state’s card is accepted.',
      'Plan for both NREMT timing and Ohio certificate processing before your first job start date.'
    ],
    searchBlurb: 'Ohio EMT certificate to practice, Division of EMS, NREMT, and reciprocity rules.',
    tags: ['Ohio EMT', 'Ohio Division of EMS', 'how to become an EMT in Ohio', 'Ohio EMS reciprocity']
  },
  {
    slug: 'illinois',
    name: 'Illinois',
    code: 'IL',
    agency: 'Illinois Department of Public Health (IDPH) — EMS',
    agencyUrl: 'https://dph.illinois.gov/topics-services/emergency-preparedness-response/ems.html',
    initialUrl: 'https://dph.illinois.gov/topics-services/emergency-preparedness-response/ems.html',
    feesUrl: 'https://dph.illinois.gov/topics-services/emergency-preparedness-response/ems.html',
    reciprocityUrl: 'https://dph.illinois.gov/topics-services/emergency-preparedness-response/ems.html',
    programsNote: 'Train through an IDPH-recognized EMS System / approved EMT education program. Illinois EMS education and licensing are tightly linked to EMS Systems and resource hospitals.',
    nremtVsState: 'Illinois uses National Registry examinations for many EMT candidates and still requires state licensure/recognition through IDPH and the EMS System where you will practice. NREMT does not replace Illinois EMS provider licensure or local system credentialing.',
    requirements: [
      'Complete an IDPH-approved EMT education program affiliated with an EMS System.',
      'Pass required NREMT cognitive (and any psychomotor) testing your program schedules.',
      'Complete IDPH / EMS System licensing or recognition steps, including background and CPR requirements.',
      'Obtain any local system or employer credentials before independent practice.'
    ],
    costs: [
      { label: 'State / system fees', value: 'Confirm current IDPH and EMS System fees with your program coordinator' },
      { label: 'NREMT exam fee', value: 'Paid to NREMT — confirm current amount' },
      { label: 'Program tuition & supplies', value: 'Varies — use the Program Cost planner' }
    ],
    reciprocity: 'Out-of-state EMTs should contact IDPH EMS and the Illinois EMS System where they plan to work. Expect verification of training, NREMT or equivalent testing history, and system-specific onboarding—do not assume automatic reciprocity.',
    tips: [
      'Ask which EMS System will “claim” you after graduation—systems drive clinical sites and protocols.',
      'Clarify whether your first employer needs additional system entry testing or protocol exams.',
      'Keep copies of course completion, NREMT results, and CPR for IDPH uploads.'
    ],
    searchBlurb: 'Illinois EMT training through IDPH EMS Systems, NREMT testing, and state licensing steps.',
    tags: ['Illinois EMT', 'IDPH EMS', 'how to become an EMT in Illinois', 'EMS System Illinois']
  },
  {
    slug: 'georgia',
    name: 'Georgia',
    code: 'GA',
    agency: 'Georgia Department of Public Health — Office of EMS and Trauma',
    agencyUrl: 'https://dph.georgia.gov/EMS',
    initialUrl: 'https://dph.georgia.gov/EMS',
    feesUrl: 'https://dph.georgia.gov/EMS',
    reciprocityUrl: 'https://dph.georgia.gov/EMS',
    programsNote: 'Complete a Georgia-approved EMT education program listed or recognized by the Office of EMS and Trauma.',
    nremtVsState: 'Georgia EMT candidates typically complete state-approved education and National Registry testing, then obtain Georgia EMS licensure through the Office of EMS and Trauma. Holding NREMT without a Georgia license is not authorization to practice in Georgia.',
    requirements: [
      'Graduate from a Georgia-approved EMT program.',
      'Pass NREMT EMT examinations as required for initial Georgia licensure.',
      'Submit a Georgia EMS license application, fees, and background screening as directed.',
      'Maintain CPR and meet employer / medical director credentialing.'
    ],
    costs: [
      { label: 'Georgia EMS license fees', value: 'Confirm current amounts on the Office of EMS and Trauma site' },
      { label: 'NREMT exam fee', value: 'Paid to NREMT — confirm current amount' },
      { label: 'Program tuition & supplies', value: 'Varies — use the Program Cost planner' }
    ],
    reciprocity: 'Georgia offers pathways for currently licensed out-of-state providers. Expect proof of training, current NREMT or equivalent, and a Georgia application. Use the official EMS office instructions for reciprocity / endorsement.',
    tips: [
      'Verify your school appears on Georgia’s approved program lists before paying deposits.',
      'Start background checks early—licensing often waits on them.',
      'Ask rural vs metro employers about volunteer-to-paid pathways after initial certification.'
    ],
    searchBlurb: 'Georgia EMT requirements, Office of EMS and Trauma licensing, NREMT, and reciprocity.',
    tags: ['Georgia EMT', 'Georgia DPH EMS', 'how to become an EMT in Georgia', 'NREMT Georgia']
  },
  {
    slug: 'north-carolina',
    name: 'North Carolina',
    code: 'NC',
    agency: 'North Carolina Office of Emergency Medical Services (OEMS)',
    agencyUrl: 'https://oems.nc.gov/',
    initialUrl: 'https://oems.nc.gov/',
    feesUrl: 'https://oems.nc.gov/',
    reciprocityUrl: 'https://oems.nc.gov/',
    programsNote: 'Complete an OEMS-approved EMT education program. North Carolina credentials EMS personnel through OEMS after education and testing.',
    nremtVsState: 'North Carolina commonly uses National Registry examinations for EMT candidates and issues a separate state credential through OEMS. NREMT certification is not by itself a North Carolina practice authorization.',
    requirements: [
      'Enroll in an OEMS-approved EMT program.',
      'Complete didactic, skills, and clinical requirements.',
      'Pass required NREMT cognitive testing and any state/practical steps your program schedules.',
      'Apply for North Carolina EMS credentials through OEMS and complete background requirements.'
    ],
    costs: [
      { label: 'OEMS credential fees', value: 'Confirm current fee schedule on oems.nc.gov' },
      { label: 'NREMT exam fee', value: 'Paid to NREMT — confirm current amount' },
      { label: 'Program tuition & supplies', value: 'Varies — use the Program Cost planner' }
    ],
    reciprocity: 'Out-of-state EMTs should follow OEMS reciprocity / legal recognition instructions. Current NREMT and verification from the sending state are commonly required. Confirm details on oems.nc.gov before relocating.',
    tips: [
      'Ask programs about NC OEMS affiliation and recent NREMT pass rates.',
      'Clarify county credentialing or protocol exams your first employer requires after state credentialing.',
      'Use the school finder and cost planner before signing an enrollment agreement.'
    ],
    searchBlurb: 'North Carolina EMT training, OEMS credentials, NREMT testing, and reciprocity.',
    tags: ['North Carolina EMT', 'NC OEMS', 'how to become an EMT in North Carolina', 'NREMT North Carolina']
  },
  {
    slug: 'michigan',
    name: 'Michigan',
    code: 'MI',
    agency: 'Michigan Department of Health and Human Services — EMS',
    agencyUrl: 'https://www.michigan.gov/mdhhs/safety-injury-prev/emergencyprep/ems',
    initialUrl: 'https://www.michigan.gov/mdhhs/safety-injury-prev/emergencyprep/ems',
    feesUrl: 'https://www.michigan.gov/mdhhs/safety-injury-prev/emergencyprep/ems',
    reciprocityUrl: 'https://www.michigan.gov/mdhhs/safety-injury-prev/emergencyprep/ems',
    programsNote: 'Complete a Michigan-approved EMT education program recognized by MDHHS EMS.',
    nremtVsState: 'Michigan EMT candidates generally complete approved education and National Registry testing, then obtain Michigan EMS licensure through MDHHS. NREMT alone does not authorize practice in Michigan.',
    requirements: [
      'Complete a Michigan-approved EMT course.',
      'Pass NREMT EMT examinations as required for initial licensure.',
      'Apply for Michigan EMS licensure, including any background and CPR documentation MDHHS requires.',
      'Meet medical director / agency onboarding before independent field work.'
    ],
    costs: [
      { label: 'Michigan EMS license fees', value: 'Confirm current MDHHS fee schedule before applying' },
      { label: 'NREMT exam fee', value: 'Paid to NREMT — confirm current amount' },
      { label: 'Program tuition & supplies', value: 'Varies — use the Program Cost planner' }
    ],
    reciprocity: 'Michigan provides pathways for currently licensed out-of-state EMS personnel. Expect NREMT currency, verification of prior licenses, and a Michigan application. Follow MDHHS EMS reciprocity instructions rather than informal advice.',
    tips: [
      'Confirm your program is Michigan-approved—not only nationally marketed.',
      'Ask about winter clinical logistics and driving requirements for unpaid ride time.',
      'Keep NREMT active if you may move—portability is easier with a current National Registry card.'
    ],
    searchBlurb: 'Michigan EMT requirements, MDHHS EMS licensure, NREMT, and out-of-state reciprocity.',
    tags: ['Michigan EMT', 'MDHHS EMS', 'how to become an EMT in Michigan', 'NREMT Michigan']
  }
];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function navHtml(currentPath) {
  const link = (href, title, small, current) =>
    `<a ${current ? 'aria-current="page" ' : ''}href="${href}"><strong>${title}</strong><small>${small}</small></a>`;
  const startCurrent = currentPath.startsWith('/become-an-emt') || currentPath === '/explore-ems.html' || currentPath === '/emt-school-finder.html' || currentPath === '/emt-program-cost.html';
  return `<div class="main-nav"><details class="nav-group${startCurrent ? ' current' : ''}" data-nav-group=""><summary>Start EMS</summary><div class="nav-dropdown">${link('/explore-ems.html', 'Explore EMS', 'For high-school students and beginners', false)}${link('/become-an-emt.html', 'Become an EMT', 'Training, certification, and state steps', currentPath === '/become-an-emt.html')}${link('/become-an-emt/states/', 'State EMT Guides', 'Requirements, costs, NREMT vs license by state', currentPath.startsWith('/become-an-emt/states'))}${link('/emt-school-finder.html', 'EMT School Finder', 'Search for and verify nearby programs', false)}${link('/emt-program-cost.html', 'Program Cost &amp; Financial Help', 'Estimate the full cost and find ways to pay less', false)}</div></details><details class="nav-group" data-nav-group=""><summary>Prepare</summary><div class="nav-dropdown"><a href="/emt-prep.html"><strong>Free EMT Prep Program</strong><small>Build foundations before class begins</small></a><a href="/pre-emt-equipment.html"><strong>Pre-EMT Equipment Guide</strong><small>Choose a practical cuff and stethoscope</small></a><a href="/emt-school-success.html"><strong>Succeed in EMT School</strong><small>Study, skills, clinicals, and exams</small></a><a href="/first-100-shifts.html"><strong>First EMT Job</strong><small>Field training and your first 100 shifts</small></a></div></details><details class="nav-group" data-nav-group=""><summary>Practice</summary><div class="nav-dropdown"><a href="/#daily-practice"><strong>Today’s 5-Minute Practice</strong><small>Quiz, fact, simulator, and prep progress</small></a><a href="/ems-training-tools.html"><strong>Training Tools</strong><small>Free vital-sign and assessment simulators</small></a><a href="/abc-training.html"><strong>ABC Learning Center</strong><small>Airway, breathing, circulation, and primary assessment</small></a><a href="/cpr-training.html"><strong>CPR Training Center</strong><small>2025 guidance, practice, and class finder</small></a><a href="/emt-flashcards.html"><strong>EMT Flashcards</strong><small>Choose a category or build a random deck</small></a><a href="/quiz/"><strong>Daily Quiz</strong><small>EMT, paramedic, terminology, and medication review</small></a></div></details><details class="nav-group" data-nav-group=""><summary>Career</summary><div class="nav-dropdown"><a href="/ems-progress-tracker.html"><strong>Personal Progress Tracker</strong><small>Track calls, skills, and success rates</small></a><a href="/ems-career-planner.html"><strong>EMS Career Planner</strong><small>Map training, jobs, and next credentials</small></a><a href="/ems-career-growth.html"><strong>Career Paths &amp; Pay</strong><small>Paramedic, fire, flight, nursing, education, and leadership</small></a><a href="/ems-recertification.html"><strong>Recertification</strong><small>NREMT and state renewal planning</small></a><a href="/ems-wellness.html"><strong>EMS Wellness</strong><small>Sleep, fitness, mental health, and career longevity</small></a></div></details><details class="nav-group" data-nav-group=""><summary>Resources</summary><div class="nav-dropdown"><a href="/ems-resources.html"><strong>Trusted Resources</strong><small>Official agencies and reliable EMS references</small></a><a href="/about.html"><strong>About EMSCodeSim</strong><small>Creator experience and editorial standards</small></a><a href="/search.html"><strong>Search the Site</strong><small>Find a guide, simulator, or quiz</small></a><a href="/privacy.html"><strong>Privacy Choices</strong><small>Analytics, local storage, and user controls</small></a></div></details></div>`;
}

function mobileMenuHtml() {
  return `<select aria-label="Navigate EMSCodeSim" class="mobile-menu" id="mobileMenu"><option value="">Menu</option><option value="/">Home</option><optgroup label="Start EMS"><option value="/explore-ems.html">Explore EMS</option><option value="/become-an-emt.html">Become an EMT</option><option value="/become-an-emt/states/">State EMT Guides</option><option value="/emt-school-finder.html">EMT School Finder</option><option value="/emt-program-cost.html">Program Cost &amp; Financial Help</option></optgroup><optgroup label="Prepare"><option value="/emt-prep.html">Free EMT Prep Program</option><option value="/pre-emt-equipment.html">Pre-EMT Equipment Guide</option><option value="/emt-school-success.html">Succeed in EMT School</option><option value="/first-100-shifts.html">First EMT Job</option></optgroup><optgroup label="Practice"><option value="/#daily-practice">Today’s 5-Minute Practice</option><option value="/ems-training-tools.html">Training Tools</option><option value="/abc-training.html">ABC Learning Center</option><option value="/cpr-training.html">CPR Training Center</option><option value="/emt-flashcards.html">EMT Flashcards</option><option value="/quiz/">Daily Quiz</option></optgroup><optgroup label="Career"><option value="/ems-progress-tracker.html">Personal Progress Tracker</option><option value="/ems-career-planner.html">EMS Career Planner</option><option value="/ems-career-growth.html">Career Paths &amp; Pay</option><option value="/ems-recertification.html">Recertification</option><option value="/ems-wellness.html">EMS Wellness</option></optgroup><optgroup label="Resources"><option value="/ems-resources.html">Trusted Resources</option><option value="/about.html">About EMSCodeSim</option><option value="/search.html">Search the Site</option><option value="/privacy.html">Privacy Choices</option></optgroup></select>`;
}

function footerHtml() {
  return `<footer class="site-footer"><div class="footer-grid">
<div><h2>EMSCodeSim</h2><p>Free guidance and practice from first interest in EMS through career growth and retirement.</p><form action="/search.html" class="footer-search" method="get" role="search"><label class="sr-only" for="footerSearch">Search EMSCodeSim</label><input id="footerSearch" name="q" placeholder="Search EMSCodeSim" type="search"/><button type="submit">Search</button></form></div>
<div><h3>Start &amp; Prepare</h3><a href="/explore-ems.html">Explore EMS</a><a href="/become-an-emt.html">Become an EMT</a><a href="/become-an-emt/states/">State EMT Guides</a><a href="/emt-school-finder.html">EMT School Finder</a><a href="/emt-program-cost.html">Program Cost Help</a><a href="/emt-prep.html">Free EMT Prep Program</a></div>
<div><h3>Practice &amp; Career</h3><a href="/#daily-practice">Today’s 5-Minute Practice</a><a href="/ems-training-tools.html">Training Tools</a><a href="/quiz/">Daily Quiz</a><a href="/ems-career-planner.html">EMS Career Planner</a><a href="/ems-career-growth.html">Career Paths &amp; Pay</a></div>
<div><h3>About &amp; Support</h3><a href="/ems-wellness.html">EMS Wellness</a><a href="/ems-resources.html">Trusted Resources</a><a href="/about.html">About EMSCodeSim</a><a href="/privacy.html">Privacy Choices</a></div>
</div><div class="footer-bottom">EMSCodeSim provides educational information and simulation practice. It does not replace an approved EMS course, local protocol, medical direction, certification authority, or professional financial, legal, or health advice. State fees and rules change—verify with the official EMS office before you enroll or apply.</div></footer>`;
}

function shell({ title, description, canonicalPath, breadcrumbs, heroTitle, heroLead, jsonLd, bodyMain, extraHead = '' }) {
  const url = `https://emscodesim.com${canonicalPath}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width,initial-scale=1,viewport-fit=cover" name="viewport"/>
<title>${esc(title)}</title>
<meta content="${esc(description)}" name="description"/>
<meta content="index,follow,max-image-preview:large" name="robots"/>
<link href="${url}" rel="canonical"/>
<meta content="#081626" name="theme-color"/>
<link href="/favicon.png" rel="icon" type="image/png"/>
<link href="/favicon.ico" rel="shortcut icon"/>
<link href="/favicon.png" rel="apple-touch-icon"/>
<link href="/site.webmanifest" rel="manifest"/>
<meta content="website" property="og:type"/><meta content="EMSCodeSim" property="og:site_name"/><meta content="${esc(title)}" property="og:title"/><meta content="${esc(description)}" property="og:description"/><meta content="${url}" property="og:url"/><meta content="https://emscodesim.com/ems-logo.png" property="og:image"/>
<link href="/styles/career-hub.css" rel="stylesheet"/>
<link href="/styles/become-emt-states.css" rel="stylesheet"/>
<link href="/styles/responsive.css" rel="stylesheet"/>
<link href="/styles/site-enhancements.css" rel="stylesheet"/>
${extraHead}
<script type="application/ld+json">${jsonLd}</script>
<script defer="" src="/privacy-controls.js"></script>
<script defer="" src="/scripts/engagement-loop.js"></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>
<header class="site-header">
<nav aria-label="Primary navigation" class="nav-wrap">
<a class="brand" href="/"><picture><source srcset="/ems-logo.webp" type="image/webp"/><img alt="EMSCodeSim logo" height="40" src="/ems-logo.png" width="40"/></picture><span>EMSCodeSim<small>EMS Career &amp; Training Hub</small></span></a>
${navHtml(canonicalPath)}
${mobileMenuHtml()}
</nav>
</header>
<section class="page-hero"><div class="page-hero-inner"><div class="breadcrumbs">${breadcrumbs}</div><h1>${esc(heroTitle)}</h1><p>${heroLead}</p></div></section>
${bodyMain}
<aside aria-label="About the author" class="author-panel"><div aria-hidden="true" class="author-mark">DG</div><div><h2>Created by an experienced EMS educator</h2><p><strong>David Gallaher</strong> is a career paramedic, firefighter, and EMS instructor with more than two decades in prehospital care. These guides support—not replace—approved education, medical direction, or state authorization. <a href="/about.html">Editorial standards &amp; corrections</a>. <strong>Last reviewed: ${REVIEWED}.</strong></p></div></aside>
${footerHtml()}
<script defer="" src="/career.js"></script>
</body>
</html>
`;
}

function stateNav(activeSlug) {
  return `<nav class="state-nav-row" aria-label="State guides">${STATES.map((s) =>
    `<a href="/become-an-emt/states/${s.slug}.html"${s.slug === activeSlug ? ' aria-current="page"' : ''}>${esc(s.name)}</a>`
  ).join('')}<a href="/become-an-emt/states/">All states</a></nav>`;
}

function funnelSidebar(stateName) {
  return `<aside class="sidebar">
<div class="side-card"><h2>Free prep &amp; practice</h2>
<p>Most people who stall out of EMT school struggle with foundations—not motivation.</p>
<a href="/emt-prep.html">Start Free EMT Prep →</a>
<a href="/vitals/">Open vital-sign simulators →</a>
<a href="/quiz/emt_quiz.html">Try an EMT quiz →</a>
</div>
<div class="side-card"><h3>Plan school &amp; career</h3>
<a href="/emt-school-finder.html">Find approved programs</a>
<a href="/emt-program-cost.html">Estimate total cost</a>
<a href="/ems-career-planner.html">EMS Career Planner</a>
<a href="/first-100-shifts.html">First 100 shifts guide</a>
</div>
<div class="side-card"><h3>Official directories</h3>
<ul>
<li><a href="https://www.nremt.org/resources/state-ems-offices" rel="noopener" target="_blank">NREMT state EMS offices</a></li>
<li><a href="https://www.ems.gov/becoming-an-ems-clinician" rel="noopener" target="_blank">EMS.gov clinician path</a></li>
<li><a href="https://www.nremt.org/EMT/Certification" rel="noopener" target="_blank">NREMT EMT certification</a></li>
</ul>
<p class="source-note">${esc(stateName)} rules change. Always re-check the state EMS office before you pay tuition or submit an application.</p>
</div>
</aside>`;
}

function renderHub() {
  const cards = STATES.map((s) => {
    const featured = s.featured ? ' featured' : '';
    return `<a class="state-card${featured}" href="/become-an-emt/states/${s.slug}.html">
<span class="state-code">${esc(s.code)} · ${esc(s.agency.split('—')[0].trim())}</span>
<h3>How to become an EMT in ${esc(s.name)}</h3>
<p>${esc(s.searchBlurb)}</p>
<div class="state-meta"><span class="state-chip">Requirements</span><span class="state-chip">Costs</span><span class="state-chip">NREMT vs license</span><span class="state-chip">Reciprocity</span></div>
</a>`;
  }).join('\n');

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://emscodesim.com/' },
          { '@type': 'ListItem', position: 2, name: 'Become an EMT', item: 'https://emscodesim.com/become-an-emt.html' },
          { '@type': 'ListItem', position: 3, name: 'State EMT Guides', item: 'https://emscodesim.com/become-an-emt/states/' }
        ]
      },
      {
        '@type': 'CollectionPage',
        name: 'How to Become an EMT — State-by-State Guides',
        description: 'State EMT requirements, typical costs, approved programs, NREMT vs state licensing, and reciprocity for high-search states.',
        url: 'https://emscodesim.com/become-an-emt/states/',
        dateModified: LASTMOD,
        isPartOf: { '@type': 'WebSite', name: 'EMSCodeSim', url: 'https://emscodesim.com/' }
      }
    ]
  });

  const bodyMain = `<main id="main">
<section class="section compact">
<div class="section-head">
<p class="eyebrow">National overview first</p>
<h2>NREMT certification is not a state license</h2>
<p class="section-lead">Almost every state uses National Registry testing in some form—but permission to practice comes from the state EMS office (or, in California, a Local EMS Agency). Use the national roadmap, then open your state guide before you enroll.</p>
</div>
<div class="states-quick">
<a href="/become-an-emt.html">National 7-step roadmap<span>Education → testing → state license → first job</span></a>
<a href="/emt-school-finder.html">Find approved programs<span>Search schools and verify approval</span></a>
<a href="/emt-program-cost.html">Estimate real cost<span>Tuition, testing, gear, travel</span></a>
<a href="/emt-prep.html">Free EMT Prep<span>Build foundations before day one</span></a>
</div>
</section>

<section class="section compact">
<div class="section-head">
<p class="eyebrow">What every state guide covers</p>
<h2>Requirements, costs, programs, NREMT vs license, reciprocity</h2>
<p class="section-lead">Each guide links official EMS office pages, separates exam fees from tuition ranges, and funnels you into free prep, simulators, and the career planner.</p>
</div>
<div class="funnel-band">
<div class="funnel-card"><h3>1. Confirm the state path</h3><p>Age, approved education, exams, background checks, and application portals differ by state.</p><a href="#state-list">Browse state guides →</a></div>
<div class="funnel-card"><h3>2. Prepare before class</h3><p>Use free EMT Prep and vital-sign simulators so anatomy, terms, and vitals are not brand new on day one.</p><a href="/emt-prep.html">Start prep →</a></div>
<div class="funnel-card"><h3>3. Plan the first job</h3><p>Map IFT vs 911, schedules, and next credentials with the career planner after you know your state rules.</p><a href="/ems-career-planner.html">Open career planner →</a></div>
</div>
</section>

<section class="section" id="state-list">
<div class="section-head">
<p class="eyebrow">Top search-volume states</p>
<h2>Choose your state guide</h2>
<p class="section-lead">Starting with Texas and other high-demand states. More states will be added—use the <a href="https://www.nremt.org/resources/state-ems-offices" rel="noopener" target="_blank">NREMT state EMS office directory</a> if yours is not listed yet.</p>
</div>
<div class="state-grid">
${cards}
</div>
<section class="callout warning" style="margin-top:22px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px">
<h2 style="margin-top:0">Educational information only</h2>
<p>Fees, forms, and reciprocity rules change. EMSCodeSim summarizes publicly posted requirements and links official sources. Always verify with your state EMS office and approved program before you enroll, test, or apply.</p>
</section>
</section>
</main>`;

  return shell({
    title: 'How to Become an EMT by State | Requirements, Costs & Reciprocity',
    description: 'State-by-state guides to becoming an EMT: requirements, typical costs, approved programs, NREMT vs state licensing, and reciprocity—plus free prep, simulators, and career planning.',
    canonicalPath: '/become-an-emt/states/',
    breadcrumbs: '<a href="/">Home</a> / <a href="/become-an-emt.html">Become an EMT</a> / State Guides',
    heroTitle: 'How to become an EMT — state by state',
    heroLead: 'High-search guides for requirements, costs, approved programs, NREMT vs. state licensing, and reciprocity. Start with Texas or pick another top state, then jump into free prep, simulators, and the career planner.',
    jsonLd,
    bodyMain
  });
}

function renderState(state) {
  const path = `/become-an-emt/states/${state.slug}.html`;
  const title = `How to Become an EMT in ${state.name}: Requirements, Costs & License`;
  const description = `Learn how to become an EMT in ${state.name}: state requirements, typical costs, approved programs, NREMT vs state licensing, and reciprocity—with links to free EMT prep and career tools.`;
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://emscodesim.com/' },
          { '@type': 'ListItem', position: 2, name: 'Become an EMT', item: 'https://emscodesim.com/become-an-emt.html' },
          { '@type': 'ListItem', position: 3, name: 'State Guides', item: 'https://emscodesim.com/become-an-emt/states/' },
          { '@type': 'ListItem', position: 4, name: state.name, item: `https://emscodesim.com${path}` }
        ]
      },
      {
        '@type': 'Article',
        headline: title,
        description,
        mainEntityOfPage: `https://emscodesim.com${path}`,
        dateModified: LASTMOD,
        author: { '@type': 'Organization', name: 'EMSCodeSim' },
        publisher: {
          '@type': 'Organization',
          name: 'EMSCodeSim',
          logo: { '@type': 'ImageObject', url: 'https://emscodesim.com/ems-logo.png' }
        }
      }
    ]
  });

  const costRows = state.costs
    .map((c) => `<tr><td>${esc(c.label)}</td><td>${esc(c.value)}</td></tr>`)
    .join('');
  const reqList = state.requirements.map((r) => `<li>${esc(r)}</li>`).join('');
  const tips = state.tips.map((t) => `<li>${esc(t)}</li>`).join('');

  const bodyMain = `<main class="content-layout" id="main"><article class="article">
<section class="callout"><h2>Quick facts — ${esc(state.name)}</h2>
<div class="state-facts">
<div class="state-fact"><strong>EMS authority</strong><span>${esc(state.agency)}</span></div>
<div class="state-fact"><strong>NREMT vs license</strong><span>See details below — they are not the same credential</span></div>
</div>
${stateNav(state.slug)}
</section>

<section id="requirements"><h2>Requirements to become an EMT in ${esc(state.name)}</h2>
<p>${esc(state.programsNote)}</p>
<ol>${reqList}</ol>
<p class="source-note">Primary source: <a href="${esc(state.initialUrl)}" rel="noopener" target="_blank">${esc(state.agency)}</a>. Re-check before you enroll.</p>
</section>

<section id="nremt"><h2>NREMT vs. ${esc(state.name)} licensing</h2>
<p>${esc(state.nremtVsState)}</p>
<p><a href="https://www.nremt.org/EMT/Certification" rel="noopener" target="_blank">NREMT EMT certification overview →</a></p>
</section>

<section id="costs"><h2>Typical costs</h2>
<p>Separate <strong>state/application fees</strong> (citeable on official fee pages) from <strong>program tuition</strong> (school-specific). Use the cost planner for a full budget.</p>
<div class="table-wrap"><table class="comparison"><thead><tr><th>Item</th><th>What to expect</th></tr></thead><tbody>${costRows}</tbody></table></div>
<p><a class="btn btn-blue" href="/emt-program-cost.html">Open EMT Program Cost planner →</a></p>
${state.feesUrl ? `<p class="source-note">Fee references: <a href="${esc(state.feesUrl)}" rel="noopener" target="_blank">official fee / EMS office page</a>.</p>` : ''}
</section>

<section id="programs"><h2>Find approved ${esc(state.name)} EMT programs</h2>
<p>Only enroll in programs your state EMS office (or LEMSA, where applicable) recognizes for certification eligibility. Marketing pages are not approval.</p>
<p><a class="btn btn-blue" href="/emt-school-finder.html">Search the EMT School Finder →</a></p>
<p>Then compare schedules, clinical access, and total price with the <a href="/become-an-emt.html">national Become an EMT roadmap</a>.</p>
</section>

<section id="reciprocity"><h2>Reciprocity &amp; out-of-state EMTs</h2>
<p>${esc(state.reciprocity)}</p>
<div class="official-links">
<a href="${esc(state.agencyUrl)}" rel="noopener" target="_blank">Official ${esc(state.name)} EMS office</a>
<a href="${esc(state.reciprocityUrl)}" rel="noopener" target="_blank">Reciprocity / certification details</a>
<a href="https://www.nremt.org/resources/state-ems-offices" rel="noopener" target="_blank">All state EMS offices (NREMT directory)</a>
</div>
</section>

<section id="tips"><h2>Practical tips for ${esc(state.name)} applicants</h2>
<ul>${tips}</ul>
</section>

<section class="callout wellness" id="next-steps"><h2>Your next steps on EMSCodeSim</h2>
<p>Free tools that turn this research into action:</p>
<ul>
<li><a href="/emt-prep.html"><strong>Free EMT Prep Program</strong></a> — foundations before class</li>
<li><a href="/vitals/bp.html"><strong>Blood pressure simulator</strong></a> and <a href="/vitals/">other vital-sign tools</a></li>
<li><a href="/ems-career-planner.html"><strong>EMS Career Planner</strong></a> — training to first job and beyond</li>
<li><a href="/first-100-shifts.html"><strong>First 100 shifts</strong></a> — field training survival guide</li>
</ul>
</section>

<section class="callout warning"><h2>Verify before you pay</h2>
<p>This page is educational. It is not legal advice and not a substitute for ${esc(state.name)} EMS office instructions, approved course requirements, or employer credentialing.</p>
</section>
</article>
${funnelSidebar(state.name)}
</main>`;

  return shell({
    title,
    description,
    canonicalPath: path,
    breadcrumbs: `<a href="/">Home</a> / <a href="/become-an-emt.html">Become an EMT</a> / <a href="/become-an-emt/states/">State Guides</a> / ${esc(state.name)}`,
    heroTitle: `How to become an EMT in ${state.name}`,
    heroLead: `${esc(state.searchBlurb)} Official links, realistic cost framing, and free prep tools to get you ready for class and your first job.`,
    jsonLd,
    bodyMain
  });
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderHub());
  for (const state of STATES) {
    fs.writeFileSync(path.join(OUT_DIR, `${state.slug}.html`), renderState(state));
  }

  console.log(`Wrote hub + ${STATES.length} state guides to ${OUT_DIR}`);
}

main();
