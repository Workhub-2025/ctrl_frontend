export interface CallSimulationCriterion {
  key: string;
  field:
    | 'callerName'
    | 'callbackNumber'
    | 'callerDob'
    | 'callerDoorNo'
    | 'callerStreet'
    | 'callerPostcode'
    | 'incidentCategory'
    | 'callerType'
    | 'responseTime'
    | 'referenceNumber'
    | 'suspectGender'
    | 'suspectEthnicity'
    | 'suspectAge'
    | 'suspectClothing'
    | 'uniqueInformation'
    | 'incidentDoorNo'
    | 'incidentStreet'
    | 'incidentPostcode'
    | 'incidentSummary'
    | 'keyInformation1'
    | 'keyInformation2'
    | 'keyInformation3';
  displayName: string;
  section:
    | 'caller_information'
    | 'system_information'
    | 'suspect_information'
    | 'intelligence_information'
    | 'incident_information';
  expectedConcept?: string;
  expectedValue?: string;
  acceptedExamples?: string[];
  /**
   * For ai_multi_point_extraction: the list of specific facts the AI should look for.
   * Each point is weighted equally against contentScore.
   */
  keyPoints?: string[];
  /**
   * For ai_multi_point_extraction: max marks available for finding the key points.
   * Defaults to 65% of score if not set.
   */
  contentScore?: number;
  /**
   * For ai_multi_point_extraction: max marks available for narrative quality
   * (clarity, professional tone, structure). Defaults to 35% of score if not set.
   */
  structureScore?: number;
  score: number;
  ruleType:
    | 'exact_or_readable_match'
    | 'numeric_match'
    | 'ai_evidence_extraction'
    | 'ai_multi_point_extraction';
  timeSensitive: boolean;
  esp: number; // seconds into audio at which this information is first spoken
  critical?: boolean;
}

export const CALL_2_BURGLARY_CRITERIA: CallSimulationCriterion[] = [

  // ─── CALLER INFORMATION ──────────────────────────────────────────────────────
  {
    key: 'caller_name',
    field: 'callerName',
    displayName: 'Caller Name',
    section: 'caller_information',
    expectedValue: 'Yasmin Gray',
    score: 0.20,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 87.08,
  },
  {
    key: 'telephone_number',
    field: 'callbackNumber',
    displayName: 'Telephone Number',
    section: 'caller_information',
    expectedValue: '07852176493',
    score: 0.20,
    ruleType: 'numeric_match',
    timeSensitive: true,
    esp: 112.68,
  },
  {
    key: 'caller_dob',
    field: 'callerDob',
    displayName: 'Date of Birth',
    section: 'caller_information',
    expectedValue: '18/03/1987',
    score: 0.20,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 104.52,
  },
  {
    key: 'caller_door_no',
    field: 'callerDoorNo',
    displayName: 'Caller Door No.',
    section: 'caller_information',
    expectedValue: '42',
    score: 0.15,
    ruleType: 'numeric_match',
    timeSensitive: true,
    esp: 20.22,
  },
  {
    key: 'caller_street',
    field: 'callerStreet',
    displayName: 'Caller Street',
    section: 'caller_information',
    expectedValue: 'Maple Crescent',
    score: 0.15,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 20.22,
  },
  {
    key: 'caller_postcode',
    field: 'callerPostcode',
    displayName: 'Caller Postcode',
    section: 'caller_information',
    expectedValue: 'BR1 4TN',
    score: 0.15,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 20.22,
  },

  // ─── SYSTEM INFORMATION ───────────────────────────────────────────────────────
  {
    key: 'incident_category',
    field: 'incidentCategory',
    displayName: 'Incident Category',
    section: 'system_information',
    expectedValue: 'Residential Burglary',
    score: 0.40,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 8.80,
    critical: true,
  },
  {
    key: 'caller_type',
    field: 'callerType',
    displayName: 'Caller Type',
    section: 'system_information',
    expectedValue: 'Victim',
    score: 0.20,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 8.80,
  },
  {
    key: 'response_time',
    field: 'responseTime',
    displayName: 'Response Time',
    section: 'system_information',
    expectedValue: 'Priority / officers within 60 minutes',
    score: 0.20,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 81.38,
    critical: true,
  },
  {
    key: 'reference_number',
    field: 'referenceNumber',
    displayName: 'Reference Number',
    section: 'system_information',
    expectedValue: '63918',
    score: 0.10,
    ruleType: 'numeric_match',
    timeSensitive: true,
    esp: 190.88,
  },

  // ─── SUSPECT INFORMATION (dropdown selects — exact match, time-sensitive) ─────
  {
    key: 'suspect_gender',
    field: 'suspectGender',
    displayName: 'Suspect Gender',
    section: 'suspect_information',
    expectedValue: 'Male',
    score: 0.05,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 162.50,
  },
  {
    key: 'suspect_ethnicity',
    field: 'suspectEthnicity',
    displayName: 'Suspect Ethnicity',
    section: 'suspect_information',
    expectedValue: 'Asian',
    score: 0.05,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 162.50,
  },
  {
    key: 'suspect_age',
    field: 'suspectAge',
    displayName: 'Suspect Age Range',
    section: 'suspect_information',
    expectedValue: '40-50 years',
    score: 0.05,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 162.50,
  },

  // ─── INTELLIGENCE INFORMATION (AI / free-text — not time-sensitive) ───────────
  {
    key: 'suspect_clothing',
    field: 'suspectClothing',
    displayName: 'Suspect Clothing',
    section: 'intelligence_information',
    expectedConcept: 'green high-visibility jacket',
    acceptedExamples: ['green hi-vis', 'green reflective jacket', 'high visibility jacket', 'hi vis jacket'],
    score: 0.05,
    ruleType: 'ai_evidence_extraction',
    timeSensitive: false,
    esp: 162.50,
  },
  {
    key: 'unique_information',
    field: 'uniqueInformation',
    displayName: 'Unique / Intel Details',
    section: 'intelligence_information',
    expectedConcept: 'gold necklace stolen',
    acceptedExamples: ['gold necklace', 'necklace from bedroom', 'jewellery taken'],
    score: 0.40,
    ruleType: 'ai_evidence_extraction',
    timeSensitive: false,
    esp: 81.38,
  },

  // ─── INCIDENT INFORMATION ─────────────────────────────────────────────────────
  {
    key: 'incident_door_no',
    field: 'incidentDoorNo',
    displayName: 'Incident Door No.',
    section: 'incident_information',
    expectedValue: '42',
    score: 0.15,
    ruleType: 'numeric_match',
    timeSensitive: true,
    esp: 20.22,
    critical: true,
  },
  {
    key: 'incident_street',
    field: 'incidentStreet',
    displayName: 'Incident Street',
    section: 'incident_information',
    expectedValue: 'Maple Crescent',
    score: 0.15,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 20.22,
    critical: true,
  },
  {
    key: 'incident_postcode',
    field: 'incidentPostcode',
    displayName: 'Incident Postcode',
    section: 'incident_information',
    expectedValue: 'BR1 4TN',
    score: 0.15,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 20.22,
    critical: true,
  },

  // ─── INCIDENT SUMMARY — ai_multi_point_extraction ────────────────────────────
  // Total: 2.00
  //   • Content (key points found):  1.30  — 4 points × 0.325 each
  //   • Structure quality:           0.70  — AI rates wording, clarity, professional tone
  {
    key: 'incident_summary',
    field: 'incidentSummary',
    displayName: 'Incident Summary & Details',
    section: 'intelligence_information',
    expectedConcept: 'residential burglary — forced entry, property stolen, suspect seen, absence timings noted',
    keyPoints: [
      'Forced entry via rear kitchen window (frame smashed / damaged)',
      'Gold necklace stolen from bedroom',
      'Neighbour has CCTV footage that may have captured the suspect',
      'Caller left home at approximately 07:30 and returned at approximately 17:30',
    ],
    contentScore: 1.30,
    structureScore: 0.70,
    score: 2.00,
    ruleType: 'ai_multi_point_extraction',
    timeSensitive: false,
    esp: 56.20,
  },
];

export const CALL_1_CAR_BREAK_IN_CRITERIA: CallSimulationCriterion[] = [
  {
    key: 'caller_name',
    field: 'callerName',
    displayName: 'Caller Name',
    section: 'caller_information',
    expectedValue: 'Jessie Peres',
    score: 0.20,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 118.28,
  },
  {
    key: 'telephone_number',
    field: 'callbackNumber',
    displayName: 'Telephone Number',
    section: 'caller_information',
    expectedValue: '07700938216',
    score: 0.20,
    ruleType: 'numeric_match',
    timeSensitive: true,
    esp: 147.75,
  },
  {
    key: 'caller_dob',
    field: 'callerDob',
    displayName: 'Date of Birth',
    section: 'caller_information',
    expectedValue: '14/02/1991',
    score: 0.20,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 137.86,
  },
  {
    key: 'caller_door_no',
    field: 'callerDoorNo',
    displayName: 'Caller Door No.',
    section: 'caller_information',
    expectedValue: '16',
    score: 0.15,
    ruleType: 'numeric_match',
    timeSensitive: true,
    esp: 161.65,
  },
  {
    key: 'caller_street',
    field: 'callerStreet',
    displayName: 'Caller Street',
    section: 'caller_information',
    expectedValue: 'Camden Grove',
    score: 0.15,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 161.65,
  },
  {
    key: 'caller_postcode',
    field: 'callerPostcode',
    displayName: 'Caller Postcode',
    section: 'caller_information',
    expectedValue: 'SE15 3XB',
    score: 0.15,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 161.65,
  },
  {
    key: 'incident_category',
    field: 'incidentCategory',
    displayName: 'Incident Category',
    section: 'system_information',
    expectedValue: 'Theft from Vehicle',
    score: 0.40,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 4.96,
    critical: true,
  },
  {
    key: 'caller_type',
    field: 'callerType',
    displayName: 'Caller Type',
    section: 'system_information',
    expectedValue: 'Witness',
    score: 0.20,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 4.96,
  },
  {
    key: 'response_time',
    field: 'responseTime',
    displayName: 'Response Time',
    section: 'system_information',
    expectedValue: 'Emergency / immediate response',
    score: 0.20,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 84.25,
    critical: true,
  },
  {
    key: 'reference_number',
    field: 'referenceNumber',
    displayName: 'Reference Number',
    section: 'system_information',
    expectedValue: '46195',
    score: 0.10,
    ruleType: 'numeric_match',
    timeSensitive: true,
    esp: 186.65,
  },
  {
    key: 'suspect_gender',
    field: 'suspectGender',
    displayName: 'Suspect Gender',
    section: 'suspect_information',
    expectedValue: 'Male',
    score: 0.05,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 58.38,
  },
  {
    key: 'suspect_ethnicity',
    field: 'suspectEthnicity',
    displayName: 'Suspect Ethnicity',
    section: 'suspect_information',
    expectedValue: 'White',
    score: 0.05,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 58.38,
  },
  {
    key: 'suspect_age',
    field: 'suspectAge',
    displayName: 'Suspect Age Range',
    section: 'suspect_information',
    expectedValue: '25-40 years',
    score: 0.05,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 58.38,
  },
  {
    key: 'suspect_clothing',
    field: 'suspectClothing',
    displayName: 'Suspect Clothing',
    section: 'intelligence_information',
    expectedConcept: 'black jacket and grey jogging bottoms',
    acceptedExamples: ['black jacket', 'grey jogging bottoms', 'grey joggers', 'joggers'],
    score: 0.05,
    ruleType: 'ai_evidence_extraction',
    timeSensitive: false,
    esp: 58.38,
  },
  {
    key: 'unique_information',
    field: 'uniqueInformation',
    displayName: 'Unique / Intel Details',
    section: 'intelligence_information',
    expectedConcept: 'suspect used a hammer to smash the window',
    acceptedExamples: ['hammer', 'used a hammer', 'hammer to smash window'],
    score: 0.40,
    ruleType: 'ai_evidence_extraction',
    timeSensitive: false,
    esp: 51.0,
  },
  {
    key: 'incident_door_no',
    field: 'incidentDoorNo',
    displayName: 'Incident Door No.',
    section: 'incident_information',
    expectedValue: '18',
    score: 0.15,
    ruleType: 'numeric_match',
    timeSensitive: true,
    esp: 28.53,
    critical: true,
  },
  {
    key: 'incident_street',
    field: 'incidentStreet',
    displayName: 'Incident Street',
    section: 'incident_information',
    expectedValue: 'Camden Grove',
    score: 0.15,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 28.53,
    critical: true,
  },
  {
    key: 'incident_postcode',
    field: 'incidentPostcode',
    displayName: 'Incident Postcode',
    section: 'incident_information',
    expectedValue: 'SE15 3XB',
    score: 0.15,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 28.53,
    critical: true,
  },
  {
    key: 'incident_summary',
    field: 'incidentSummary',
    displayName: 'Incident Summary & Details',
    section: 'intelligence_information',
    expectedConcept: 'theft from motor vehicle in progress — window smashed, silver toyota details, registration number details',
    keyPoints: [
      'Theft from motor vehicle in progress',
      'Vehicle window smashed / broken',
      'Vehicle is a silver Toyota Yaris',
      'Registration plate is HN28 YJW',
    ],
    contentScore: 1.30,
    structureScore: 0.70,
    score: 2.00,
    ruleType: 'ai_multi_point_extraction',
    timeSensitive: false,
    esp: 4.96,
  },
];

