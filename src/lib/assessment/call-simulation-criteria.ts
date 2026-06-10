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
  section: 'caller_information' | 'system_information' | 'intelligence_information' | 'incident_information';
  expectedConcept?: string;
  expectedValue?: string;
  acceptedExamples?: string[];
  score: number;
  ruleType: 'exact_or_readable_match' | 'numeric_match' | 'ai_evidence_extraction';
  timeSensitive: boolean;
  esp: number; // in seconds
  critical?: boolean;
}

export const CALL_2_BURGLARY_CRITERIA: CallSimulationCriterion[] = [
  // --- CALLER INFORMATION ---
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

  // --- SYSTEM INFORMATION ---
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

  // --- INTELLIGENCE INFORMATION ---
  {
    key: 'suspect_gender',
    field: 'suspectGender',
    displayName: 'Suspect Gender',
    section: 'intelligence_information',
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
    section: 'intelligence_information',
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
    section: 'intelligence_information',
    expectedValue: '40-50 years',
    score: 0.05,
    ruleType: 'exact_or_readable_match',
    timeSensitive: true,
    esp: 162.50,
  },
  {
    key: 'suspect_clothing',
    field: 'suspectClothing',
    displayName: 'Suspect Clothing',
    section: 'intelligence_information',
    expectedConcept: 'green high-visibility jacket',
    acceptedExamples: ['green hi-vis', 'green reflective jacket', 'high visibility jacket', 'hi vis jacket'],
    score: 0.05,
    ruleType: 'ai_evidence_extraction',
    timeSensitive: true,
    esp: 162.50,
  },
  {
    key: 'unique_information',
    field: 'uniqueInformation',
    displayName: 'Unique Information',
    section: 'intelligence_information',
    expectedConcept: 'gold necklace stolen',
    acceptedExamples: ['gold necklace', 'necklace from bedroom', 'jewellery taken'],
    score: 0.50,
    ruleType: 'ai_evidence_extraction',
    timeSensitive: true,
    esp: 81.38,
  },

  // --- INCIDENT INFORMATION ---
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
  {
    key: 'incident_summary',
    field: 'incidentSummary',
    displayName: 'Incident Summary',
    section: 'incident_information',
    expectedConcept: 'residential burglary with forced entry and property stolen',
    acceptedExamples: ['house burgled', 'burglary at home', 'home broken into', 'forced window', 'entry via kitchen window', 'gold necklace stolen', 'jewellery taken'],
    score: 0.70,
    ruleType: 'ai_evidence_extraction',
    timeSensitive: true,
    esp: 56.20,
  },
  {
    key: 'key_information_1',
    field: 'keyInformation1',
    displayName: 'Key Information 1',
    section: 'incident_information',
    expectedConcept: 'forced entry via kitchen window',
    acceptedExamples: ['forced open back kitchen window', 'rear kitchen window damaged', 'entry through kitchen window'],
    score: 0.40,
    ruleType: 'ai_evidence_extraction',
    timeSensitive: true,
    esp: 69.31,
  },
  {
    key: 'key_information_2',
    field: 'keyInformation2',
    displayName: 'Key Information 2',
    section: 'incident_information',
    expectedConcept: 'gold necklace stolen',
    acceptedExamples: ['gold necklace taken', 'necklace stolen', 'jewellery stolen'],
    score: 0.40,
    ruleType: 'ai_evidence_extraction',
    timeSensitive: true,
    esp: 81.38,
  },
  {
    key: 'key_information_3',
    field: 'keyInformation3',
    displayName: 'Key Information 3',
    section: 'incident_information',
    expectedConcept: 'CCTV footage available showing suspect',
    acceptedExamples: ['neighbour has CCTV', 'camera footage', 'footage available', 'recording available'],
    score: 0.40,
    ruleType: 'ai_evidence_extraction',
    timeSensitive: true,
    esp: 150.38,
  },
];
