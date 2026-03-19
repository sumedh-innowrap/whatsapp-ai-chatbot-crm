import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  Users,
  Star,
  MessageSquare,
  RotateCcw,
  UserCheck,
  Bot,
  Send,
  Maximize2,
  Minimize2,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { useState, useRef, useEffect } from "react";

function renderMessageContent(text: string, isBot: boolean) {
  if (!text) return null;
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  const textBuf: string[] = [];

  const flushText = (key: number) => {
    if (textBuf.length === 0) return;
    result.push(
      <p key={`t${key}`} className="whitespace-pre-wrap">
        {textBuf.join("\n")}
      </p>,
    );
    textBuf.length = 0;
  };

  lines.forEach((line, i) => {
    if (line.startsWith("[IMAGE] ")) {
      flushText(i);
      const rest = line.slice(8);
      const sepIdx = rest.indexOf(" | ");
      const url = sepIdx !== -1 ? rest.slice(0, sepIdx) : rest;
      const caption = sepIdx !== -1 ? rest.slice(sepIdx + 3) : "";
      result.push(
        <div key={`img${i}`} className="mt-1.5">
          <img
            src={url}
            alt={caption}
            className="rounded-lg max-w-full object-cover"
            style={{ maxHeight: 220 }}
          />
          {caption && (
            <p className={`text-[10px] mt-0.5 ${isBot ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
              {caption}
            </p>
          )}
        </div>,
      );
    } else if (line.startsWith("[CTA_URL] ")) {
      flushText(i);
      const url = line.slice(10).trim();
      result.push(
        <a
          key={`cta${i}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 border border-white/40 rounded-lg px-3 py-2 transition-colors"
        >
          Check Availability →
        </a>,
      );
    } else {
      textBuf.push(line);
    }
  });
  flushText(lines.length);

  return <>{result}</>;
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: lead } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => api.get<any>(`/leads/${id}`),
    enabled: !!id,
    refetchInterval: 5000,
  });

  // SSE-based messages
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("crm_token");
    const base = (import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:8080/api/admin") as string;
    const es = new EventSource(
      `${base}/leads/${id}/messages/stream?token=${token}`,
    );
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages(data);
      } catch {
        // ignore parse errors
      }
    };
    es.onerror = () => {
      // Let EventSource auto-reconnect — do not call es.close() here
    };
    return () => {
      es.close();
    };
  }, [id]);

  // Auto-scroll + new message indicator
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const isNearBottom = useRef(true);

  // On first mount, scroll to bottom
  const hasInitialScrolled = useRef(false);
  useEffect(() => {
    if (messages.length > 0 && !hasInitialScrolled.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      hasInitialScrolled.current = true;
    }
  }, [messages.length]);

  // On subsequent new messages
  const prevLengthRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevLengthRef.current && hasInitialScrolled.current) {
      if (isNearBottom.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowNewMsg(false);
      } else {
        setShowNewMsg(true);
      }
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    isNearBottom.current = nearBottom;
    if (nearBottom) setShowNewMsg(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowNewMsg(false);
  };

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [agentMsg, setAgentMsg] = useState("");
  const [notes, setNotes] = useState("");
  const [takeoverDialog, setTakeoverDialog] = useState(false);
  const [restartDialog, setRestartDialog] = useState(false);

  const updateLead = useMutation({
    mutationFn: (updates: Record<string, any>) =>
      api.put(`/leads/${id}`, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const restartChat = useMutation({
    mutationFn: () => api.post(`/leads/${id}/restart`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Chat restarted — user can re-enquire fresh");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const takeover = useMutation({
    mutationFn: () => api.post(`/leads/${id}/takeover`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] });
      toast.success("Human takeover active — AI replies paused");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const release = useMutation({
    mutationFn: () => api.post(`/leads/${id}/release`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] });
      toast.success("Handed back to AI");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendMsg = useMutation({
    mutationFn: () =>
      api.post(`/leads/${id}/send-message`, { message: agentMsg }),
    onSuccess: () => {
      setAgentMsg("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSend = () => {
    if (!agentMsg.trim()) return;
    sendMsg.mutate();
  };

  if (!lead)
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );

  const isHuman = lead.human_takeover;

  // Build chip summary from intent fields
  const summaryChips: { label: string; value: string }[] = [];
  if (lead.trip_type)
    summaryChips.push({ label: "Trip", value: lead.trip_type });
  if (lead.travel_group)
    summaryChips.push({ label: "Group", value: lead.travel_group });
  if (lead.city_of_origin)
    summaryChips.push({ label: "From", value: lead.city_of_origin });
  if (lead.travel_date)
    summaryChips.push({
      label: "Date",
      value:
        lead.travel_date +
        (lead.travel_date_note ? ` (${lead.travel_date_note})` : ""),
    });
  if (lead.stay_duration)
    summaryChips.push({
      label: "Duration",
      value:
        lead.stay_duration +
        (lead.stay_duration_note ? ` (${lead.stay_duration_note})` : ""),
    });
  if (lead.experience_interest)
    summaryChips.push({ label: "Interest", value: lead.experience_interest });
  if (lead.experiences_booked?.length)
    lead.experiences_booked.forEach((exp: string) =>
      summaryChips.push({ label: "✨ Booked", value: exp }),
    );

  const conversationPanelClass = isFullScreen
    ? "fixed inset-0 z-50 bg-card flex flex-col"
    : "flex flex-col h-full overflow-hidden";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Back button */}
      <div className="shrink-0 pb-3">
        <Link
          to="/leads"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to Leads
        </Link>
      </div>

      {/* Main content — fills remaining height */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT panel — independently scrollable */}
        <div className="lg:col-span-1 overflow-y-auto custom-scroll space-y-4 pr-1">
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold">
                {lead.name || "Unknown"}
              </h2>
              <StatusBadge status={lead.lead_status} />
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone size={14} />
                {lead.phone_number}
              </div>
              {lead.city_of_origin && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin size={14} />
                  {lead.city_of_origin}
                </div>
              )}
              {lead.travel_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar size={14} />
                  {lead.travel_date}
                  {lead.travel_date_note && (
                    <span className="text-xs italic">
                      "{lead.travel_date_note}"
                    </span>
                  )}
                </div>
              )}
              {lead.travel_group && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users size={14} />
                  {lead.travel_group}
                </div>
              )}
              {lead.trip_type && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Star size={14} />
                  {lead.trip_type}
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lead Score</span>
                <span className="font-display font-bold text-lg">
                  {lead.lead_score}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span>
                  {lead.stay_duration
                    ? `${lead.stay_duration}${lead.stay_duration_note ? ` (${lead.stay_duration_note})` : ""}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Property</span>
                <span>{lead.properties?.property_name || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Booking Link Sent</span>
                <span>{lead.booking_link_sent ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Booking Confirmed</span>
                <span>{lead.booking_confirmed ? "✅ Yes" : "No"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Experiences Booked
                </span>
                <span className="text-right">
                  {lead.experiences_booked?.length
                    ? lead.experiences_booked.map((exp: string) => (
                        <span
                          key={exp}
                          className="inline-block ml-1 px-1.5 py-0.5 rounded text-xs font-medium"
                        >
                          {exp}
                        </span>
                      ))
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border p-6 space-y-4">
            <h3 className="font-display font-semibold">Actions</h3>

            <div className="space-y-2">
              <Label>Update Status</Label>
              <Select
                value={lead.lead_status ?? ""}
                onValueChange={(v) => updateLead.mutate({ lead_status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant={lead.booking_confirmed ? "secondary" : "default"}
              className="w-full"
              onClick={() =>
                updateLead.mutate({
                  booking_confirmed: !lead.booking_confirmed,
                })
              }
            >
              {lead.booking_confirmed
                ? "Unmark Booking"
                : "Mark Booking Confirmed"}
            </Button>
            <div className="space-y-2">
              <Label>Add Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes..."
              />
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  updateLead.mutate({
                    notes: (lead.notes ? lead.notes + "\n" : "") + notes,
                  });
                  setNotes("");
                }}
              >
                Save Notes
              </Button>
            </div>
            {lead.notes && (
              <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3 whitespace-pre-wrap">
                {lead.notes}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT panel — conversation */}
        <div
          className={`lg:col-span-2 ${isFullScreen ? "" : "min-h-0 flex flex-col"}`}
        >
          <div className={conversationPanelClass}>
            <div className="bg-card rounded-xl border flex flex-col h-full overflow-hidden">
              {/* Conversation header */}
              <div className="p-4 border-b flex items-center gap-2 shrink-0">
                <MessageSquare size={18} />
                <h3 className="font-display font-semibold">Conversation</h3>
                {isHuman && (
                  <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200">
                    Agent Mode
                  </span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {messages.length} messages
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Restart Chat"
                  disabled={restartChat.isPending}
                  onClick={() => setRestartDialog(true)}
                  className="text-purple-600 hover:text-purple-600 hover:bg-purple-200"
                >
                  <RotateCcw size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title={isFullScreen ? "Exit full screen" : "Full screen"}
                  onClick={() => setIsFullScreen((f) => !f)}
                  className="text-green-600 hover:text-green-600 hover:bg-green-200"
                >
                  {isFullScreen ? (
                    <Minimize2 size={16} />
                  ) : (
                    <Maximize2 size={16} />
                  )}
                </Button>
              </div>

              {/* AI / Human takeover bar */}
              <div
                className={`px-4 py-2 shrink-0 border-b flex items-center justify-between gap-3 ${isHuman ? "bg-orange-50/60 dark:bg-orange-950/20" : "bg-muted/30"}`}
              >
                <div className="flex items-center gap-2 text-sm">
                  {isHuman ? (
                    <UserCheck size={14} className="text-orange-500" />
                  ) : (
                    <Bot size={14} className="text-muted-foreground" />
                  )}
                  <span
                    className={
                      isHuman
                        ? "text-orange-600 font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {isHuman
                      ? "👤 Human Mode — AI replies paused"
                      : "🤖 AI Active"}
                  </span>
                </div>
                {/* Toggle button — opens confirm dialog */}
                <button
                  disabled={takeover.isPending || release.isPending}
                  onClick={() => setTakeoverDialog(true)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${isHuman ? "bg-orange-500" : "bg-muted-foreground/30"}`}
                  role="switch"
                  aria-checked={isHuman}
                >
                  <span
                    className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${isHuman ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>

              {/* Chat summary — chips */}
              {summaryChips.length > 0 && (
                <div className="px-4 py-2 shrink-0 border-b bg-muted/20 flex flex-wrap gap-1.5">
                  {summaryChips.map((chip) => (
                    <span
                      key={chip.label}
                      className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2.5 py-1 text-muted-foreground"
                    >
                      <span className="font-medium text-foreground/60">
                        {chip.label}:
                      </span>{" "}
                      {chip.value}
                    </span>
                  ))}
                </div>
              )}

              {/* Messages area */}
              <div
                className="flex-1 overflow-y-auto custom-scroll p-4 space-y-3 relative"
                ref={scrollContainerRef}
                onScroll={handleScroll}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === "user" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-xl px-4 py-2.5 text-sm ${msg.sender_type === "user" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}
                    >
                      {renderMessageContent(msg.message_text, msg.sender_type !== "user")}
                      <p
                        className={`text-[10px] mt-1 ${msg.sender_type === "user" ? "text-muted-foreground" : "text-primary-foreground/70"}`}
                      >
                        {msg.created_at
                          ? format(new Date(msg.created_at), "MMM d, HH:mm")
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-center text-muted-foreground py-12">
                    No messages yet
                  </p>
                )}
                <div ref={messagesEndRef} />

                {/* New message indicator */}
                {showNewMsg && (
                  <div className="sticky bottom-2 flex justify-center">
                    <button
                      onClick={scrollToBottom}
                      className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow-md hover:opacity-90 transition-opacity"
                    >
                      ↓ New message
                    </button>
                  </div>
                )}
              </div>

              {/* Agent message input */}
              {isHuman && (
                <div className="p-3 border-t shrink-0 flex gap-2 bg-orange-50/50 dark:bg-orange-950/10">
                  <Input
                    placeholder="Type your message to the user..."
                    value={agentMsg}
                    onChange={(e) => setAgentMsg(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={sendMsg.isPending || !agentMsg.trim()}
                  >
                    <Send size={16} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Restart Chat confirm dialog */}
      <AlertDialog open={restartDialog} onOpenChange={setRestartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the entire chat history and all collected trip
              details so the user can start a fresh enquiry. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                setRestartDialog(false);
                restartChat.mutate();
              }}
            >
              Yes, restart chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Takeover / Release confirm dialog */}
      <AlertDialog open={takeoverDialog} onOpenChange={setTakeoverDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isHuman ? "Hand back to AI?" : "Take over conversation?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isHuman
                ? "The bot will resume replying to the user automatically. You can take over again at any time."
                : "AI replies will be paused. You can type messages directly to the user. Hand back to AI when done."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                isHuman ? "" : "bg-orange-500 hover:bg-orange-600 text-white"
              }
              onClick={() => {
                setTakeoverDialog(false);
                isHuman ? release.mutate() : takeover.mutate();
              }}
            >
              {isHuman ? "Yes, hand to AI" : "Yes, take over"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
