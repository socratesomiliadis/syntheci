"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";

import {
  Building2,
  BookUser,
  Mail,
  Phone,
  Search,
  StickyNote,
  UserPlus,
  UserRoundSearch
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  listItemReveal,
  panelReveal,
  panelTransition,
  statusReveal,
  statusTransition,
  withStagger
} from "@/components/dashboard/motion-presets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ContactBookItem {
  id: string;
  workspaceId: string;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  company: string | null;
  role: string | null;
  notes: string | null;
  origin: string;
  messageCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContactDraft {
  name: string;
  email: string;
  phoneNumber: string;
  company: string;
  role: string;
  notes: string;
}

function emptyDraft(): ContactDraft {
  return {
    name: "",
    email: "",
    phoneNumber: "",
    company: "",
    role: "",
    notes: ""
  };
}

function draftFromContact(contact: ContactBookItem): ContactDraft {
  return {
    name: contact.name ?? "",
    email: contact.email ?? "",
    phoneNumber: contact.phoneNumber ?? "",
    company: contact.company ?? "",
    role: contact.role ?? "",
    notes: contact.notes ?? ""
  };
}

function contactLabel(contact: ContactBookItem) {
  return contact.name || contact.email || "Unnamed contact";
}

function formatRelativeDate(value: string | null) {
  if (!value) {
    return "No mail touchpoint yet";
  }

  return new Date(value).toLocaleString();
}

async function readJson<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error
        : "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

export function ContactBook({
  initialContacts,
  initialSelectedContactId
}: {
  initialContacts: ContactBookItem[];
  initialSelectedContactId?: string | null;
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    initialSelectedContactId ?? initialContacts[0]?.id ?? null
  );
  const [mode, setMode] = useState<"create" | "edit">(
    initialSelectedContactId || initialContacts[0] ? "edit" : "create"
  );
  const [draft, setDraft] = useState<ContactDraft>(
    initialSelectedContactId
      ? draftFromContact(
          initialContacts.find((contact) => contact.id === initialSelectedContactId) ?? initialContacts[0]!
        )
      : initialContacts[0]
        ? draftFromContact(initialContacts[0])
        : emptyDraft()
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [isSaving, setIsSaving] = useState(false);

  const deferredQuery = useDeferredValue(query);
  const selectedContact =
    contacts.find((contact) => contact.id === selectedContactId) ?? null;

  useEffect(() => {
    if (mode === "edit" && selectedContact) {
      setDraft(draftFromContact(selectedContact));
    }
  }, [mode, selectedContact]);

  async function refreshContacts(preferredContactId?: string | null) {
    const response = await fetch("/api/contacts", {
      cache: "no-store"
    });
    const payload = await readJson<{ contacts: ContactBookItem[] }>(response);

    startTransition(() => {
      setContacts(payload.contacts);
      if (payload.contacts.length === 0) {
        setSelectedContactId(null);
        setMode("create");
        setDraft(emptyDraft());
        return;
      }

      const nextSelectedId =
        preferredContactId && payload.contacts.some((contact) => contact.id === preferredContactId)
          ? preferredContactId
          : payload.contacts[0].id;

      setSelectedContactId(nextSelectedId);
      setMode("edit");
    });
  }

  async function saveContact() {
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch(
        mode === "create" ? "/api/contacts" : `/api/contacts/${selectedContactId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(draft)
        }
      );

      const payload = await readJson<{ contact: ContactBookItem }>(response);
      await refreshContacts(payload.contact.id);
      setStatusTone("success");
      setStatus(mode === "create" ? "Contact created." : "Contact updated.");
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Unable to save contact.");
    } finally {
      setIsSaving(false);
    }
  }

  function startCreate() {
    setMode("create");
    setSelectedContactId(null);
    setDraft(emptyDraft());
    setStatus(null);
  }

  function selectContact(contactId: string) {
    setMode("edit");
    setSelectedContactId(contactId);
    setStatus(null);
  }

  const filteredContacts = contacts.filter((contact) => {
    const haystack = [
      contact.name,
      contact.email,
      contact.phoneNumber,
      contact.company,
      contact.role,
      contact.notes
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(deferredQuery.trim().toLowerCase());
  });

  const enrichedCount = contacts.filter(
    (contact) => Boolean(contact.company || contact.role || contact.phoneNumber || contact.notes)
  ).length;
  const autoCapturedCount = contacts.filter((contact) => contact.origin !== "manual").length;

  return (
    <motion.section initial="initial" animate="animate" variants={panelReveal} transition={panelTransition}>
      <div className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[1.8rem] border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(237,246,255,0.94))] shadow-sm">
            <CardHeader className="space-y-4">
              <Badge className="w-fit border border-sky-200 bg-sky-50 text-sky-800">
                <BookUser className="mr-1 size-3.5" />
                Shared people graph
              </Badge>
              <div className="space-y-3">
                <CardTitle className="text-3xl tracking-tight text-slate-950">
                  Build a living contact book from real conversations, then enrich it when context matters.
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6 text-slate-600">
                  New Gmail senders land here automatically, and every update feeds the workspace&apos;s
                  searchable knowledge so meetings, retrieval, and follow-up work stay people-aware.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>

          <section className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <Card className="rounded-[1.35rem] border-slate-200/80 bg-white/92 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-700">Known contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-semibold tracking-tight text-slate-950">{contacts.length}</p>
              </CardContent>
            </Card>
            <Card className="rounded-[1.35rem] border-slate-200/80 bg-white/92 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-700">Auto-captured</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-semibold tracking-tight text-slate-950">{autoCapturedCount}</p>
              </CardContent>
            </Card>
            <Card className="rounded-[1.35rem] border-slate-200/80 bg-white/92 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-700">Enriched profiles</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-semibold tracking-tight text-slate-950">{enrichedCount}</p>
              </CardContent>
            </Card>
          </section>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[1.7rem] border-slate-200/80 bg-white/92 shadow-sm">
            <CardHeader className="gap-4 border-b border-slate-200/80 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl text-slate-950">Directory</CardTitle>
                  <CardDescription>
                    Search everyone the workspace knows, whether they were added manually or discovered from mail.
                  </CardDescription>
                </div>
                <Button type="button" className="rounded-xl" onClick={startCreate}>
                  <UserPlus className="size-4" />
                  Add contact
                </Button>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, email, company, role, or notes"
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10"
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {filteredContacts.length === 0 ? (
                  <motion.div
                    key="contacts-empty"
                    layout
                    className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={statusReveal}
                    transition={statusTransition}
                  >
                    <UserRoundSearch className="mx-auto size-9 text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      {contacts.length === 0 ? "No contacts yet." : "No contacts match this search."}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Gmail senders appear here automatically once they sync in.
                    </p>
                  </motion.div>
                ) : (
                  filteredContacts.map((contact, index) => {
                    const isActive = mode === "edit" && contact.id === selectedContactId;

                    return (
                      <motion.button
                        type="button"
                        key={contact.id}
                        onClick={() => selectContact(contact.id)}
                        className={cn(
                          "w-full rounded-[1.2rem] border px-4 py-4 text-left transition-colors",
                          isActive
                            ? "border-sky-200 bg-sky-50/80 shadow-sm"
                            : "border-slate-200/80 bg-slate-50/65 hover:bg-slate-100/80"
                        )}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={listItemReveal}
                        transition={withStagger(index, 0.035)}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{contactLabel(contact)}</p>
                            <p className="mt-1 truncate text-sm text-slate-500">
                              {contact.email ?? "No email yet"}
                            </p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {contact.origin.replace("_", " ")}
                          </Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                          {contact.company ? (
                            <span className="rounded-full bg-white px-2.5 py-1">{contact.company}</span>
                          ) : null}
                          {contact.role ? (
                            <span className="rounded-full bg-white px-2.5 py-1">{contact.role}</span>
                          ) : null}
                          <span className="rounded-full bg-white px-2.5 py-1">
                            {contact.messageCount} messages
                          </span>
                        </div>

                        <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                          Last touch {formatRelativeDate(contact.lastMessageAt)}
                        </p>
                      </motion.button>
                    );
                  })
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          <Card className="rounded-[1.7rem] border-slate-200/80 bg-white/92 shadow-sm">
            <CardHeader className="border-b border-slate-200/80 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl text-slate-950">
                    {mode === "create" ? "Add contact" : contactLabel(selectedContact ?? {
                      id: "",
                      workspaceId: "",
                      name: null,
                      email: null,
                      phoneNumber: null,
                      company: null,
                      role: null,
                      notes: null,
                      origin: "manual",
                      messageCount: 0,
                      firstSeenAt: "",
                      lastSeenAt: "",
                      lastMessageAt: null,
                      createdAt: "",
                      updatedAt: ""
                    })}
                  </CardTitle>
                  <CardDescription>
                    {mode === "create"
                      ? "Create a manual record that joins the rest of the workspace context."
                      : "Enrich the profile without losing the original mail-derived touchpoints."}
                  </CardDescription>
                </div>
                {selectedContact ? (
                  <Badge variant="secondary" className="border border-slate-200 bg-slate-100 text-slate-700">
                    {selectedContact.messageCount} linked messages
                  </Badge>
                ) : null}
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
              <AnimatePresence mode="popLayout" initial={false}>
                {status ? (
                  <motion.p
                    key={`${statusTone}-${status}`}
                    layout
                    className={
                      statusTone === "error"
                        ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                    }
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={statusReveal}
                    transition={statusTransition}
                  >
                    {status}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Alex Morgan"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={draft.email}
                    onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                    placeholder="alex@company.com"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    value={draft.phoneNumber}
                    onChange={(event) => setDraft((current) => ({ ...current, phoneNumber: event.target.value }))}
                    placeholder="+30 210 555 0000"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-company">Company</Label>
                  <Input
                    id="contact-company"
                    value={draft.company}
                    onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))}
                    placeholder="Acme Labs"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="contact-role">Role</Label>
                  <Input
                    id="contact-role"
                    value={draft.role}
                    onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
                    placeholder="Chief of Staff"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="contact-notes">Notes</Label>
                  <Textarea
                    id="contact-notes"
                    value={draft.notes}
                    onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Context, preferences, relationship notes, or meeting prep cues"
                    className="min-h-32 rounded-2xl border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              {selectedContact ? (
                <div className="grid gap-3 rounded-[1.3rem] border border-slate-200/80 bg-slate-50/80 p-4 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="inline-flex items-start gap-2">
                    <Mail className="mt-0.5 size-4 text-sky-700" />
                    <div>
                      <p className="font-medium text-slate-800">Email trail</p>
                      <p>{selectedContact.email ?? "No email yet"}</p>
                    </div>
                  </div>
                  <div className="inline-flex items-start gap-2">
                    <Phone className="mt-0.5 size-4 text-emerald-700" />
                    <div>
                      <p className="font-medium text-slate-800">Phone</p>
                      <p>{selectedContact.phoneNumber ?? "Not captured"}</p>
                    </div>
                  </div>
                  <div className="inline-flex items-start gap-2">
                    <Building2 className="mt-0.5 size-4 text-amber-700" />
                    <div>
                      <p className="font-medium text-slate-800">Company and role</p>
                      <p>
                        {selectedContact.company || selectedContact.role
                          ? [selectedContact.company, selectedContact.role].filter(Boolean).join(" - ")
                          : "Still blank"}
                      </p>
                    </div>
                  </div>
                  <div className="inline-flex items-start gap-2">
                    <StickyNote className="mt-0.5 size-4 text-fuchsia-700" />
                    <div>
                      <p className="font-medium text-slate-800">Touchpoints</p>
                      <p>{selectedContact.messageCount} linked inbox messages</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button type="button" className="rounded-xl" onClick={() => void saveContact()} disabled={isSaving}>
                  {isSaving ? "Saving..." : mode === "create" ? "Create contact" : "Save changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    if (selectedContact) {
                      setMode("edit");
                      setDraft(draftFromContact(selectedContact));
                    } else {
                      setDraft(emptyDraft());
                    }
                    setStatus(null);
                  }}
                  disabled={isSaving}
                >
                  Reset form
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.section>
  );
}
