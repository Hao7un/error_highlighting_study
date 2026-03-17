/**
 * Task definitions for the Error Highlighting User Study
 * Based on Plan-Then-Execute (He et al., CHI 2025)
 * 
 * 4 tasks selected from the original 6, covering different risk levels.
 * Each task has:
 *   - A task description (what the user wants the LLM agent to do)
 *   - A pre-generated step-wise plan with intentionally seeded errors
 *   - Two types of errors:
 *     (1) Highlighted errors: flagged with visual indicators in treatment condition
 *     (2) Non-highlighted errors: present in BOTH conditions without visual cues
 *   - A ground-truth plan for scoring
 *   - Simulated execution outcome
 */

const TASKS = [
  // ============================================================
  // TASK 1: Low-risk — Setting an Alarm
  // Adapted from original Task-4
  // ============================================================
  {
    id: "alarm",
    risk: "low",
    domain: "Alarm",
    title: "Setting a Weekday Alarm",
    description:
      "I need to set an alarm for every weekday morning at 7:30, and then cancel the alarm for Thursday, changing it to 8:00 in the evening.",
    plan: [
      {
        id: "s1",
        primary: true,
        text: "1. Set the alarm for every weekday",
        children: [
          {
            id: "s1.1",
            text: "1.1 Get the alarm setting information (Time: 07:30 AM, Frequency: Monday to Friday)",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
          {
            id: "s1.2",
            text: "1.2 Set the alarm",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
          {
            id: "s1.3",
            text: "1.3 Confirm whether the alarm is set successfully",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
        ],
      },
      {
        id: "s2",
        primary: true,
        text: "2. Cancel the Thursday alarm",
        children: [
          {
            id: "s2.1",
            text: "2.1 Get the information of the alarm to be cancelled (Time: 07:30 AM, Frequency: Thursday)",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
          {
            id: "s2.2",
            text: "2.2 Cancel the alarm",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
          {
            id: "s2.3",
            text: "2.3 Confirm whether the alarm is cancelled successfully",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
        ],
      },
      {
        id: "s3",
        primary: true,
        text: "3. Set the new Thursday alarm",
        children: [
          {
            id: "s3.1",
            // HIGHLIGHTED ERROR: Wrong time — should be 8:00 PM, says 8:00 AM
            text: "3.1 Get the information of the new alarm (New Time: 08:00 AM, Frequency: Thursday)",
            hasHighlightedError: true,
            errorDescription: "Wrong time: should be 08:00 PM (evening), not 08:00 AM",
            correctText: "3.1 Get the information of the new alarm (New Time: 08:00 PM, Frequency: Thursday)",
          },
          {
            id: "s3.2",
            text: "3.2 Set the new alarm",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
          {
            id: "s3.3",
            // NON-HIGHLIGHTED ERROR: Missing confirmation step content — says "check time zone" which is irrelevant
            text: "3.3 Check the time zone settings for the new alarm",
            hasHighlightedError: false,
            hasNonHighlightedError: true,
            errorDescription: "Should be: Confirm whether the new alarm is set successfully (checking time zone is irrelevant)",
            correctText: "3.3 Confirm whether the new alarm is set successfully",
          },
        ],
      },
    ],
    executionResult: {
      success: true,
      summary: "Alarms have been configured. Weekday alarms set for 7:30 AM (Mon–Fri). Thursday alarm adjusted.",
    },
    groundTruthPlan: "Set weekday alarm 7:30 AM Mon-Fri → Cancel Thursday alarm → Set new Thursday alarm 8:00 PM → Confirm each step",
  },

  // ============================================================
  // TASK 2: Medium-risk (A) — Booking a Flight
  // Adapted from original Task-5
  // ============================================================
  {
    id: "flight",
    risk: "medium",
    domain: "Flight",
    title: "Booking Return Flights",
    description:
      "I have an important meeting next Wednesday, and I need to book a flight ticket from London to Amsterdam for tomorrow. It must be a morning flight, and then return from Amsterdam to London tomorrow night. Please handle it for me.",
    plan: [
      {
        id: "s1",
        primary: true,
        text: "1. Search outbound flight ticket",
        children: [
          {
            id: "s1.1",
            text: "1.1 Obtain outbound flight search information (Departure City: London, Arrival City: Amsterdam, Departure Date: Tomorrow, Departure Time Slot: Morning)",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
          {
            id: "s1.2",
            text: "1.2 Search for outbound flights",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
          {
            id: "s1.3",
            text: "1.3 Select a suitable outbound flight",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
        ],
      },
      {
        id: "s2",
        primary: true,
        text: "2. Book outbound flight ticket",
        children: [
          {
            id: "s2.1",
            text: "2.1 Obtain outbound passenger information (Name: User Name, ID Number: User ID Number)",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
          {
            id: "s2.2",
            text: "2.2 Book outbound flight ticket",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
          {
            id: "s2.3",
            text: "2.3 Confirm whether the outbound flight ticket is successfully booked",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
        ],
      },
      {
        id: "s3",
        primary: true,
        text: "3. Search return flight ticket",
        children: [
          {
            id: "s3.1",
            // HIGHLIGHTED ERROR: Departure and Arrival cities are swapped
            text: "3.1 Obtain return flight search information (Departure City: London, Arrival City: Amsterdam, Departure Date: Tomorrow, Departure Time Slot: Evening)",
            hasHighlightedError: true,
            errorDescription: "Cities are swapped: return should depart from Amsterdam to London",
            correctText: "3.1 Obtain return flight search information (Departure City: Amsterdam, Arrival City: London, Departure Date: Tomorrow, Departure Time Slot: Evening)",
          },
          {
            id: "s3.2",
            text: "3.2 Search for return flights",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
          {
            id: "s3.3",
            text: "3.3 Select a suitable return flight",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
        ],
      },
      {
        id: "s4",
        primary: true,
        text: "4. Book return flight ticket",
        children: [
          {
            id: "s4.1",
            // NON-HIGHLIGHTED ERROR: Says "outbound" instead of "return" passenger info
            text: "4.1 Obtain outbound passenger information (Name: User Name, ID Number: User ID Number)",
            hasHighlightedError: false,
            hasNonHighlightedError: true,
            errorDescription: "Should say 'return' passenger information, not 'outbound'",
            correctText: "4.1 Obtain return passenger information (Name: User Name, ID Number: User ID Number)",
          },
          {
            id: "s4.2",
            text: "4.2 Book return flight ticket",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
          {
            id: "s4.3",
            text: "4.3 Confirm whether the return flight ticket is successfully booked",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
        ],
      },
    ],
    executionResult: {
      success: true,
      summary: "Flight tickets processed. Outbound: London → Amsterdam (morning). Return: Amsterdam → London (evening).",
    },
    groundTruthPlan: "Search morning LHR→AMS → Book outbound → Search evening AMS→LHR → Book return → Confirm each",
  },

  // ============================================================
  // TASK 3: Medium-risk (B) — Scheduling a Repair Service
  // Adapted from original Task-3
  // ============================================================
  {
    id: "repair",
    risk: "medium",
    domain: "Repair",
    title: "Booking a TV Repair Service",
    description:
      "I need to schedule a repair for my TV at 6 PM tomorrow evening. The brand is Sony, model X800H, and there is an issue with the screen. Please book the repair service and tell me the reservation number.",
    plan: [
      {
        id: "s1",
        primary: true,
        text: "1. Obtain user and appliance information",
        children: [
          {
            id: "s1.1",
            text: "1.1 Obtain user contact information",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
          {
            id: "s1.2",
            // HIGHLIGHTED ERROR: Wrong brand — Samsung instead of Sony
            text: "1.2 Record appliance details (Brand: Samsung, Model: X800H, Issue: Screen problem)",
            hasHighlightedError: true,
            errorDescription: "Wrong brand: should be Sony, not Samsung",
            correctText: "1.2 Record appliance details (Brand: Sony, Model: X800H, Issue: Screen problem)",
          },
        ],
      },
      {
        id: "s2",
        primary: true,
        text: "2. Search for repair service provider",
        children: [
          {
            id: "s2.1",
            text: "2.1 Search for authorized Sony repair service providers in the area",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
          {
            id: "s2.2",
            text: "2.2 Select a suitable service provider based on availability",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
        ],
      },
      {
        id: "s3",
        primary: true,
        text: "3. Schedule the repair appointment",
        children: [
          {
            id: "s3.1",
            // NON-HIGHLIGHTED ERROR: Wrong appointment time — 5 PM instead of 6 PM
            text: "3.1 Schedule the repair appointment (Appointment Time: Tomorrow 5 PM, Issue: Screen problem)",
            hasHighlightedError: false,
            hasNonHighlightedError: true,
            errorDescription: "Wrong time: should be 6 PM, not 5 PM",
            correctText: "3.1 Schedule the repair appointment (Appointment Time: Tomorrow 6 PM, Issue: Screen problem)",
          },
          {
            id: "s3.2",
            text: "3.2 Obtain the reservation number",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
        ],
      },
      {
        id: "s4",
        primary: true,
        text: "4. Notify the user",
        children: [
          {
            id: "s4.1",
            text: "4.1 Send the reservation number and contact information to the user",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
        ],
      },
    ],
    executionResult: {
      success: true,
      summary: "Repair service booked. Reservation #SR-20250318-0042. Sony authorized technician will visit at the scheduled time.",
    },
    groundTruthPlan: "Get user info → Record Sony X800H screen issue → Find Sony service → Book 6PM tomorrow → Get reservation # → Notify user",
  },

  // ============================================================
  // TASK 4: High-risk — Currency Exchange
  // Adapted from original Task-1
  // ============================================================
  {
    id: "currency",
    risk: "high",
    domain: "Finance",
    title: "Foreign Currency Exchange",
    description:
      "My account ID is 54321, and the password is PWD2023. I plan to make two foreign exchange transactions. The first is to buy 10,000 euros (with USD), and the second is to sell 5,000 US dollars (to EUR). Please help me operate.",
    plan: [
      {
        id: "s1",
        primary: true,
        text: "1. Log in to user account",
        children: [
          {
            id: "s1.1",
            text: "1.1 Obtain account login information (Account ID: 54321, Account Password: PWD2023)",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
          {
            id: "s1.2",
            text: "1.2 Log in to the account",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
          {
            id: "s1.3",
            text: "1.3 Confirm successful login",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
          },
        ],
      },
      {
        id: "s2",
        primary: true,
        // NON-HIGHLIGHTED ERROR: Both transactions are grouped under one primary step
        // (should be split into two separate primary steps)
        text: "2. Conduct foreign exchange transactions",
        hasNonHighlightedError: true,
        errorDescription: "Two distinct transactions should be in separate primary steps for correct sequential execution",
        children: [
          {
            id: "s2.1",
            text: "2.1 Buy euros",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
            children: [
              {
                id: "s2.1.1",
                // HIGHLIGHTED ERROR: Wrong purchase amount — 5000 instead of 10000
                text: "2.1.1 Obtain information for buying euros (Currency Type: EUR, Purchase Amount: 5,000)",
                hasHighlightedError: true,
                errorDescription: "Wrong amount: should be 10,000 EUR, not 5,000",
                correctText: "2.1.1 Obtain information for buying euros (Currency Type: EUR, Purchase Amount: 10,000)",
              },
              {
                id: "s2.1.2",
                text: "2.1.2 Buy the specified amount of euros",
                hasHighlightedError: false,
                hasNonHighlightedError: false,
              },
              {
                id: "s2.1.3",
                text: "2.1.3 Confirm successful euro purchase",
                hasHighlightedError: false,
                hasNonHighlightedError: false,
              },
            ],
          },
          {
            id: "s2.2",
            text: "2.2 Sell US dollars",
            hasHighlightedError: false,
            hasNonHighlightedError: false,
            children: [
              {
                id: "s2.2.1",
                text: "2.2.1 Obtain information for selling US dollars (Currency Type: USD, Sell Amount: 5,000)",
                hasHighlightedError: false,
                hasNonHighlightedError: false,
              },
              {
                id: "s2.2.2",
                text: "2.2.2 Sell the specified amount of US dollars",
                hasHighlightedError: false,
                hasNonHighlightedError: false,
              },
              {
                id: "s2.2.3",
                text: "2.2.3 Confirm successful US dollar sale",
                hasHighlightedError: false,
                hasNonHighlightedError: false,
              },
            ],
          },
        ],
      },
    ],
    executionResult: {
      success: true,
      summary: "Foreign exchange transactions completed. EUR purchase and USD sale processed through account 54321.",
    },
    groundTruthPlan: "Login → Buy 10,000 EUR (as separate primary step) → Sell 5,000 USD (as separate primary step) → Confirm each",
  },
];

/**
 * Counterbalancing scheme
 * 
 * 4 groups to counterbalance:
 *   - Order of conditions (Control-first vs Treatment-first)
 *   - Assignment of tasks to conditions
 * 
 * Tasks are paired: {alarm, flight} and {repair, currency}
 * Each pair is assigned to one condition.
 */
const COUNTERBALANCE_GROUPS = [
  {
    groupId: 1,
    conditionOrder: ["control", "treatment"],
    conditionA_tasks: ["alarm", "flight"],      // Control
    conditionB_tasks: ["repair", "currency"],    // Treatment
  },
  {
    groupId: 2,
    conditionOrder: ["treatment", "control"],
    conditionA_tasks: ["alarm", "flight"],      // Treatment
    conditionB_tasks: ["repair", "currency"],    // Control
  },
  {
    groupId: 3,
    conditionOrder: ["control", "treatment"],
    conditionA_tasks: ["repair", "currency"],    // Control
    conditionB_tasks: ["alarm", "flight"],       // Treatment
  },
  {
    groupId: 4,
    conditionOrder: ["treatment", "control"],
    conditionA_tasks: ["repair", "currency"],    // Treatment
    conditionB_tasks: ["alarm", "flight"],       // Control
  },
];

/**
 * NASA-TLX subscales
 */
const NASA_TLX_SCALES = [
  {
    id: "mental_demand",
    label: "Mental Demand",
    lowEnd: "Very Low",
    highEnd: "Very High",
    description: "How mentally demanding was the task?",
  },
  {
    id: "physical_demand",
    label: "Physical Demand",
    lowEnd: "Very Low",
    highEnd: "Very High",
    description: "How physically demanding was the task?",
  },
  {
    id: "temporal_demand",
    label: "Temporal Demand",
    lowEnd: "Very Low",
    highEnd: "Very High",
    description: "How hurried or rushed was the pace of the task?",
  },
  {
    id: "performance",
    label: "Performance",
    lowEnd: "Perfect",
    highEnd: "Failure",
    description: "How successful were you in accomplishing what you were asked to do?",
  },
  {
    id: "effort",
    label: "Effort",
    lowEnd: "Very Low",
    highEnd: "Very High",
    description: "How hard did you have to work to accomplish your level of performance?",
  },
  {
    id: "frustration",
    label: "Frustration",
    lowEnd: "Very Low",
    highEnd: "Very High",
    description: "How insecure, discouraged, irritated, stressed, and annoyed were you?",
  },
];

/**
 * Post-task Likert scale questions
 */
const POST_TASK_QUESTIONS = [
  {
    id: "perceived_usefulness",
    text: "The error highlighting feature helped me identify errors in the plan.",
  },
  {
    id: "perceived_reliability",
    text: "I trusted the error highlights to accurately indicate potential problems.",
  },
  {
    id: "confidence_with_highlighting",
    text: "I felt more confident in my edited plans when error highlighting was present.",
  },
  {
    id: "attention_allocation",
    text: "When error highlighting was present, I spent more time checking highlighted steps than non-highlighted steps.",
  },
  {
    id: "complacency_awareness",
    text: "I still carefully reviewed non-highlighted steps even when error highlighting was available.",
  },
  {
    id: "overall_preference",
    text: "I would prefer to have error highlighting when reviewing LLM-generated plans in the future.",
  },
];

/**
 * Semi-structured interview questions (open-ended)
 */
const INTERVIEW_QUESTIONS = [
  {
    id: "attention_strategy",
    text: "How did you allocate your attention between highlighted and non-highlighted steps when error highlighting was present? Did this differ from how you reviewed plans without highlighting?",
  },
  {
    id: "editing_strategy",
    text: "Did the error highlighting change your editing strategy in any way? If so, how?",
  },
  {
    id: "trust_perception",
    text: "How did the error highlighting affect your trust in the LLM-generated plans? Did you trust the highlighted errors more or less than errors you found on your own?",
  },
  {
    id: "difficulties",
    text: "Were there any unexpected difficulties or confusing moments during the study? If so, please describe them.",
  },
  {
    id: "suggestions",
    text: "Do you have any suggestions for improving the error highlighting feature or the plan review process?",
  },
];
