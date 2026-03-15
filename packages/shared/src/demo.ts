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
  },
  {
    key: "mia",
    name: "Mia Chen",
    email: "mia.chen@solsticehealth.com",
    phoneNumber: "+30 210 555 1112",
    company: "Solstice Health",
    role: "Implementation Director",
    notes: "Primary stakeholder for onboarding timing, enablement, and workshop logistics.",
    origin: "manual"
  },
  {
    key: "priya",
    name: "Priya Raman",
    email: "priya@catalystbank.com",
    phoneNumber: "+44 20 7946 2040",
    company: "Catalyst Bank",
    role: "Security Program Lead",
    notes: "Needs fast, precise answers on retention, SSO, and regional storage controls.",
    origin: "manual"
  },
  {
    key: "james",
    name: "James Ortiz",
    email: "james@harborpartners.io",
    phoneNumber: "+1 415 555 0140",
    company: "Harbor Partners",
    role: "Operating Partner",
    notes: "Coordinates advisory council follow-ups and often suggests specific meeting windows.",
    origin: "manual"
  },
  {
    key: "sara",
    name: "Sara Nordin",
    email: "sara.nordin@helioscloud.com",
    phoneNumber: "+46 8 555 9001",
    company: "Helios Cloud",
    role: "CFO",
    notes: "Commercial approver for the Helios renewal. Prefers direct answers with next steps.",
    origin: "manual"
  },
  {
    key: "elena",
    name: "Elena Petrova",
    email: "elena@northforge.ai",
    phoneNumber: "+359 2 555 0149",
    company: "Northforge AI",
    role: "Design Partner Lead",
    notes: "Shares product feedback and wants to see roadmap movement reflected quickly.",
    origin: "manual"
  },
  {
    key: "marco",
    name: "Marco Silva",
    email: "marco.silva@vervecommerce.com",
    phoneNumber: "+351 21 555 6002",
    company: "Verve Commerce",
    role: "Revenue Operations",
    notes: "Asks for conversion numbers, rollout metrics, and enterprise pipeline visibility.",
    origin: "manual"
  },
  {
    key: "avery",
    name: "Avery Cole",
    email: "avery@redwoodlegal.com",
    phoneNumber: "+1 646 555 0180",
    company: "Redwood Legal",
    role: "External Counsel",
    notes: "Reviews enterprise redlines and prefers narrow, clause-specific responses.",
    origin: "manual"
  },
  {
    key: "tomas",
    name: "Tomas Ionescu",
    email: "tomas@latticeops.co",
    phoneNumber: "+40 21 555 4411",
    company: "LatticeOps",
    role: "Solutions Architect",
    notes: "Evaluating pilot expansion and cares most about rollout readiness and support ownership.",
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
  },
  {
    key: "helios-renewal",
    externalMessageId: "demo-msg-helios-renewal",
    externalThreadId: "demo-thread-helios-renewal",
    senderName: "Sara Nordin",
    senderEmail: "sara.nordin@helioscloud.com",
    subject: "Need commercial sign-off on the Helios renewal",
    textBody:
      "We are ready to renew, but procurement needs confirmation on the new support SLA and annual prepay discount. If you can send a final answer by Friday, I can route the order form internally the same day.",
    receivedAt: "2026-03-14T10:55:00.000Z",
    isUnread: true,
    triage: {
      label: "needs_reply",
      confidence: 0.91,
      rationale: "Commercial approval is explicitly blocking the renewal process and requires a direct response."
    }
  },
  {
    key: "sso-escalation",
    externalMessageId: "demo-msg-sso-escalation",
    externalThreadId: "demo-thread-sso-escalation",
    senderName: "Priya Raman",
    senderEmail: "priya@catalystbank.com",
    subject: "Blocking issue on SSO testing before security review",
    textBody:
      "We hit a blocker in SSO testing because the fallback domain mapping is still returning staging values. Can your team confirm whether this is fixed today? It affects the security review readiness for tomorrow.",
    receivedAt: "2026-03-15T09:40:00.000Z",
    isUnread: true,
    triage: {
      label: "urgent",
      confidence: 0.96,
      rationale: "A same-day blocker is affecting a next-day security review and asks for immediate confirmation."
    }
  },
  {
    key: "design-partner-feedback",
    externalMessageId: "demo-msg-design-partner-feedback",
    externalThreadId: "demo-thread-design-partner-feedback",
    senderName: "Elena Petrova",
    senderEmail: "elena@northforge.ai",
    subject: "A few notes from the design partner session",
    textBody:
      "The team loved the citation-backed answers, but they want a clearer way to see what changed after each inbox sync and whether meeting proposals were approved by someone on our side. Happy to send annotated screenshots if helpful.",
    receivedAt: "2026-03-13T11:15:00.000Z",
    isUnread: false,
    triage: {
      label: "follow_up",
      confidence: 0.79,
      rationale: "This is useful product feedback from a prior session and suggests a follow-up rather than urgent action."
    }
  },
  {
    key: "hiring-panel-shift",
    externalMessageId: "demo-msg-hiring-panel-shift",
    externalThreadId: "demo-thread-hiring-panel-shift",
    senderName: "People Ops",
    senderEmail: "people@internal.example",
    subject: "Can we shift the platform candidate panel to Thursday morning?",
    textBody:
      "The data lead is out Wednesday afternoon, so we need to move the platform candidate panel. Would Thursday at 10:00 Athens time work for your side? If yes, I will update all interviewers.",
    receivedAt: "2026-03-14T12:25:00.000Z",
    isUnread: true,
    triage: {
      label: "scheduling",
      confidence: 0.88,
      rationale: "The core ask is to confirm an alternate interview slot."
    }
  },
  {
    key: "pipeline-snapshot",
    externalMessageId: "demo-msg-pipeline-snapshot",
    externalThreadId: "demo-thread-pipeline-snapshot",
    senderName: "Marco Silva",
    senderEmail: "marco.silva@vervecommerce.com",
    subject: "Quick note on enterprise conversion",
    textBody:
      "The latest pipeline snapshot looks strong. Enterprise opportunities sourced by partners are converting faster than self-serve expansions, especially in retail and fintech. No action needed, just wanted to share the updated view before the board prep.",
    receivedAt: "2026-03-12T15:35:00.000Z",
    isUnread: false,
    triage: {
      label: "informational",
      confidence: 0.82,
      rationale: "The sender is sharing context and metrics without asking for a response."
    }
  },
  {
    key: "reference-request",
    externalMessageId: "demo-msg-reference-request",
    externalThreadId: "demo-thread-reference-request",
    senderName: "James Ortiz",
    senderEmail: "james@harborpartners.io",
    subject: "Can you join a customer reference call next week?",
    textBody:
      "One of our portfolio companies wants to hear how your team handles inbox triage and meeting extraction in practice. If you are open to it, I can line up a 30-minute reference call early next week.",
    receivedAt: "2026-03-13T17:20:00.000Z",
    isUnread: false,
    triage: {
      label: "follow_up",
      confidence: 0.8,
      rationale: "The request is valuable but not urgent, and it likely needs scheduling follow-up."
    }
  },
  {
    key: "legal-review-handoff",
    externalMessageId: "demo-msg-legal-review-handoff",
    externalThreadId: "demo-thread-legal-review-handoff",
    senderName: "Avery Cole",
    senderEmail: "avery@redwoodlegal.com",
    subject: "Send me the final commercial position on the support clause",
    textBody:
      "I can finalize the Helios response tonight if you send the final commercial position on the support clause and any limits you want on response times. The current draft is close, but I do not want to guess on the fallback language.",
    receivedAt: "2026-03-14T18:10:00.000Z",
    isUnread: true,
    triage: {
      label: "needs_reply",
      confidence: 0.87,
      rationale: "Legal is waiting on a specific answer before they can complete the handoff."
    }
  },
  {
    key: "pilot-expansion",
    externalMessageId: "demo-msg-pilot-expansion",
    externalThreadId: "demo-thread-pilot-expansion",
    senderName: "Tomas Ionescu",
    senderEmail: "tomas@latticeops.co",
    subject: "What would it take to expand our pilot next month?",
    textBody:
      "The team wants to expand the pilot if the next rollout goes well. Can you outline what support coverage, onboarding effort, and data setup would look like for an additional business unit in April?",
    receivedAt: "2026-03-13T13:45:00.000Z",
    isUnread: false,
    triage: {
      label: "needs_reply",
      confidence: 0.83,
      rationale: "The sender is asking for a scoped commercial and rollout answer before expanding."
    }
  },
  {
    key: "exec-summary-request",
    externalMessageId: "demo-msg-exec-summary-request",
    externalThreadId: "demo-thread-exec-summary-request",
    senderName: "Nina Patel",
    senderEmail: "nina.patel@apollo-industries.com",
    subject: "Also include the customer narrative in tonight's note",
    textBody:
      "One more thing for tonight's launch note: include the customer narrative, not just blockers. I want a short paragraph on why this rollout matters to Apollo and what the first two weeks should prove if everything lands on time.",
    receivedAt: "2026-03-15T11:05:00.000Z",
    isUnread: true,
    triage: {
      label: "follow_up",
      confidence: 0.84,
      rationale: "This builds on the existing launch summary request with more guidance for the response."
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
    },
    {
      key: "reference-call-window",
      externalMessageId: "demo-msg-reference-call-window",
      externalThreadId: "demo-thread-reference-call-window",
      senderName: "James Ortiz",
      senderEmail: "james@harborpartners.io",
      subject: "Monday 14:00 works for the reference call if you are free",
      textBody:
        "I checked with the portfolio team and Monday at 14:00 Athens would work well for the reference call. If that window is good on your side I will send the hold and prep notes.",
      receivedAt: "2026-03-15T12:35:00.000Z",
      isUnread: true,
      triage: {
        label: "scheduling",
        confidence: 0.9,
        rationale: "The sender is proposing a concrete time slot and waiting for confirmation."
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
    },
    {
      key: "onboarding-qa-review",
      externalMessageId: "demo-msg-onboarding-qa-review",
      externalThreadId: "demo-thread-onboarding-qa-review",
      senderName: "Mia Chen",
      senderEmail: "mia.chen@solsticehealth.com",
      subject: "Could we add a 20-minute QA review before the workshop?",
      textBody:
        "The implementation team would like a short QA review before the Wednesday workshop, ideally earlier that same day. We mainly want to confirm provisioning steps and owner handoffs.",
      receivedAt: "2026-03-15T13:25:00.000Z",
      isUnread: true,
      triage: {
        label: "scheduling",
        confidence: 0.87,
        rationale: "This request is centered on finding time for an additional meeting."
      }
    }
  ],
  "demo-batch-commercial": [
    {
      key: "helios-legal-redline",
      externalMessageId: "demo-msg-helios-legal-redline",
      externalThreadId: "demo-thread-helios-legal-redline",
      senderName: "Sara Nordin",
      senderEmail: "sara.nordin@helioscloud.com",
      subject: "One redline left on the support language",
      textBody:
        "Legal is aligned on everything except the premium support language in section 4. If your team can accept the attached wording, I believe we can get this renewal signed without another round.",
      receivedAt: "2026-03-15T14:10:00.000Z",
      isUnread: true,
      triage: {
        label: "needs_reply",
        confidence: 0.9,
        rationale: "A direct decision is needed to resolve the last contractual blocker."
      }
    },
    {
      key: "pipeline-deck-request",
      externalMessageId: "demo-msg-pipeline-deck-request",
      externalThreadId: "demo-thread-pipeline-deck-request",
      senderName: "Omar Hassan",
      senderEmail: "omar@northstar.vc",
      subject: "Send the refreshed pipeline deck when you have it",
      textBody:
        "No rush tonight, but when the refreshed pipeline deck is ready I would love to review the partner-sourced opportunities and expansion assumptions ahead of next week's board preview.",
      receivedAt: "2026-03-15T14:30:00.000Z",
      isUnread: true,
      triage: {
        label: "follow_up",
        confidence: 0.78,
        rationale: "This is a low-pressure follow-up on previously discussed board material."
      }
    }
  ],
  "demo-batch-expansion": [
    {
      key: "reference-grid-request",
      externalMessageId: "demo-msg-reference-grid-request",
      externalThreadId: "demo-thread-reference-grid-request",
      senderName: "Marco Silva",
      senderEmail: "marco.silva@vervecommerce.com",
      subject: "Can you send the latest reference customer list?",
      textBody:
        "Before tomorrow's pipeline review, could you send the latest reference customer list and call out which accounts are strongest for retail and regulated buyers? That would help the field team a lot.",
      receivedAt: "2026-03-15T15:05:00.000Z",
      isUnread: true,
      triage: {
        label: "needs_reply",
        confidence: 0.85,
        rationale: "The sender is asking for a concrete artifact that supports an upcoming review."
      }
    },
    {
      key: "roadmap-proof-point",
      externalMessageId: "demo-msg-roadmap-proof-point",
      externalThreadId: "demo-thread-roadmap-proof-point",
      senderName: "Elena Petrova",
      senderEmail: "elena@northforge.ai",
      subject: "Which roadmap proof points should I share with my team?",
      textBody:
        "The team keeps asking what changed after the design partner session. If you have a concise list of proof points or shipped improvements, I can circulate it internally and keep momentum up.",
      receivedAt: "2026-03-15T15:20:00.000Z",
      isUnread: true,
      triage: {
        label: "follow_up",
        confidence: 0.8,
        rationale: "This is a request for follow-up product evidence rather than an urgent operational action."
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
  },
  {
    key: "launch-risks-note",
    title: "Launch risks and mitigations",
    body:
      "Current launch risks: legal sign-off delay, SSO testing instability for regulated buyers, and onboarding coverage in APAC. Mitigations: keep nightly readiness updates tight, prewrite customer-facing explanations for any slip, and finalize fallback owners before Tuesday."
  },
  {
    key: "procurement-faq-note",
    title: "Procurement FAQ answers",
    body:
      "Standard answers for security and procurement: retention can be configured by workspace policy, SSO supports SAML with domain restrictions, and regional storage controls are available through isolated buckets and workspace-level deployment configuration."
  },
  {
    key: "hiring-priorities-note",
    title: "Hiring priorities for the next quarter",
    body:
      "Hiring priorities remain platform engineering, solutions engineering, and customer success operations. The main gap is senior ownership for enterprise rollout QA and implementation readiness."
  },
  {
    key: "partner-pipeline-note",
    title: "Partner pipeline notes",
    body:
      "Partner-sourced opportunities are strongest where we can provide clear rollout support and security answers. Fintech and retail buyers respond fastest when the reference customer set is specific and the approval loop stays under one business day."
  },
  {
    key: "security-review-checklist",
    title: "Security review checklist",
    body:
      "Before any security review, confirm retention policy wording, regional storage control answers, SSO fallback behavior, audit log screenshots, and incident response contacts. The open gap this week is the fallback domain mapping fix."
  }
];

export const demoLinks: DemoLinkFixture[] = [
  {
    key: "apollo-brief",
    title: "Project kickoff",
    url: "https://www.atlassian.com/team-playbook/plays/project-kickoff",
    rawText:
      "Atlassian's project kickoff guide emphasizes aligning the team on goals, owners, timeline, and risks before execution starts. It recommends a clear definition of success, visible responsibilities, and early identification of blockers that can derail delivery."
  },
  {
    key: "partnership-playbook",
    title: "Stripe Connect hosted onboarding",
    url: "https://docs.stripe.com/connect/hosted-onboarding",
    rawText:
      "Stripe's hosted onboarding guide explains how platforms collect required information from connected accounts with a managed onboarding flow. It covers redirect-based onboarding, requirement collection, and configuration tradeoffs for faster partner activation."
  },
  {
    key: "security-overview",
    title: "Google Cloud security foundations",
    url: "https://cloud.google.com/architecture/security-foundations",
    rawText:
      "Google Cloud's security foundations architecture covers the baseline controls needed for enterprise environments, including IAM structure, logging, networking, monitoring, and centralized policy controls. It is a useful reference for regulated buyers asking about security posture and operating controls."
  },
  {
    key: "pipeline-snapshot-link",
    title: "Customer onboarding 101",
    url: "https://stripe.com/resources/more/customer-onboarding-101",
    rawText:
      "Stripe's customer onboarding guide focuses on reducing time to value through clear milestones, education, and fast activation. It highlights how onboarding quality affects retention, product adoption, and long-term expansion."
  },
  {
    key: "onboarding-runbook",
    title: "Get started with Confluence Cloud",
    url: "https://support.atlassian.com/confluence-cloud/docs/get-started-with-confluence-cloud/",
    rawText:
      "Atlassian's Confluence getting-started guide walks through setting up spaces, creating pages, organizing documentation, and collaborating with teammates. It is a practical reference for establishing a shared workspace and repeatable operational documentation."
  },
  {
    key: "renewal-faq",
    title: "About authentication with single sign-on",
    url: "https://docs.github.com/en/enterprise-cloud@latest/authentication/authenticating-with-single-sign-on/about-authentication-with-single-sign-on",
    rawText:
      "GitHub's SSO guide explains how identity provider-based authentication works, how linked identities behave, and what users need to do to access protected resources. It is relevant when enterprise security reviews ask about SAML and access governance."
  },
  {
    key: "reference-call-brief",
    title: "AWS incident response",
    url: "https://docs.aws.amazon.com/whitepapers/latest/aws-caf-security-perspective/incident-response.html",
    rawText:
      "AWS's incident response guidance describes preparation, detection, containment, recovery, and continuous improvement in cloud environments. It provides concrete language for security-minded prospects who want to understand operational readiness."
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
  },
  {
    key: "security-qa-pack",
    title: "security-qa-pack.md",
    fileName: "security-qa-pack.md",
    mimeType: "text/markdown",
    objectBody:
      "# Security QA pack\n\n## Core answers\n- Retention is configurable by workspace policy.\n- SSO supports SAML and domain restrictions.\n- Regional storage controls are available for regulated buyers.\n\n## Open item\n- Verify fallback domain mapping before Catalyst review.\n",
    rawText:
      "Security QA pack. Retention is configurable by workspace policy. SSO supports SAML and domain restrictions. Regional storage controls are available for regulated buyers. Open item: verify fallback domain mapping before the Catalyst review."
  },
  {
    key: "board-preview-outline",
    title: "board-preview-outline.md",
    fileName: "board-preview-outline.md",
    mimeType: "text/markdown",
    objectBody:
      "# Board preview outline\n\n## Slides\n1. Apollo launch readiness\n2. Pipeline quality and partner contribution\n3. Security and procurement blockers\n4. Hiring priorities and execution risks\n",
    rawText:
      "Board preview outline. Slides cover Apollo launch readiness, pipeline quality and partner contribution, security and procurement blockers, and hiring priorities with execution risks."
  },
  {
    key: "reference-customers",
    title: "reference-customers.csv",
    fileName: "reference-customers.csv",
    mimeType: "text/csv",
    objectBody:
      "company,use_case,owner\nApollo Industries,launch operations,nina.patel@apollo-industries.com\nSolstice Health,onboarding workflow,mia.chen@solsticehealth.com\nNorthforge AI,design partner feedback,elena@northforge.ai\n",
    rawText:
      "Reference customers list includes Apollo Industries for launch operations, Solstice Health for onboarding workflow, and Northforge AI for design partner feedback."
  },
  {
    key: "rollout-checklist",
    title: "rollout-checklist.txt",
    fileName: "rollout-checklist.txt",
    mimeType: "text/plain",
    objectBody:
      "Rollout checklist\n- Confirm connector setup\n- Validate two retrieval questions with citations\n- Review priority inbox labels\n- Align workshop agenda\n- Confirm escalation contacts\n- Draft first executive summary\n",
    rawText:
      "Rollout checklist includes connector setup, retrieval validation with citations, inbox label review, workshop agenda alignment, escalation contacts, and the first executive summary draft."
  },
  {
    key: "partner-pipeline-export",
    title: "partner-pipeline-export.csv",
    fileName: "partner-pipeline-export.csv",
    mimeType: "text/csv",
    objectBody:
      "segment,source,stage,value\nretail,partner,proposal,180000\nfintech,partner,security review,240000\nhealthcare,self-serve expansion,95000\n",
    rawText:
      "Partner pipeline export shows retail and fintech partner-sourced opportunities leading current proposal and security-review stage value."
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
    "Apollo launch prep is the top priority, the VectorOps proposal and Helios renewal need commercial attention, and security review answers should be tightened before tomorrow.",
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
      type: "todo",
      title: "Unblock the Helios renewal",
      reason: "Sara needs final commercial answers on support language and discount structure to route the order form.",
      refs: [
        { sourceType: "gmail", key: "helios-renewal" },
        { sourceType: "note", key: "procurement-faq-note" }
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
      title: "Package tomorrow's Catalyst security answers",
      reason: "The SSO blocker and retention answers need to be ready before the review committee meets.",
      refs: [
        { sourceType: "gmail", key: "sso-escalation" },
        { sourceType: "upload", key: "security-qa-pack" },
        { sourceType: "link", key: "security-overview" }
      ]
    },
    {
      type: "followup",
      title: "Refresh the board preview deck narrative",
      reason: "Omar asked for pipeline and customer win context ahead of next week's preview.",
      refs: [
        { sourceType: "gmail", key: "investor-follow-up" },
        { sourceType: "upload", key: "board-preview-outline" },
        { sourceType: "upload", key: "partner-pipeline-export" }
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
  },
  {
    key: "commercial-priorities",
    title: "Commercial priorities",
    messages: [
      {
        role: "user",
        text: "Which commercial threads need my attention first?"
      },
      {
        role: "assistant",
        text:
          "Start with the VectorOps proposal and the Helios renewal. VectorOps is waiting on approval before legal handoff, while Helios needs final confirmation on support language and discount structure to close the renewal this week.",
        refs: [
          { sourceType: "gmail", key: "vectorops-proposal" },
          { sourceType: "gmail", key: "helios-renewal" },
          { sourceType: "note", key: "procurement-faq-note" }
        ]
      }
    ]
  },
  {
    key: "security-prep",
    title: "Security review prep",
    messages: [
      {
        role: "user",
        text: "What should I send Catalyst Bank before the review?"
      },
      {
        role: "assistant",
        text:
          "You should send the current answers on retention, SSO, and regional storage controls, plus a clear update on the fallback domain mapping blocker. The security QA pack already covers most of the questions, but the SSO issue needs a fresh status line.",
        refs: [
          { sourceType: "gmail", key: "sso-escalation" },
          { sourceType: "note", key: "procurement-faq-note" },
          { sourceType: "upload", key: "security-qa-pack" }
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
