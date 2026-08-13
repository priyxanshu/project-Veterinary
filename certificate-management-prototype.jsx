import { useState } from "react";
import {
  ShieldCheck, Award, FileText, Download, Printer, QrCode, Clock, CheckCircle2, XCircle,
  AlertTriangle, ChevronRight, ChevronLeft, ArrowLeft, Hash, User, Calendar, RefreshCw,
  Copy, Send, LogOut, X, Check, MapPin, Building2, Info, ChevronDown, Landmark, Truck,
  Globe, Files, History, Eye, ArrowRightLeft, ShieldAlert, GraduationCap, Upload,
  Loader2, ExternalLink, Sparkles as SparklesIcon,
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* Mock data                                                               */
/* ---------------------------------------------------------------------- */

const HOLDER = {
  regNo: "MPSVC/REG/2016/000745",
  fullName: "Dr. Ankit Sharma",
  mobile: "9876543210",
  email: "ankit.sharma@example.com",
};

// Base certificate history: Main → Renewal #1 → Renewal #2 (current). The last entry
// in the array is always treated as "current" — its status (Active / Expiring Soon /
// Expired) is computed live against the demo scenario date; every earlier entry is
// always "Superseded".
const BASE_CERTIFICATES = [
  {
    id: "main",
    kind: "Main Certificate",
    certNo: "MP-CERT-2016-000745",
    issueDate: "2016-08-05",
    validFrom: "2016-08-10",
    validUntil: "2021-08-09",
  },
  {
    id: "renewal-1",
    kind: "Renewal Certificate #1",
    certNo: "MP-CERT-2021-000998",
    issueDate: "2021-08-04",
    validFrom: "2021-08-10",
    validUntil: "2026-08-09",
  },
  {
    id: "renewal-2",
    kind: "Renewal Certificate #2",
    certNo: "MP-CERT-2026-001245",
    issueDate: "2026-08-04",
    validFrom: "2026-08-10",
    validUntil: "2031-08-09",
  },
];

// Pre-seeded applications so Application History shows realistic variety immediately —
// the reviewer can also submit fresh ones through the Renewal / Duplicate / Transfer flows.
const INITIAL_APPLICATIONS = [
  {
    id: "app-dup-seed",
    kind: "duplicate",
    appNo: "DUP-2026-000321",
    status: "approved",
    submittedOn: "02 Jun 2026",
    relatedCertId: "renewal-1",
    reason: "Certificate Lost",
    details: "Original copy misplaced during office relocation.",
    timeline: [
      { status: "submitted", time: "02 Jun 2026, 10:12 am" },
      { status: "under_review", time: "02 Jun 2026, 10:12 am" },
      { status: "approved", time: "06 Jun 2026, 04:30 pm" },
    ],
  },
  {
    id: "app-trf-seed",
    kind: "transfer",
    appNo: "TRF-2026-000145",
    status: "under_review",
    submittedOn: "28 Jul 2026",
    reason: "Relocating for employment",
    destinationState: "Rajasthan",
    details: "Joining Rajasthan Veterinary Council on transfer of service.",
    timeline: [
      { status: "submitted", time: "28 Jul 2026, 02:45 pm" },
      { status: "under_review", time: "28 Jul 2026, 02:45 pm" },
    ],
  },
];

const CERT_STATUS_META = {
  active:     { label: "Active",         tone: "active" },
  expiring:   { label: "Expiring Soon",  tone: "expiring" },
  expired:    { label: "Expired",        tone: "expired" },
  superseded: { label: "Superseded",     tone: "superseded" },
};

const APP_STATUS_META = {
  submitted:    { label: "Submitted",     tone: "pending" },
  under_review: { label: "Under Review",  tone: "review" },
  approved:     { label: "Approved",      tone: "approved" },
  rejected:     { label: "Rejected",      tone: "rejected" },
  renewed:      { label: "Renewed",       tone: "approved" },
};

const APP_KIND_META = {
  renewal:   { label: "Renewal Application",             icon: RefreshCw },
  duplicate: { label: "Duplicate Certificate Application", icon: Copy },
  transfer:  { label: "Transfer Application",             icon: ArrowRightLeft },
};

// The "as of" date each demo scenario simulates, evaluated only against the current
// (last) certificate — this is what drives Active / Expiring Soon / Expired.
const SCENARIO_ASOF = {
  active: "2026-08-10",
  expiring: "2031-04-12",
  expired: "2031-09-20",
};

const DESTINATION_STATES = [
  "Rajasthan", "Uttar Pradesh", "Maharashtra", "Gujarat", "Chhattisgarh",
  "Delhi", "Punjab", "Haryana", "Karnataka", "Other",
];

const DUPLICATE_REASONS = ["Certificate Lost", "Certificate Damaged", "Name Change", "Other"];

/* ---------------------------------------------------------------------- */
/* Date helpers                                                            */
/* ---------------------------------------------------------------------- */

function toIsoDate(d) { return d.toISOString().slice(0, 10); }
function addDaysIso(iso, days) { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + days); return toIsoDate(d); }
function addYearsIso(iso, years) { const d = new Date(iso + "T00:00:00"); d.setFullYear(d.getFullYear() + years); return toIsoDate(d); }
function diffInDays(fromIso, toIso) {
  const from = new Date(fromIso + "T00:00:00");
  const to = new Date(toIso + "T00:00:00");
  return Math.round((to - from) / 86400000);
}
function formatLongDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}
function genAppNo(prefix) {
  const rand = Math.floor(100000 + Math.random() * 899999);
  return `${prefix}-2026-${rand}`;
}
function genCertNo(iso) {
  const year = iso.slice(0, 4);
  const rand = Math.floor(100000 + Math.random() * 899999);
  return `MP-CERT-${year}-${rand}`;
}
function nowStamp() {
  return new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
// Masks a mobile number down to just the last 4 digits — the registration-number
// login flow looks the mobile number up from records rather than the citizen typing
// it in themselves, so it must be masked when shown back to them.
function maskMobile(mobile) {
  const digits = mobile.replace(/\D/g, "");
  return "XXXXXX" + digits.slice(-4);
}

/* ---------------------------------------------------------------------- */
/* Small shared components                                                 */
/* ---------------------------------------------------------------------- */

function CertBadge({ status }) {
  const meta = CERT_STATUS_META[status];
  if (!meta) return null;
  const Icon = status === "active" ? CheckCircle2 : status === "expiring" ? AlertTriangle : status === "expired" ? XCircle : History;
  return (
    <span className={`badge badge-${meta.tone}`}>
      <Icon size={13} /> {meta.label}
    </span>
  );
}

function AppBadge({ status }) {
  const meta = APP_STATUS_META[status];
  if (!meta) return null;
  return <span className={`badge badge-${meta.tone}`}>{meta.label}</span>;
}

function SectionHeading({ eyebrow, title, action }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="section-eyebrow">{eyebrow}</div>}
        <h2 className="section-title">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="empty-state">
      <Icon size={28} />
      <div className="empty-state-title">{title}</div>
      {body && <p className="empty-state-body">{body}</p>}
    </div>
  );
}

function ProgressStepper({ steps, currentIndex, rejected }) {
  return (
    <div className="app-stepper">
      {steps.map((s, i) => {
        const done = i < currentIndex || (i === currentIndex && !rejected);
        const isLast = i === steps.length - 1;
        const failed = rejected && i === currentIndex;
        return (
          <div className="app-step" key={s}>
            <div className="app-step-marker">
              <div className={`app-step-dot ${failed ? "app-step-dot-rejected" : done ? "app-step-dot-done" : ""}`}>
                {failed ? <X size={12} /> : done ? <Check size={12} /> : <span>{i + 1}</span>}
              </div>
              {!isLast && <div className={`app-step-line ${i < currentIndex ? "app-step-line-done" : ""}`} />}
            </div>
            <div className={`app-step-label ${done || failed ? "" : "app-step-label-muted"}`}>{s}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Main application                                                        */
/* ---------------------------------------------------------------------- */

export default function CertificateManagementPrototype() {
  const [screen, setScreen] = useState("login");
  const [loggedIn, setLoggedIn] = useState(false);
  const [regNoInput, setRegNoInput] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [certificates, setCertificates] = useState(BASE_CERTIFICATES);
  const [applications, setApplications] = useState(INITIAL_APPLICATIONS);
  const [demoScenario, setDemoScenario] = useState("active");
  const [showDemoPanel, setShowDemoPanel] = useState(true);

  const [viewerCertId, setViewerCertId] = useState(null);
  const [duplicateCertId, setDuplicateCertId] = useState(null);
  const [duplicateReason, setDuplicateReason] = useState(DUPLICATE_REASONS[0]);
  const [duplicateDetails, setDuplicateDetails] = useState("");

  const [renewalStep, setRenewalStep] = useState(1);
  const [renewalForm, setRenewalForm] = useState({ address: HOLDER.regNo ? "12, Napier Town, Jabalpur, Madhya Pradesh - 482001" : "", contactConfirmed: false });
  const [renewalDocs, setRenewalDocs] = useState({});
  const [lastRenewalAppId, setLastRenewalAppId] = useState(null);

  const [transferStep, setTransferStep] = useState(1);
  const [transferForm, setTransferForm] = useState({ reason: "", destinationState: DESTINATION_STATES[0], details: "" });
  const [lastTransferAppId, setLastTransferAppId] = useState(null);

  const [selectedAppId, setSelectedAppId] = useState(null);
  const [toast, setToast] = useState(null);

  function pushToast(message, type = "success") {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(t => (t && t.id === toast?.id ? null : t)), 3200);
  }

  const asOfIso = SCENARIO_ASOF[demoScenario];
  const currentCert = certificates[certificates.length - 1];
  const decoratedCertificates = certificates.map((c, i) => {
    const isCurrent = i === certificates.length - 1;
    const days = diffInDays(asOfIso, c.validUntil);
    const status = !isCurrent ? "superseded" : days < 0 ? "expired" : days <= 120 ? "expiring" : "active";
    return { ...c, isCurrent, status, remainingDays: days };
  });
  const currentCertDecorated = decoratedCertificates[decoratedCertificates.length - 1];

  const transferApp = applications.find(a => a.kind === "transfer");
  const transferApproved = transferApp?.status === "approved";
  const transferPending = transferApp && !["approved", "rejected"].includes(transferApp.status);

  function findCert(id) { return decoratedCertificates.find(c => c.id === id); }
  function findApp(id) { return applications.find(a => a.id === id); }

  function goDashboard() { setScreen("dashboard"); }

  function handleLogin() {
    setLoggingIn(true);
    setTimeout(() => {
      setLoggingIn(false);
      setOtp(""); setOtpError("");
      setScreen("otp");
    }, 900);
  }

  function handleVerifyOtp() {
    if (otp.trim().length !== 6) {
      setOtpError("Enter the 6-digit OTP sent to your registered mobile number.");
      return;
    }
    setOtpError("");
    setVerifyingOtp(true);
    setTimeout(() => {
      setVerifyingOtp(false);
      setLoggedIn(true);
      setScreen("dashboard");
    }, 700);
  }

  function handleLogout() {
    setScreen("login"); setLoggedIn(false); setRegNoInput("");
    setOtp(""); setOtpError(""); setVerifyingOtp(false);
    setCertificates(BASE_CERTIFICATES); setApplications(INITIAL_APPLICATIONS);
    setDemoScenario("active"); setViewerCertId(null); setDuplicateCertId(null);
    setSelectedAppId(null); setRenewalStep(1); setTransferStep(1);
  }

  function openViewer(certId) { setViewerCertId(certId); }
  function closeViewer() { setViewerCertId(null); }

  function openDuplicate(certId) {
    setDuplicateCertId(certId);
    setDuplicateReason(DUPLICATE_REASONS[0]);
    setDuplicateDetails("");
  }
  function closeDuplicate() { setDuplicateCertId(null); }

  function submitDuplicate() {
    const appNo = genAppNo("DUP");
    const app = {
      id: `app-${Date.now()}`,
      kind: "duplicate",
      appNo,
      status: "under_review",
      submittedOn: nowStamp(),
      relatedCertId: duplicateCertId,
      reason: duplicateReason,
      details: duplicateDetails,
      timeline: [
        { status: "submitted", time: nowStamp() },
        { status: "under_review", time: nowStamp() },
      ],
    };
    setApplications(prev => [app, ...prev]);
    closeDuplicate();
    pushToast(`Duplicate certificate application ${appNo} submitted.`);
    setSelectedAppId(app.id);
    setScreen("application-detail");
  }

  function startRenewal() {
    setRenewalStep(1);
    setRenewalDocs({});
    setScreen("renewal-flow");
  }

  function submitRenewal() {
    const appNo = genAppNo("REN");
    const app = {
      id: `app-${Date.now()}`,
      kind: "renewal",
      appNo,
      status: "under_review",
      submittedOn: nowStamp(),
      relatedCertId: currentCert.id,
      timeline: [
        { status: "submitted", time: nowStamp() },
        { status: "under_review", time: nowStamp() },
      ],
    };
    setApplications(prev => [app, ...prev]);
    setLastRenewalAppId(app.id);
    setScreen("renewal-confirmation");
  }

  function startTransfer() {
    setTransferStep(1);
    setTransferForm({ reason: "", destinationState: DESTINATION_STATES[0], details: "" });
    setScreen("transfer-flow");
  }

  function submitTransfer() {
    const appNo = genAppNo("TRF");
    const app = {
      id: `app-${Date.now()}`,
      kind: "transfer",
      appNo,
      status: "under_review",
      submittedOn: nowStamp(),
      reason: transferForm.reason || "Relocating out of Madhya Pradesh",
      destinationState: transferForm.destinationState,
      details: transferForm.details,
      timeline: [
        { status: "submitted", time: nowStamp() },
        { status: "under_review", time: nowStamp() },
      ],
    };
    setApplications(prev => [app, ...prev]);
    setLastTransferAppId(app.id);
    setScreen("transfer-confirmation");
  }

  function advanceApplication(appId, newStatus) {
    setApplications(prev => prev.map(a => a.id === appId
      ? { ...a, status: newStatus, timeline: [...a.timeline, { status: newStatus, time: nowStamp() }] }
      : a));
    const meta = APP_STATUS_META[newStatus];
    pushToast(`Application moved to "${meta.label}".`);
  }

  function issueRenewedCertificate(appId) {
    const validFrom = addDaysIso(currentCert.validUntil, 1);
    const validUntil = addDaysIso(addYearsIso(validFrom, 5), -1);
    const newCert = {
      id: `renewal-${certificates.length}`,
      kind: `Renewal Certificate #${certificates.length - 1}`,
      certNo: genCertNo(validFrom),
      issueDate: asOfIso,
      validFrom, validUntil,
    };
    setCertificates(prev => [...prev, newCert]);
    setApplications(prev => prev.map(a => a.id === appId
      ? { ...a, status: "renewed", timeline: [...a.timeline, { status: "renewed", time: nowStamp() }] }
      : a));
    setDemoScenario("active");
    pushToast(`New certificate ${newCert.certNo} issued — valid until ${formatLongDate(newCert.validUntil)}.`);
    setScreen("dashboard");
  }

  /* ---------------------------- Screens ---------------------------- */

  function ScreenLogin() {
    return (
      <div className="page-narrow">
        <div className="login-hero">
          <div className="login-hero-emblem"><ShieldCheck size={26} /></div>
          <h1>Veterinary Login</h1>
          <p>Madhya Pradesh State Veterinary Council — view, renew, and manage your registration certificate online.</p>
        </div>
        <div className="card login-card">
          <div className="card-header">Registration Number Login</div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">MPSVC Registration Number<span className="required-star">*</span></label>
              <input
                className="form-input"
                placeholder="MPSVC/REG/2016/000745"
                value={regNoInput}
                onChange={e => setRegNoInput(e.target.value)}
              />
              <div className="form-hint">Demo: any value logs you in as {HOLDER.fullName} ({HOLDER.regNo}).</div>
            </div>
            <button className="btn btn-primary btn-block" disabled={loggingIn} onClick={handleLogin}>
              {loggingIn ? (<><Loader2 size={16} className="spin" /> Verifying…</>) : (<>Login</>)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function ScreenOtp() {
    return (
      <div className="page-narrow">
        <BackLink onClick={() => { setOtp(""); setOtpError(""); setScreen("login"); }} />
        <div className="card login-card">
          <div className="card-header">Verify OTP</div>
          <div className="card-body">
            <p className="muted-text" style={{ marginBottom: 18 }}>
              An OTP has been sent to your registered mobile number <strong>+91 {maskMobile(HOLDER.mobile)}</strong>.
              (Demo — any 6-digit code will be accepted)
            </p>
            <div className="form-group">
              <label className="form-label">Enter OTP<span className="required-star">*</span></label>
              <input
                className="form-input"
                maxLength={6}
                placeholder="6-digit OTP"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            {otpError && <div className="form-error">{otpError}</div>}
            <button className="btn btn-primary btn-block" disabled={verifyingOtp} onClick={handleVerifyOtp}>
              {verifyingOtp ? (<><Loader2 size={16} className="spin" /> Verifying…</>) : (<>Verify &amp; Continue</>)}
            </button>
            <button className="btn btn-link" style={{ marginTop: 4 }} onClick={() => setOtpError("")}>Resend OTP</button>
          </div>
        </div>
      </div>
    );
  }

  function ScreenDashboard() {
    return (
      <div className="page-wide">
        <div className="dash-top">
          <div>
            <h1 className="dash-title">Welcome back, {HOLDER.fullName}</h1>
            <p className="muted-text">Registration No: <strong>{HOLDER.regNo}</strong></p>
          </div>
        </div>

        {showDemoPanel && (
          <div className="demo-panel">
            <div className="demo-panel-head">
              <span><SparklesIcon size={14} /> Prototype Controls — simulate certificate state</span>
              <button className="icon-btn" onClick={() => setShowDemoPanel(false)}><X size={15} /></button>
            </div>
            <div className="demo-panel-body">
              {["active", "expiring", "expired"].map(s => (
                <button key={s} className={`chip-btn ${demoScenario === s ? "chip-btn-active" : ""}`} onClick={() => setDemoScenario(s)}>
                  {s === "active" ? "Active" : s === "expiring" ? "Expiring Soon" : "Expired"}
                </button>
              ))}
              <span className="demo-panel-note">Affects the current certificate's countdown below.</span>
            </div>
          </div>
        )}

        {/* Current Certificate */}
        <SectionHeading eyebrow="Current Certificate" title={currentCertDecorated.kind} />
        <div className="card current-cert-card">
          <div className="current-cert-main">
            <div className="current-cert-info">
              <div className="current-cert-row"><Hash size={15} /><span>Certificate No.</span><strong>{currentCertDecorated.certNo}</strong></div>
              <div className="current-cert-row"><User size={15} /><span>Registration No.</span><strong>{HOLDER.regNo}</strong></div>
              <div className="current-cert-row"><Award size={15} /><span>Certificate Type</span><strong>{currentCertDecorated.kind}</strong></div>
              <div className="current-cert-row"><Calendar size={15} /><span>Issue Date</span><strong>{formatLongDate(currentCertDecorated.issueDate)}</strong></div>
              <div className="current-cert-row"><Clock size={15} /><span>Valid Until</span><strong>{formatLongDate(currentCertDecorated.validUntil)}</strong></div>
              <div className="current-cert-row"><CertBadge status={currentCertDecorated.status} /></div>
            </div>
            <CountdownPanel cert={currentCertDecorated} />
          </div>
          <div className="current-cert-actions">
            <button className="btn btn-outline" onClick={() => openViewer(currentCertDecorated.id)}><Eye size={15} /> View Certificate</button>
            <button className="btn btn-outline" onClick={() => { pushToast("Certificate downloaded (simulated)."); }}><Download size={15} /> Download</button>
            <button className="btn btn-outline" onClick={() => openDuplicate(currentCertDecorated.id)}><Copy size={15} /> Apply for Duplicate</button>
            {transferApproved ? (
              <div className="notice notice-inline"><ShieldAlert size={15} /> Renewal through Madhya Pradesh is no longer available — registration transferred out.</div>
            ) : (
              <button className="btn btn-primary" onClick={startRenewal}><RefreshCw size={15} /> Apply for Renewal</button>
            )}
            <button
              className="btn btn-outline-danger"
              disabled={transferApproved}
              title={transferApproved ? "Already transferred out." : ""}
              onClick={startTransfer}
            >
              <Globe size={15} /> Transfer Out of Madhya Pradesh
            </button>
          </div>
          {transferPending && !transferApproved && (
            <p className="small-muted" style={{ padding: "0 22px 18px" }}>
              Note: application {transferApp.appNo} is already under review — submitting another is allowed here for demo purposes.
            </p>
          )}
        </div>

        {/* Certificate Timeline */}
        <SectionHeading eyebrow="Certificate History" title="Main Certificate & Renewal Timeline" />
        <div className="card table-card">
          <div className="table-scroll">
            <table className="cert-table">
              <thead>
                <tr>
                  <th>Certificate</th>
                  <th>Certificate No.</th>
                  <th>Issue Date</th>
                  <th>Valid From</th>
                  <th>Valid Until</th>
                  <th>Status</th>
                  <th className="cert-table-actions-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {decoratedCertificates.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="cert-table-kind">{c.kind}</div>
                      <div className="cert-table-range">{c.validFrom.slice(0, 4)} → {c.validUntil.slice(0, 4)}</div>
                    </td>
                    <td className="cert-table-mono">{c.certNo}</td>
                    <td>{formatLongDate(c.issueDate)}</td>
                    <td>{formatLongDate(c.validFrom)}</td>
                    <td>{formatLongDate(c.validUntil)}</td>
                    <td><CertBadge status={c.status} /></td>
                    <td>
                      <div className="cert-table-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => openViewer(c.id)}><Eye size={13} /> View</button>
                        <button className="btn btn-outline btn-sm" onClick={() => pushToast("Certificate downloaded (simulated).")}><Download size={13} /> Download</button>
                        <button className="btn btn-outline btn-sm" onClick={() => openDuplicate(c.id)}><Copy size={13} /> Apply for Duplicate</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Application History */}
        <SectionHeading eyebrow="Applications" title="Application History" />
        {applications.length === 0 ? (
          <div className="card"><EmptyState icon={FileText} title="No applications yet" body="Renewal, duplicate, and transfer applications you submit will appear here." /></div>
        ) : (
          <div className="app-list">
            {applications.map(a => {
              const Icon = APP_KIND_META[a.kind].icon;
              return (
                <div className="card app-row" role="button" tabIndex={0} key={a.id} onClick={() => { setSelectedAppId(a.id); setScreen("application-detail"); }}>
                  <div className="app-row-icon"><Icon size={18} /></div>
                  <div className="app-row-body">
                    <div className="app-row-title">{APP_KIND_META[a.kind].label}</div>
                    <div className="app-row-sub">{a.appNo} · Submitted {a.submittedOn}</div>
                  </div>
                  <AppBadge status={a.status} />
                  <ChevronRight size={16} className="app-row-arrow" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function CountdownPanel({ cert }) {
    if (cert.status === "expired") {
      const overdue = Math.abs(cert.remainingDays).toLocaleString("en-IN");
      return (
        <div className="countdown-panel countdown-expired">
          <XCircle size={22} />
          <div className="countdown-title">Certificate Expired</div>
          <div className="countdown-sub">Your certificate expired on {formatLongDate(cert.validUntil)} ({overdue} days ago)</div>
          {!transferApproved && <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={startRenewal}>Apply for Renewal</button>}
        </div>
      );
    }
    if (cert.status === "expiring") {
      return (
        <div className="countdown-panel countdown-expiring">
          <AlertTriangle size={22} />
          <div className="countdown-title">Certificate Expiring Soon</div>
          <div className="countdown-value">{cert.remainingDays.toLocaleString("en-IN")}</div>
          <div className="countdown-sub">days remaining · expires {formatLongDate(cert.validUntil)}</div>
        </div>
      );
    }
    return (
      <div className="countdown-panel countdown-active">
        <CheckCircle2 size={22} />
        <div className="countdown-title">Certificate Active</div>
        <div className="countdown-value">{cert.remainingDays.toLocaleString("en-IN")}</div>
        <div className="countdown-sub">days remaining · expires {formatLongDate(cert.validUntil)}</div>
      </div>
    );
  }

  function ScreenRenewal() {
    const steps = ["Review Details", "Required Information", "Documents", "Review & Submit"];
    return (
      <div className="page-narrow">
        <BackLink onClick={goDashboard} label="Cancel Renewal" />
        <div className="card">
          <div className="card-header">Apply for Renewal — {currentCertDecorated.kind}</div>
          <div className="card-body">
            <ProgressStepper steps={steps} currentIndex={renewalStep - 1} />

            {renewalStep === 1 && (
              <>
                <div className="section-title">Review Your Current Certificate</div>
                <div className="confirm-grid">
                  <div><span>Certificate No.</span><strong>{currentCertDecorated.certNo}</strong></div>
                  <div><span>Registration No.</span><strong>{HOLDER.regNo}</strong></div>
                  <div><span>Holder Name</span><strong>{HOLDER.fullName}</strong></div>
                  <div><span>Valid Until</span><strong>{formatLongDate(currentCertDecorated.validUntil)}</strong></div>
                  <div><span>Status</span><CertBadge status={currentCertDecorated.status} /></div>
                </div>
                <NoteBanner>A renewed certificate is valid for 5 years from the date your current certificate expires.</NoteBanner>
              </>
            )}

            {renewalStep === 2 && (
              <>
                <div className="section-title">Required Information</div>
                <NoteBanner>
                  Application form fields shown here will be exactly as they appear on the official MPSVC.org portal — field names and sequence must not be altered.
                </NoteBanner>
                <div className="form-group">
                  <label className="form-label">Current Address</label>
                  <textarea className="form-input" rows={2} value={renewalForm.address} onChange={e => setRenewalForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <label className="checkbox-row">
                  <input type="checkbox" checked={renewalForm.contactConfirmed} onChange={e => setRenewalForm(f => ({ ...f, contactConfirmed: e.target.checked }))} />
                  <span>I confirm my mobile ({HOLDER.mobile}) and email ({HOLDER.email}) are up to date.</span>
                </label>
              </>
            )}

            {renewalStep === 3 && (
              <>
                <div className="section-title">Documents</div>
                {["Identity Proof", "Address Proof", "Recent Photograph"].map(label => (
                  <UploadRow key={label} label={label} fileName={renewalDocs[label]} onPick={f => setRenewalDocs(d => ({ ...d, [label]: f }))} />
                ))}
              </>
            )}

            {renewalStep === 4 && (
              <>
                <div className="section-title">Review &amp; Submit</div>
                <div className="confirm-grid">
                  <div><span>Certificate</span><strong>{currentCertDecorated.kind}</strong></div>
                  <div><span>Address</span><strong>{renewalForm.address || "—"}</strong></div>
                  <div><span>Contact Confirmed</span><strong>{renewalForm.contactConfirmed ? "Yes" : "No"}</strong></div>
                  {["Identity Proof", "Address Proof", "Recent Photograph"].map(label => (
                    <div key={label}><span>{label}</span><strong>{renewalDocs[label] || "—"}</strong></div>
                  ))}
                </div>
                <NoteBanner tone="blue">Submitting this application is simulated — no real data is sent anywhere.</NoteBanner>
              </>
            )}

            <div className="form-actions">
              <button className="btn btn-outline" disabled={renewalStep === 1} onClick={() => setRenewalStep(s => s - 1)}><ChevronLeft size={16} /> Back</button>
              {renewalStep < 4 ? (
                <button className="btn btn-primary" onClick={() => setRenewalStep(s => s + 1)}>Continue <ChevronRight size={16} /></button>
              ) : (
                <button className="btn btn-primary" onClick={submitRenewal}><Send size={15} /> Submit Application</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ScreenRenewalConfirmation() {
    const app = findApp(lastRenewalAppId);
    if (!app) return null;
    return (
      <div className="page-narrow">
        <div className="result-panel result-success">
          <CheckCircle2 size={44} />
          <h2>Renewal Application Submitted</h2>
          <div className="confirm-grid">
            <div><span>Application Number</span><strong>{app.appNo}</strong></div>
            <div><span>Status</span><AppBadge status={app.status} /></div>
          </div>
          <div className="demo-btn-row">
            <button className="btn btn-primary" onClick={() => { setSelectedAppId(app.id); setScreen("application-detail"); }}>View Application</button>
            <button className="btn btn-outline" onClick={goDashboard}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  function ScreenTransfer() {
    return (
      <div className="page-narrow">
        <BackLink onClick={transferStep === 1 ? goDashboard : () => setTransferStep(1)} label={transferStep === 1 ? "Cancel" : "Back"} />
        <div className="card">
          <div className="card-header">Transfer Out of Madhya Pradesh</div>
          <div className="card-body">
            <div className="section-title">Your Current Registration</div>
            <div className="confirm-grid" style={{ marginBottom: 20 }}>
              <div><span>Registration No.</span><strong>{HOLDER.regNo}</strong></div>
              <div><span>Holder Name</span><strong>{HOLDER.fullName}</strong></div>
              <div><span>Current Certificate</span><strong>{currentCertDecorated.certNo}</strong></div>
            </div>

            {transferStep === 1 && (
              <>
                <div className="section-title">Transfer Details</div>
                <NoteBanner>
                  Application form fields shown here will be exactly as they appear on the official MPSVC.org portal — field names and sequence must not be altered.
                </NoteBanner>
                <div className="form-group">
                  <label className="form-label">Reason for Transfer<span className="required-star">*</span></label>
                  <input className="form-input" placeholder="e.g. Relocating for employment" value={transferForm.reason} onChange={e => setTransferForm(f => ({ ...f, reason: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Destination State<span className="required-star">*</span></label>
                  <select className="form-input" value={transferForm.destinationState} onChange={e => setTransferForm(f => ({ ...f, destinationState: e.target.value }))}>
                    {DESTINATION_STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Additional Information</label>
                  <textarea className="form-input" rows={3} value={transferForm.details} onChange={e => setTransferForm(f => ({ ...f, details: e.target.value }))} />
                </div>
                <NoteBanner tone="amber">Once a transfer is approved, renewal through Madhya Pradesh will no longer be available.</NoteBanner>
                <div className="form-actions">
                  <button className="btn btn-outline" onClick={goDashboard}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => setTransferStep(2)}>Review Application <ChevronRight size={16} /></button>
                </div>
              </>
            )}

            {transferStep === 2 && (
              <>
                <div className="section-title">Review Transfer Application</div>
                <div className="confirm-grid">
                  <div><span>Reason for Transfer</span><strong>{transferForm.reason || "—"}</strong></div>
                  <div><span>Destination State</span><strong>{transferForm.destinationState}</strong></div>
                  <div><span>Additional Information</span><strong>{transferForm.details || "—"}</strong></div>
                </div>
                <NoteBanner tone="blue">Submitting this application is simulated — no real data is sent anywhere.</NoteBanner>
                <div className="form-actions">
                  <button className="btn btn-outline" onClick={() => setTransferStep(1)}><ChevronLeft size={16} /> Back</button>
                  <button className="btn btn-primary" onClick={submitTransfer}><Send size={15} /> Submit Application</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function ScreenTransferConfirmation() {
    const app = findApp(lastTransferAppId);
    if (!app) return null;
    return (
      <div className="page-narrow">
        <div className="result-panel result-success">
          <CheckCircle2 size={44} />
          <h2>Transfer Application Submitted</h2>
          <div className="confirm-grid">
            <div><span>Application No.</span><strong>{app.appNo}</strong></div>
            <div><span>Status</span><AppBadge status={app.status} /></div>
          </div>
          <div className="demo-btn-row">
            <button className="btn btn-primary" onClick={() => { setSelectedAppId(app.id); setScreen("application-detail"); }}>View Application</button>
            <button className="btn btn-outline" onClick={goDashboard}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  function ScreenApplicationDetail() {
    const app = findApp(selectedAppId);
    if (!app) {
      return (
        <div className="page-narrow">
          <BackLink onClick={goDashboard} />
          <div className="card"><div className="card-body muted-text">No application found.</div></div>
        </div>
      );
    }
    const rejected = app.status === "rejected";
    const isRenewal = app.kind === "renewal";
    const steps = isRenewal
      ? ["Submitted", "Under Review", "Approved", "Renewed"]
      : ["Submitted", "Under Review", app.status === "rejected" ? "Rejected" : "Approved"];
    const stepIndexMap = { submitted: 0, under_review: 1, approved: 2, rejected: 2, renewed: 3 };
    const currentIndex = stepIndexMap[app.status] ?? 0;
    const relatedCert = app.relatedCertId ? findCert(app.relatedCertId) : null;
    const Icon = APP_KIND_META[app.kind].icon;

    return (
      <div className="page-narrow">
        <BackLink onClick={goDashboard} />
        <div className="card">
          <div className="card-header"><Icon size={16} style={{ marginRight: 8, verticalAlign: -2 }} />{APP_KIND_META[app.kind].label}</div>
          <div className="card-body">
            <div className="confirm-grid" style={{ marginBottom: 20 }}>
              <div><span>Application No.</span><strong>{app.appNo}</strong></div>
              <div><span>Submitted On</span><strong>{app.submittedOn}</strong></div>
              <div><span>Status</span><AppBadge status={app.status} /></div>
            </div>

            <ProgressStepper steps={steps} currentIndex={currentIndex} rejected={rejected} />

            {relatedCert && (
              <>
                <div className="section-title">Related Certificate</div>
                <div className="confirm-grid">
                  <div><span>Certificate</span><strong>{relatedCert.kind}</strong></div>
                  <div><span>Certificate No.</span><strong>{relatedCert.certNo}</strong></div>
                </div>
              </>
            )}

            {app.kind === "duplicate" && (
              <>
                <div className="section-title">Application Details</div>
                <div className="confirm-grid">
                  <div><span>Reason</span><strong>{app.reason}</strong></div>
                  <div><span>Additional Details</span><strong>{app.details || "—"}</strong></div>
                </div>
              </>
            )}

            {app.kind === "transfer" && (
              <>
                <div className="section-title">Application Details</div>
                <div className="confirm-grid">
                  <div><span>Reason for Transfer</span><strong>{app.reason}</strong></div>
                  <div><span>Destination State</span><strong>{app.destinationState}</strong></div>
                  <div><span>Additional Information</span><strong>{app.details || "—"}</strong></div>
                </div>
                {app.status === "approved" && (
                  <NoteBanner tone="amber">
                    <ShieldAlert size={15} style={{ marginRight: 6, verticalAlign: -3 }} />
                    Transfer Out of Madhya Pradesh Approved — your registration has been transferred out. Renewal
                    through Madhya Pradesh is no longer available.
                  </NoteBanner>
                )}
              </>
            )}

            <div className="section-title">Timeline</div>
            <div className="timeline-log">
              {app.timeline.map((h, i) => (
                <div className="timeline-log-row" key={i}>
                  <span className="timeline-log-dot" />
                  <div>
                    <div className="timeline-log-status">{APP_STATUS_META[h.status]?.label || h.status}</div>
                    <div className="timeline-log-time">{h.time}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="demo-panel" style={{ marginTop: 20 }}>
              <div className="demo-panel-head"><span><SparklesIcon size={14} /> Prototype Controls — simulate office action</span></div>
              <div className="demo-panel-body">
                {app.status === "under_review" && (
                  <>
                    <button className="btn btn-outline btn-sm" onClick={() => advanceApplication(app.id, "approved")}>Move to Approved</button>
                    <button className="btn btn-danger btn-sm" onClick={() => advanceApplication(app.id, "rejected")}>Move to Rejected</button>
                  </>
                )}
                {app.status === "approved" && isRenewal && (
                  <button className="btn btn-primary btn-sm" onClick={() => issueRenewedCertificate(app.id)}><Award size={14} /> Issue Renewed Certificate</button>
                )}
                {app.status === "approved" && app.kind === "duplicate" && (
                  <div className="small-muted">Duplicate certificate ready — see the related certificate above to view or download it.</div>
                )}
                {app.status === "approved" && app.kind === "transfer" && (
                  <div className="small-muted">Business rule applied — return to the dashboard to see Apply for Renewal disabled.</div>
                )}
                {(app.status === "rejected" || app.status === "renewed") && (
                  <div className="small-muted">Application lifecycle complete.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------- Small helpers ---------------------------- */

  function BackLink({ onClick, label = "Back" }) {
    return <button className="back-link" onClick={onClick}><ArrowLeft size={14} /> {label}</button>;
  }

  function NoteBanner({ children, tone = "amber" }) {
    return (
      <div className={`note-banner note-${tone}`}>
        <Info size={15} />
        <div>{children}</div>
      </div>
    );
  }

  function UploadRow({ label, fileName, onPick }) {
    return (
      <div className="upload-row">
        <div className="upload-row-icon"><FileText size={16} /></div>
        <div className="upload-row-body">
          <div className="upload-row-label">{label}</div>
          <div className="upload-row-file">{fileName || "No file selected"}</div>
        </div>
        <label className="upload-btn">
          <Upload size={13} /> {fileName ? "Replace" : "Upload"}
          <input type="file" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f.name); }} />
        </label>
      </div>
    );
  }

  function CertificateViewerModal() {
    const cert = viewerCertId ? findCert(viewerCertId) : null;
    if (!cert) return null;
    return (
      <div className="modal-backdrop" onClick={closeViewer}>
        <div className="modal-box modal-box-wide" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <span>Digital Certificate Viewer</span>
            <button className="icon-btn" onClick={closeViewer}><X size={16} /></button>
          </div>
          <div className="modal-body">
            <div className="cert-print-area">
              <div className="official-cert">
                <div className="official-cert-header">
                  <div className="official-cert-emblem"><Landmark size={26} /></div>
                  <div>
                    <div className="official-cert-dept">Government of Madhya Pradesh</div>
                    <div className="official-cert-org">Madhya Pradesh State Veterinary Council</div>
                  </div>
                  <div className="official-cert-qr"><QrCode size={46} /></div>
                </div>
                <div className="official-cert-divider" />
                <div className="official-cert-title">{cert.kind}</div>
                <div className="official-cert-sub">Certificate of Registration</div>
                <div className="official-cert-body">
                  <p>This is to certify that</p>
                  <p className="official-cert-name">{HOLDER.fullName}</p>
                  <p>holding Registration No. <strong>{HOLDER.regNo}</strong> is a registered veterinary practitioner under the Madhya Pradesh State Veterinary Council.</p>
                </div>
                <div className="official-cert-grid">
                  <div><span>Certificate No.</span><strong>{cert.certNo}</strong></div>
                  <div><span>Issue Date</span><strong>{formatLongDate(cert.issueDate)}</strong></div>
                  <div><span>Valid From</span><strong>{formatLongDate(cert.validFrom)}</strong></div>
                  <div><span>Valid Until</span><strong>{formatLongDate(cert.validUntil)}</strong></div>
                </div>
                <div className="official-cert-footer">
                  <div className="official-cert-seal"><ShieldCheck size={30} /><span>SEAL</span></div>
                  <div className="official-cert-sign">
                    <div className="sign-line" />
                    Registrar, MPSVC<br /><span className="small-muted">Digitally eSigned</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => pushToast("Certificate downloaded (simulated).")}><Download size={15} /> Download Certificate</button>
              <button className="btn btn-outline" onClick={() => window.print()}><Printer size={15} /> Print Certificate</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function DuplicateModal() {
    const cert = duplicateCertId ? findCert(duplicateCertId) : null;
    if (!cert) return null;
    return (
      <div className="modal-backdrop" onClick={closeDuplicate}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <span>Apply for Duplicate Certificate</span>
            <button className="icon-btn" onClick={closeDuplicate}><X size={16} /></button>
          </div>
          <div className="modal-body">
            <NoteBanner>
              Application form fields shown here will be exactly as they appear on the official MPSVC.org portal — field names and sequence must not be altered.
            </NoteBanner>
            <div className="form-group">
              <label className="form-label">Selected Certificate</label>
              <div className="selected-cert-pill"><Award size={14} /> {cert.kind} — {cert.certNo}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Reason<span className="required-star">*</span></label>
              <select className="form-input" value={duplicateReason} onChange={e => setDuplicateReason(e.target.value)}>
                {DUPLICATE_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Additional Details</label>
              <textarea className="form-input" rows={3} value={duplicateDetails} onChange={e => setDuplicateDetails(e.target.value)} />
            </div>
          </div>
          <div className="modal-actions modal-actions-split">
            <button className="btn btn-outline" onClick={closeDuplicate}>Cancel</button>
            <button className="btn btn-primary" onClick={submitDuplicate}><Send size={15} /> Submit Application</button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------- Router ---------------------------- */

  function renderScreen() {
    switch (screen) {
      case "login": return <ScreenLogin />;
      case "otp": return <ScreenOtp />;
      case "dashboard": return <ScreenDashboard />;
      case "renewal-flow": return <ScreenRenewal />;
      case "renewal-confirmation": return <ScreenRenewalConfirmation />;
      case "transfer-flow": return <ScreenTransfer />;
      case "transfer-confirmation": return <ScreenTransferConfirmation />;
      case "application-detail": return <ScreenApplicationDetail />;
      default: return <ScreenLogin />;
    }
  }

  return (
    <div className="cmp-wrap">
      <style>{CSS}</style>
      <header className="cmp-header">
        <div className="cmp-header-brand"><ShieldCheck size={20} /> Certificate Management Portal</div>
        {loggedIn && (
          <div className="cmp-header-user">
            <span className="cmp-header-name">{HOLDER.fullName}</span>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}><LogOut size={14} /> Logout</button>
          </div>
        )}
      </header>
      <main className="cmp-main">{renderScreen()}</main>
      <footer className="cmp-footer">
        Madhya Pradesh State Veterinary Council · Certificate Management Portal (Prototype) · Helpline: 0755-XXXXXXX
      </footer>

      <CertificateViewerModal />
      <DuplicateModal />

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === "error" ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Styles                                                                   */
/* ---------------------------------------------------------------------- */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Inter:wght@400;500;600;700&display=swap');

* { box-sizing: border-box; }

.cmp-wrap {
  --navy: #16324A;
  --navy-deep: #0E2436;
  --gold: #A2762A;
  --gold-soft: #F1E7D2;
  --paper: #F5F6F2;
  --card: #FFFFFF;
  --ink: #1F2530;
  --ink-soft: #5B6472;
  --line: #E1E4DC;
  --green: #2E6B4F; --green-soft: #E3EFE8;
  --amber: #9C6B12; --amber-soft: #FBF0DA;
  --red: #9C3B2E; --red-soft: #F5E2DE;
  --blue: #2A537F; --blue-soft: #E4EBF3;
  --muted: #8A8F7E; --muted-soft: #ECEDE6;

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--ink);
  background: var(--paper);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.cmp-wrap h1, .cmp-wrap h2 { font-family: 'Merriweather', Georgia, serif; }

.cmp-header {
  background: var(--navy-deep);
  color: #fff;
  padding: 14px 24px;
  display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; z-index: 30;
}
.cmp-header-brand { display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 15px; letter-spacing: 0.01em; }
.cmp-header-user { display: flex; align-items: center; gap: 12px; }
.cmp-header-name { font-size: 13.5px; opacity: 0.9; }

.cmp-main { flex: 1; padding: 28px 20px 60px; }
.cmp-footer { text-align: center; padding: 18px; font-size: 12px; color: var(--ink-soft); border-top: 1px solid var(--line); background: var(--card); }

.page-narrow { max-width: 640px; margin: 0 auto; }
.page-wide { max-width: 980px; margin: 0 auto; }

/* Login */
.login-hero { text-align: center; margin: 30px 0 26px; }
.login-hero-emblem { width: 54px; height: 54px; border-radius: 50%; background: var(--gold-soft); color: var(--gold); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
.login-hero h1 { font-size: 24px; margin: 0 0 8px; color: var(--navy-deep); }
.login-hero p { color: var(--ink-soft); font-size: 14px; max-width: 420px; margin: 0 auto; }
.login-card { max-width: 420px; margin: 0 auto; }

/* Cards & typography */
.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 1px 3px rgba(20,20,10,0.04); margin-bottom: 20px; overflow: hidden; }
.card-header { padding: 16px 20px; font-weight: 700; font-size: 15px; border-bottom: 1px solid var(--line); color: var(--navy-deep); }
.card-body { padding: 20px; }
.muted-text { color: var(--ink-soft); font-size: 13.5px; }
.small-muted { color: var(--ink-soft); font-size: 12.5px; }

.section-heading { display: flex; align-items: flex-end; justify-content: space-between; margin: 30px 0 12px; }
.section-eyebrow { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--gold); font-weight: 700; margin-bottom: 2px; }
.section-title { font-size: 19px; margin: 0; color: var(--navy-deep); }
.section-title.inner { font-size: 14px; font-weight: 700; margin: 18px 0 10px; color: var(--navy-deep); }
.card-body .section-title { font-size: 14px; font-weight: 700; margin: 18px 0 10px; color: var(--navy-deep); font-family: 'Inter', sans-serif; }
.card-body .section-title:first-child { margin-top: 0; }

/* Badges */
.badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.badge-active { background: var(--green-soft); color: var(--green); }
.badge-expiring { background: var(--amber-soft); color: var(--amber); }
.badge-expired { background: var(--red-soft); color: var(--red); }
.badge-superseded { background: var(--muted-soft); color: var(--muted); }
.badge-pending { background: var(--muted-soft); color: var(--ink-soft); }
.badge-review { background: var(--blue-soft); color: var(--blue); }
.badge-approved { background: var(--green-soft); color: var(--green); }
.badge-rejected { background: var(--red-soft); color: var(--red); }

/* Buttons */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border-radius: 9px; font-size: 13.5px; font-weight: 600; padding: 10px 16px; border: 1px solid transparent; cursor: pointer; transition: opacity .15s, background .15s; font-family: inherit; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary { background: var(--navy); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--navy-deep); }
.btn-outline { background: #fff; color: var(--navy-deep); border-color: var(--line); }
.btn-outline:hover:not(:disabled) { background: var(--paper); }
.btn-outline-danger { background: #fff; color: var(--red); border-color: var(--red-soft); }
.btn-outline-danger:hover:not(:disabled) { background: var(--red-soft); }
.btn-danger { background: var(--red); color: #fff; }
.btn-block { width: 100%; }
.btn-sm { padding: 7px 12px; font-size: 12.5px; }
.btn-link { background: none; border: none; color: var(--navy); text-decoration: underline; padding: 8px 0; font-size: 12.5px; font-weight: 500; cursor: pointer; width: 100%; }
.icon-btn { background: transparent; border: none; cursor: pointer; color: var(--ink-soft); padding: 4px; border-radius: 6px; display: flex; }
.icon-btn:hover { background: var(--paper); }
.spin { animation: cmp-spin 0.9s linear infinite; }
@keyframes cmp-spin { to { transform: rotate(360deg); } }

/* Forms */
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 6px; color: var(--navy-deep); }
.required-star { color: var(--red); margin-left: 3px; }
.form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; font-size: 13.5px; font-family: inherit; background: #fff; color: var(--ink); }
.form-input:focus { outline: none; border-color: var(--navy); box-shadow: 0 0 0 3px rgba(22,50,74,0.08); }
.form-hint { font-size: 12px; color: var(--ink-soft); margin-top: 5px; }
.form-error { color: var(--red); font-size: 12.5px; margin: -8px 0 14px; }
.form-actions { display: flex; justify-content: space-between; margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--line); }
.checkbox-row { display: flex; align-items: flex-start; gap: 9px; font-size: 13px; color: var(--ink-soft); margin: 10px 0 4px; cursor: pointer; }

.back-link { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: var(--ink-soft); font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 14px; padding: 4px 0; }
.back-link:hover { color: var(--navy-deep); }

.confirm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px 22px; }
.confirm-grid > div { display: flex; flex-direction: column; gap: 3px; }
.confirm-grid span { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-soft); }
.confirm-grid strong { font-size: 13.5px; color: var(--ink); font-weight: 600; }

.note-banner { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 9px; font-size: 12.5px; margin: 14px 0; }
.note-amber { background: var(--amber-soft); color: #7A5A15; }
.note-blue { background: var(--blue-soft); color: var(--blue); }
.notice { display: flex; align-items: center; gap: 8px; background: var(--muted-soft); color: var(--ink-soft); padding: 10px 12px; border-radius: 9px; font-size: 12.5px; }
.notice-inline { width: 100%; }

/* Demo panel */
.demo-panel { background: var(--gold-soft); border: 1px dashed var(--gold); border-radius: 12px; padding: 12px 16px; margin-bottom: 22px; }
.demo-panel-head { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 700; color: #7A5A15; margin-bottom: 8px; }
.demo-panel-head span { display: flex; align-items: center; gap: 6px; }
.demo-panel-body { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.demo-panel-note { font-size: 11.5px; color: #7A5A15; opacity: 0.8; margin-left: 4px; }
.chip-btn { background: #fff; border: 1px solid var(--gold); color: #7A5A15; border-radius: 999px; padding: 6px 13px; font-size: 12px; font-weight: 600; cursor: pointer; }
.chip-btn-active { background: var(--gold); color: #fff; }

/* Current certificate */
.current-cert-card { padding: 22px; }
.current-cert-main { display: grid; grid-template-columns: 1fr 240px; gap: 24px; align-items: stretch; }
.current-cert-info { display: flex; flex-direction: column; gap: 11px; }
.current-cert-row { display: flex; align-items: center; gap: 9px; font-size: 13.5px; color: var(--ink-soft); }
.current-cert-row strong { color: var(--ink); font-weight: 600; margin-left: auto; }
.current-cert-row svg { color: var(--gold); flex-shrink: 0; }
.current-cert-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--line); }

.countdown-panel { border-radius: 12px; padding: 18px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
.countdown-active { background: var(--green-soft); color: var(--green); }
.countdown-expiring { background: var(--amber-soft); color: var(--amber); }
.countdown-expired { background: var(--red-soft); color: var(--red); }
.countdown-title { font-weight: 700; font-size: 13px; margin-top: 4px; }
.countdown-value { font-size: 30px; font-weight: 900; font-family: 'Merriweather', serif; line-height: 1.1; margin-top: 2px; }
.countdown-sub { font-size: 11.5px; opacity: 0.85; }

/* Timeline */
.table-card { padding: 0; }
.table-scroll { overflow-x: auto; }
.cert-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.cert-table th { text-align: left; padding: 12px 16px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-soft); font-weight: 700; background: var(--paper); border-bottom: 1px solid var(--line); white-space: nowrap; }
.cert-table td { padding: 14px 16px; border-bottom: 1px solid var(--line); vertical-align: middle; white-space: nowrap; }
.cert-table tbody tr:last-child td { border-bottom: none; }
.cert-table tbody tr:hover { background: var(--paper); }
.cert-table-kind { font-weight: 700; color: var(--navy-deep); }
.cert-table-range { font-size: 11px; color: var(--ink-soft); margin-top: 2px; }
.cert-table-mono { font-family: 'Courier New', monospace; font-size: 12.5px; }
.cert-table-actions { display: flex; gap: 6px; flex-wrap: nowrap; }
.cert-table-actions-head { text-align: right; }
.cert-table td:last-child .cert-table-actions { justify-content: flex-end; }

/* Application list */
.app-list { display: flex; flex-direction: column; gap: 10px; }
.app-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; margin: 0; cursor: pointer; transition: box-shadow .15s; }
.app-row:hover { box-shadow: 0 3px 10px rgba(20,20,10,0.07); }
.app-row-icon { width: 38px; height: 38px; border-radius: 10px; background: var(--blue-soft); color: var(--blue); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.app-row-body { flex: 1; min-width: 0; }
.app-row-title { font-weight: 600; font-size: 13.5px; }
.app-row-sub { font-size: 12px; color: var(--ink-soft); margin-top: 2px; }
.app-row-arrow { color: var(--muted); flex-shrink: 0; }

.empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 40px 20px; color: var(--ink-soft); gap: 8px; }
.empty-state-title { font-weight: 600; color: var(--ink); }
.empty-state-body { font-size: 12.5px; max-width: 320px; margin: 0; }

/* Stepper (application progress) */
.app-stepper { display: flex; align-items: flex-start; margin: 18px 0 24px; }
.app-step { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; }
.app-step-marker { display: flex; align-items: center; width: 100%; }
.app-step-dot { width: 24px; height: 24px; border-radius: 50%; background: var(--muted-soft); color: var(--ink-soft); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; margin: 0 auto; }
.app-step-dot-done { background: var(--green); color: #fff; }
.app-step-dot-rejected { background: var(--red); color: #fff; }
.app-step-line { flex: 1; height: 2px; background: var(--line); position: absolute; top: 11px; left: 50%; width: 100%; z-index: -1; }
.app-step-line-done { background: var(--green); }
.app-step:last-child .app-step-line { display: none; }
.app-step-label { font-size: 11px; text-align: center; margin-top: 8px; font-weight: 600; color: var(--ink); }
.app-step-label-muted { color: var(--ink-soft); font-weight: 400; }

.timeline-log { display: flex; flex-direction: column; gap: 14px; margin: 6px 0; }
.timeline-log-row { display: flex; align-items: flex-start; gap: 12px; }
.timeline-log-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--navy); margin-top: 6px; flex-shrink: 0; }
.timeline-log-status { font-weight: 600; font-size: 13px; }
.timeline-log-time { font-size: 11.5px; color: var(--ink-soft); }

/* Upload row */
.upload-row { display: flex; align-items: center; gap: 12px; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
.upload-row-icon { width: 34px; height: 34px; border-radius: 8px; background: var(--paper); display: flex; align-items: center; justify-content: center; color: var(--gold); flex-shrink: 0; }
.upload-row-body { flex: 1; min-width: 0; }
.upload-row-label { font-size: 13px; font-weight: 600; }
.upload-row-file { font-size: 11.5px; color: var(--ink-soft); }
.upload-btn { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--navy); border: 1px solid var(--line); border-radius: 7px; padding: 7px 11px; cursor: pointer; background: #fff; }

/* Result panel */
.result-panel { text-align: center; padding: 40px 24px; background: var(--card); border: 1px solid var(--line); border-radius: 14px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.result-success svg { color: var(--green); }
.result-panel h2 { margin: 6px 0 16px; font-size: 20px; color: var(--navy-deep); }
.result-panel .confirm-grid { justify-content: center; text-align: center; margin-bottom: 20px; }
.result-panel .confirm-grid > div { align-items: center; }
.demo-btn-row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(14,20,15,0.55); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal-box { background: #fff; border-radius: 14px; width: 100%; max-width: 460px; max-height: 88vh; overflow-y: auto; }
.modal-box-wide { max-width: 620px; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--line); font-weight: 700; color: var(--navy-deep); font-size: 14.5px; }
.modal-body { padding: 20px; }
.modal-actions { display: flex; gap: 10px; padding: 0 20px 20px; flex-wrap: wrap; }
.modal-actions-split { justify-content: flex-end; padding: 16px 20px; border-top: 1px solid var(--line); margin: 0; }
.selected-cert-pill { display: inline-flex; align-items: center; gap: 7px; background: var(--gold-soft); color: #7A5A15; padding: 8px 12px; border-radius: 8px; font-size: 12.5px; font-weight: 600; }

/* Official certificate */
.cert-print-area { display: flex; justify-content: center; }
.official-cert { width: 100%; max-width: 540px; border: 2px solid var(--gold); border-radius: 10px; padding: 26px 28px; background: linear-gradient(180deg, #FEFDFA, #FBF8F0); }
.official-cert-header { display: flex; align-items: center; gap: 12px; }
.official-cert-emblem { width: 44px; height: 44px; border-radius: 50%; background: var(--navy); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.official-cert-dept { font-size: 11px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.04em; }
.official-cert-org { font-weight: 700; color: var(--navy-deep); font-size: 14px; }
.official-cert-qr { margin-left: auto; color: var(--navy); }
.official-cert-divider { height: 2px; background: var(--gold); opacity: 0.4; margin: 16px 0; }
.official-cert-title { font-family: 'Merriweather', serif; font-size: 20px; text-align: center; color: var(--navy-deep); font-weight: 900; }
.official-cert-sub { text-align: center; font-size: 12px; color: var(--ink-soft); margin-top: 4px; letter-spacing: 0.03em; text-transform: uppercase; }
.official-cert-body { text-align: center; margin: 18px 0; font-size: 13px; line-height: 1.7; }
.official-cert-name { font-family: 'Merriweather', serif; font-size: 19px; font-weight: 700; color: var(--navy-deep); margin: 4px 0; }
.official-cert-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; margin: 16px 0; }
.official-cert-grid span { display: block; font-size: 10px; text-transform: uppercase; color: var(--ink-soft); letter-spacing: 0.03em; }
.official-cert-grid strong { font-size: 12.5px; }
.official-cert-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; }
.official-cert-seal { display: flex; flex-direction: column; align-items: center; color: var(--gold); font-size: 9px; font-weight: 700; letter-spacing: 0.08em; gap: 2px; }
.official-cert-sign { text-align: center; font-size: 11.5px; }
.sign-line { width: 130px; border-top: 1px solid var(--ink); margin-bottom: 4px; }

/* Toast */
.toast { position: fixed; bottom: 22px; right: 22px; z-index: 200; display: flex; align-items: center; gap: 9px; background: var(--navy-deep); color: #fff; padding: 12px 16px; border-radius: 10px; font-size: 13px; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,0.2); max-width: 320px; }
.toast-error { background: var(--red); }

@media print {
  body * { visibility: hidden; }
  .cert-print-area, .cert-print-area * { visibility: visible; }
  .cert-print-area { position: fixed; top: 0; left: 0; width: 100%; margin: 0; padding: 24px; }
}

@media (max-width: 860px) {
  .current-cert-main { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .cmp-main { padding: 20px 14px 50px; }
  .confirm-grid { grid-template-columns: 1fr; }
  .current-cert-actions { flex-direction: column; align-items: stretch; }
  .current-cert-actions .btn { width: 100%; }
  .app-stepper { overflow-x: auto; }
  .section-heading { flex-direction: column; align-items: flex-start; gap: 6px; }
}
`;
