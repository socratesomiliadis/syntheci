import {
  demoBriefing,
  demoInitialEmails,
  demoSyncEmailBatches,
  demoWorkspaceName
} from "@syntheci/shared";

import type {
  BriefingCase,
  ChatConclusionCase,
  MeetingExtractionCase,
  RetrievalCase,
  TriageCase
} from "./types";

export const BENCHMARK_DATASET_NAME = `${demoWorkspaceName} benchmark v1`;

export const retrievalCases: RetrievalCase[] = [
  {
    id: "retrieval-apollo-context",
    type: "retrieval",
    prompt: "What are the biggest Apollo rollout blockers?",
    supportRefs: [
      { sourceType: "gmail", key: "apollo-launch" },
      { sourceType: "link", key: "apollo-brief" }
    ],
    minimumEvidenceRefs: [{ sourceType: "gmail", key: "apollo-launch" }],
    tags: ["multi_doc", "email", "link"]
  },
  {
    id: "retrieval-commercial-priorities",
    type: "retrieval",
    prompt: "Which commercial threads need my attention first?",
    supportRefs: [
      { sourceType: "gmail", key: "vectorops-proposal" },
      { sourceType: "gmail", key: "helios-renewal" },
      { sourceType: "note", key: "procurement-faq-note" }
    ],
    minimumEvidenceRefs: [
      { sourceType: "gmail", key: "vectorops-proposal" },
      { sourceType: "gmail", key: "helios-renewal" }
    ],
    tags: ["multi_doc", "email", "note"]
  },
  {
    id: "retrieval-security-prep",
    type: "retrieval",
    prompt: "What should I send Catalyst Bank before the review?",
    supportRefs: [
      { sourceType: "gmail", key: "sso-escalation" },
      { sourceType: "note", key: "procurement-faq-note" },
      { sourceType: "upload", key: "security-qa-pack" }
    ],
    minimumEvidenceRefs: [
      { sourceType: "gmail", key: "sso-escalation" },
      { sourceType: "upload", key: "security-qa-pack" }
    ],
    tags: ["multi_doc", "email", "note", "upload"]
  },
  {
    id: "retrieval-q2-risks",
    type: "retrieval",
    prompt: "What are the top Q2 risks?",
    supportRefs: [{ sourceType: "upload", key: "q2-plan" }],
    minimumEvidenceRefs: [{ sourceType: "upload", key: "q2-plan" }],
    tags: ["single_doc", "upload"]
  },
  {
    id: "retrieval-board-preview",
    type: "retrieval",
    prompt: "What material should go into the board preview?",
    supportRefs: [
      { sourceType: "gmail", key: "investor-follow-up" },
      { sourceType: "upload", key: "board-preview-outline" },
      { sourceType: "upload", key: "partner-pipeline-export" }
    ],
    minimumEvidenceRefs: [
      { sourceType: "gmail", key: "investor-follow-up" },
      { sourceType: "upload", key: "board-preview-outline" }
    ],
    tags: ["multi_doc", "email", "upload"]
  }
];

export const chatConclusionCases: ChatConclusionCase[] = [
  {
    id: "chat-commercial-priorities",
    type: "chat_conclusion",
    prompt:
      "Which commercial threads need my attention first? Return the best option key only.",
    supportRefs: [
      { sourceType: "gmail", key: "vectorops-proposal" },
      { sourceType: "gmail", key: "helios-renewal" },
      { sourceType: "note", key: "procurement-faq-note" }
    ],
    minimumEvidenceRefs: [
      { sourceType: "gmail", key: "vectorops-proposal" },
      { sourceType: "gmail", key: "helios-renewal" }
    ],
    expectedAnswerKey: "vectorops_and_helios",
    options: [
      {
        key: "vectorops_and_helios",
        label: "VectorOps proposal and Helios renewal"
      },
      {
        key: "apollo_and_board",
        label: "Apollo launch summary and board preview deck"
      },
      {
        key: "monthly_report_only",
        label: "February operating report only"
      }
    ],
    tags: ["multi_doc", "email", "note"]
  },
  {
    id: "chat-security-prep",
    type: "chat_conclusion",
    prompt:
      "What should I send Catalyst Bank before the review? Return the best option key only.",
    supportRefs: [
      { sourceType: "gmail", key: "sso-escalation" },
      { sourceType: "note", key: "procurement-faq-note" },
      { sourceType: "upload", key: "security-qa-pack" }
    ],
    minimumEvidenceRefs: [
      { sourceType: "gmail", key: "sso-escalation" },
      { sourceType: "upload", key: "security-qa-pack" }
    ],
    expectedAnswerKey: "security_answers_plus_blocker",
    options: [
      {
        key: "security_answers_plus_blocker",
        label:
          "Send retention, SSO, and regional storage answers plus a clear fallback-domain blocker update"
      },
      {
        key: "meeting_reschedule_only",
        label: "Only send a meeting reschedule proposal"
      },
      {
        key: "wait_for_board_deck",
        label: "Wait until the board preview deck is complete before responding"
      }
    ],
    tags: ["multi_doc", "email", "note", "upload"]
  },
  {
    id: "chat-apollo-context",
    type: "chat_conclusion",
    prompt:
      "What are the biggest Apollo rollout blockers? Return the best option key only.",
    supportRefs: [
      { sourceType: "gmail", key: "apollo-launch" },
      { sourceType: "link", key: "apollo-brief" }
    ],
    minimumEvidenceRefs: [{ sourceType: "gmail", key: "apollo-launch" }],
    expectedAnswerKey: "legal_and_onboarding",
    options: [
      {
        key: "legal_and_onboarding",
        label:
          "Legal approval of the revised order form and completing the onboarding runbook"
      },
      {
        key: "pricing_and_headcount",
        label: "Pricing changes and engineering headcount"
      },
      {
        key: "no_major_blockers",
        label: "There are no meaningful blockers"
      }
    ],
    tags: ["multi_doc", "email", "link"]
  },
  {
    id: "chat-q2-risks",
    type: "chat_conclusion",
    prompt: "What are the top Q2 risks? Return the best option key only.",
    supportRefs: [{ sourceType: "upload", key: "q2-plan" }],
    minimumEvidenceRefs: [{ sourceType: "upload", key: "q2-plan" }],
    expectedAnswerKey: "security_questionnaires_and_calendar_thresholds",
    options: [
      {
        key: "security_questionnaires_and_calendar_thresholds",
        label:
          "Security questionnaires slowing procurement and unclear calendar creation confidence thresholds"
      },
      {
        key: "customer_churn_and_hiring_freeze",
        label: "Customer churn and a hiring freeze"
      },
      {
        key: "none_listed",
        label: "No concrete risks are listed"
      }
    ],
    tags: ["single_doc", "upload"]
  }
];

export const triageCases: TriageCase[] = [
  ...demoInitialEmails.map((email) => ({
    id: `triage-${email.key}`,
    messageKey: email.key,
    expectedLabel: email.triage.label,
    tags: ["email"] as const
  })),
  ...Object.values(demoSyncEmailBatches)
    .flat()
    .map((email) => ({
      id: `triage-${email.key}`,
      messageKey: email.key,
      expectedLabel: email.triage.label,
      tags: ["email"] as const
    }))
];

export const briefingCase: BriefingCase = {
  id: "briefing-demo-daily",
  briefingDate: demoBriefing.briefingDate,
  referenceTimeIso: "2026-03-15T07:45:00.000Z",
  expectedItems: demoBriefing.items.map((item) => ({
    type: item.type,
    refs: item.refs
  })),
  expectedPriorityRefs: demoBriefing.items
    .filter((item) => item.type === "priority")
    .flatMap((item) => item.refs)
};

export const meetingExtractionCases: MeetingExtractionCase[] = [
  {
    id: "meeting-customer-workshop",
    messageKey: "customer-workshop",
    expected: {
      hasSchedulingIntent: true,
      title: null,
      startsAt: "2026-03-18T13:00:00.000Z",
      endsAt: null,
      attendees: []
    },
    tags: ["email", "scheduling"]
  },
  {
    id: "meeting-hiring-panel-shift",
    messageKey: "hiring-panel-shift",
    expected: {
      hasSchedulingIntent: true,
      title: null,
      startsAt: "2026-03-19T08:00:00.000Z",
      endsAt: null,
      attendees: []
    },
    tags: ["email", "scheduling"]
  },
  {
    id: "meeting-reference-request",
    messageKey: "reference-request",
    expected: {
      hasSchedulingIntent: true,
      title: null,
      startsAt: null,
      endsAt: null,
      attendees: []
    },
    tags: ["email", "scheduling"]
  },
  {
    id: "meeting-monthly-report",
    messageKey: "monthly-report",
    expected: {
      hasSchedulingIntent: false,
      title: null,
      startsAt: null,
      endsAt: null,
      attendees: []
    },
    tags: ["email"]
  },
  {
    id: "meeting-pipeline-snapshot",
    messageKey: "pipeline-snapshot",
    expected: {
      hasSchedulingIntent: false,
      title: null,
      startsAt: null,
      endsAt: null,
      attendees: []
    },
    tags: ["email"]
  }
];
