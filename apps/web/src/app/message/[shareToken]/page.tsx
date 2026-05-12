"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, X, Play, Music, Camera, Mic, Video, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contribution {
  id: string;
  mediaType: "photo" | "video" | "audio";
  mediaKey: string;
  senderName: string;
  senderMessage: string | null;
  createdAt: string;
}

interface PublicCard {
  id: string;
  shareToken: string;
  title: string | null;
  message: string | null;
  orientation: "landscape" | "portrait";
  coverImage: { original: string | null; web: string | null; thumb: string | null };
  settings: { passwordProtected: boolean; allowContributions: boolean };
}

type MediaKind = "photo" | "video" | "audio";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") + "/api";
const SESSION_KEY = (token: string) => `viewer_token_${token}`;
const SENDER_NAME_KEY = "tw_sender_name";

// ── Header ────────────────────────────────────────────────────────────────────

function ShareHeader({ onPickKind, onCapture, isOwner, onOwnerLogin }: {
  onPickKind?: (kind: MediaKind, file: File) => void;
  onCapture?: (kind: MediaKind) => void;
  isOwner: boolean;
  onOwnerLogin: () => void;
}) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [pickedKind, setPickedKind] = useState<MediaKind | null>(null);
  const [showNameForm, setShowNameForm] = useState(false);
  const [nameFirst, setNameFirst] = useState("");
  const [nameLast, setNameLast] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingKindRef = useRef<MediaKind>("photo");
  const pendingActionRef = useRef<"upload" | "capture">("upload");

  const FILE_ACCEPT: Record<MediaKind, string> = {
    photo: "image/jpeg,image/png,image/heic,image/*",
    video: "video/mp4,video/quicktime,video/webm,video/*",
    audio: "audio/mpeg,audio/mp4,audio/wav,audio/m4a,audio/*",
  };

  function closePicker() {
    setShowPicker(false);
    setPickedKind(null);
    setShowNameForm(false);
  }

  function triggerFilePicker(kind: MediaKind) {
    pendingKindRef.current = kind;
    closePicker();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.accept = FILE_ACCEPT[kind];
      fileInputRef.current.click();
    }
  }

  function dispatch(kind: MediaKind, action: "upload" | "capture") {
    if (action === "upload") {
      triggerFilePicker(kind);
    } else {
      closePicker();
      onCapture?.(kind);
    }
  }

  function handleAction(kind: MediaKind, action: "upload" | "capture") {
    const stored = localStorage.getItem(SENDER_NAME_KEY);
    if (!stored) {
      pendingActionRef.current = action;
      setShowNameForm(true);
    } else {
      dispatch(kind, action);
    }
  }

  function handleNameSave() {
    const full = [nameFirst.trim(), nameLast.trim()].filter(Boolean).join(" ");
    if (!full) return;
    localStorage.setItem(SENDER_NAME_KEY, full);
    const kind = pickedKind!;
    setNameFirst("");
    setNameLast("");
    dispatch(kind, pendingActionRef.current);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onPickKind?.(pendingKindRef.current, file);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        closePicker();
      }
    }
    if (showPicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  const kinds: { kind: MediaKind; label: string; Icon: React.ElementType }[] = [
    { kind: "photo", label: "Photo", Icon: Camera },
    { kind: "audio", label: "Audio", Icon: Mic },
    { kind: "video", label: "Video", Icon: Video },
  ];

  const actionLabels: Record<MediaKind, { title: string; upload: string; capture: string }> = {
    photo: { title: "Add Photo",  upload: "Upload photo",  capture: "Take a photo"   },
    audio: { title: "Add Audio",  upload: "Upload audio",  capture: "Record audio"   },
    video: { title: "Add Video",  upload: "Upload video",  capture: "Record video"   },
  };

  const SHADOW = "0 2px 4px -2px rgba(16,24,40,0.06), 0 4px 8px -2px rgba(16,24,40,0.10)";

  return (
    <header className="bg-white border-b border-border">
      <div className="h-14 sm:h-[72px] relative flex items-center px-4 sm:px-6">
        <div className="shrink-0">
          <Button variant="outline" size="sm" onClick={() => router.push("/cards/new")} className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Create a Card</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-serif text-xl sm:text-[26px] font-normal text-foreground tracking-wide">Timewell</span>
        </div>
        <div className="shrink-0 ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onOwnerLogin}
            title={isOwner ? "Owner mode active" : "Owner sign in"}
            className={`h-8 w-8 flex items-center justify-center rounded-full border transition-colors ${isOwner ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground/60 hover:bg-muted"}`}
          >
            <User className="w-4 h-4" />
          </button>
          {onPickKind && (
            <>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
            <div ref={pickerRef} className="relative">
              <Button onClick={() => setShowPicker((v) => !v)}>Upload</Button>

              {showPicker && (
                <div
                  className="absolute right-0 top-[calc(100%+10px)] z-50 bg-white rounded-[4px] w-[calc(100vw-2rem)] sm:w-auto"
                  style={{
                    minWidth: showNameForm ? 320 : 300,
                    maxWidth: showNameForm ? 390 : 374,
                    padding: showNameForm ? 0 : 9,
                    boxShadow: SHADOW,
                  }}
                >
                  {pickedKind === null ? (
                    /* Step 1 — kind picker */
                    <>
                      <div className="flex gap-[10px]">
                        {kinds.map(({ kind, label, Icon }) => (
                          <button
                            key={kind}
                            onClick={() => setPickedKind(kind)}
                            className="flex-1 flex flex-col items-center justify-center gap-[10px] rounded-[3px] bg-[#F4F6F3] border-2 border-[#CCD2C8] hover:border-[#687C63] transition-colors"
                            style={{ height: 82 }}
                          >
                            <Icon className="w-8 h-8 text-[#687C63]" strokeWidth={1.5} />
                            <span className="text-[13px] font-normal leading-none text-[#485744]">{label}</span>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={closePicker}
                        className="w-full mt-[9px] text-[13px] text-[#485744] hover:text-[#485744]/70 transition-colors text-center"
                      >
                        Close
                      </button>
                    </>
                  ) : !showNameForm ? (
                    /* Step 2 — action picker */
                    <>
                      <div className="flex items-center mb-[15px]">
                        <button
                          onClick={() => setPickedKind(null)}
                          className="w-6 h-6 flex items-center justify-center text-[#1C1B1F] hover:text-[#1C1B1F]/70 transition-colors shrink-0"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <span className="flex-1 ml-2 text-[13px] font-medium text-[#394636]">
                          {actionLabels[pickedKind].title}
                        </span>
                        <button
                          onClick={closePicker}
                          className="text-[13px] text-[#394636] hover:text-[#394636]/70 transition-colors shrink-0"
                        >
                          Close
                        </button>
                      </div>
                      <div className="flex gap-[10px]">
                        <button
                          onClick={() => handleAction(pickedKind, "upload")}
                          className="flex-1 flex items-center justify-center rounded-[4px] bg-[#485744] text-white text-[13px] font-normal hover:bg-[#485744]/90 transition-colors"
                          style={{ height: 48 }}
                        >
                          {actionLabels[pickedKind].upload}
                        </button>
                        <button
                          onClick={() => handleAction(pickedKind, "capture")}
                          className="flex-1 flex items-center justify-center rounded-[4px] text-[#485744] text-[13px] font-normal hover:bg-[#485744]/5 transition-colors"
                          style={{ height: 48, border: "1.2px solid #485744" }}
                        >
                          {actionLabels[pickedKind].capture}
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Step 3 — name form */
                    <div className="px-[16px] pt-[24px] pb-[24px]">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setShowNameForm(false)}
                            className="w-6 h-6 flex items-center justify-center text-[#1C1B1F] hover:text-[#1C1B1F]/70 transition-colors"
                          >
                            <ArrowLeft className="w-5 h-5" />
                          </button>
                          <h2 className="font-serif text-[22px] font-normal text-[#394636] leading-tight">Your Name</h2>
                        </div>
                        <button onClick={closePicker} className="text-[#485744] hover:opacity-70 transition-opacity mt-0.5">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-[12px] text-[#485744] mt-[12px]">
                        Add your name to help organize contributions.
                      </p>

                      {/* Inputs */}
                      <div className="mt-[29px] space-y-[8px]">
                        <div className="rounded-[4px] bg-[#F4F6F3] px-4 h-[50px] flex items-center">
                          <input
                            type="text"
                            placeholder="First Name"
                            value={nameFirst}
                            autoFocus
                            onChange={(e) => setNameFirst(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                            className="w-full bg-transparent text-[14px] text-[#394636] placeholder:text-[#394636]/50 outline-none"
                          />
                        </div>
                        <div className="rounded-[4px] bg-[#F4F6F3] px-4 h-[50px] flex items-center">
                          <input
                            type="text"
                            placeholder="Last Name"
                            value={nameLast}
                            onChange={(e) => setNameLast(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                            className="w-full bg-transparent text-[14px] text-[#394636] placeholder:text-[#394636]/50 outline-none"
                          />
                        </div>
                      </div>

                      {/* Save */}
                      <button
                        onClick={handleNameSave}
                        disabled={!nameFirst.trim()}
                        className="mt-[24px] w-full h-[40px] rounded-[4px] bg-[#485744] text-white text-[14px] font-normal disabled:opacity-50 hover:bg-[#485744]/90 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ── Owner login modal ─────────────────────────────────────────────────────────

function OwnerLoginModal({ onLogin, onClose }: {
  onLogin: (token: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError("Enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? "Invalid credentials."); return; }
      const ownerError = await onLogin(json.data.accessToken);
      if (ownerError) setError(ownerError);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl font-normal text-foreground">Owner Sign In</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground">Sign in as the card owner to enable contribution management.</p>
        <form onSubmit={handleLogin} className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 text-sm" autoFocus />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 text-sm" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Password gate ─────────────────────────────────────────────────────────────

function PasswordGate({ token, onUnlocked }: { token: string; onUnlocked: (vt: string, card: PublicCard) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/cards/share/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? "Incorrect password. Please try again."); return; }
      const { viewerToken, card } = json.data;
      sessionStorage.setItem(SESSION_KEY(token), viewerToken);
      onUnlocked(viewerToken, card);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[400px] bg-white border border-border rounded-xl p-8 space-y-5 shadow-sm">
      <div className="space-y-2">
        <h2 className="font-serif text-[26px] font-normal text-foreground leading-tight">Access with a Password</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This card is password-protected. Please enter the password provided by the card owner to access the message page.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 text-sm" autoFocus />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={loading}>
          {loading ? "Checking…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}

// ── Capture modal ─────────────────────────────────────────────────────────────

function CaptureModal({ kind, onCapture, onClose }: {
  kind: MediaKind;
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [phase, setPhase] = useState<"starting" | "ready" | "recording" | "error">("starting");
  const [elapsed, setElapsed] = useState(0);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const constraints: MediaStreamConstraints =
          kind === "photo"  ? { video: { facingMode: "environment" } } :
          kind === "audio"  ? { audio: true } :
                              { video: { facingMode: "environment" }, audio: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current && kind !== "audio") {
          videoRef.current.srcObject = stream;
        }
        setPhase("ready");
      } catch (e: unknown) {
        if (!cancelled) {
          setErrMsg(
            e instanceof Error && e.name === "NotAllowedError"
              ? "Permission denied. Please allow camera/microphone access and try again."
              : "Could not access camera or microphone."
          );
          setPhase("error");
        }
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [kind]);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onCapture(new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }

  // Start waveform after phase="recording" render so canvasRef is mounted
  useEffect(() => {
    if (phase !== "recording" || kind !== "audio") return;
    if (!streamRef.current || !canvasRef.current) return;

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    audioCtx.createMediaStreamSource(streamRef.current).connect(analyser);
    audioCtxRef.current = audioCtx;

    const canvas = canvasRef.current;
    let animFrame: number;
    const draw = () => {
      animFrame = requestAnimationFrame(draw);
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(data);
      const w = canvas.width;
      const h = canvas.height;
      const c = canvas.getContext("2d")!;
      c.clearRect(0, 0, w, h);
      c.beginPath();
      c.strokeStyle = "#485744";
      c.lineWidth = 2.5;
      c.lineJoin = "round";
      c.lineCap = "round";
      const sliceW = w / data.length;
      let x = 0;
      data.forEach((v, i) => {
        const y = (v / 128.0) * (h / 2);
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        x += sliceW;
      });
      c.lineTo(w, h / 2);
      c.stroke();
    };
    draw();

    return () => {
      cancelAnimationFrame(animFrame);
      audioCtx.close();
      audioCtxRef.current = null;
    };
  }, [phase, kind]);

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = kind === "audio" ? "audio/webm" : "video/webm";
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : "",
    });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const type = kind === "audio" ? "audio/webm" : "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onCapture(new File([blob], `${kind}_${Date.now()}.webm`, { type }));
    };
    recorder.start(100);
    recorderRef.current = recorder;
    setElapsed(0);
    setPhase("recording");
    const maxSeconds = kind === "audio" ? 300 : 180;
    timerRef.current = setInterval(() => {
      setElapsed((s) => {
        if (s + 1 >= maxSeconds) {
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          recorderRef.current?.stop();
        }
        return s + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    recorderRef.current?.stop();
  }

  function fmt(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  const title = kind === "photo" ? "Take a Photo" : kind === "audio" ? "Record Audio" : "Record Video";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-serif text-xl font-normal text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {phase === "starting" && (
            <div className="flex items-center justify-center py-14">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {phase === "error" && (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm text-destructive">{errMsg}</p>
            </div>
          )}

          {/* Video viewfinder (photo + video) */}
          {kind !== "audio" && phase !== "error" && (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              {phase === "recording" && (
                <div className={`absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 ${elapsed >= 150 ? "bg-red-600/90" : "bg-black/60"}`}>
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-white text-xs font-mono">{fmt(elapsed)}</span>
                  {elapsed >= 150 && <span className="text-white text-xs">/ 3:00 max</span>}
                </div>
              )}
            </div>
          )}

          {/* Audio-only UI */}
          {kind === "audio" && phase !== "error" && phase !== "starting" && (
            <div className="flex flex-col items-center gap-3 py-6">
              {phase === "recording" ? (
                <>
                  <div className="w-full rounded-xl bg-[#F4F6F3] px-4 py-3" style={{ height: 80 }}>
                    <canvas ref={canvasRef} width={360} height={56} className="w-full h-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className={`text-sm font-mono ${elapsed >= 270 ? "text-red-500 font-semibold" : ""}`}>{fmt(elapsed)}</span>
                    {elapsed >= 270 && <span className="text-xs text-red-500">/ 5:00 max</span>}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <Mic className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Ready to record</p>
                </>
              )}
            </div>
          )}

          {/* Controls */}
          {phase !== "error" && phase !== "starting" && (
            kind === "photo" ? (
              <Button className="w-full h-11" onClick={capturePhoto}>
                <Camera className="w-4 h-4 mr-2" /> Capture Photo
              </Button>
            ) : (
              <button
                onClick={phase === "recording" ? stopRecording : startRecording}
                className={`w-full h-11 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  phase === "recording"
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                }`}
              >
                {phase === "recording" ? (
                  <><span className="w-3 h-3 bg-white rounded-sm shrink-0" /> Stop Recording</>
                ) : (
                  <><span className="w-3 h-3 rounded-full border-2 border-white shrink-0" /> Start Recording</>
                )}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── Contribution thumbnail ─────────────────────────────────────────────────────

function ContribThumb({ contrib, onClick, isOwner, onDelete }: { contrib: Contribution; onClick: () => void; isOwner?: boolean; onDelete?: () => void }) {
  const date = new Date(contrib.createdAt).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const deleteBtn = isOwner && onDelete ? (
    <button
      onClick={(e) => { e.stopPropagation(); onDelete(); }}
      className="absolute top-2 right-2 z-10 h-7 w-7 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
      title="Delete contribution"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  ) : null;

  if (contrib.mediaType === "audio") {
    return (
      <div className="relative">
        <button
          onClick={onClick}
          className="relative w-full bg-white rounded-2xl text-left flex flex-col p-3 hover:opacity-90 transition-opacity"
          style={{
            aspectRatio: "192 / 139",
            boxShadow: "0 2px 4px -2px rgba(16,24,40,0.06), 0 4px 8px -2px rgba(16,24,40,0.10)",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 44 44" fill="none" aria-hidden="true">
            <rect x="4"  y="18" width="4" height="8"  rx="2" fill="#1C1B1F" />
            <rect x="12" y="12" width="4" height="20" rx="2" fill="#1C1B1F" />
            <rect x="20" y="4"  width="4" height="36" rx="2" fill="#1C1B1F" />
            <rect x="28" y="12" width="4" height="20" rx="2" fill="#1C1B1F" />
            <rect x="36" y="18" width="4" height="8"  rx="2" fill="#1C1B1F" />
          </svg>
          <div className="mt-auto">
            <p className="font-semibold text-sm leading-snug truncate" style={{ color: "#003133" }}>
              {contrib.senderName}
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: "#457374" }}>{date}</p>
          </div>
        </button>
        {deleteBtn}
      </div>
    );
  }

  if (contrib.mediaType === "video") {
    return (
      <div className="relative row-span-2 h-full">
        <button
          onClick={onClick}
          className="relative overflow-hidden rounded-2xl w-full h-full block hover:opacity-90 transition-opacity"
        >
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={contrib.mediaKey}
            className="absolute inset-0 w-full h-full object-cover"
            preload="metadata"
            muted
            playsInline
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-md"
              style={{ background: "rgba(255,255,255,0.82)" }}
            >
              <Play className="w-5 h-5 ml-0.5" fill="#003133" style={{ color: "#003133" }} />
            </div>
          </div>
        </button>
        {deleteBtn}
      </div>
    );
  }

  // Photo
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="relative overflow-hidden rounded-2xl aspect-square w-full hover:opacity-90 transition-opacity"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={contrib.mediaKey} alt={contrib.senderName} className="w-full h-full object-cover" />
      </button>
      {deleteBtn}
    </div>
  );
}

// ── Fullscreen viewer (carousel) ──────────────────────────────────────────────

function FullscreenViewer({ contributions, index, onNavigate, onClose }: {
  contributions: Contribution[];
  index: number;
  onNavigate: (newIndex: number) => void;
  onClose: () => void;
}) {
  const contrib = contributions[index];
  const hasPrev = index > 0;
  const hasNext = index < contributions.length - 1;
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" && hasNext) onNavigate(index + 1);
      else if (e.key === "ArrowLeft" && hasPrev) onNavigate(index - 1);
      else if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, hasPrev, hasNext, onNavigate, onClose]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (delta > 50 && hasNext) onNavigate(index + 1);
    else if (delta < -50 && hasPrev) onNavigate(index - 1);
    touchStartX.current = null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close */}
      <button className="absolute top-4 right-4 text-white hover:text-white/70 transition-colors z-10" onClick={onClose}>
        <X className="w-6 h-6" />
      </button>

      {/* Prev arrow */}
      {hasPrev && (
        <button
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
          aria-label="Previous"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next arrow */}
      {hasNext && (
        <button
          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
          aria-label="Next"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Content */}
      <div className="max-w-2xl w-full px-14 sm:px-16" onClick={(e) => e.stopPropagation()}>
        {contrib.mediaType === "photo" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={contrib.mediaKey} alt={contrib.senderName} className="w-full rounded-lg" />
        ) : contrib.mediaType === "video" ? (
          <video key={contrib.id} src={contrib.mediaKey} controls autoPlay className="w-full rounded-lg" />
        ) : (
          <div className="bg-white rounded-lg p-6 space-y-3">
            <Music className="w-10 h-10 text-muted-foreground mx-auto" />
            <audio key={contrib.id} src={contrib.mediaKey} controls autoPlay className="w-full" />
          </div>
        )}
        <div className="mt-4 text-white space-y-1">
          <p className="font-semibold">{contrib.senderName}</p>
          {contrib.senderMessage && <p className="text-sm text-white/70">{contrib.senderMessage}</p>}
        </div>
        {/* Dot indicator */}
        {contributions.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {contributions.map((_, i) => (
              <button
                key={i}
                onClick={() => onNavigate(i)}
                className={`rounded-full transition-all ${i === index ? "bg-white w-4 h-1.5" : "bg-white/40 w-1.5 h-1.5"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Content modal ─────────────────────────────────────────────────────────

function AddContentModal({ token, onDone, onClose, initialKind = "photo", initialName = "", initialFile }: { token: string; onDone: (c: Contribution) => void; onClose: () => void; initialKind?: MediaKind; initialName?: string; initialFile?: File }) {
  const kind = initialKind;
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [preview, setPreview] = useState<string>(() => initialFile ? URL.createObjectURL(initialFile) : "");
  // Show preview+Use/Delete step when media comes from a recording
  const [previewStep, setPreviewStep] = useState<boolean>(() => !!initialFile && (initialKind === "audio" || initialKind === "video"));
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const ACCEPT: Record<MediaKind, string> = {
    photo: "image/jpeg,image/png,image/heic",
    video: "video/mp4,video/quicktime,video/webm",
    audio: "audio/mpeg,audio/mp4,audio/wav,audio/m4a,audio/webm",
  };

  const MAX_DURATION_S: Record<MediaKind, number> = { photo: Infinity, video: 3 * 60, audio: 5 * 60 };
  const MAX_BYTES: Record<MediaKind, number> = {
    photo: 15 * 1024 * 1024,
    video: 200 * 1024 * 1024,
    audio: 50 * 1024 * 1024,
  };
  const DURATION_LABEL: Record<MediaKind, string> = { photo: "", video: "3 minutes", audio: "5 minutes" };

  function checkMediaDuration(f: File, mediaKind: MediaKind): Promise<number> {
    return new Promise((resolve) => {
      const el = document.createElement(mediaKind === "audio" ? "audio" : "video");
      el.preload = "metadata";
      const url = URL.createObjectURL(f);
      el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(el.duration); };
      el.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
      el.src = url;
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));

    if (kind === "video" || kind === "audio") {
      checkMediaDuration(f, kind).then((duration) => {
        // Infinity/NaN = MediaRecorder blob with no duration header; timer already enforced the limit
        if (isFinite(duration) && duration > MAX_DURATION_S[kind]) {
          setError(`${kind === "video" ? "Video" : "Audio"} must be ${DURATION_LABEL[kind]} or less.`);
          setFile(null);
          setPreview("");
        }
      });
    }
  }

  async function handleSave() {
    if (!file || !name.trim()) { setError("Please select a file and enter your name."); return; }
    if (file.size > MAX_BYTES[kind]) {
      const limitMb = MAX_BYTES[kind] / (1024 * 1024);
      setError(`File is too large. Maximum size for ${kind} is ${limitMb} MB.`);
      return;
    }
    if (kind === "video" || kind === "audio") {
      const duration = await checkMediaDuration(file, kind);
      if (isFinite(duration) && duration > MAX_DURATION_S[kind]) {
        setError(`${kind === "video" ? "Video" : "Audio"} must be ${DURATION_LABEL[kind]} or less.`);
        return;
      }
    }
    setUploading(true); setError("");
    try {
      const form = new FormData();
      form.append("media", file);
      form.append("senderName", name.trim());
      if (message.trim()) form.append("senderMessage", message.trim());
      const res = await fetch(`${API}/cards/public/${token}/contributions`, { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? "Upload failed."); return; }
      onDone(json.data);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-serif text-xl font-normal text-foreground capitalize">Add {kind}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* ── Preview step (recorded audio/video) ── */}
          {previewStep && file && preview ? (
            <>
              <div className="rounded-lg overflow-hidden bg-muted">
                {kind === "video" && (
                  <video src={preview} controls className="w-full max-h-56" />
                )}
                {kind === "audio" && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Music className="w-6 h-6 shrink-0 text-muted-foreground" />
                      <p className="text-sm text-foreground truncate">{file.name}</p>
                    </div>
                    <audio src={preview} controls className="w-full" />
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                  onClick={onClose}
                >
                  Delete
                </Button>
                <Button className="flex-1" onClick={() => setPreviewStep(false)}>
                  Use
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* File area */}
              {!file ? (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-36 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-sm">Click to select {kind}</span>
                </button>
              ) : (
                <div className="relative rounded-lg overflow-hidden bg-muted">
                  {kind === "photo" && preview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="preview" className="w-full max-h-48 object-cover" />
                  )}
                  {kind === "video" && preview && (
                    <video src={preview} className="w-full max-h-48" controls />
                  )}
                  {kind === "audio" && (
                    <div className="p-4 space-y-2">
                      <Music className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-foreground truncate">{file.name}</p>
                      <audio src={preview} controls className="w-full" />
                    </div>
                  )}
                  <button
                    onClick={() => { setFile(null); setPreview(""); if (fileRef.current) fileRef.current.value = ""; }}
                    className="absolute top-2 right-2 bg-black/50 rounded-full p-1 text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <input ref={fileRef} type="file" accept={ACCEPT[kind]} className="hidden" onChange={handleFileChange} />

              {/* Sender details */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Your Name <span className="text-destructive">*</span></p>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-9 text-sm" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Your Message <span className="text-muted-foreground/60">(optional, {280 - message.length} chars left)</span></p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 280))}
                    placeholder="Write something nice…"
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button className="w-full h-10" onClick={handleSave} disabled={uploading}>
                {uploading ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MessagePage({ params }: { params: { shareToken: string } }) {
  const { shareToken: token } = params;

  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<PublicCard | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showAddContent, setShowAddContent] = useState(false);
  const [addContentKind, setAddContentKind] = useState<MediaKind>("photo");
  const [addContentFile, setAddContentFile] = useState<File | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [captureKind, setCaptureKind] = useState<MediaKind>("photo");
  const [isOwner, setIsOwner] = useState(false);
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [showOwnerLogin, setShowOwnerLogin] = useState(false);

  async function loadPublicCard(viewerToken?: string) {
    try {
      const headers: Record<string, string> = {};
      if (viewerToken) headers["Authorization"] = `Bearer ${viewerToken}`;
      const res = await fetch(`${API}/cards/public/${token}`, { headers });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (res.status === 401) { setNeedsPassword(true); return; }
        setFetchError(json.error?.message ?? "Card not found.");
        return;
      }
      const json = await res.json();
      setCard(json.data.card);
      setContributions(json.data.contributions ?? []);
    } catch {
      setFetchError("Failed to load card.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`${API}/cards/share/${token}`);
        if (!res.ok) { setFetchError("Card not found."); setLoading(false); return; }
        const json = await res.json();
        if (json.data.passwordProtected) {
          const cached = sessionStorage.getItem(SESSION_KEY(token));
          if (cached) {
            await loadPublicCard(cached);
          } else {
            setNeedsPassword(true);
            setLoading(false);
          }
        } else {
          await loadPublicCard();
        }
      } catch {
        setFetchError("Failed to load card.");
        setLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleUnlocked(viewerToken: string, unlockedCard: PublicCard) {
    setCard(unlockedCard);
    setNeedsPassword(false);
    loadPublicCard(viewerToken);
  }

  function handleContribAdded(c: Contribution) {
    setContributions((prev) => [c, ...prev]);
    setShowAddContent(false);
  }

  function openUpload(kind: MediaKind, file: File) {
    setAddContentKind(kind);
    setAddContentFile(file);
    setShowAddContent(true);
  }

  function handleCapture(kind: MediaKind) {
    setCaptureKind(kind);
    setShowCapture(true);
  }

  function handleCaptured(file: File) {
    setShowCapture(false);
    openUpload(captureKind, file);
  }

  async function handleOwnerLogin(accessToken: string): Promise<string | null> {
    if (!card) return "Card not loaded.";
    try {
      const res = await fetch(`${API}/cards/${card.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setIsOwner(true);
        setOwnerToken(accessToken);
        setShowOwnerLogin(false);
        return null;
      }
      return "You are not the owner of this card.";
    } catch {
      return "Verification failed. Please try again.";
    }
  }

  async function handleDeleteContribution(contribId: string) {
    if (!card || !ownerToken) return;
    try {
      const res = await fetch(`${API}/cards/${card.id}/contributions/${contribId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      if (res.ok || res.status === 204) {
        setContributions((prev) => prev.filter((c) => c.id !== contribId));
      }
    } catch {
      // silently ignore — contribution stays in list
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <ShareHeader
        onPickKind={card?.settings.allowContributions ? openUpload : undefined}
        onCapture={card?.settings.allowContributions ? handleCapture : undefined}
        isOwner={isOwner}
        onOwnerLogin={() => setShowOwnerLogin(true)}
      />

      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-8 sm:py-10">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border-2 border-muted border-t-foreground animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">{fetchError}</p>
          </div>
        ) : needsPassword ? (
          <div className="flex-1 flex items-center justify-center">
            <PasswordGate token={token} onUnlocked={handleUnlocked} />
          </div>
        ) : card ? (
          <div className="w-full flex flex-col items-center gap-8"
            style={{ maxWidth: card.orientation === "portrait" ? 480 : 680 }}
          >
            {/* Cover photo */}
            {(card.coverImage?.original ?? card.coverImage?.web) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.coverImage.original ?? card.coverImage.web ?? ""}
                alt={card.title ?? "Card"}
                className="w-full object-cover shadow-sm rounded-sm"
                style={{ aspectRatio: card.orientation === "portrait" ? "3/4" : "4/3" }}
              />
            )}

            {/* Title + message */}
            {(card.title || card.message) && (
              <div className="text-center space-y-2 w-full">
                {card.title && <h1 className="font-serif text-3xl font-bold text-foreground">{card.title}</h1>}
                {card.message && <p className="text-base text-muted-foreground">{card.message}</p>}
              </div>
            )}

            {/* Contributions grid */}
            {contributions.length > 0 && (
              <div className="w-full">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" style={{ gridAutoFlow: "row dense" }}>
                  {contributions.map((c, idx) => (
                    <ContribThumb
                      key={c.id}
                      contrib={c}
                      onClick={() => setActiveIndex(idx)}
                      isOwner={isOwner}
                      onDelete={() => handleDeleteContribution(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>

      <footer className="py-6 text-center">
        <p className="text-sm text-muted-foreground">Create your special moments at timewell.co</p>
      </footer>

      {showOwnerLogin && (
        <OwnerLoginModal
          onLogin={handleOwnerLogin}
          onClose={() => setShowOwnerLogin(false)}
        />
      )}
      {showCapture && (
        <CaptureModal
          kind={captureKind}
          onCapture={handleCaptured}
          onClose={() => setShowCapture(false)}
        />
      )}
      {activeIndex !== null && (
        <FullscreenViewer
          contributions={contributions}
          index={activeIndex}
          onNavigate={setActiveIndex}
          onClose={() => setActiveIndex(null)}
        />
      )}
      {showAddContent && addContentFile && (
        <AddContentModal
          token={token}
          initialKind={addContentKind}
          initialFile={addContentFile}
          initialName={typeof window !== "undefined" ? (localStorage.getItem(SENDER_NAME_KEY) ?? "") : ""}
          onDone={handleContribAdded}
          onClose={() => { setShowAddContent(false); setAddContentFile(null); }}
        />
      )}
    </div>
  );
}
