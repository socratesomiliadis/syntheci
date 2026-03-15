import type { ChatMessageRole, SourceType, TriageLabel } from "./types";

export interface DemoTriageFixture {
  label: TriageLabel;
  confidence: number;
  rationale: string;
}

export interface DemoEmailFixture {
  key: string;
  externalMessageId: string;
  externalThreadId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  textBody: string;
  htmlBody?: string | null;
  receivedAt: string;
  isUnread: boolean;
  isOpenThread?: boolean;
  deepLink?: string | null;
  triage: DemoTriageFixture;
}

export interface DemoContactFixture {
  key: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  company?: string | null;
  role?: string | null;
  notes?: string | null;
  origin?: string;
}

export interface DemoNoteFixture {
  key: string;
  title: string;
  body: string;
}

export interface DemoLinkFixture {
  key: string;
  title: string;
  url: string;
  rawText: string;
}

export interface DemoUploadFixture {
  key: string;
  title: string;
  mimeType: string;
  fileName: string;
  objectBody: string;
  rawText: string;
}

export interface DemoMeetingFixture {
  key: string;
  sourceMessageKey: string;
  title: string;
  description: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  attendees: string[];
  status: "proposed" | "approved" | "created";
  externalEventId?: string | null;
}

export interface DemoCalendarItemFixture {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  attendees: string[];
  externalUrl?: string | null;
  isAllDay?: boolean;
}

export interface DemoReferenceFixture {
  sourceType: SourceType;
  key: string;
}

export interface DemoBriefingItemFixture {
  type: "priority" | "todo" | "meeting" | "followup";
  title: string;
  reason: string;
  refs: DemoReferenceFixture[];
}

export interface DemoChatMessageFixture {
  role: ChatMessageRole;
  text: string;
  refs?: DemoReferenceFixture[];
}

export interface DemoChatConversationFixture {
  key: string;
  title: string;
  messages: DemoChatMessageFixture[];
}

export interface DemoConnectedAccountMetadata {
  demo: true;
  label: string;
  seededCalendarItems: DemoCalendarItemFixture[];
  remainingSyncBatchIds: string[];
  importedSyncBatchIds: string[];
}

export function isDemoConnectedAccountMetadata(
  value: unknown
): value is DemoConnectedAccountMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.demo === true &&
    typeof record.label === "string" &&
    Array.isArray(record.seededCalendarItems) &&
    Array.isArray(record.remainingSyncBatchIds) &&
    Array.isArray(record.importedSyncBatchIds)
  );
}

export const demoWorkspaceName = "Syntheci Demo Workspace";
export const demoWorkspaceTimezone = "Europe/Athens";
export const demoConnectorLabel = "Syntheci Demo Google";

export const demoContacts: DemoContactFixture[] = [
  {
    key: "nina",
    name: "Nina Patel",
    email: "nina.patel@apollo-industries.com",
    phoneNumber: "+44 20 7946 0101",
    company: "Apollo Industries",
    role: "VP Operations",
    notes: "Runs the Apollo rollout and expects concise updates with clear blockers.",
    origin: "manual"
  },
  {
    key: "omar",
    name: "Omar Hassan",
    email: "omar@northstar.vc",
    company: "Northstar Ventures",
    role: "Investor",
    notes: "Interested in commercial traction and enterprise pipeline depth.",
    origin: "manual"
  },
  {
    key: "lena",
    name: "Lena Schmidt",
    email: "lena@vectorops.io",
    company: "VectorOps",
    role: "Head of Partnerships",
    notes: "Owns the resale partnership and regularly requests status summaries.",
    origin: "manual"
  }
];

export const demoInitialEmails: DemoEmailFixture[] = [
  {
    key: "apollo-launch",
    externalMessageId: "demo-msg-apollo-launch",
    externalThreadId: "demo-thread-apollo-launch",
    senderName: "Nina Patel",
    senderEmail: "nina.patel@apollo-industries.com",
    subject: "Need tonight's launch readiness summary",
    textBody:
      "We need a crisp readiness summary for the Apollo launch by 7pm. Please include the onboarding blockers, remaining customer dependencies, and whether legal has cleared the revised order form.",
    receivedAt: "2026-03-15T08:15:00.000Z",
    isUnread: true,
    triage: {
      label: "urgent",
      confidence: 0.95,
      rationale: "A same-day executive summary is explicitly requested with launch risk context."
    }
  },
  {
    key: "vectorops-proposal",
    externalMessageId: "demo-msg-vectorops-proposal",
    externalThreadId: "demo-thread-vectorops-proposal",
    senderName: "Lena Schmidt",
    senderEmail: "lena@vectorops.io",
    subject: "Can you approve the updated partner proposal?",
    textBody:
      "Attached is the updated partner proposal with the new revenue share terms. If this looks good, reply with approval so I can send the final draft to our legal team tomorrow morning.",
    receivedAt: "2026-03-14T14:05:00.000Z",
    isUnread: true,
    triage: {
      label: "needs_reply",
      confidence: 0.89,
      rationale: "The sender is waiting on a concrete approval decision before moving forward."
    }
  },
  {
    key: "investor-follow-up",
    externalMessageId: "demo-msg-investor-follow-up",
    externalThreadId: "demo-thread-investor-follow-up",
    senderName: "Omar Hassan",
    senderEmail: "omar@northstar.vc",
    subject: "Following up on next week's board preview",
    textBody:
      "Checking in on the board preview deck. It would help to see the top customer wins, current pipeline conversion, and what we need from Northstar before the Q2 planning session.",
    receivedAt: "2026-03-13T16:40:00.000Z",
    isUnread: false,
    triage: {
      label: "follow_up",
      confidence: 0.81,
      rationale: "This is a nudge on previously discussed material rather than a fresh urgent request."
    }
  },
  {
    key: "customer-workshop",
    externalMessageId: "demo-msg-customer-workshop",
    externalThreadId: "demo-thread-customer-workshop",
    senderName: "Mia Chen",
    senderEmail: "mia.chen@solsticehealth.com",
    subject: "Could we move the onboarding workshop to Wednesday?",
    textBody:
      "Our implementation lead is traveling Tuesday afternoon. Could we move the onboarding workshop to Wednesday at 15:00 Athens time? The same attendees still work for us.",
    receivedAt: "2026-03-15T06:30:00.000Z",
    isUnread: true,
    triage: {
      label: "scheduling",
      confidence: 0.92,
      rationale: "The message is centered on rescheduling a workshop with a proposed alternative time."
    }
  },
  {
    key: "monthly-report",
    externalMessageId: "demo-msg-monthly-report",
    externalThreadId: "demo-thread-monthly-report",
    senderName: "Finance Ops",
    senderEmail: "finance@internal.example",
    subject: "February operating report",
    textBody:
      "Sharing the February operating report. Gross margin improved by 4 points, onboarding time dropped by 18%, and support escalations stayed flat month over month.",
    receivedAt: "2026-03-12T09:20:00.000Z",
    isUnread: false,
    triage: {
      label: "informational",
      confidence: 0.77,
      rationale: "This is a status report with no direct reply or action requested."
    }
  }
];

export const demoSyncEmailBatches: Record<string, DemoEmailFixture[]> = {
  "demo-batch-followups": [
    {
      key: "security-review",
      externalMessageId: "demo-msg-security-review",
      externalThreadId: "demo-thread-security-review",
      senderName: "Priya Raman",
      senderEmail: "priya@catalystbank.com",
      subject: "Need your answers for tomorrow's security review",
      textBody:
        "Our security committee meets tomorrow morning and they need answers on data retention, SSO support, and regional storage controls. Send me your latest answers tonight if possible.",
      receivedAt: "2026-03-15T12:20:00.000Z",
      isUnread: true,
      triage: {
        label: "urgent",
        confidence: 0.94,
        rationale: "The sender needs specific security review answers before a next-day committee meeting."
      }
    }
  ],
  "demo-batch-scheduling": [
    {
      key: "advisory-council",
      externalMessageId: "demo-msg-advisory-council",
      externalThreadId: "demo-thread-advisory-council",
      senderName: "James Ortiz",
      senderEmail: "james@harborpartners.io",
      subject: "Locking time for the advisory council debrief",
      textBody:
        "Can we lock 11:30 on Friday for the advisory council debrief? If that works I will send the calendar hold to everyone on our side.",
      receivedAt: "2026-03-15T13:05:00.000Z",
      isUnread: true,
      triage: {
        label: "scheduling",
        confidence: 0.9,
        rationale: "The email is explicitly proposing a specific meeting time for confirmation."
      }
    }
  ]
};

export const demoNotes: DemoNoteFixture[] = [
  {
    key: "board-prep-note",
    title: "Board preview talking points",
    body:
      "Focus on three narratives: launch readiness, enterprise expansion, and retrieval quality. Mention Apollo as the flagship rollout, highlight that partner-sourced pipeline is now 22% of qualified opportunities, and call out that approval workflows reduced response latency for urgent emails."
  },
  {
    key: "customer-voice-note",
    title: "Customer voice themes",
    body:
      "Customers consistently praise citation-backed answers, faster email response drafting, and clearer meeting extraction. The main ask is tighter visibility into what changed after each Gmail sync."
  }
];

export const demoLinks: DemoLinkFixture[] = [
  {
    key: "apollo-brief",
    title: "Apollo rollout brief",
    url: "https://syntheci.demo/apollo-rollout-brief",
    rawText:
      "Apollo rollout brief: target launch is March 21. Key blockers are legal approval of the revised order form and completion of the onboarding runbook for the APAC support team. The executive sponsor wants a nightly readiness summary."
  },
  {
    key: "partnership-playbook",
    title: "Partnership playbook",
    url: "https://syntheci.demo/partnership-playbook",
    rawText:
      "Partnership playbook: every reseller proposal should include commercial guardrails, integration ownership, and launch criteria. VectorOps expects approval turnaround within one business day once pricing is stable."
  }
];

export const demoUploads: DemoUploadFixture[] = [
  {
    key: "q2-plan",
    title: "Q2-plan.md",
    fileName: "Q2-plan.md",
    mimeType: "text/markdown",
    objectBody:
      "# Q2 operating plan\n\n## Goals\n- Convert 6 enterprise pilots into paid annual contracts.\n- Ship demo mode and approval analytics.\n- Improve grounded answer precision for contacts and uploads.\n\n## Risks\n- Security questionnaires are slowing procurement.\n- Calendar creation needs clearer confidence thresholds.\n",
    rawText:
      "Q2 operating plan. Goals: convert six enterprise pilots, ship demo mode and approval analytics, improve grounded answer precision for contacts and uploads. Risks: security questionnaires are slowing procurement and calendar creation needs clearer confidence thresholds."
  }
];

export const demoMeetings: DemoMeetingFixture[] = [
  {
    key: "apollo-war-room",
    sourceMessageKey: "apollo-launch",
    title: "Apollo launch war room",
    description: "Executive checkpoint before the launch summary goes out.",
    timezone: demoWorkspaceTimezone,
    startsAt: "2026-03-16T16:00:00.000Z",
    endsAt: "2026-03-16T16:30:00.000Z",
    attendees: ["nina.patel@apollo-industries.com", "ops@syntheci.demo"],
    status: "approved"
  },
  {
    key: "solstice-workshop",
    sourceMessageKey: "customer-workshop",
    title: "Solstice onboarding workshop",
    description: "Rescheduled onboarding workshop extracted from the email thread.",
    timezone: demoWorkspaceTimezone,
    startsAt: "2026-03-19T12:00:00.000Z",
    endsAt: "2026-03-19T13:00:00.000Z",
    attendees: ["mia.chen@solsticehealth.com", "onboarding@syntheci.demo"],
    status: "proposed"
  },
  {
    key: "northstar-debrief",
    sourceMessageKey: "investor-follow-up",
    title: "Northstar board preview debrief",
    description: "Created meeting showing the final stage of the workflow.",
    timezone: demoWorkspaceTimezone,
    startsAt: "2026-03-18T09:00:00.000Z",
    endsAt: "2026-03-18T09:45:00.000Z",
    attendees: ["omar@northstar.vc", "founders@syntheci.demo"],
    status: "created",
    externalEventId: "demo-event-northstar-debrief"
  }
];

export const demoCalendarItems: DemoCalendarItemFixture[] = [
  {
    id: "demo-event-northstar-debrief",
    title: "Northstar board preview debrief",
    startsAt: "2026-03-18T09:00:00.000Z",
    endsAt: "2026-03-18T09:45:00.000Z",
    timezone: demoWorkspaceTimezone,
    attendees: ["omar@northstar.vc", "founders@syntheci.demo"],
    externalUrl: "https://calendar.google.com/calendar/u/0/r/eventedit/demo-event-northstar-debrief"
  },
  {
    id: "demo-event-customer-council",
    title: "Customer council prep",
    startsAt: "2026-03-17T10:30:00.000Z",
    endsAt: "2026-03-17T11:15:00.000Z",
    timezone: demoWorkspaceTimezone,
    attendees: ["team@syntheci.demo"],
    externalUrl: "https://calendar.google.com/calendar/u/0/r/eventedit/demo-event-customer-council"
  }
];

export const demoBriefing = {
  briefingDate: "2026-03-15",
  summary:
    "Apollo launch prep is the top priority, the VectorOps proposal needs approval, and there are two upcoming meetings that should be reviewed before end of day.",
  items: [
    {
      type: "priority",
      title: "Ship the Apollo readiness summary tonight",
      reason: "Nina needs a concise launch status update with blockers and legal status before 19:00.",
      refs: [{ sourceType: "gmail", key: "apollo-launch" }]
    },
    {
      type: "todo",
      title: "Approve the VectorOps partner proposal",
      reason: "Legal handoff is waiting on a direct approval response from Syntheci.",
      refs: [
        { sourceType: "gmail", key: "vectorops-proposal" },
        { sourceType: "link", key: "partnership-playbook" }
      ]
    },
    {
      type: "meeting",
      title: "Review the Apollo launch war room timing",
      reason: "The approved proposal is ready to create if you want to finalize the event.",
      refs: [{ sourceType: "gmail", key: "apollo-launch" }]
    },
    {
      type: "followup",
      title: "Refresh the board preview deck narrative",
      reason: "Omar asked for pipeline and customer win context ahead of next week's preview.",
      refs: [
        { sourceType: "gmail", key: "investor-follow-up" },
        { sourceType: "upload", key: "q2-plan" }
      ]
    }
  ] satisfies DemoBriefingItemFixture[]
};

export const demoChatConversations: DemoChatConversationFixture[] = [
  {
    key: "daily-focus",
    title: "What should I focus on today?",
    messages: [
      {
        role: "user",
        text: "What should I focus on today?"
      },
      {
        role: "assistant",
        text:
          "Start with the Apollo launch readiness summary, then approve the VectorOps proposal, and finally review the upcoming Apollo war room timing so it can be created when you are ready.",
        refs: [
          { sourceType: "gmail", key: "apollo-launch" },
          { sourceType: "gmail", key: "vectorops-proposal" },
          { sourceType: "upload", key: "q2-plan" }
        ]
      }
    ]
  },
  {
    key: "apollo-context",
    title: "Apollo rollout context",
    messages: [
      {
        role: "user",
        text: "What are the biggest Apollo rollout blockers?"
      },
      {
        role: "assistant",
        text:
          "The biggest blockers are legal approval of the revised order form and completing the onboarding runbook for APAC support. Nina also expects a nightly readiness summary, so launch communication itself is time-sensitive.",
        refs: [
          { sourceType: "gmail", key: "apollo-launch" },
          { sourceType: "link", key: "apollo-brief" }
        ]
      }
    ]
  }
];

export function buildDemoConnectedAccountMetadata(): DemoConnectedAccountMetadata {
  return {
    demo: true,
    label: demoConnectorLabel,
    seededCalendarItems: demoCalendarItems,
    remainingSyncBatchIds: Object.keys(demoSyncEmailBatches),
    importedSyncBatchIds: []
  };
}
