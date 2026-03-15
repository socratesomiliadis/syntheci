"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useState } from "react";

import {
  Building2,
  Copy,
  ExternalLink,
  Mail,
  Phone,
  Search,
  StickyNote,
  UserPlus,
  UserRoundSearch,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { buildContactDashboardUrl } from "@syntheci/shared";

import {
  listItemReveal,
  panelReveal,
  panelTransition,
  statusReveal,
  statusTransition,
  withStagger,
} from "@/components/dashboard/motion-presets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    notes: "",
  };
}

function draftFromContact(contact: ContactBookItem): ContactDraft {
  return {
    name: contact.name ?? "",
    email: contact.email ?? "",
    phoneNumber: contact.phoneNumber ?? "",
    company: contact.company ?? "",
    role: contact.role ?? "",
    notes: contact.notes ?? "",
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
  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null;
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error
        ? payload.error
        : "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

export function ContactBook({
  initialContacts,
  initialSelectedContactId,
}: {
  initialContacts: ContactBookItem[];
  initialSelectedContactId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
          initialContacts.find(
            (contact) => contact.id === initialSelectedContactId
          ) ?? initialContacts[0]!
        )
      : initialContacts[0]
      ? draftFromContact(initialContacts[0])
      : emptyDraft()
  );
  const [query, setQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const deferredQuery = useDeferredValue(query);
  const selectedContact =
    contacts.find((contact) => contact.id === selectedContactId) ?? null;

  useEffect(() => {
    if (mode === "edit" && selectedContact) {
      setDraft(draftFromContact(selectedContact));
    }
  }, [mode, selectedContact]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentContactId = params.get("contact");

    if (selectedContactId) {
      params.set("contact", selectedContactId);
    } else {
      params.delete("contact");
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (
      (selectedContactId ?? null) !== (currentContactId ?? null) ||
      nextQuery !== currentQuery
    ) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    }
  }, [pathname, router, searchParams, selectedContactId]);

  async function refreshContacts(preferredContactId?: string | null) {
    const response = await fetch("/api/contacts", {
      cache: "no-store",
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
        preferredContactId &&
        payload.contacts.some((contact) => contact.id === preferredContactId)
          ? preferredContactId
          : payload.contacts[0].id;

      setSelectedContactId(nextSelectedId);
      setMode("edit");
    });
  }

  async function saveContact() {
    setIsSaving(true);

    try {
      const response = await fetch(
        mode === "create"
          ? "/api/contacts"
          : `/api/contacts/${selectedContactId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(draft),
        }
      );

      const payload = await readJson<{ contact: ContactBookItem }>(response);
      await refreshContacts(payload.contact.id);
      toast.success(
        mode === "create" ? "Contact created." : "Contact updated."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save contact."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function startCreate() {
    setMode("create");
    setSelectedContactId(null);
    setDraft(emptyDraft());
  }

  function selectContact(contactId: string) {
    setMode("edit");
    setSelectedContactId(contactId);
  }

  async function copySelectedContactLink() {
    if (!selectedContact) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        buildContactDashboardUrl(selectedContact.id)
      );
      toast.success("Contact link copied.");
    } catch {
      toast.error("Unable to copy contact link.");
    }
  }

  const filteredContacts = contacts.filter((contact) => {
    const haystack = [
      contact.name,
      contact.email,
      contact.phoneNumber,
      contact.company,
      contact.role,
      contact.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(deferredQuery.trim().toLowerCase());
  });

  const enrichedCount = contacts.filter((contact) =>
    Boolean(
      contact.company || contact.role || contact.phoneNumber || contact.notes
    )
  ).length;
  const autoCapturedCount = contacts.filter(
    (contact) => contact.origin !== "manual"
  ).length;

  return (
    <motion.section
      initial="initial"
      animate="animate"
      variants={panelReveal}
      transition={panelTransition}
    >
      <div className="space-y-4">
        <section className="grid gap-3 md:grid-cols-3">
          <Card className="border-border/80 bg-card/92 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Known contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {contacts.length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/92 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Auto-captured
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {autoCapturedCount}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/92 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Enriched profiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {enrichedCount}
              </p>
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[1.7rem] border-border/80 bg-card/92 shadow-sm">
            <CardHeader className="gap-4 border-b border-border/80 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl text-foreground">
                    Directory
                  </CardTitle>
                  <CardDescription>
                    Search everyone the workspace knows, whether they were added
                    manually or discovered from mail.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  className="rounded-xl"
                  onClick={startCreate}
                >
                  <UserPlus className="size-4" />
                  Add contact
                </Button>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, email, company, role, or notes"
                  className="h-11 rounded-xl border-border bg-muted pl-10"
                />
              </div>
            </CardHeader>

            <CardContent className="grid grid-cols-2 gap-3 pt-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {filteredContacts.length === 0 ? (
                  <motion.div
                    key="contacts-empty"
                    layout
                    className="rounded-[1.2rem] border border-dashed border-border bg-muted/80 px-5 py-8 text-center"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={statusReveal}
                    transition={statusTransition}
                  >
                    <UserRoundSearch className="mx-auto size-9 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium text-foreground">
                      {contacts.length === 0
                        ? "No contacts yet."
                        : "No contacts match this search."}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Gmail senders appear here automatically once they sync in.
                    </p>
                  </motion.div>
                ) : (
                  filteredContacts.map((contact, index) => {
                    const isActive =
                      mode === "edit" && contact.id === selectedContactId;

                    return (
                      <motion.button
                        type="button"
                        key={contact.id}
                        onClick={() => selectContact(contact.id)}
                        className={cn(
                          "w-full rounded-[1.2rem] border px-4 py-4 text-left transition-colors",
                          isActive
                            ? "border-info/25 bg-info/10 shadow-sm"
                            : "border-border/80 bg-muted/65 hover:bg-accent/80"
                        )}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={listItemReveal}
                        transition={withStagger(index, 0.035)}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {contactLabel(contact)}
                            </p>
                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {contact.email ?? "No email yet"}
                            </p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {contact.origin.replace("_", " ")}
                          </Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {contact.company ? (
                            <span className="rounded-full bg-card px-2.5 py-1">
                              {contact.company}
                            </span>
                          ) : null}
                          {contact.role ? (
                            <span className="rounded-full bg-card px-2.5 py-1">
                              {contact.role}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-card px-2.5 py-1">
                            {contact.messageCount} messages
                          </span>
                        </div>

                        <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                          Last touch {formatRelativeDate(contact.lastMessageAt)}
                        </p>
                      </motion.button>
                    );
                  })
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          <Card className="rounded-[1.7rem] border-border/80 bg-card/92 shadow-sm">
            <CardHeader className="border-b border-border/80 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl text-foreground">
                    {mode === "create"
                      ? "Add contact"
                      : contactLabel(
                          selectedContact ?? {
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
                            updatedAt: "",
                          }
                        )}
                  </CardTitle>
                  <CardDescription>
                    {mode === "create"
                      ? "Create a manual record that joins the rest of the workspace context."
                      : "Enrich the profile without losing the original mail-derived touchpoints."}
                  </CardDescription>
                </div>
                {selectedContact ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="border border-border bg-accent text-foreground"
                    >
                      {selectedContact.messageCount} linked messages
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => void copySelectedContactLink()}
                    >
                      <Copy className="size-4" />
                      Copy link
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      render={
                        <Link
                          href={buildContactDashboardUrl(selectedContact.id)}
                          target="_blank"
                        />
                      }
                    >
                      <ExternalLink className="size-4" />
                      Open
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Alex Morgan"
                    className="h-11 rounded-xl border-border bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={draft.email}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="alex@company.com"
                    className="h-11 rounded-xl border-border bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    value={draft.phoneNumber}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        phoneNumber: event.target.value,
                      }))
                    }
                    placeholder="+30 210 555 0000"
                    className="h-11 rounded-xl border-border bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-company">Company</Label>
                  <Input
                    id="contact-company"
                    value={draft.company}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        company: event.target.value,
                      }))
                    }
                    placeholder="Acme Labs"
                    className="h-11 rounded-xl border-border bg-muted"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="contact-role">Role</Label>
                  <Input
                    id="contact-role"
                    value={draft.role}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        role: event.target.value,
                      }))
                    }
                    placeholder="Chief of Staff"
                    className="h-11 rounded-xl border-border bg-muted"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="contact-notes">Notes</Label>
                  <Textarea
                    id="contact-notes"
                    value={draft.notes}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Context, preferences, relationship notes, or meeting prep cues"
                    className="min-h-32 rounded-2xl border-border bg-muted"
                  />
                </div>
              </div>

              {selectedContact ? (
                <div className="grid gap-3 rounded-[1.3rem] border border-border/80 bg-muted/80 p-4 text-sm text-muted-foreground sm:grid-cols-2">
                  <div className="inline-flex items-start gap-2">
                    <Mail className="mt-0.5 size-4 text-sky-700" />
                    <div>
                      <p className="font-medium text-foreground">Email trail</p>
                      <p>{selectedContact.email ?? "No email yet"}</p>
                    </div>
                  </div>
                  <div className="inline-flex items-start gap-2">
                    <Phone className="mt-0.5 size-4 text-emerald-700" />
                    <div>
                      <p className="font-medium text-foreground">Phone</p>
                      <p>{selectedContact.phoneNumber ?? "Not captured"}</p>
                    </div>
                  </div>
                  <div className="inline-flex items-start gap-2">
                    <Building2 className="mt-0.5 size-4 text-amber-700" />
                    <div>
                      <p className="font-medium text-foreground">
                        Company and role
                      </p>
                      <p>
                        {selectedContact.company || selectedContact.role
                          ? [selectedContact.company, selectedContact.role]
                              .filter(Boolean)
                              .join(" - ")
                          : "Still blank"}
                      </p>
                    </div>
                  </div>
                  <div className="inline-flex items-start gap-2">
                    <StickyNote className="mt-0.5 size-4 text-fuchsia-700" />
                    <div>
                      <p className="font-medium text-foreground">Touchpoints</p>
                      <p>
                        {selectedContact.messageCount} linked inbox messages
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  className="rounded-xl"
                  onClick={() => void saveContact()}
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : mode === "create"
                    ? "Create contact"
                    : "Save changes"}
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
