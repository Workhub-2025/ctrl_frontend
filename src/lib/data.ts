export const typingTestData = [
  {
    id: 'practice',
    text: 'The quick brown fox jumps over the lazy dog. This is a practice run to get you comfortable with the interface. Take your time and focus on your accuracy. When you are ready, you can start the real tests.',
  },
  {
    id: 'test-1',
    text: 'In an emergency, every second counts. Clear communication is vital. Your ability to type quickly and accurately can make a significant difference in outcomes. Stay calm and focus on the task at hand. Your training has prepared you for this moment.',
  },
  {
    id: 'test-2',
    text: 'A call comes in reporting a multi-car pile-up on the main highway. You must dispatch police, fire, and ambulance services immediately. Gathering correct location details and the number of potential victims is critical for an effective response.',
  },
  {
    id: 'test-3',
    text: 'Attention to detail is paramount when logging incident reports. Ensure all fields are completed with precise information from the caller. This data is used for official records and post-incident analysis. Double-check all addresses and names for spelling.',
  },
];

export const situationalJudgementQuestions = [
  {
    id: 1,
    type: 'mcq',
    question:
      "You receive a call from someone who is very distressed and speaking quickly. You are struggling to understand them. What is the most appropriate initial action?",
    options: [
      'Ask them to calm down and speak slowly.',
      'Politely interrupt and ask them to repeat the key information, like their address.',
      'Keep listening, hoping to piece the information together.',
      'Immediately transfer the call to a supervisor.',
    ],
  },
  {
    id: 2,
    type: 'mcq',
    question:
      'Two emergencies are reported simultaneously in the same area, but you only have one available unit to dispatch. How do you prioritize?',
    options: [
      'Dispatch to the call that came in first.',
      'Dispatch to the incident that appears to pose a greater immediate threat to life.',
      'Ask the supervisor to decide which incident to prioritize.',
      'Wait for more information before dispatching to either.',
    ],
  },
  {
    id: 3,
    type: 'mcq',
    question:
      'A caller provides information that seems to contradict the standard operating procedure. What should you do?',
    options: [
      'Follow the caller\'s information as they are at the scene.',
      'Strictly adhere to the standard operating procedure without deviation.',
      'Follow the procedure, but also log the contradictory information and flag it for review.',
      'Ignore the contradictory information as it is likely incorrect.',
    ],
  },
  {
    id: 4,
    type: 'text',
    question:
      'You are handling a call about a break-in in progress. The caller is whispering and sounds terrified. They suddenly stop responding to your questions. Describe in detail the immediate steps you would take and explain the reasoning behind your actions.',
    rubric:
      'Evaluates the candidate\'s ability to remain calm, follow protocol for a silent call, use available resources (like dispatching police immediately to the last known location), and reasoning skills under pressure. A good answer will mention dispatching police, trying to re-establish contact, and logging all actions. A great answer will also discuss keeping the line open and listening for background noises.',
  },
];
