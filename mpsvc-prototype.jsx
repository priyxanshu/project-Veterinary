import { useState } from "react";
import {
  User, Mail, Upload, CheckCircle2, Circle, Clock, XCircle,
  FileText, CreditCard, Landmark, Truck, Bell, LogOut, ChevronRight,
  ChevronLeft, Download, QrCode, ShieldCheck, AlertTriangle, Building2,
  GraduationCap, Camera, PenTool, Home, ArrowLeft, RefreshCw, Send,
  Calendar, Award, Info, LayoutDashboard, X, Check, MapPin, Sparkles,
  UserPlus, ArrowLeftRight
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* Static reference data                                                   */
/* ---------------------------------------------------------------------- */

// New Registration and Transfer-In to Madhya Pradesh are separate services — a fresh
// applicant vs. a vet already registered with another State Veterinary Council — but
// they share the same field set (see ScreenNewRegistrationForm), differing only in
// that Transfer-In always requires NOC details from the applicant's previous council.
const SERVICES = {
  provisional:    { label: "Provisional Registration",              code: "PROV",  loginType: "mobile", fee: 15 },
  new:            { label: "New Registration",                      code: "NEW",   loginType: "mobile", fee: 1000 },
  "transfer-in":  { label: "Transfer-In to Madhya Pradesh",          code: "TRIN",  loginType: "mobile", fee: 1000 },
  renewal:        { label: "Renewal Registration",                  code: "REN",   loginType: "regno", fee: 1000 },
  "transfer-out": { label: "Transfer-Out of Madhya Pradesh",         code: "TROUT", loginType: "regno", fee: 1000 },
  "add-qualification": { label: "Addition of Qualification",         code: "AOQ",   loginType: "regno", fee: 500 },
};

// The entry flow branches on two questions before any login happens:
//   1. Is the applicant new to MPSVC, or already on the Council's rolls?
//   2. (new applicants only) Is their veterinary college inside Madhya Pradesh?
// A Provisional Registration can only be granted to a student of a recognised MP
// college (see PROVISIONAL_TNC), so an applicant from an out-of-state college skips
// straight to New Registration. Transfer-In is offered in both cases — a vet already
// registered with another State Council may hold a degree from either.
const SERVICES_BY_COLLEGE = {
  mp:     ["provisional", "transfer-in"],
  outside: ["new", "transfer-in"],
};
// Services unlocked by each kind of existing-user credential.
const SERVICES_BY_CREDENTIAL = {
  provisional: ["new"],
  regno:       ["renewal", "transfer-out", "add-qualification"],
};

// Official Terms & Conditions shown to the applicant before they can submit a
// Provisional Registration application.
const PROVISIONAL_TNC = [
  "You should be a student of a recognized college of Madhya Pradesh (Schedule II).",
  "Provisional registration fee is Rs. 15.",
];

// Madhya Pradesh districts — Residential Address is always within MP (see T&C above),
// so this powers the Residential District dropdown, and the Permanent District dropdown
// whenever Permanent State is also set to Madhya Pradesh.
const MP_DISTRICTS = [
  "Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Rewa", "Satna",
  "Katni", "Dewas", "Ratlam", "Chhindwara", "Khargone", "Mandsaur", "Vidisha",
  "Shivpuri", "Damoh", "Betul", "Hoshangabad", "Neemuch", "Balaghat", "Guna",
  "Morena", "Panna", "Raisen", "Rajgarh", "Sehore", "Seoni", "Shahdol", "Sidhi",
];

const AREA_TYPES = ["Rural", "Urban"];

// Illustrative Madhya Pradesh administrative-hierarchy option lists for the address
// blocks — Block/Panchayat/Gram for Rural addresses, City/Ward for Urban addresses.
// These render as dropdowns only when the address's State is Madhya Pradesh; for any
// other state the same fields become free-text inputs (see LocationField below).
const MP_BLOCKS = [
  "Berasia", "Huzur", "Kolar", "Phanda", "Sehore", "Ichhawar", "Vidisha",
  "Ganjbasoda", "Sanchi", "Kurwai", "Mhow", "Depalpur", "Sanwer", "Hatod",
];
const MP_PANCHAYATS = [
  "Barkheda", "Semra", "Kalapipal", "Ratanpur", "Chandanpura", "Rajpur",
  "Amla", "Karond", "Bagli", "Nazirabad",
];
const MP_GRAMS = [
  "Kanera", "Bhauri", "Bilkisganj", "Mendori", "Salaiya", "Chunabhatti",
  "Khejda", "Devgurdiya", "Untkhedi", "Manpur",
];
const MP_WARDS = Array.from({ length: 20 }, (_, i) => `Ward ${i + 1}`);

// Pincode → Post Office reference lookup for Madhya Pradesh addresses — picking a
// Pincode auto-populates the matching Post Office. Outside MP neither list exists, so
// both fields fall back to open text entry (see LocationField).
const MP_PINCODE_POST_OFFICES = [
  { pincode: "462001", postOffice: "Bhopal G.P.O." },
  { pincode: "462016", postOffice: "Ravindra Bhawan S.O." },
  { pincode: "462045", postOffice: "Berasia S.O." },
  { pincode: "452001", postOffice: "Indore G.P.O." },
  { pincode: "482001", postOffice: "Jabalpur G.P.O." },
  { pincode: "474001", postOffice: "Gwalior G.P.O." },
  { pincode: "486001", postOffice: "Rewa G.P.O." },
  { pincode: "470001", postOffice: "Sagar G.P.O." },
  { pincode: "456001", postOffice: "Ujjain G.P.O." },
  { pincode: "483501", postOffice: "Katni G.P.O." },
  { pincode: "455001", postOffice: "Dewas G.P.O." },
];
const MP_PINCODES = MP_PINCODE_POST_OFFICES.map(p => p.pincode);
const MP_POST_OFFICES = MP_PINCODE_POST_OFFICES.map(p => p.postOffice);

// Representative list of Indian states/UTs for the Permanent Address dropdown, since a
// citizen's permanent address may lie outside Madhya Pradesh even though their
// residential address (where they currently study) must be within it.
const INDIAN_STATES = [
  "Madhya Pradesh", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi",
];

const MP_VET_COLLEGES = [
  "College of Veterinary Science & A.H., Jabalpur",
  "College of Veterinary Science & A.H., Mhow",
  "College of Veterinary Science, Rewa",
  "Nanaji Deshmukh Veterinary Science University, Jabalpur",
];

const PROVISIONAL_PASSING_YEARS = ["2025-2026", "2026-2027", "2027-2028"];

// New Registration / Transfer-In — official MPSVC field set (see ScreenNewRegistrationForm).
const SECTOR_OPTIONS = ["Government", "Private", "Self-Employed", "Academic / Research", "NGO"];
const NEW_REG_PASSING_YEARS = Array.from({ length: 15 }, (_, i) => String(2026 - i));
const VET_UNIVERSITIES = ["Nanaji Deshmukh Veterinary Science University, Jabalpur", "Other Recognized University"];

const UPLOAD_MAX_KB = 1024;
// Certificates and other supporting documents are uploaded as PDF; the photo (and
// signature) are uploaded as JPG, since they're used as-is on the printed certificate.
const UPLOAD_ACCEPT = {
  pdf: "application/pdf,.pdf",
  photo: "image/jpeg,.jpg,.jpeg",
};
const UPLOAD_ALLOWED_TYPES = { pdf: ["application/pdf"], photo: ["image/jpeg", "image/jpg"] };
const UPLOAD_ALLOWED_EXT = { pdf: /\.pdf$/i, photo: /\.jpe?g$/i };
const UPLOAD_FORMAT_LABEL = { pdf: "PDF", photo: "JPG" };
function validateUploadFile(file, format = "pdf") {
  if (!file) return "This file is required.";
  const typeOk = UPLOAD_ALLOWED_TYPES[format].includes(file.type) || UPLOAD_ALLOWED_EXT[format].test(file.name);
  if (!typeOk) return `Only ${UPLOAD_FORMAT_LABEL[format]} files are allowed.`;
  if (file.size > UPLOAD_MAX_KB * 1024) return `File size should not be greater than ${UPLOAD_MAX_KB} KB.`;
  return "";
}

// A citizen logging in via Registration Number — their New Registration was applied
// for, approved, and completed years ago: digital certificate eSigned AND the
// physical certificate already dispatched and received via Speed Post. Registration
// Number login exists precisely because this citizen already holds a full
// registration; the dashboard should reflect that rather than asking them to
// re-apply. Renewal / Transfer-Out are the only services relevant to them now.
const MOCK_RECORD = {
  applicationId: "MPSVC/NEW/2018/40452",
  regNo: "MPSVC/REG/2018/00452",
  fullName: "Dr. Ankit Sharma",
  guardianName: "Mr. Rajesh Sharma",
  dob: "1990-05-14",
  gender: "Male",
  category: "General",
  address: "12, Napier Town, Jabalpur, Madhya Pradesh - 482001",
  degree: "B.V.Sc & A.H.",
  university: "Nanaji Deshmukh Veterinary Science University, Jabalpur",
  yearOfPassing: "2016",
  collegeName: "College of Veterinary Science, Mhow",
  mobile: "9876543210",
  email: "ankit.sharma@example.com",
  idProofType: "Aadhaar",
  idProofNumber: "XXXX-XXXX-2210",
  issueDate: "2018-04-02",
  dispatchDate: "2018-04-15",
  trackingNumber: "EM482910335IN",
  existingRegValidTill: "2027-03-31",
  bankName: "State Bank of India — Napier Town Branch, Jabalpur",
};

// A citizen who has already completed Provisional Registration — used to demo the
// "post-provisional" dashboard state. Provisional Registration only ever issues a
// digital certificate (eSigned, delivered instantly online) — there is no physical
// copy and therefore no Speed Post dispatch step for this service type. The natural
// next step for such an applicant is to apply for New Registration.
const PROVISIONAL_RECORD = {
  certNo: "MPSVC/PROV/2025/00187",
  fullName: "Dr. Neha Kulkarni",
  firstName: "Neha", middleName: "", lastName: "Kulkarni", fatherName: "Mr. Suresh Kulkarni",
  dob: "1998-02-21", gender: "Female",
  resAddress: "45, Civil Lines, Gwalior, Madhya Pradesh - 474001",
  resAreaType: "Urban", resCity: "Gwalior", resWard: "Ward 5", resPostOffice: "Gwalior G.P.O.",
  resState: "Madhya Pradesh", resDistrict: "Gwalior", resPincode: "474001",
  mobile1: "9123456780", mobile2: "",
  mobile: "9123456780",
  email: "neha.kulkarni@example.com",
  provUniversityName: "Nanaji Deshmukh Veterinary Science University, Jabalpur",
  provCollegeName: "College of Veterinary Science, Mhow",
  provPassingYear: "2025",
  issueDate: "2025-12-10",
};

// The same demo citizen has since applied for New Registration and already received
// its digital certificate — physical dispatch is deliberately left pending so the
// Track Status / Certificate screens still have something to demonstrate.
const NEW_REG_RECORD = {
  applicationId: "MPSVC/NEW/2026/40218",
  registrationNo: "MPSVC/REG/2026/00734",
  idProofType: "Aadhaar",
  idProofNumber: "XXXX-XXXX-4821",
  submittedOn: "12 Jan 2026, 11:20 am",
  scrutinyOn: "14 Jan 2026, 03:05 pm",
  approvedOn: "28 Jan 2026, 05:40 pm",
  issueDate: "2026-01-29",
  photoFile: "photograph.jpg",
  sigFile: "signature.jpg",
};

// Full certificate lifecycle for the Registration Number login citizen (Dr. Ankit
// Sharma) — Main Certificate superseded by one renewal, matching MOCK_RECORD's own
// figures for the current certificate (regNo, issue/dispatch date, valid-till). This
// gives Registration Number login the same certificate-history/countdown/application
// detail that the standalone Certificate Management Portal shows, entirely in-app.
const CERT_HISTORY = [
  {
    id: "main", kind: "Registration Certificate", certNo: MOCK_RECORD.applicationId,
    issueDate: "2018-04-02", validFrom: "2018-04-02", validUntil: "2023-04-01",
    dispatchDate: "2018-04-15", trackingNumber: "EM482910335IN",
  },
  {
    id: "renewal-1", kind: "Renewal Certificate #1", certNo: MOCK_RECORD.regNo,
    issueDate: "2023-03-20", validFrom: "2023-04-02", validUntil: MOCK_RECORD.existingRegValidTill,
    dispatchDate: "2023-04-05", trackingNumber: "EM913204487IN",
  },
];

const CERT_LIFECYCLE_META = {
  active:     { label: "Active",        tone: "active" },
  expiring:   { label: "Expiring Soon", tone: "expiring" },
  expired:    { label: "Expired",       tone: "expired" },
  superseded: { label: "Superseded",    tone: "superseded" },
};

const CERT_APP_STATUS_META = {
  submitted:    { label: "Submitted",    tone: "pending" },
  under_review: { label: "Under Review", tone: "scrutiny" },
  approved:     { label: "Approved",     tone: "confirmed" },
  rejected:     { label: "Rejected",     tone: "sentback" },
};

const CERT_APP_KIND_LABEL = {
  duplicate: "Duplicate Certificate Application",
  transfer: "Transfer Application",
};

// Pre-seeded so Application History shows realistic variety immediately, without
// requiring the reviewer to submit anything first — same idea as the standalone portal.
const CERT_INITIAL_APPLICATIONS = [
  {
    id: "capp-dup-seed", kind: "duplicate", appNo: "DUP-2026-000321", status: "approved",
    submittedOn: "02 Jun 2026", relatedCertId: "main", reason: "Certificate Lost",
    details: "Original copy misplaced during office relocation.",
    timeline: [
      { status: "submitted", time: "02 Jun 2026, 10:12 am" },
      { status: "under_review", time: "02 Jun 2026, 10:12 am" },
      { status: "approved", time: "06 Jun 2026, 04:30 pm" },
    ],
  },
  {
    id: "capp-trf-seed", kind: "transfer", appNo: "TRF-2026-000145", status: "under_review",
    submittedOn: "28 Jul 2026", reason: "Relocating for employment", destinationState: "Rajasthan",
    details: "Joining Rajasthan Veterinary Council on transfer of service.",
    timeline: [
      { status: "submitted", time: "28 Jul 2026, 02:45 pm" },
      { status: "under_review", time: "28 Jul 2026, 02:45 pm" },
    ],
  },
];

// "as of" dates the demo scenario switcher simulates, evaluated only against the
// current (last) certificate in CERT_HISTORY.
const CERT_SCENARIO_ASOF = { active: "2026-08-10", expiring: "2026-12-05", expired: "2027-04-15" };

const DUPLICATE_REASONS = ["Certificate Lost", "Certificate Damaged", "Name Change", "Other"];

const EMPTY_FORM = {
  fullName: "", collegeName: "", guardianName: "", dob: "", gender: "", category: "",
  address: "",
  degree: "", university: "", yearOfPassing: "",
  idProofType: "", idProofNumber: "",
  prevCouncilName: "", prevRegNo: "", prevRegDate: "", transferReason: "",
  existingRegNo: "", existingRegValidTill: "", renewalPeriod: "",
  addlQualDegree: "", addlQualSpecialization: "", addlQualUniversity: "", addlQualCollege: "", addlQualYear: "",

  // Provisional Registration — official MPSVC field set (see PROVISIONAL_TNC)
  firstName: "", middleName: "", lastName: "", fatherName: "",
  resAddress: "", resAreaType: "", resPostOffice: "",
  resState: "Madhya Pradesh", resDistrict: "", resPincode: "",
  resBlock: "", resPanchayat: "", resGram: "", resCity: "", resWard: "",
  sameAsResidential: false,
  permAddress: "", permAreaType: "", permPostOffice: "",
  permState: "", permDistrict: "", permPincode: "",
  permBlock: "", permPanchayat: "", permGram: "", permCity: "", permWard: "",
  preferredAddress: "", mobile1: "", mobile2: "", email: "",
  rollNo: "", universityEnrollmentNo: "",
  provDegreeName: "B.V.SC.& A.H.",
  provUniversityName: "Nanaji Deshmukh University of Veterinary Sciences, Jabalpur",
  provCollegeName: "", provPassingYear: "",
  chequeDDNo: "", bankName: "", paymentDate: "",

  // New Registration / Transfer-In to MP — official MPSVC field set. Personal details
  // (firstName..gender), Residential/Permanent Address (res*/perm*) and Contact
  // (mobile1/mobile2/email) reuse the same keys as Provisional Registration above, so a
  // citizen's Provisional details can be copied straight across — see
  // applyForNewRegistration(). Professional Address (pro*) is new but mirrors the exact
  // same Area Type / Rural-Urban field shape as the other two address blocks.
  organization: "", department: "", designation: "", sector: "",
  proAddress: "", proAreaType: "", proPostOffice: "",
  proState: "Madhya Pradesh", proDistrict: "", proPincode: "",
  proBlock: "", proPanchayat: "", proGram: "", proCity: "", proWard: "",
  landline: "", fax: "",
  qualBvscUniversity: "", qualBvscCollege: "", qualBvscYear: "",
  qualMvscUniversity: "", qualMvscCollege: "", qualMvscYear: "",
  qualPhdUniversity: "", qualPhdCollege: "", qualPhdYear: "",
  qualOtherDegreeName: "", qualOtherUniversity: "", qualOtherCollege: "", qualOtherYear: "",
  gradDate: "", degreeId: "",
  nocPrevCouncilName: "", nocPrevRegNo: "", nocPrevRegDate: "", nocDetails: "",
};

const STATUS_META = {
  submitted_payment_confirmed: { label: "Submitted – Payment Confirmed",          tone: "confirmed" },
  submitted_payment_pending:   { label: "Submitted – Payment Confirmation Pending", tone: "pending" },
  payment_confirmed:           { label: "Payment Confirmed",                       tone: "confirmed" },
  under_scrutiny:              { label: "Under Scrutiny",                          tone: "scrutiny" },
  sent_back:                   { label: "Sent Back for Correction",                tone: "sentback" },
  approved:                    { label: "Approved",                                tone: "approved" },
  certificate_issued:          { label: "Digital Certificate Issued",              tone: "issued" },
  dispatched:                  { label: "Physical Certificate Dispatched",         tone: "dispatched" },
};

const PHOTO_HINT = "This photo will be printed on your certificate — use a clear, professional, recent photograph.";

function getChecklist(serviceType) {
  if (serviceType === "provisional") {
    return [
      { key: "courseCompletionCert", label: "University / Course Completion Certificate", format: "pdf" },
      { key: "photo", label: "Photo", format: "photo", hint: PHOTO_HINT },
      { key: "other", label: "Other Document", format: "pdf" },
    ];
  }
  if (serviceType === "new" || serviceType === "transfer-in") {
    const list = [
      { key: "domicileCert", label: "Domicile Certificate", format: "pdf" },
      { key: "gradDegreeCert", label: "Graduation Degree / PDC Certificate", format: "pdf" },
      { key: "photo", label: "Photo (Passport size, 3x4 cm)", format: "photo", hint: PHOTO_HINT },
      { key: "marksheet10", label: "10th Marksheet", format: "pdf" },
      { key: "other", label: "Others", format: "pdf" },
    ];
    if (serviceType === "transfer-in") list.push({ key: "nocCertificate", label: "NOC Certificate (Transfer-In)", format: "pdf" });
    return list;
  }
  const base = [
    { key: "degree", label: "Degree Certificate", format: "pdf" },
    { key: "idProof", label: "ID Proof (Aadhaar / PAN / Voter ID)", format: "pdf" },
    { key: "photo", label: "Passport-size Photograph", format: "photo", hint: PHOTO_HINT },
    { key: "signature", label: "Signature Specimen", format: "photo" },
  ];
  if (serviceType === "renewal" || serviceType === "transfer-out" || serviceType === "add-qualification") {
    base.push({ key: "priorReg", label: "Prior Registration Certificate", format: "pdf" });
  }
  if (serviceType === "add-qualification") {
    base.push({ key: "addlQualCert", label: "Additional Qualification Degree Certificate", format: "pdf" });
    base.push({ key: "addlQualMarksheet", label: "Additional Qualification Marksheet", format: "pdf" });
  }
  return base;
}

function genAppId(serviceType) {
  const code = SERVICES[serviceType].code;
  const rand = Math.floor(10000 + Math.random() * 89999);
  return `MPSVC/${code}/2026/${rand}`;
}
function genChallan() {
  const rand = Math.floor(100000 + Math.random() * 899999);
  return `CHLN/2026/${rand}`;
}
function genRegNo(serviceType) {
  const rand = Math.floor(1000 + Math.random() * 8999);
  return `MPSVC/REG/2026/${rand}`;
}
function nowStamp() {
  return new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function todayDate() {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function getInitials(name) {
  if (!name) return "?";
  const parts = name.replace(/^(Dr\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, "").split(" ").filter(Boolean);
  return parts.slice(0, 2).map(p => p[0].toUpperCase()).join("") || "?";
}
function formatLongDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}
function certDiffInDays(fromIso, toIso) {
  const from = new Date(fromIso + "T00:00:00");
  const to = new Date(toIso + "T00:00:00");
  return Math.round((to - from) / 86400000);
}
function genCertAppNo(prefix) {
  const rand = Math.floor(100000 + Math.random() * 899999);
  return `${prefix}-2026-${rand}`;
}

/* ---------------------------------------------------------------------- */
/* Small shared UI pieces                                                  */
/* ---------------------------------------------------------------------- */

function GovHeader({ loggedIn, profile, notifications, notifOpen, setNotifOpen, onLogout, onHome }) {
  const unread = notifications.length;
  return (
    <header className="gh-wrap">
      <div className="gh-tricolor" />
      <div className="gh-main">
        <div className="gh-brand" onClick={onHome} role="button" tabIndex={0}>
          <div className="gh-emblem">MP</div>
          <div className="gh-titles">
            <span className="gh-title-hi">मध्य प्रदेश शासन</span>
            <span className="gh-title-en">Government of Madhya Pradesh &nbsp;|&nbsp; Veterinary Council</span>
          </div>
        </div>
        <div className="gh-right">
          <span className="gh-lang">EN&nbsp;|&nbsp;<span className="gh-lang-muted">हिं</span></span>
          {loggedIn && (
            <div className="gh-notif-wrap">
              <button className="gh-icon-btn" aria-label="Notifications" onClick={() => setNotifOpen(!notifOpen)}>
                <Bell size={18} />
                {unread > 0 && <span className="gh-dot" />}
              </button>
              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-panel-head">
                    <span>Notifications</span>
                    <button className="gh-icon-btn" onClick={() => setNotifOpen(false)}><X size={15} /></button>
                  </div>
                  <div className="notif-panel-sub">SMS + Email log of status changes</div>
                  <div className="notif-list">
                    {notifications.length === 0 && <div className="notif-empty">No notifications yet.</div>}
                    {notifications.map(n => (
                      <div className="notif-item" key={n.id}>
                        <div className="notif-item-icon"><Mail size={14} /></div>
                        <div>
                          <div className="notif-item-msg">{n.message}</div>
                          <div className="notif-item-time">{n.time} · SMS + Email</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {loggedIn && (
            <div className="gh-user-chip">
              <User size={14} />
              <span>{profile.fullName || "Applicant"}</span>
            </div>
          )}
          {loggedIn && (
            <button className="gh-icon-btn" aria-label="Logout" onClick={onLogout}><LogOut size={17} /></button>
          )}
        </div>
      </div>
    </header>
  );
}

function WizardRibbon({ step }) {
  const steps = ["Service", "Application Form", "Documents", "Review", "Payment", "Confirmation"];
  return (
    <div className="wizard-ribbon">
      {steps.map((s, i) => {
        const idx = i + 1;
        const state = idx < step ? "done" : idx === step ? "active" : "todo";
        return (
          <div className="wizard-step" key={s}>
            <div className={`wizard-dot wizard-dot-${state}`}>{state === "done" ? <Check size={13} /> : idx}</div>
            <span className={`wizard-label wizard-label-${state}`}>{s}</span>
            {idx < steps.length && <div className={`wizard-connector ${idx < step ? "wizard-connector-done" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}

function NoteBanner({ children, tone = "amber", style }) {
  const Icon = tone === "blue" ? Info : AlertTriangle;
  return (
    <div className={`note-banner note-banner-${tone}`} style={style}>
      <Icon size={16} className="note-banner-icon" />
      <div>{children}</div>
    </div>
  );
}

function StatusBadge({ code }) {
  const meta = STATUS_META[code];
  if (!meta) return null;
  return <span className={`status-badge status-${meta.tone}`}>{meta.label}</span>;
}

function CertLifecycleBadge({ status }) {
  const meta = CERT_LIFECYCLE_META[status];
  if (!meta) return null;
  return <span className={`status-badge status-${meta.tone}`}>{meta.label}</span>;
}

function CertAppBadge({ status }) {
  const meta = CERT_APP_STATUS_META[status];
  if (!meta) return null;
  return <span className={`status-badge status-${meta.tone}`}>{meta.label}</span>;
}

function CertCountdownPanel({ cert }) {
  if (cert.status === "expired") {
    const overdue = Math.abs(cert.remainingDays).toLocaleString("en-IN");
    return (
      <div className="cert-countdown cert-countdown-expired">
        <XCircle size={20} />
        <div className="cert-countdown-title">Certificate Expired</div>
        <div className="cert-countdown-sub">Expired on {formatLongDate(cert.validUntil)} ({overdue} days ago)</div>
      </div>
    );
  }
  if (cert.status === "expiring") {
    return (
      <div className="cert-countdown cert-countdown-expiring">
        <AlertTriangle size={20} />
        <div className="cert-countdown-title">Expiring Soon</div>
        <div className="cert-countdown-value">{cert.remainingDays.toLocaleString("en-IN")}</div>
        <div className="cert-countdown-sub">days remaining · expires {formatLongDate(cert.validUntil)}</div>
      </div>
    );
  }
  return (
    <div className="cert-countdown cert-countdown-active">
      <CheckCircle2 size={20} />
      <div className="cert-countdown-title">Certificate Active</div>
      <div className="cert-countdown-value">{cert.remainingDays.toLocaleString("en-IN")}</div>
      <div className="cert-countdown-sub">days remaining · expires {formatLongDate(cert.validUntil)}</div>
    </div>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && <span className="required-star">*</span>}</label>
      {children}
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );
}

// Madhya Pradesh addresses get a dropdown of known values; every other state gets an
// open text field (with the same required validation) since we don't hold exhaustive
// district/block/ward lists for the rest of the country.
function LocationField({ isMP, options, value, onChange, disabled }) {
  return isMP ? (
    <select className="form-input" disabled={disabled} value={value} onChange={onChange}>
      <option value="">Select</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  ) : (
    <input className="form-input" disabled={disabled} value={value} onChange={onChange} />
  );
}

/* ---------------------------------------------------------------------- */
/* Main application                                                        */
/* ---------------------------------------------------------------------- */

export default function MPSVCPrototype() {
  const [screen, setScreen] = useState("login");
  const [loggedIn, setLoggedIn] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Entry flow. applicantType is "new" (never registered with MPSVC) or "existing"
  // (already holds a Provisional Certificate or a Registration Number). Only an
  // existing user logs in — they have a credential to be identified by. A new
  // applicant answers one question, which college they graduated from, because that
  // alone decides whether Provisional Registration is open to them, and goes straight
  // to the application form.
  const [applicantType, setApplicantType] = useState(null);
  const [collegeState, setCollegeState] = useState("");     // state the college sits in
  const [collegeChoice, setCollegeChoice] = useState("");   // MP college picked from the list
  const [collegeOtherName, setCollegeOtherName] = useState("");   // free-text college, non-MP
  const [collegeOtherUniversity, setCollegeOtherUniversity] = useState("");
  const [collegeError, setCollegeError] = useState("");
  // "mp" | "outside" — resolved from the answers above, keys into SERVICES_BY_COLLEGE
  const [collegeOrigin, setCollegeOrigin] = useState(null);

  // Existing-user login — which credential they identified themselves with. Keys into
  // SERVICES_BY_CREDENTIAL: a Provisional Certificate Number only unlocks New
  // Registration, a Registration Number unlocks the post-registration services.
  const [existingLoginTab, setExistingLoginTab] = useState("provisional");
  const [credentialType, setCredentialType] = useState(null);
  const [provCertInput, setProvCertInput] = useState("");
  const [provCertOtp, setProvCertOtp] = useState("");

  // contact admin — fallback when the citizen can't reach their registered mobile/email
  const [contactForm, setContactForm] = useState({ name: "", regNo: "", altContact: "", message: "" });
  const [contactFormError, setContactFormError] = useState("");
  const [contactTicketId, setContactTicketId] = useState("");

  const [regNoInput, setRegNoInput] = useState("");
  const [regnoOtp, setRegnoOtp] = useState("");

  // forgot registration number — look it up by name, email, and mobile number
  const [forgotRegnoName, setForgotRegnoName] = useState("");
  const [forgotRegnoEmail, setForgotRegnoEmail] = useState("");
  const [forgotRegnoMobile, setForgotRegnoMobile] = useState("");
  const [forgotRegnoError, setForgotRegnoError] = useState("");
  const [forgotRegnoResult, setForgotRegnoResult] = useState(null);

  const [profile, setProfile] = useState({ fullName: "", email: "", mobile: "" });

  // an already-completed Provisional Registration held by the logged-in citizen
  // (kept separate from the single "current application" state below so both can
  // be shown on the dashboard at once — see PROVISIONAL_RECORD)
  const [provisionalRecord, setProvisionalRecord] = useState(null);

  // a full Registration already issued and physically received, held by a citizen
  // who logged in via Registration Number — see MOCK_RECORD
  const [existingRegRecord, setExistingRegRecord] = useState(null);

  // certificate history / application-history detail shown for Registration Number
  // login — same shape and features as the standalone Certificate Management Portal
  const [certHistory, setCertHistory] = useState(CERT_HISTORY);
  const [certApplications, setCertApplications] = useState(CERT_INITIAL_APPLICATIONS);
  const [certScenario, setCertScenario] = useState("active");
  const [showCertDemoPanel, setShowCertDemoPanel] = useState(true);
  const [certViewerId, setCertViewerId] = useState(null);
  const [certViewerTab, setCertViewerTab] = useState("digital");
  const [certDupCertId, setCertDupCertId] = useState(null);
  const [certDupReason, setCertDupReason] = useState(DUPLICATE_REASONS[0]);
  const [certDupDetails, setCertDupDetails] = useState("");
  const [certSelectedAppId, setCertSelectedAppId] = useState(null);

  // application state
  const [serviceType, setServiceType] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState("");
  const [sigFile, setSigFile] = useState("");
  const [documents, setDocuments] = useState({});
  const [tncAccepted, setTncAccepted] = useState(false);
  // What an existing registrant says has changed since their last registration — drives
  // which sections expand inline in ScreenRenewalChoices.
  const [renewalChoices, setRenewalChoices] = useState({
    residentialAddress: false, professionalAddress: false, photo: false, otherDocument: false, qualification: false,
  });
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [challanNumber, setChallanNumber] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");

  const [appStatus, setAppStatus] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [sentBackRemarks, setSentBackRemarks] = useState("");
  const [remarksDraft, setRemarksDraft] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
  const [certificateIssueDate, setCertificateIssueDate] = useState("");
  const [certTab, setCertTab] = useState("digital");
  const [showCertPreview, setShowCertPreview] = useState(false);

  function pushNotification(message) {
    setNotifications(prev => [{ id: Date.now() + Math.random(), message, time: nowStamp() }, ...prev]);
  }

  function updateStatus(code, extra) {
    setAppStatus(code);
    setStatusHistory(prev => [...prev, { code, time: nowStamp() }]);
    const meta = STATUS_META[code];
    pushNotification(`${meta.label} — Application ${applicationId}`);
    if (extra) extra();
  }

  function resetAll() {
    setScreen("login"); setLoggedIn(false); setNotifOpen(false); setNotifications([]);
    setApplicantType(null); setCollegeState(""); setCollegeChoice(""); setCollegeOtherName("");
    setCollegeOtherUniversity(""); setCollegeError(""); setCollegeOrigin(null);
    setExistingLoginTab("provisional"); setCredentialType(null); setProvCertInput(""); setProvCertOtp("");
    setContactForm({ name: "", regNo: "", altContact: "", message: "" }); setContactFormError(""); setContactTicketId("");
    setRegNoInput(""); setRegnoOtp("");
    setForgotRegnoName(""); setForgotRegnoEmail(""); setForgotRegnoMobile("");
    setForgotRegnoError(""); setForgotRegnoResult(null);
    setProfile({ fullName: "", email: "", mobile: "" });
    setProvisionalRecord(null);
    setExistingRegRecord(null);
    setCertHistory(CERT_HISTORY); setCertApplications(CERT_INITIAL_APPLICATIONS);
    setCertScenario("active"); setShowCertDemoPanel(true); setCertViewerId(null);
    setCertViewerTab("digital"); setCertDupCertId(null); setCertSelectedAppId(null);
    setServiceType(null); setFormData(EMPTY_FORM); setPhotoFile(""); setSigFile("");
    setDocuments({}); setTncAccepted(false); setPaymentMethod(null); setChallanNumber(""); setApplicationId("");
    setRenewalChoices({ residentialAddress: false, professionalAddress: false, photo: false, otherDocument: false, qualification: false });
    setRegistrationNo(""); setAppStatus(null); setStatusHistory([]); setSentBackRemarks("");
    setRemarksDraft(""); setTrackingNumber(""); setDispatchDate(""); setCertificateIssueDate("");
    setCertTab("digital");
  }

  function goDashboard() { setScreen("dashboard"); }

  // The single source of truth for "which services is this citizen allowed to apply
  // for" — driven by how they entered the portal. An existing user's credential decides
  // it (Registration Number vs. Provisional Certificate Number); a new applicant's
  // college decides it (inside Madhya Pradesh vs. outside). See SERVICES_BY_* above.
  function availableServices() {
    if (credentialType) return SERVICES_BY_CREDENTIAL[credentialType];
    return SERVICES_BY_COLLEGE[collegeOrigin] || SERVICES_BY_COLLEGE.outside;
  }

  // A first-time applicant never logs in, so the portal only learns who they are from
  // the application itself. Called on submission, this fills the profile behind the
  // header and the dashboard greeting from what they entered on the form. An existing
  // user's profile already came from their record at login, so it is left alone.
  // Leaving the application form goes back to wherever the service was chosen — the
  // college screen for a first-time applicant (so they can change college as well as
  // service), the service menu for a logged-in existing user.
  function backFromForm() {
    setScreen(credentialType ? "service-select" : "college-check");
  }

  function syncProfileFromForm() {
    if (existingRegRecord || provisionalRecord) return;
    setProfile(p => ({
      fullName: applicantDisplayName() || p.fullName,
      email: formData.email || p.email,
      mobile: formData.mobile1 || p.mobile,
    }));
  }

  // Provisional Registration and New Registration both collect First/Middle/Last Name
  // separately rather than a single Full Name field — this reassembles a display name
  // for certificate previews regardless of which service is active.
  function applicantDisplayName() {
    if (serviceType === "provisional" || serviceType === "new" || serviceType === "transfer-in") {
      return [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" ");
    }
    return formData.fullName;
  }

  /* ---------------------------- Certificate history / applications ---------------------------- */

  function findCertHistoryEntry(id) {
    return decoratedCertHistory().find(c => c.id === id);
  }
  function findCertApplication(id) {
    return certApplications.find(a => a.id === id);
  }
  function decoratedCertHistory() {
    const asOf = CERT_SCENARIO_ASOF[certScenario];
    return certHistory.map((c, i) => {
      const isCurrent = i === certHistory.length - 1;
      const days = certDiffInDays(asOf, c.validUntil);
      const status = !isCurrent ? "superseded" : days < 0 ? "expired" : days <= 120 ? "expiring" : "active";
      return { ...c, isCurrent, status, remainingDays: days };
    });
  }

  function openCertDuplicate(certId) {
    setCertDupCertId(certId);
    setCertDupReason(DUPLICATE_REASONS[0]);
    setCertDupDetails("");
  }
  function closeCertDuplicate() { setCertDupCertId(null); }

  function submitCertDuplicate() {
    const appNo = genCertAppNo("DUP");
    const app = {
      id: `capp-${Date.now()}`,
      kind: "duplicate",
      appNo,
      status: "under_review",
      submittedOn: nowStamp(),
      relatedCertId: certDupCertId,
      reason: certDupReason,
      details: certDupDetails,
      timeline: [
        { status: "submitted", time: nowStamp() },
        { status: "under_review", time: nowStamp() },
      ],
    };
    setCertApplications(prev => [app, ...prev]);
    closeCertDuplicate();
    pushNotification(`Duplicate certificate application ${appNo} submitted.`);
    setCertSelectedAppId(app.id);
    setScreen("cert-application-detail");
  }

  function advanceCertApplication(appId, newStatus) {
    setCertApplications(prev => prev.map(a => a.id === appId
      ? { ...a, status: newStatus, timeline: [...a.timeline, { status: newStatus, time: nowStamp() }] }
      : a));
  }

  // Moves the citizen from a completed Provisional Registration into a fresh New
  // Registration application. Works whether they arrived via the demo shortcut
  // (provisionalRecord already set) or by actually completing a Provisional
  // Registration through the normal apply flow (serviceType/applicationId) —
  // in the latter case it first snapshots that completed application into
  // provisionalRecord so it stays visible on the dashboard, then clears the
  // "current application" slot so it can be reused for the new application.
  function applyForNewRegistration() {
    let record = provisionalRecord;
    if (!record && serviceType === "provisional" && applicationId) {
      record = {
        certNo: registrationNo || applicationId,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        firstName: formData.firstName, middleName: formData.middleName,
        lastName: formData.lastName, fatherName: formData.fatherName,
        dob: formData.dob, gender: formData.gender,
        resAddress: formData.resAddress, resAreaType: formData.resAreaType, resPostOffice: formData.resPostOffice,
        resState: formData.resState, resDistrict: formData.resDistrict, resPincode: formData.resPincode,
        resBlock: formData.resBlock, resPanchayat: formData.resPanchayat, resGram: formData.resGram,
        resCity: formData.resCity, resWard: formData.resWard,
        mobile1: formData.mobile1, mobile2: formData.mobile2, mobile: formData.mobile1,
        email: formData.email,
        provUniversityName: formData.provUniversityName, provCollegeName: formData.provCollegeName,
        provPassingYear: formData.provPassingYear,
        issueDate: certificateIssueDate,
      };
      setProvisionalRecord(record);
    }
    setServiceType("new");
    // Personal details, Residential Address, and Contact carry straight across from the
    // Provisional application (same field names); the B.V.Sc row of the Qualification
    // table is seeded from the Provisional degree info. Everything New Registration asks
    // for beyond that (Organization/Department/Sector, Professional Address, other
    // qualifications, NOC) has no Provisional equivalent and is left for the citizen to fill.
    setFormData(f => ({
      ...f,
      firstName: record?.firstName || f.firstName, middleName: record?.middleName || f.middleName,
      lastName: record?.lastName || f.lastName, fatherName: record?.fatherName || f.fatherName,
      dob: record?.dob || f.dob, gender: record?.gender || f.gender,
      resAddress: record?.resAddress || f.resAddress, resAreaType: record?.resAreaType || f.resAreaType,
      resPostOffice: record?.resPostOffice || f.resPostOffice,
      resState: record?.resState || f.resState, resDistrict: record?.resDistrict || f.resDistrict,
      resPincode: record?.resPincode || f.resPincode,
      resBlock: record?.resBlock || f.resBlock, resPanchayat: record?.resPanchayat || f.resPanchayat,
      resGram: record?.resGram || f.resGram, resCity: record?.resCity || f.resCity, resWard: record?.resWard || f.resWard,
      mobile1: record?.mobile1 || f.mobile1, mobile2: record?.mobile2 || f.mobile2,
      email: record?.email || f.email,
      qualBvscUniversity: record?.provUniversityName || f.qualBvscUniversity,
      qualBvscCollege: record?.provCollegeName || f.qualBvscCollege,
      qualBvscYear: record?.provPassingYear || f.qualBvscYear,
    }));
    setApplicationId(""); setAppStatus(null); setStatusHistory([]); setSentBackRemarks("");
    setRegistrationNo(""); setCertificateIssueDate(""); setTrackingNumber(""); setDispatchDate("");
    setCertTab("digital"); setDocuments({}); setPhotoFile(""); setSigFile("");
    setChallanNumber(""); setPaymentMethod("online");
    setScreen("app-form");
  }

  /* ---------------------------- Screens ---------------------------- */

  function ScreenLogin() {
    return (
      <div className="page-narrow">
        <div className="entry-hero">
          <div className="entry-hero-badge"><ShieldCheck size={26} /></div>
          <h1>Madhya Pradesh State Veterinary Council</h1>
          <p>Apply for registration, track your application, and download your certificate online.</p>
        </div>

        <div className="login-options">
          <div
            className="login-option-card login-option-card-staff"
            role="button" tabIndex={0}
            onClick={() => { window.location.href = import.meta.env.BASE_URL + "back-office.html"; }}
          >
            <div className="login-option-icon"><Building2 size={22} /></div>
            <div className="login-option-body">
              <div className="login-option-title">Office Login</div>
              <div className="login-option-desc">For Scrutiny Officer / Approving Authority (Office User Portal).</div>
            </div>
            <ChevronRight size={18} className="login-option-arrow" />
          </div>

          <div className="login-options-label">Are you new to MPSVC, or already registered?</div>

          <div
            className="login-option-card"
            role="button" tabIndex={0}
            onClick={() => {
              setApplicantType("new");
              setCredentialType(null);
              setCollegeError("");
              setServiceType(null);
              setScreen("college-check");
            }}
          >
            <div className="login-option-icon"><UserPlus size={22} /></div>
            <div className="login-option-body">
              <div className="login-option-title">I am a New Applicant</div>
              <div className="login-option-desc">
                I have never registered with the Council.
              </div>
            </div>
            <ChevronRight size={18} className="login-option-arrow" />
          </div>

          <div
            className="login-option-card login-option-card-regno"
            role="button" tabIndex={0}
            onClick={() => {
              setApplicantType("existing");
              setCredentialType(null);
              setExistingLoginTab("provisional");
              setScreen("existing-login");
            }}
          >
            <div className="login-option-icon"><Award size={22} /></div>
            <div className="login-option-body">
              <div className="login-option-title">I am Already Registered</div>
              <div className="login-option-desc">
                I hold an MPSVC Provisional Certificate Number or Registration Number.
              </div>
            </div>
            <ChevronRight size={18} className="login-option-arrow" />
          </div>
        </div>
      </div>
    );
  }

  /* ---- New applicant, step 1: which college did they graduate from? ----
     This is asked before login because it is the only thing that decides whether
     Provisional Registration is available — it is reserved for students of recognised
     Madhya Pradesh colleges (Schedule II). An out-of-state graduate goes straight to
     New Registration instead. Either way Transfer-In stays on the menu. */

  function ScreenCollegeCheck() {
    const isMP = collegeState === "Madhya Pradesh";
    // As soon as the state is known so is the service menu, so the citizen picks the
    // service here rather than on a separate screen after login.
    const choices = collegeState ? SERVICES_BY_COLLEGE[isMP ? "mp" : "outside"] : null;

    function chooseService(key) {
      if (isMP && !collegeChoice) { setCollegeError("Select your college."); return; }
      if (!isMP && !collegeOtherName.trim()) { setCollegeError("Enter the name of your college."); return; }

      const origin = isMP ? "mp" : "outside";
      const college = isMP ? collegeChoice : collegeOtherName.trim();
      const university = isMP ? "Nanaji Deshmukh Veterinary Science University, Jabalpur" : collegeOtherUniversity.trim();
      setCollegeOrigin(origin);
      setCollegeError("");
      setServiceType(key);
      // No login stands between the citizen and the form — a first-time applicant has
      // no credential to log in with, and the application itself collects their name,
      // mobile number and email. The profile behind the header is filled in from those
      // answers when the application is submitted (see syncProfileFromForm).
      setLoggedIn(true);
      // Carry the answer into every form that asks for the same thing, so the citizen
      // never re-types it — Provisional uses provCollegeName, New Registration /
      // Transfer-In use the B.V.Sc row of the Qualification table, and the
      // Renewal-style form uses collegeName/university.
      setFormData(f => ({
        ...f,
        collegeName: college, university: university || f.university,
        provCollegeName: isMP ? college : f.provCollegeName,
        qualBvscCollege: college, qualBvscUniversity: university || f.qualBvscUniversity,
      }));
      setScreen("app-form");
    }

    return (
      <div className="page-narrow">
        <BackLink onClick={() => setScreen("login")} />
        <div className="card">
          <div className="card-header">Your Veterinary College</div>
          <div className="card-body">
            <p className="muted-text">
              Tell us where you completed your veterinary degree. Provisional Registration is granted only to
              students of a recognised Madhya Pradesh college, so this decides which services you can apply for.
            </p>

            <Field label="State of your College / University" required>
              <select className="form-input" value={collegeState}
                onChange={e => { setCollegeState(e.target.value); setCollegeChoice(""); setCollegeError(""); }}>
                <option value="">Select</option>
                {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>

            {isMP ? (
              <Field label="College Name" required>
                <select className="form-input" value={collegeChoice}
                  onChange={e => { setCollegeChoice(e.target.value); setCollegeError(""); }}>
                  <option value="">Select</option>
                  {MP_VET_COLLEGES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            ) : collegeState ? (
              <>
                <Field label="College Name" required>
                  <input className="form-input" placeholder="e.g. College of Veterinary Science, Nagpur"
                    value={collegeOtherName}
                    onChange={e => { setCollegeOtherName(e.target.value); setCollegeError(""); }} />
                </Field>
                <Field label="University Name" hint="The university your college is affiliated to.">
                  <input className="form-input" placeholder="e.g. Maharashtra Animal & Fishery Sciences University"
                    value={collegeOtherUniversity} onChange={e => setCollegeOtherUniversity(e.target.value)} />
                </Field>
              </>
            ) : null}

            {choices && (
              <>
                <div className="section-title">
                  How would you like to proceed?
                  <span className="section-title-tag">{isMP ? "Madhya Pradesh College" : "College outside Madhya Pradesh"}</span>
                </div>
                <p className="muted-text small-muted">
                  {isMP
                    ? "As a Madhya Pradesh graduate you may apply for Provisional Registration first, or transfer in an existing registration from another State Council."
                    : "Provisional Registration is reserved for Madhya Pradesh college students, so you can apply directly for New Registration, or transfer in an existing registration from another State Council."}
                </p>
                <div className="service-grid">
                  {choices.map(key => {
                    const Icon = SERVICE_ICONS[key] || GraduationCap;
                    return (
                      <div className="service-card" role="button" tabIndex={0} key={key}
                        onClick={() => chooseService(key)}>
                        <Icon size={20} />
                        <div className="service-card-label">
                          {SERVICES[key].label}
                          <div className="service-card-sub">
                            {key === "transfer-in"
                              ? "I already hold a registration with another State Veterinary Council."
                              : key === "provisional"
                                ? "I have completed my course and need a provisional certificate."
                                : "I am registering with MPSVC for the first time."}
                          </div>
                        </div>
                        <ChevronRight size={16} className="service-card-arrow" />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {collegeError && <div className="form-error">{collegeError}</div>}
          </div>
        </div>
      </div>
    );
  }

  /* ---- Already registered: identify by Provisional Certificate Number or by
     Registration Number. The credential is not just a way in — it decides what the
     citizen can do next (see SERVICES_BY_CREDENTIAL). Someone who only ever completed
     Provisional Registration can look at that certificate's history and go on to apply
     for New Registration; someone holding a full Registration Number is past that and
     gets the post-registration services instead. ---- */

  function ScreenExistingLogin() {
    const onProv = existingLoginTab === "provisional";
    return (
      <div className="page-narrow">
        <BackLink onClick={() => setScreen("login")} />
        <div className="card">
          <div className="card-header">Existing User Login</div>
          <div className="card-body">
            <div className="login-method-toggle">
              <button
                type="button"
                className={`login-method-tab ${onProv ? "login-method-tab-active" : ""}`}
                onClick={() => setExistingLoginTab("provisional")}
              >
                <GraduationCap size={14} /> Provisional Certificate No.
              </button>
              <button
                type="button"
                className={`login-method-tab ${!onProv ? "login-method-tab-active" : ""}`}
                onClick={() => setExistingLoginTab("regno")}
              >
                <Award size={14} /> Registration Number
              </button>
            </div>

            <div className="login-info-panel">
              {onProv ? (
                <div className="login-info-block">
                  <div className="login-info-label"><GraduationCap size={13} /> Provisional Certificate Number</div>
                  <div className="login-info-chips">
                    <span className="login-info-chip">New Registration</span>
                    <span className="login-info-chip">Provisional Certificate History</span>
                  </div>
                  <p className="login-info-note">
                    Your Provisional Registration is already on file. From here you can view that certificate and its
                    history, and apply for New Registration.
                  </p>
                </div>
              ) : (
                <div className="login-info-block">
                  <div className="login-info-label login-info-label-regno"><Award size={13} /> Registration Number</div>
                  <div className="login-info-chips">
                    {SERVICES_BY_CREDENTIAL.regno.map(k => (
                      <span key={k} className="login-info-chip login-info-chip-regno">{SERVICES[k].label}</span>
                    ))}
                  </div>
                  <p className="login-info-note">
                    You already hold a full MPSVC registration. You can view the details or apply for these services
                    using your Registration Number.
                  </p>
                </div>
              )}
            </div>

            {onProv ? (
              <>
                <Field label="Provisional Certificate Number" required hint="An OTP will be sent to the mobile number registered against this certificate.">
                  <input className="form-input" placeholder="MPSVC/PROV/2025/00187" value={provCertInput}
                    onChange={e => setProvCertInput(e.target.value)} />
                </Field>
                <p className="muted-text small-muted">Demo: this screen accepts any entry and loads a sample provisional record — {PROVISIONAL_RECORD.fullName} ({PROVISIONAL_RECORD.certNo}).</p>
                <button className="btn btn-primary btn-block" onClick={() => {
                  setProvCertOtp("");
                  setScreen("prov-cert-otp");
                }}>Send OTP</button>
              </>
            ) : (
              <>
                <Field label="MPSVC Registration Number" required hint="An OTP will be sent to the mobile number registered against this Registration Number.">
                  <input className="form-input" placeholder="MPSVC/REG/2018/00452" value={regNoInput}
                    onChange={e => setRegNoInput(e.target.value)} />
                </Field>
                <p className="muted-text small-muted">Demo: this screen accepts any entry and loads a sample registration record — {MOCK_RECORD.fullName} ({MOCK_RECORD.regNo}).</p>
                <button className="btn btn-primary btn-block" onClick={() => {
                  setRegnoOtp("");
                  setScreen("regno-otp");
                }}>Send OTP</button>

                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 6 }}>
                  <button className="btn btn-link" style={{ padding: 0 }}
                    onClick={() => {
                      setForgotRegnoName(""); setForgotRegnoEmail(""); setForgotRegnoMobile("");
                      setForgotRegnoError(""); setForgotRegnoResult(null);
                      setScreen("forgot-regno");
                    }}>
                    Forgot Registration Number?
                  </button>
                </div>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
              <button className="btn btn-link" style={{ padding: 0 }}
                onClick={() => {
                  setContactForm({ name: "", regNo: "", altContact: "", message: "" });
                  setContactFormError(""); setContactTicketId("");
                  setScreen("contact-admin");
                }}>
                Can't access the registered mobile number? Contact Admin
              </button>
            </div>
          </div>
        </div>

        <button
          className="demo-shortcut"
          role="button" tabIndex={0}
          onClick={() => {
            setProvisionalRecord(PROVISIONAL_RECORD);
            setProfile({ fullName: PROVISIONAL_RECORD.fullName, email: PROVISIONAL_RECORD.email, mobile: PROVISIONAL_RECORD.mobile });
            setCredentialType("provisional");

            // This demo citizen has already gone on to apply for New Registration and
            // has received its digital certificate — physical dispatch is left pending
            // so Track Status / Certificate still have something to demonstrate.
            setServiceType("new");
            setFormData(f => ({
              ...f,
              firstName: PROVISIONAL_RECORD.firstName, middleName: PROVISIONAL_RECORD.middleName,
              lastName: PROVISIONAL_RECORD.lastName, fatherName: PROVISIONAL_RECORD.fatherName,
              dob: PROVISIONAL_RECORD.dob, gender: PROVISIONAL_RECORD.gender,
              resAddress: PROVISIONAL_RECORD.resAddress, resAreaType: PROVISIONAL_RECORD.resAreaType,
              resPostOffice: PROVISIONAL_RECORD.resPostOffice, resState: PROVISIONAL_RECORD.resState,
              resDistrict: PROVISIONAL_RECORD.resDistrict, resPincode: PROVISIONAL_RECORD.resPincode,
              resCity: PROVISIONAL_RECORD.resCity, resWard: PROVISIONAL_RECORD.resWard,
              mobile1: PROVISIONAL_RECORD.mobile1, mobile2: PROVISIONAL_RECORD.mobile2,
              email: PROVISIONAL_RECORD.email,
              qualBvscUniversity: PROVISIONAL_RECORD.provUniversityName,
              qualBvscCollege: PROVISIONAL_RECORD.provCollegeName,
              qualBvscYear: PROVISIONAL_RECORD.provPassingYear,
            }));
            setPhotoFile(NEW_REG_RECORD.photoFile);
            setSigFile(NEW_REG_RECORD.sigFile);
            setDocuments({
              domicileCert: "domicile_certificate.pdf",
              gradDegreeCert: "degree_certificate.pdf",
              photo: NEW_REG_RECORD.photoFile,
              marksheet10: "10th_marksheet.pdf",
            });
            setPaymentMethod("online");
            setApplicationId(NEW_REG_RECORD.applicationId);
            setRegistrationNo(NEW_REG_RECORD.registrationNo);
            setCertificateIssueDate(NEW_REG_RECORD.issueDate);
            setAppStatus("certificate_issued");
            setStatusHistory([
              { code: "submitted_payment_confirmed", time: NEW_REG_RECORD.submittedOn },
              { code: "under_scrutiny", time: NEW_REG_RECORD.scrutinyOn },
              { code: "approved", time: NEW_REG_RECORD.approvedOn },
              { code: "certificate_issued", time: NEW_REG_RECORD.issueDate },
            ]);

            setLoggedIn(true);
            setScreen("dashboard");
          }}
        >
          <div className="demo-shortcut-icon"><Sparkles size={15} /></div>
          <div className="demo-shortcut-body">
            <div className="demo-shortcut-label">Prototype Shortcut</div>
            <div className="demo-shortcut-title">Sign in as an applicant who has already gone on from Provisional to New Registration</div>
          </div>
          <ChevronRight size={16} color="var(--mp-amber-text)" />
        </button>
      </div>
    );
  }

  // Provisional Certificate Number login — lands on a dashboard holding nothing but the
  // provisional certificate and its history, with New Registration as the next step.
  function ScreenProvCertOtp() {
    return (
      <div className="page-narrow">
        <BackLink onClick={() => setScreen("existing-login")} />
        <div className="card">
          <div className="card-header">Verify OTP</div>
          <div className="card-body">
            <p className="muted-text">
              An OTP has been sent to the mobile number registered against <strong>{provCertInput || PROVISIONAL_RECORD.certNo}</strong>.
              (Demo — no validation, any entry will be accepted)
            </p>
            <Field label="Enter OTP" required>
              <input className="form-input" maxLength={6} placeholder="6-digit OTP" value={provCertOtp}
                onChange={e => setProvCertOtp(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <button className="btn btn-primary btn-block" onClick={() => {
              setProvisionalRecord(PROVISIONAL_RECORD);
              setProfile({ fullName: PROVISIONAL_RECORD.fullName, email: PROVISIONAL_RECORD.email, mobile: PROVISIONAL_RECORD.mobile });
              setCredentialType("provisional");
                // Seed the details the Council already holds against this provisional
              // certificate so the New Registration form opens pre-filled.
              setFormData(f => ({
                ...f,
                firstName: PROVISIONAL_RECORD.firstName, middleName: PROVISIONAL_RECORD.middleName,
                lastName: PROVISIONAL_RECORD.lastName, fatherName: PROVISIONAL_RECORD.fatherName,
                dob: PROVISIONAL_RECORD.dob, gender: PROVISIONAL_RECORD.gender,
                resAddress: PROVISIONAL_RECORD.resAddress, resAreaType: PROVISIONAL_RECORD.resAreaType,
                resPostOffice: PROVISIONAL_RECORD.resPostOffice, resState: PROVISIONAL_RECORD.resState,
                resDistrict: PROVISIONAL_RECORD.resDistrict, resPincode: PROVISIONAL_RECORD.resPincode,
                resCity: PROVISIONAL_RECORD.resCity, resWard: PROVISIONAL_RECORD.resWard,
                mobile1: PROVISIONAL_RECORD.mobile1, mobile2: PROVISIONAL_RECORD.mobile2,
                email: PROVISIONAL_RECORD.email,
                provUniversityName: PROVISIONAL_RECORD.provUniversityName,
                provCollegeName: PROVISIONAL_RECORD.provCollegeName,
                provPassingYear: PROVISIONAL_RECORD.provPassingYear,
                qualBvscUniversity: PROVISIONAL_RECORD.provUniversityName,
                qualBvscCollege: PROVISIONAL_RECORD.provCollegeName,
                qualBvscYear: PROVISIONAL_RECORD.provPassingYear,
              }));
              setLoggedIn(true);
              setScreen("dashboard");
            }}>Verify OTP</button>
            <button className="btn btn-link" onClick={() => setProvCertOtp("")}>Resend OTP</button>
          </div>
        </div>
      </div>
    );
  }

  function ScreenRegnoOtp() {
    return (
      <div className="page-narrow">
        <BackLink onClick={() => setScreen("existing-login")} />
        <div className="card">
          <div className="card-header">Verify OTP</div>
          <div className="card-body">
            <p className="muted-text">
              An OTP has been sent to the mobile number registered against <strong>{regNoInput || MOCK_RECORD.regNo}</strong>.
              (Demo — no validation, any entry will be accepted)
            </p>
            <Field label="Enter OTP" required>
              <input className="form-input" maxLength={6} placeholder="6-digit OTP" value={regnoOtp}
                onChange={e => setRegnoOtp(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <button className="btn btn-primary btn-block" onClick={() => {
              setProfile({ fullName: MOCK_RECORD.fullName, email: MOCK_RECORD.email, mobile: MOCK_RECORD.mobile });
              setExistingRegRecord(MOCK_RECORD);
              setCredentialType("regno");
              setFormData(f => ({
                ...f,
                fullName: MOCK_RECORD.fullName, collegeName: MOCK_RECORD.collegeName,
                guardianName: MOCK_RECORD.guardianName, dob: MOCK_RECORD.dob, gender: MOCK_RECORD.gender,
                category: MOCK_RECORD.category, address: MOCK_RECORD.address, degree: MOCK_RECORD.degree,
                university: MOCK_RECORD.university, yearOfPassing: MOCK_RECORD.yearOfPassing,
                existingRegNo: MOCK_RECORD.regNo, existingRegValidTill: MOCK_RECORD.existingRegValidTill,
                bankName: MOCK_RECORD.bankName,
              }));
              setLoggedIn(true);
              setScreen("dashboard");
            }}>Verify OTP</button>
            <button className="btn btn-link" onClick={() => setRegnoOtp("")}>Resend OTP</button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Forgot Registration Number: look it up by name, email, and mobile number ---- */

  function ScreenForgotRegno() {
    return (
      <div className="page-narrow">
        <BackLink onClick={() => setScreen("existing-login")} />
        <div className="card">
          <div className="card-header">Forgot Registration Number</div>
          <div className="card-body">
            <p className="muted-text">
              Enter the details on file with your MPSVC profile and we'll look up your registration number for you.
            </p>
            <Field label="Full Name" required>
              <input className="form-input" value={forgotRegnoName}
                onChange={e => { setForgotRegnoName(e.target.value); setForgotRegnoError(""); }} />
            </Field>
            <Field label="Registered Email ID" required>
              <input className="form-input" type="email" placeholder="you@example.com" value={forgotRegnoEmail}
                onChange={e => { setForgotRegnoEmail(e.target.value); setForgotRegnoError(""); }} />
            </Field>
            <Field label="Registered Mobile Number" required hint="10-digit mobile number registered with you.">
              <input className="form-input" type="tel" maxLength={10} placeholder="9876543210" value={forgotRegnoMobile}
                onChange={e => { setForgotRegnoMobile(e.target.value.replace(/\D/g, "")); setForgotRegnoError(""); }} />
            </Field>
            {forgotRegnoError && <div className="form-error">{forgotRegnoError}</div>}
            <p className="muted-text small-muted">Demo: this screen accepts any entry and matches it to a sample registration record — {MOCK_RECORD.fullName}.</p>
            <button className="btn btn-primary btn-block" onClick={() => {
              if (!forgotRegnoName.trim() || !forgotRegnoEmail.trim() || forgotRegnoMobile.length !== 10) {
                setForgotRegnoError("Enter your full name, registered email ID, and a valid 10-digit mobile number.");
                return;
              }
              setForgotRegnoResult(MOCK_RECORD);
              setScreen("forgot-regno-result");
            }}>Search Registration Number</button>
          </div>
        </div>
      </div>
    );
  }

  function ScreenForgotRegnoResult() {
    if (!forgotRegnoResult) {
      return (
        <div className="page-narrow">
          <BackLink onClick={() => setScreen("forgot-regno")} />
          <div className="card"><div className="card-body muted-text">No matching registration found. Please check your details and try again.</div></div>
        </div>
      );
    }
    const r = forgotRegnoResult;
    return (
      <div className="page-narrow">
        <BackLink onClick={() => setScreen("forgot-regno")} />
        <div className="card">
          <div className="card-header">Registration Number Found</div>
          <div className="card-body">
            <NoteBanner tone="blue">A match was found against the details you provided.</NoteBanner>
            <div className="challan-box">
              <span className="challan-label">MPSVC Registration Number</span>
              <span className="challan-number">{r.regNo}</span>
              <span className="challan-amount">{r.fullName}</span>
            </div>
            <button className="btn btn-primary btn-block" onClick={() => {
              setRegNoInput(r.regNo);
              setExistingLoginTab("regno");
              setScreen("existing-login");
            }}>Login with this Registration Number</button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Contact Admin: fallback when both mobile and email are lost ---- */

  function ScreenContactAdmin() {
    if (contactTicketId) {
      return (
        <div className="page-narrow">
          <div className="result-panel result-success">
            <CheckCircle2 size={44} />
            <h2>Request Submitted</h2>
            <p>
              Your request has been sent to the MPSVC office. Reference number <strong>{contactTicketId}</strong>.
              An administrator will verify your identity and contact you on the alternate number provided.
            </p>
            <button className="btn btn-primary" onClick={() => setScreen("login")}>Back to Login</button>
          </div>
        </div>
      );
    }
    return (
      <div className="page-narrow">
        <BackLink onClick={() => setScreen("existing-login")} />
        <div className="card">
          <div className="card-header">Contact Admin</div>
          <div className="card-body">
            <p className="muted-text">
              If you've lost access to both your registered mobile number and email ID, share a few details below and
              the MPSVC office will get in touch to help you recover access to your account.
            </p>
            <Field label="Full Name" required>
              <input className="form-input" value={contactForm.name}
                onChange={e => setContactForm({ ...contactForm, name: e.target.value })} />
            </Field>
            <Field label="MPSVC Registration Number" hint="If you know it — helps the office locate your record faster.">
              <input className="form-input" placeholder="MPSVC/REG/2018/00452" value={contactForm.regNo}
                onChange={e => setContactForm({ ...contactForm, regNo: e.target.value })} />
            </Field>
            <Field label="Alternate Contact Number" required hint="A number the office can reach you on.">
              <input className="form-input" type="tel" maxLength={10} placeholder="9876543210" value={contactForm.altContact}
                onChange={e => setContactForm({ ...contactForm, altContact: e.target.value.replace(/\D/g, "") })} />
            </Field>
            <Field label="Message" required hint="Briefly describe your issue.">
              <textarea className="form-input" rows={3} placeholder="I have lost access to both my registered mobile number and email ID…"
                value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} />
            </Field>
            {contactFormError && <div className="form-error">{contactFormError}</div>}
            <button className="btn btn-primary btn-block" onClick={() => {
              if (!contactForm.name.trim() || contactForm.altContact.length !== 10 || !contactForm.message.trim()) {
                setContactFormError("Please fill in your name, a valid 10-digit alternate number, and a message.");
                return;
              }
              const ticketId = `MPSVC-HELP-${Math.floor(1000 + Math.random() * 9000)}`;
              setContactTicketId(ticketId);
              pushNotification(`Contact Admin request submitted — Reference ${ticketId}`);
            }}>Submit Request</button>
          </div>
        </div>
      </div>
    );
  }

  const SERVICE_ICONS = {
    provisional: GraduationCap, new: UserPlus, "transfer-in": ArrowLeftRight,
    renewal: RefreshCw, "transfer-out": ArrowLeftRight, "add-qualification": Award,
  };

  function ScreenServiceSelect({ options }) {
    // Spell out why this particular menu is on offer — the list is not the same for
    // every citizen, it is the result of the college / credential question they
    // answered on the way in (see availableServices).
    const reason =
      credentialType === "regno" ? "These are the services available against your MPSVC Registration Number."
      : credentialType === "provisional" ? "Your Provisional Registration is already on file, so New Registration is the next step."
      : applicantType === "new" && collegeOrigin === "mp" ? `Your college (${formData.collegeName}) is in Madhya Pradesh, so Provisional Registration is open to you.`
      : applicantType === "new" ? `Your college (${formData.collegeName}) is outside Madhya Pradesh, so you may apply for New Registration directly.`
      : "Choose the service you'd like to apply for.";
    return (
      <div className="page-narrow">
        <div className="card">
          <div className="card-header">Select a Service</div>
          <div className="card-body">
            <p className="muted-text">Welcome, {profile.fullName || "Applicant"}. {reason}</p>
            <div className="service-grid">
              {options.map(key => {
                const Icon = SERVICE_ICONS[key] || GraduationCap;
                return (
                  <div className="service-card" role="button" tabIndex={0} key={key}
                    onClick={() => {
                      setServiceType(key);
                      if (key !== "renewal" && key !== "transfer-out" && key !== "add-qualification") {
                        setFormData(f => ({ ...f, fullName: profile.fullName || f.fullName }));
                      }
                      setScreen("app-form");
                    }}>
                    <Icon size={20} />
                    <div className="service-card-label">{SERVICES[key].label}</div>
                    <ChevronRight size={16} className="service-card-arrow" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ScreenProvisionalAppForm() {
    const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));

    function toggleSameAsResidential(checked) {
      setFormData(f => ({
        ...f,
        sameAsResidential: checked,
        ...(checked ? {
          permAddress: f.resAddress, permAreaType: f.resAreaType, permPostOffice: f.resPostOffice,
          permState: f.resState, permDistrict: f.resDistrict, permPincode: f.resPincode,
          permBlock: f.resBlock, permPanchayat: f.resPanchayat, permGram: f.resGram,
          permCity: f.resCity, permWard: f.resWard,
        } : {}),
      }));
    }

    // Picking a Pincode auto-populates the matching Post Office (Madhya Pradesh only —
    // outside MP both fields are open text, so there's nothing to look up).
    function handlePincodeChange(prefix, pincode) {
      const match = MP_PINCODE_POST_OFFICES.find(p => p.pincode === pincode);
      setFormData(f => ({
        ...f,
        [`${prefix}Pincode`]: pincode,
        [`${prefix}PostOffice`]: match ? match.postOffice : f[`${prefix}PostOffice`],
      }));
    }

    return (
      <div className="page-wide">
        <BackLink onClick={() => backFromForm()} />
        <WizardRibbon step={2} />
        <div className="card">
          <div className="card-header">Application Form — {SERVICES.provisional.label}</div>
          <div className="card-body">
            <div className="section-title">Terms &amp; Conditions</div>
            <NoteBanner>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {PROVISIONAL_TNC.map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            </NoteBanner>
            <label className="checkbox-row" style={{ marginTop: 10 }}>
              <input type="checkbox" checked={tncAccepted} onChange={e => setTncAccepted(e.target.checked)} />
              <span>I have read and agree to the above Terms &amp; Conditions.</span>
            </label>

            <div className="section-title">Personal Details</div>
            <div className="two-col-grid">
              <Field label="First Name">
                <input className="form-input" value={formData.firstName} onChange={e => set("firstName", e.target.value)} />
              </Field>
              <Field label="Middle Name">
                <input className="form-input" value={formData.middleName} onChange={e => set("middleName", e.target.value)} />
              </Field>
              <Field label="Last Name">
                <input className="form-input" value={formData.lastName} onChange={e => set("lastName", e.target.value)} />
              </Field>
              <Field label="Father Name">
                <input className="form-input" value={formData.fatherName} onChange={e => set("fatherName", e.target.value)} />
              </Field>
              <Field label="Date Of Birth">
                <input className="form-input" type="date" value={formData.dob} onChange={e => set("dob", e.target.value)} />
              </Field>
              <Field label="Gender">
                <select className="form-input" value={formData.gender} onChange={e => set("gender", e.target.value)}>
                  <option value="">Select</option><option>Male</option><option>Female</option><option>Transgender</option>
                </select>
              </Field>
            </div>

            <div className="section-title">Residential Address</div>
            <div className="two-col-grid">
              <Field label="Area Type">
                <select className="form-input" value={formData.resAreaType} onChange={e => set("resAreaType", e.target.value)}>
                  <option value="">Select</option>
                  {AREA_TYPES.map(a => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="State" hint="Only recognized colleges of Madhya Pradesh are eligible (see Terms & Conditions).">
                <input className="form-input" value={formData.resState} readOnly />
              </Field>
              <Field label="District">
                <LocationField isMP options={MP_DISTRICTS} value={formData.resDistrict} onChange={e => set("resDistrict", e.target.value)} />
              </Field>
              {formData.resAreaType === "Rural" && (
                <>
                  <Field label="Block">
                    <LocationField isMP options={MP_BLOCKS} value={formData.resBlock} onChange={e => set("resBlock", e.target.value)} />
                  </Field>
                  <Field label="Panchayat">
                    <LocationField isMP options={MP_PANCHAYATS} value={formData.resPanchayat} onChange={e => set("resPanchayat", e.target.value)} />
                  </Field>
                  <Field label="Gram">
                    <LocationField isMP options={MP_GRAMS} value={formData.resGram} onChange={e => set("resGram", e.target.value)} />
                  </Field>
                </>
              )}
              {formData.resAreaType === "Urban" && (
                <>
                  <Field label="City">
                    <LocationField isMP options={MP_DISTRICTS} value={formData.resCity} onChange={e => set("resCity", e.target.value)} />
                  </Field>
                  <Field label="Ward">
                    <LocationField isMP options={MP_WARDS} value={formData.resWard} onChange={e => set("resWard", e.target.value)} />
                  </Field>
                </>
              )}
              <Field label="Pin Code">
                <LocationField isMP options={MP_PINCODES} value={formData.resPincode} onChange={e => handlePincodeChange("res", e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="Post Office" hint="Auto-filled from Pin Code — change it if a different post office applies.">
                <LocationField isMP options={MP_POST_OFFICES} value={formData.resPostOffice} onChange={e => set("resPostOffice", e.target.value)} />
              </Field>
            </div>
            <Field label="Complete Address">
              <textarea className="form-input" rows={2} value={formData.resAddress} onChange={e => set("resAddress", e.target.value)} />
            </Field>

            <div className="section-title">Permanent Address</div>
            <label className="checkbox-row" style={{ marginBottom: 10 }}>
              <input type="checkbox" checked={formData.sameAsResidential} onChange={e => toggleSameAsResidential(e.target.checked)} />
              <span>Same as Residential Address</span>
            </label>
            <div className="two-col-grid">
              <Field label="Area Type">
                <select className="form-input" disabled={formData.sameAsResidential} value={formData.permAreaType} onChange={e => set("permAreaType", e.target.value)}>
                  <option value="">Select</option>
                  {AREA_TYPES.map(a => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="State">
                <select className="form-input" disabled={formData.sameAsResidential} value={formData.permState} onChange={e => set("permState", e.target.value)}>
                  <option value="">Select</option>
                  {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="District">
                <LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_DISTRICTS} value={formData.permDistrict} onChange={e => set("permDistrict", e.target.value)} />
              </Field>
              {formData.permAreaType === "Rural" && (
                <>
                  <Field label="Block">
                    <LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_BLOCKS} value={formData.permBlock} onChange={e => set("permBlock", e.target.value)} />
                  </Field>
                  <Field label="Panchayat">
                    <LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_PANCHAYATS} value={formData.permPanchayat} onChange={e => set("permPanchayat", e.target.value)} />
                  </Field>
                  <Field label="Gram">
                    <LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_GRAMS} value={formData.permGram} onChange={e => set("permGram", e.target.value)} />
                  </Field>
                </>
              )}
              {formData.permAreaType === "Urban" && (
                <>
                  <Field label="City">
                    <LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_DISTRICTS} value={formData.permCity} onChange={e => set("permCity", e.target.value)} />
                  </Field>
                  <Field label="Ward">
                    <LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_WARDS} value={formData.permWard} onChange={e => set("permWard", e.target.value)} />
                  </Field>
                </>
              )}
              <Field label="Pin Code">
                <LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_PINCODES} value={formData.permPincode} onChange={e => handlePincodeChange("perm", e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="Post Office" hint="Auto-filled from Pin Code — change it if a different post office applies.">
                <LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_POST_OFFICES} value={formData.permPostOffice} onChange={e => set("permPostOffice", e.target.value)} />
              </Field>
            </div>
            <Field label="Complete Address">
              <textarea className="form-input" rows={2} disabled={formData.sameAsResidential} value={formData.permAddress} onChange={e => set("permAddress", e.target.value)} />
            </Field>

            <div className="section-title">Contact Details</div>
            <div className="two-col-grid">
              <Field label="Preferred Address">
                <select className="form-input" value={formData.preferredAddress} onChange={e => set("preferredAddress", e.target.value)}>
                  <option value="">Select</option>
                  <option>Residential Address</option>
                  <option>Permanent Address</option>
                </select>
              </Field>
              <Field label="Email Id">
                <input className="form-input" type="email" value={formData.email} onChange={e => set("email", e.target.value)} />
              </Field>
              <Field label="Primary Mobile No.">
                <input className="form-input" maxLength={10} value={formData.mobile1} onChange={e => set("mobile1", e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="Alternate Mobile Number">
                <input className="form-input" maxLength={10} value={formData.mobile2} onChange={e => set("mobile2", e.target.value.replace(/\D/g, ""))} />
              </Field>
            </div>

            <div className="section-title">Qualification</div>
            <div className="two-col-grid">
              <Field label="Roll No">
                <input className="form-input" value={formData.rollNo} onChange={e => set("rollNo", e.target.value)} />
              </Field>
              <Field label="University Enrollment No">
                <input className="form-input" value={formData.universityEnrollmentNo} onChange={e => set("universityEnrollmentNo", e.target.value)} />
              </Field>
              <Field label="Degree Name">
                <input className="form-input" value={formData.provDegreeName} readOnly />
              </Field>
              <Field label="Name of University">
                <input className="form-input" value={formData.provUniversityName} readOnly />
              </Field>
              <Field label="Name of College">
                <select className="form-input" value={formData.provCollegeName} onChange={e => set("provCollegeName", e.target.value)}>
                  <option value="">Select</option>
                  {MP_VET_COLLEGES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Passing Year">
                <select className="form-input" value={formData.provPassingYear} onChange={e => set("provPassingYear", e.target.value)}>
                  <option value="">Select</option>
                  {PROVISIONAL_PASSING_YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
              </Field>
            </div>

            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => backFromForm()}><ChevronLeft size={16} /> Back</button>
              <button className="btn btn-primary" onClick={() => setScreen("doc-upload")}>Continue to Documents <ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // New Registration and Transfer-In to MP — official MPSVC field set (see SERVICES.new).
  // Personal Details, Residential Address, and Contact reuse the exact same formData
  // keys as Provisional Registration above, so a citizen's Provisional details can be
  // copied straight across into this form — see applyForNewRegistration().
  function ScreenNewRegistrationForm() {
    const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));
    const isTransferIn = serviceType === "transfer-in";

    function toggleSameAsResidential(checked) {
      setFormData(f => ({
        ...f,
        sameAsResidential: checked,
        ...(checked ? {
          permAddress: f.resAddress, permAreaType: f.resAreaType, permPostOffice: f.resPostOffice,
          permState: f.resState, permDistrict: f.resDistrict, permPincode: f.resPincode,
          permBlock: f.resBlock, permPanchayat: f.resPanchayat, permGram: f.resGram,
          permCity: f.resCity, permWard: f.resWard,
        } : {}),
      }));
    }

    // Picking a Pincode auto-populates the matching Post Office (Madhya Pradesh only —
    // outside MP both fields are open text, so there's nothing to look up).
    function handlePincodeChange(prefix, pincode) {
      const match = MP_PINCODE_POST_OFFICES.find(p => p.pincode === pincode);
      setFormData(f => ({
        ...f,
        [`${prefix}Pincode`]: pincode,
        [`${prefix}PostOffice`]: match ? match.postOffice : f[`${prefix}PostOffice`],
      }));
    }

    return (
      <div className="page-wide">
        <BackLink onClick={() => backFromForm()} />
        <WizardRibbon step={2} />
        <div className="card">
          <div className="card-header">Application Form — {SERVICES[serviceType].label}</div>
          <div className="card-body">
            <NoteBanner>
              Application form fields shown here will be exactly as they appear on the official MPSVC.org portal.
            </NoteBanner>

            <div className="section-title">Personal Details</div>
            <div className="two-col-grid">
              <Field label="First Name"><input className="form-input" value={formData.firstName} onChange={e => set("firstName", e.target.value)} /></Field>
              <Field label="Middle Name"><input className="form-input" value={formData.middleName} onChange={e => set("middleName", e.target.value)} /></Field>
              <Field label="Last Name"><input className="form-input" value={formData.lastName} onChange={e => set("lastName", e.target.value)} /></Field>
              <Field label="Father Name"><input className="form-input" value={formData.fatherName} onChange={e => set("fatherName", e.target.value)} /></Field>
              <Field label="Date Of Birth"><input className="form-input" type="date" value={formData.dob} onChange={e => set("dob", e.target.value)} /></Field>
              <Field label="Gender">
                <select className="form-input" value={formData.gender} onChange={e => set("gender", e.target.value)}>
                  <option value="">Select</option><option>Male</option><option>Female</option><option>Transgender</option>
                </select>
              </Field>
              <Field label="Organization"><input className="form-input" value={formData.organization} onChange={e => set("organization", e.target.value)} /></Field>
              <Field label="Department"><input className="form-input" value={formData.department} onChange={e => set("department", e.target.value)} /></Field>
              <Field label="Designation"><input className="form-input" value={formData.designation} onChange={e => set("designation", e.target.value)} /></Field>
              <Field label="Sector">
                <select className="form-input" value={formData.sector} onChange={e => set("sector", e.target.value)}>
                  <option value="">Select</option>
                  {SECTOR_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <div className="section-title">Residential Address</div>
            <div className="two-col-grid">
              <Field label="Area Type">
                <select className="form-input" value={formData.resAreaType} onChange={e => set("resAreaType", e.target.value)}>
                  <option value="">Select</option>
                  {AREA_TYPES.map(a => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="State"><input className="form-input" value={formData.resState} readOnly /></Field>
              <Field label="District"><LocationField isMP options={MP_DISTRICTS} value={formData.resDistrict} onChange={e => set("resDistrict", e.target.value)} /></Field>
              {formData.resAreaType === "Rural" && (
                <>
                  <Field label="Block"><LocationField isMP options={MP_BLOCKS} value={formData.resBlock} onChange={e => set("resBlock", e.target.value)} /></Field>
                  <Field label="Panchayat"><LocationField isMP options={MP_PANCHAYATS} value={formData.resPanchayat} onChange={e => set("resPanchayat", e.target.value)} /></Field>
                  <Field label="Gram"><LocationField isMP options={MP_GRAMS} value={formData.resGram} onChange={e => set("resGram", e.target.value)} /></Field>
                </>
              )}
              {formData.resAreaType === "Urban" && (
                <>
                  <Field label="City"><LocationField isMP options={MP_DISTRICTS} value={formData.resCity} onChange={e => set("resCity", e.target.value)} /></Field>
                  <Field label="Ward"><LocationField isMP options={MP_WARDS} value={formData.resWard} onChange={e => set("resWard", e.target.value)} /></Field>
                </>
              )}
              <Field label="Pin Code"><LocationField isMP options={MP_PINCODES} value={formData.resPincode} onChange={e => handlePincodeChange("res", e.target.value.replace(/\D/g, ""))} /></Field>
              <Field label="Post Office" hint="Auto-filled from Pin Code — change it if a different post office applies.">
                <LocationField isMP options={MP_POST_OFFICES} value={formData.resPostOffice} onChange={e => set("resPostOffice", e.target.value)} />
              </Field>
            </div>
            <Field label="Complete Address"><textarea className="form-input" rows={2} value={formData.resAddress} onChange={e => set("resAddress", e.target.value)} /></Field>

            <div className="section-title">Professional Address</div>
            <div className="two-col-grid">
              <Field label="Area Type">
                <select className="form-input" value={formData.proAreaType} onChange={e => set("proAreaType", e.target.value)}>
                  <option value="">Select</option>
                  {AREA_TYPES.map(a => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="State"><input className="form-input" value={formData.proState} readOnly /></Field>
              <Field label="District"><LocationField isMP options={MP_DISTRICTS} value={formData.proDistrict} onChange={e => set("proDistrict", e.target.value)} /></Field>
              {formData.proAreaType === "Rural" && (
                <>
                  <Field label="Block"><LocationField isMP options={MP_BLOCKS} value={formData.proBlock} onChange={e => set("proBlock", e.target.value)} /></Field>
                  <Field label="Panchayat"><LocationField isMP options={MP_PANCHAYATS} value={formData.proPanchayat} onChange={e => set("proPanchayat", e.target.value)} /></Field>
                  <Field label="Gram"><LocationField isMP options={MP_GRAMS} value={formData.proGram} onChange={e => set("proGram", e.target.value)} /></Field>
                </>
              )}
              {formData.proAreaType === "Urban" && (
                <>
                  <Field label="City"><LocationField isMP options={MP_DISTRICTS} value={formData.proCity} onChange={e => set("proCity", e.target.value)} /></Field>
                  <Field label="Ward"><LocationField isMP options={MP_WARDS} value={formData.proWard} onChange={e => set("proWard", e.target.value)} /></Field>
                </>
              )}
              <Field label="Pin Code"><LocationField isMP options={MP_PINCODES} value={formData.proPincode} onChange={e => handlePincodeChange("pro", e.target.value.replace(/\D/g, ""))} /></Field>
              <Field label="Post Office" hint="Auto-filled from Pin Code — change it if a different post office applies.">
                <LocationField isMP options={MP_POST_OFFICES} value={formData.proPostOffice} onChange={e => set("proPostOffice", e.target.value)} />
              </Field>
            </div>
            <Field label="Complete Address"><textarea className="form-input" rows={2} value={formData.proAddress} onChange={e => set("proAddress", e.target.value)} /></Field>

            <div className="section-title">Permanent Address</div>
            <label className="checkbox-row" style={{ marginBottom: 10 }}>
              <input type="checkbox" checked={formData.sameAsResidential} onChange={e => toggleSameAsResidential(e.target.checked)} />
              <span>Same as Residential Address</span>
            </label>
            <div className="two-col-grid">
              <Field label="Area Type">
                <select className="form-input" disabled={formData.sameAsResidential} value={formData.permAreaType} onChange={e => set("permAreaType", e.target.value)}>
                  <option value="">Select</option>
                  {AREA_TYPES.map(a => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="State">
                <select className="form-input" disabled={formData.sameAsResidential} value={formData.permState} onChange={e => set("permState", e.target.value)}>
                  <option value="">Select</option>
                  {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="District"><LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_DISTRICTS} value={formData.permDistrict} onChange={e => set("permDistrict", e.target.value)} /></Field>
              {formData.permAreaType === "Rural" && (
                <>
                  <Field label="Block"><LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_BLOCKS} value={formData.permBlock} onChange={e => set("permBlock", e.target.value)} /></Field>
                  <Field label="Panchayat"><LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_PANCHAYATS} value={formData.permPanchayat} onChange={e => set("permPanchayat", e.target.value)} /></Field>
                  <Field label="Gram"><LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_GRAMS} value={formData.permGram} onChange={e => set("permGram", e.target.value)} /></Field>
                </>
              )}
              {formData.permAreaType === "Urban" && (
                <>
                  <Field label="City"><LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_DISTRICTS} value={formData.permCity} onChange={e => set("permCity", e.target.value)} /></Field>
                  <Field label="Ward"><LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_WARDS} value={formData.permWard} onChange={e => set("permWard", e.target.value)} /></Field>
                </>
              )}
              <Field label="Pin Code"><LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_PINCODES} value={formData.permPincode} onChange={e => handlePincodeChange("perm", e.target.value.replace(/\D/g, ""))} /></Field>
              <Field label="Post Office" hint="Auto-filled from Pin Code — change it if a different post office applies.">
                <LocationField isMP={formData.permState === "Madhya Pradesh"} disabled={formData.sameAsResidential} options={MP_POST_OFFICES} value={formData.permPostOffice} onChange={e => set("permPostOffice", e.target.value)} />
              </Field>
            </div>
            <Field label="Complete Address"><textarea className="form-input" rows={2} disabled={formData.sameAsResidential} value={formData.permAddress} onChange={e => set("permAddress", e.target.value)} /></Field>

            <div className="section-title">Contact Details</div>
            <div className="two-col-grid">
              <Field label="Preferred Address">
                <select className="form-input" value={formData.preferredAddress} onChange={e => set("preferredAddress", e.target.value)}>
                  <option value="">Select</option>
                  <option>Residential Address</option>
                  <option>Professional Address</option>
                  <option>Permanent Address</option>
                </select>
              </Field>
              <Field label="Land-Line No."><input className="form-input" value={formData.landline} onChange={e => set("landline", e.target.value)} /></Field>
              <Field label="Primary Mobile No."><input className="form-input" maxLength={10} value={formData.mobile1} onChange={e => set("mobile1", e.target.value.replace(/\D/g, ""))} /></Field>
              <Field label="Alternate Mobile Number"><input className="form-input" maxLength={10} value={formData.mobile2} onChange={e => set("mobile2", e.target.value.replace(/\D/g, ""))} /></Field>
              <Field label="Fax No."><input className="form-input" value={formData.fax} onChange={e => set("fax", e.target.value)} /></Field>
              <Field label="Email Id"><input className="form-input" type="email" value={formData.email} onChange={e => set("email", e.target.value)} /></Field>
            </div>

            <div className="section-title">Qualification</div>
            <div className="table-scroll">
              <table className="cert-history-table">
                <thead>
                  <tr><th>Degree Name</th><th>Name of University</th><th>Name of College</th><th>Passing Year</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>B.V.SC.&amp; A.H.</td>
                    <td>
                      <select className="form-input" value={formData.qualBvscUniversity} onChange={e => set("qualBvscUniversity", e.target.value)}>
                        <option value="">Select</option>
                        {VET_UNIVERSITIES.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-input" value={formData.qualBvscCollege} onChange={e => set("qualBvscCollege", e.target.value)}>
                        <option value="">Select</option>
                        {MP_VET_COLLEGES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-input" value={formData.qualBvscYear} onChange={e => set("qualBvscYear", e.target.value)}>
                        <option value="">Select</option>
                        {NEW_REG_PASSING_YEARS.map(y => <option key={y}>{y}</option>)}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td>M.V.SC.</td>
                    <td>
                      <select className="form-input" value={formData.qualMvscUniversity} onChange={e => set("qualMvscUniversity", e.target.value)}>
                        <option value="">Select</option>
                        {VET_UNIVERSITIES.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-input" value={formData.qualMvscCollege} onChange={e => set("qualMvscCollege", e.target.value)}>
                        <option value="">Select</option>
                        {MP_VET_COLLEGES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-input" value={formData.qualMvscYear} onChange={e => set("qualMvscYear", e.target.value)}>
                        <option value="">Select</option>
                        {NEW_REG_PASSING_YEARS.map(y => <option key={y}>{y}</option>)}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td>PHD</td>
                    <td>
                      <select className="form-input" value={formData.qualPhdUniversity} onChange={e => set("qualPhdUniversity", e.target.value)}>
                        <option value="">Select</option>
                        {VET_UNIVERSITIES.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-input" value={formData.qualPhdCollege} onChange={e => set("qualPhdCollege", e.target.value)}>
                        <option value="">Select</option>
                        {MP_VET_COLLEGES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-input" value={formData.qualPhdYear} onChange={e => set("qualPhdYear", e.target.value)}>
                        <option value="">Select</option>
                        {NEW_REG_PASSING_YEARS.map(y => <option key={y}>{y}</option>)}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td><input className="form-input" placeholder="Other Degree Name" value={formData.qualOtherDegreeName} onChange={e => set("qualOtherDegreeName", e.target.value)} /></td>
                    <td>
                      <select className="form-input" value={formData.qualOtherUniversity} onChange={e => set("qualOtherUniversity", e.target.value)}>
                        <option value="">Select</option>
                        {VET_UNIVERSITIES.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-input" value={formData.qualOtherCollege} onChange={e => set("qualOtherCollege", e.target.value)}>
                        <option value="">Select</option>
                        {MP_VET_COLLEGES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-input" value={formData.qualOtherYear} onChange={e => set("qualOtherYear", e.target.value)}>
                        <option value="">Select</option>
                        {NEW_REG_PASSING_YEARS.map(y => <option key={y}>{y}</option>)}
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="two-col-grid">
              <Field label="Graduation Degree / PDC Date"><input className="form-input" type="date" value={formData.gradDate} onChange={e => set("gradDate", e.target.value)} /></Field>
              <Field label="Degree Id"><input className="form-input" value={formData.degreeId} onChange={e => set("degreeId", e.target.value)} /></Field>
            </div>

            {isTransferIn && (
              <>
                <div className="section-title">Previous State Council Details <span className="section-title-tag">NOC Required</span></div>
                <div className="two-col-grid">
                  <Field label="Previous State Council Name"><input className="form-input" value={formData.nocPrevCouncilName} onChange={e => set("nocPrevCouncilName", e.target.value)} /></Field>
                  <Field label="Previous Registration Number"><input className="form-input" value={formData.nocPrevRegNo} onChange={e => set("nocPrevRegNo", e.target.value)} /></Field>
                  <Field label="Previous Registration Date"><input className="form-input" type="date" value={formData.nocPrevRegDate} onChange={e => set("nocPrevRegDate", e.target.value)} /></Field>
                </div>
                <Field label="Details" hint="Briefly describe the reason for transfer and NOC status.">
                  <textarea className="form-input" rows={2} value={formData.nocDetails} onChange={e => set("nocDetails", e.target.value)} />
                </Field>
              </>
            )}

            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => backFromForm()}><ChevronLeft size={16} /> Back</button>
              <button className="btn btn-primary" onClick={() => setScreen("doc-upload")}>Continue to Documents <ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Renewal is a returning registrant touching up a record the office already has on
  // file, not a fresh application — so instead of dumping every field from ScreenAppForm
  // on them again, we ask what's actually changed and only show those sections.
  function ScreenRenewalChoices() {
    const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));
    const toggle = (key) => setRenewalChoices(c => ({ ...c, [key]: !c[key] }));
    const anySelected = Object.values(renewalChoices).some(Boolean);

    // Picking a Pincode auto-populates the matching Post Office (Madhya Pradesh only —
    // outside MP both fields are open text, so there's nothing to look up).
    function handlePincodeChange(prefix, pincode) {
      const match = MP_PINCODE_POST_OFFICES.find(p => p.pincode === pincode);
      setFormData(f => ({
        ...f,
        [`${prefix}Pincode`]: pincode,
        [`${prefix}PostOffice`]: match ? match.postOffice : f[`${prefix}PostOffice`],
      }));
    }

    const offlineDetailsComplete = formData.chequeDDNo && formData.bankName && formData.paymentDate;

    function handleSubmit() {
      if (paymentMethod !== "offline" || !offlineDetailsComplete) return;
      // Demo hand-off: the citizen portal and the back-office are separate, unconnected
      // prototypes, so this is a cosmetic redirect rather than a real queue hand-off.
      window.location.href = import.meta.env.BASE_URL + "back-office.html";
    }

    const choices = [
      {
        key: "residentialAddress", icon: <Home size={20} />, title: "Residential Address",
        desc: "Your home address has changed since your last registration.",
        fields: (
          <>
            <div className="two-col-grid">
              <Field label="Area Type">
                <select className="form-input" value={formData.resAreaType} onChange={e => set("resAreaType", e.target.value)}>
                  <option value="">Select</option>
                  {AREA_TYPES.map(a => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="State"><input className="form-input" value={formData.resState} readOnly /></Field>
              <Field label="District">
                <LocationField isMP options={MP_DISTRICTS} value={formData.resDistrict} onChange={e => set("resDistrict", e.target.value)} />
              </Field>
              {formData.resAreaType === "Rural" && (
                <>
                  <Field label="Block"><LocationField isMP options={MP_BLOCKS} value={formData.resBlock} onChange={e => set("resBlock", e.target.value)} /></Field>
                  <Field label="Panchayat"><LocationField isMP options={MP_PANCHAYATS} value={formData.resPanchayat} onChange={e => set("resPanchayat", e.target.value)} /></Field>
                  <Field label="Gram"><LocationField isMP options={MP_GRAMS} value={formData.resGram} onChange={e => set("resGram", e.target.value)} /></Field>
                </>
              )}
              {formData.resAreaType === "Urban" && (
                <>
                  <Field label="City"><LocationField isMP options={MP_DISTRICTS} value={formData.resCity} onChange={e => set("resCity", e.target.value)} /></Field>
                  <Field label="Ward"><LocationField isMP options={MP_WARDS} value={formData.resWard} onChange={e => set("resWard", e.target.value)} /></Field>
                </>
              )}
              <Field label="Pin Code">
                <LocationField isMP options={MP_PINCODES} value={formData.resPincode} onChange={e => handlePincodeChange("res", e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="Post Office" hint="Auto-filled from Pin Code — change it if a different post office applies.">
                <LocationField isMP options={MP_POST_OFFICES} value={formData.resPostOffice} onChange={e => set("resPostOffice", e.target.value)} />
              </Field>
            </div>
            <Field label="Complete Address">
              <textarea className="form-input" rows={2} value={formData.resAddress} onChange={e => set("resAddress", e.target.value)} />
            </Field>
          </>
        ),
      },
      {
        key: "professionalAddress", icon: <Building2 size={20} />, title: "Professional Address",
        desc: "Your place of practice / employment address has changed.",
        fields: (
          <>
            <div className="two-col-grid">
              <Field label="Area Type">
                <select className="form-input" value={formData.proAreaType} onChange={e => set("proAreaType", e.target.value)}>
                  <option value="">Select</option>
                  {AREA_TYPES.map(a => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="State"><input className="form-input" value={formData.proState} readOnly /></Field>
              <Field label="District"><LocationField isMP options={MP_DISTRICTS} value={formData.proDistrict} onChange={e => set("proDistrict", e.target.value)} /></Field>
              {formData.proAreaType === "Rural" && (
                <>
                  <Field label="Block"><LocationField isMP options={MP_BLOCKS} value={formData.proBlock} onChange={e => set("proBlock", e.target.value)} /></Field>
                  <Field label="Panchayat"><LocationField isMP options={MP_PANCHAYATS} value={formData.proPanchayat} onChange={e => set("proPanchayat", e.target.value)} /></Field>
                  <Field label="Gram"><LocationField isMP options={MP_GRAMS} value={formData.proGram} onChange={e => set("proGram", e.target.value)} /></Field>
                </>
              )}
              {formData.proAreaType === "Urban" && (
                <>
                  <Field label="City"><LocationField isMP options={MP_DISTRICTS} value={formData.proCity} onChange={e => set("proCity", e.target.value)} /></Field>
                  <Field label="Ward"><LocationField isMP options={MP_WARDS} value={formData.proWard} onChange={e => set("proWard", e.target.value)} /></Field>
                </>
              )}
              <Field label="Pin Code">
                <LocationField isMP options={MP_PINCODES} value={formData.proPincode} onChange={e => handlePincodeChange("pro", e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="Post Office" hint="Auto-filled from Pin Code — change it if a different post office applies.">
                <LocationField isMP options={MP_POST_OFFICES} value={formData.proPostOffice} onChange={e => set("proPostOffice", e.target.value)} />
              </Field>
            </div>
            <Field label="Complete Address">
              <textarea className="form-input" rows={2} value={formData.proAddress} onChange={e => set("proAddress", e.target.value)} />
            </Field>
          </>
        ),
      },
      {
        key: "photo", icon: <Camera size={20} />, title: "Photo",
        desc: "Upload a new photograph for your renewed certificate.",
        fields: (
          <div className="two-col-grid">
            <UploadBox icon={<Camera size={18} />} label="Photograph" fileName={photoFile} onPick={f => setPhotoFile(f)} format="photo" hint={PHOTO_HINT} />
          </div>
        ),
      },
      {
        key: "otherDocument", icon: <FileText size={20} />, title: "Attach Other Document",
        desc: "Attach any additional supporting document for this renewal.",
        fields: (
          <div className="two-col-grid">
            <UploadBox
              icon={<FileText size={18} />} label="Other Document"
              fileName={documents.other?.fileName}
              onPick={name => setDocuments(d => ({ ...d, other: { uploaded: true, fileName: name } }))}
              format="pdf"
            />
          </div>
        ),
      },
      {
        key: "qualification", icon: <Award size={20} />, title: "Add Other Qualification",
        desc: "Add a further qualification earned since your last registration.",
        fields: (
          <div className="two-col-grid">
            <Field label="Degree / Qualification">
              <select className="form-input" value={formData.addlQualDegree} onChange={e => set("addlQualDegree", e.target.value)}>
                <option value="">Select</option>
                <option>M.V.Sc.</option><option>Ph.D.</option><option>Post Graduate Diploma</option><option>Other</option>
              </select>
            </Field>
            <Field label="Specialization / Subject"><input className="form-input" value={formData.addlQualSpecialization} onChange={e => set("addlQualSpecialization", e.target.value)} /></Field>
            <Field label="University"><input className="form-input" value={formData.addlQualUniversity} onChange={e => set("addlQualUniversity", e.target.value)} /></Field>
            <Field label="College / Institute"><input className="form-input" value={formData.addlQualCollege} onChange={e => set("addlQualCollege", e.target.value)} /></Field>
            <Field label="Year of Passing"><input className="form-input" value={formData.addlQualYear} onChange={e => set("addlQualYear", e.target.value)} /></Field>
          </div>
        ),
      },
    ];

    return (
      <div className="page-wide">
        <BackLink onClick={goDashboard} />
        <div className="card">
          <div className="card-header">Apply for Renewal</div>
          <div className="card-body">
            <NoteBanner>
              Your existing registration details are carried forward automatically. Tell us only what's changed since
              your last registration — click a card below to open and fill in just that section.
            </NoteBanner>

            <div className="section-title">What would you like to update?</div>
            <div className="radio-card-group">
              {choices.map(c => (
                <div key={c.key}>
                  <div
                    className={`radio-card ${renewalChoices[c.key] ? "selected" : ""}`}
                    role="button" tabIndex={0}
                    onClick={() => toggle(c.key)}
                  >
                    {c.icon}
                    <div style={{ flexGrow: 1 }}>
                      <div className="radio-card-title">{c.title}</div>
                      <div className="radio-card-desc">{c.desc}</div>
                    </div>
                    {renewalChoices[c.key] && <Check size={18} />}
                  </div>
                  {renewalChoices[c.key] && (
                    <div style={{ padding: "14px 16px", marginTop: -8, marginBottom: 8, border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 10px 10px" }}>
                      {c.fields}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {!anySelected && (
              <p className="form-hint">Nothing selected — if none of your details have changed, continue to submit your renewal as-is.</p>
            )}

            <div className="section-title">How would you like to pay?</div>
            <div className="radio-card-group">
              <div className="radio-card disabled" title="Online payment is temporarily unavailable for renewals.">
                <CreditCard size={20} />
                <div>
                  <div className="radio-card-title">Online Payment</div>
                  <div className="radio-card-desc">Pay instantly via UPI / Card / Net Banking.</div>
                </div>
                <span className="radio-card-badge">Unavailable</span>
              </div>
              <div
                className={`radio-card ${paymentMethod === "offline" ? "selected" : ""}`}
                role="button" tabIndex={0}
                onClick={() => setPaymentMethod("offline")}
              >
                <Landmark size={20} />
                <div>
                  <div className="radio-card-title">Offline Payment</div>
                  <div className="radio-card-desc">Generate a Challan and pay at a designated bank / kiosk.</div>
                </div>
              </div>
            </div>

            {paymentMethod === "offline" && (
              <>
                <div className="section-title">Payment Details</div>
                <div className="two-col-grid">
                  <Field label="Challan / Cheque / DD No">
                    <input className="form-input" value={formData.chequeDDNo} onChange={e => set("chequeDDNo", e.target.value)} placeholder="Enter after paying at the bank / kiosk" />
                  </Field>
                  <Field label="Bank Name" hint="Fetched from your registration record — change it if you're paying through a different bank.">
                    <input className="form-input" value={formData.bankName} onChange={e => set("bankName", e.target.value)} />
                  </Field>
                  <Field label="Payment Date">
                    <input className="form-input" type="date" value={formData.paymentDate} onChange={e => set("paymentDate", e.target.value)} />
                  </Field>
                </div>
              </>
            )}

            <NoteBanner tone="amber">
              After you submit, you'll get a Challan/Reference Number to pay the renewal fee offline at a designated
              bank / kiosk. The office processes your renewal once that payment is confirmed.
            </NoteBanner>

            <div className="form-actions">
              <button className="btn btn-outline" onClick={goDashboard}>Cancel</button>
              <button className="btn btn-primary" disabled={!offlineDetailsComplete} onClick={handleSubmit}>Submit Application &amp; Pay Offline <ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ScreenAppForm() {
    if (serviceType === "provisional") return <ScreenProvisionalAppForm />;
    if (serviceType === "new" || serviceType === "transfer-in") return <ScreenNewRegistrationForm />;
    const isTransfer = serviceType === "transfer-out";
    const isRenewal = serviceType === "renewal";
    const isAddQual = serviceType === "add-qualification";
    const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));

    return (
      <div className="page-wide">
        <BackLink onClick={() => backFromForm()} />
        <WizardRibbon step={2} />
        <div className="card">
          <div className="card-header">Application Form — {SERVICES[serviceType].label}</div>
          <div className="card-body">
            <NoteBanner>
              Application form fields shown here will be exactly as they appear on the official MPSVC.org portal.
            </NoteBanner>

            <div className="section-title">Applicant Details</div>
            <div className="two-col-grid">
              <Field label="Full Name"><input className="form-input" value={formData.fullName} onChange={e => set("fullName", e.target.value)} /></Field>
              <Field label="College Name (for Provisional Certificate)">
                <select className="form-input" value={formData.collegeName} onChange={e => set("collegeName", e.target.value)}>
                  <option value="">Select</option>
                  {MP_VET_COLLEGES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Father's / Husband's Name"><input className="form-input" value={formData.guardianName} onChange={e => set("guardianName", e.target.value)} /></Field>
              <Field label="Date of Birth"><input className="form-input" type="date" value={formData.dob} onChange={e => set("dob", e.target.value)} /></Field>
              <Field label="Gender">
                <select className="form-input" value={formData.gender} onChange={e => set("gender", e.target.value)}>
                  <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                </select>
              </Field>
              <Field label="Category">
                <select className="form-input" value={formData.category} onChange={e => set("category", e.target.value)}>
                  <option value="">Select</option><option>General</option><option>OBC</option><option>SC</option><option>ST</option><option>EWS</option>
                </select>
              </Field>
            </div>
            <Field label="Address"><textarea className="form-input" rows={2} value={formData.address} onChange={e => set("address", e.target.value)} /></Field>

            <div className="section-title">Qualification Details</div>
            <div className="two-col-grid">
              <Field label="Degree"><input className="form-input" value={formData.degree} onChange={e => set("degree", e.target.value)} /></Field>
              <Field label="University"><input className="form-input" value={formData.university} onChange={e => set("university", e.target.value)} /></Field>
              <Field label="Year of Passing"><input className="form-input" value={formData.yearOfPassing} onChange={e => set("yearOfPassing", e.target.value)} /></Field>
            </div>

            <div className="section-title">ID Proof</div>
            <div className="two-col-grid">
              <Field label="ID Proof Type">
                <select className="form-input" value={formData.idProofType} onChange={e => set("idProofType", e.target.value)}>
                  <option value="">Select</option><option>Aadhaar</option><option>PAN</option><option>Voter ID</option>
                </select>
              </Field>
              <Field label="ID Proof Number"><input className="form-input" value={formData.idProofNumber} onChange={e => set("idProofNumber", e.target.value)} /></Field>
            </div>

            <div className="section-title">Photograph &amp; Signature</div>
            <div className="two-col-grid">
              <UploadBox icon={<Camera size={18} />} label="Photograph" fileName={photoFile} onPick={f => setPhotoFile(f)} format="photo" hint={PHOTO_HINT} />
              <UploadBox icon={<PenTool size={18} />} label="Signature" fileName={sigFile} onPick={f => setSigFile(f)} format="photo" />
            </div>

            {isTransfer && (
              <>
                <div className="section-title">Previous State Council Details <span className="section-title-tag">Transfer Out</span></div>
                <div className="two-col-grid">
                  <Field label="Previous State Council Name"><input className="form-input" value={formData.prevCouncilName} onChange={e => set("prevCouncilName", e.target.value)} /></Field>
                  <Field label="Previous Registration Number"><input className="form-input" value={formData.prevRegNo} onChange={e => set("prevRegNo", e.target.value)} /></Field>
                  <Field label="Previous Registration Date"><input className="form-input" type="date" value={formData.prevRegDate} onChange={e => set("prevRegDate", e.target.value)} /></Field>
                  <Field label="Reason for Transfer"><input className="form-input" value={formData.transferReason} onChange={e => set("transferReason", e.target.value)} /></Field>
                </div>
              </>
            )}

            {isAddQual && (
              <>
                {/* The registration itself is unchanged — this application only adds a
                    further qualification (M.V.Sc., Ph.D., diploma) to the existing
                    record, so the existing registration is shown read-only alongside. */}
                <div className="section-title">Qualification to be Added <span className="section-title-tag">Addition of Qualification</span></div>
                <div className="two-col-grid">
                  <Field label="Existing Registration Number"><input className="form-input" value={formData.existingRegNo} readOnly /></Field>
                  <Field label="Degree / Qualification">
                    <select className="form-input" value={formData.addlQualDegree} onChange={e => set("addlQualDegree", e.target.value)}>
                      <option value="">Select</option>
                      <option>M.V.Sc.</option><option>Ph.D.</option><option>Post Graduate Diploma</option><option>Other</option>
                    </select>
                  </Field>
                  <Field label="Specialization / Subject"><input className="form-input" value={formData.addlQualSpecialization} onChange={e => set("addlQualSpecialization", e.target.value)} /></Field>
                  <Field label="University"><input className="form-input" value={formData.addlQualUniversity} onChange={e => set("addlQualUniversity", e.target.value)} /></Field>
                  <Field label="College / Institute"><input className="form-input" value={formData.addlQualCollege} onChange={e => set("addlQualCollege", e.target.value)} /></Field>
                  <Field label="Year of Passing"><input className="form-input" value={formData.addlQualYear} onChange={e => set("addlQualYear", e.target.value)} /></Field>
                </div>
              </>
            )}

            {isRenewal && (
              <>
                <div className="section-title">Existing Registration Validity <span className="section-title-tag">Renewal</span></div>
                <div className="two-col-grid">
                  <Field label="Existing Registration Number"><input className="form-input" value={formData.existingRegNo} readOnly /></Field>
                  <Field label="Registration Valid Till"><input className="form-input" value={formData.existingRegValidTill} readOnly /></Field>
                  <Field label="Renewal Period Requested">
                    <select className="form-input" value={formData.renewalPeriod} onChange={e => set("renewalPeriod", e.target.value)}>
                      <option value="">Select</option><option>1 Year</option><option>3 Years</option><option>5 Years</option>
                    </select>
                  </Field>
                </div>
              </>
            )}

            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => backFromForm()}><ChevronLeft size={16} /> Back</button>
              <button className="btn btn-primary" onClick={() => setScreen("doc-upload")}>Continue to Documents <ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ScreenDocUpload() {
    const checklist = getChecklist(serviceType);
    const isProvisional = serviceType === "provisional";
    const [fileErrors, setFileErrors] = useState({});

    function handlePick(item, file) {
      const msg = validateUploadFile(file, item.format);
      setFileErrors(fe => ({ ...fe, [item.key]: msg }));
      if (msg) return;
      setDocuments(d => ({ ...d, [item.key]: isProvisional ? file.name : { uploaded: true, fileName: file.name } }));
    }

    function handleContinue() {
      setScreen("review");
    }

    return (
      <div className="page-wide">
        <WizardRibbon step={3} />
        <div className="card">
          <div className="card-header">Document Upload</div>
          <div className="card-body">
            {isProvisional ? (
              <NoteBanner>
                Upload your certificate and any other supporting document as a PDF, and your photo as a JPG. File size should not be greater than {UPLOAD_MAX_KB} KB per file. Your photo will be printed on your certificate, so make sure it's professional and clear.
              </NoteBanner>
            ) : (
              <p className="muted-text">Upload clear scans matching the MPSVC document requirements for {SERVICES[serviceType].label} — certificates and ID proof as PDF, photograph and signature as JPG (max 2MB each).</p>
            )}
            <div className="checklist">
              {checklist.map(item => {
                const uploaded = isProvisional ? !!documents[item.key] : documents[item.key]?.uploaded;
                const fileName = isProvisional ? documents[item.key] : documents[item.key]?.fileName;
                return (
                  <div className="checklist-item" key={item.key}>
                    <div className="checklist-icon">{uploaded ? <CheckCircle2 size={20} className="icon-good" /> : <Circle size={20} className="icon-muted" />}</div>
                    <div className="checklist-body">
                      <div className="checklist-label">{item.label}</div>
                      {uploaded && <div className="checklist-filename">{fileName}</div>}
                      {item.hint && <div className="form-hint">{item.hint}</div>}
                      {isProvisional && fileErrors[item.key] && <div className="form-error">{fileErrors[item.key]}</div>}
                    </div>
                    <label className="upload-btn">
                      <Upload size={14} /> {uploaded ? "Replace" : "Upload"}
                      <input type="file" hidden accept={UPLOAD_ACCEPT[item.format]} onChange={e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (isProvisional) handlePick(item, f);
                        else setDocuments(d => ({ ...d, [item.key]: { uploaded: true, fileName: f.name } }));
                      }} />
                    </label>
                  </div>
                );
              })}
            </div>
            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => setScreen("app-form")}><ChevronLeft size={16} /> Back</button>
              <button className="btn btn-primary" onClick={handleContinue}>Continue to Review <ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pre-payment "Review & Submit" step — shows everything the citizen entered across
  // the Application Form and Document Upload steps in one place before they pay, so
  // they can catch a mistake before committing. Same field layout as
  // ScreenApplicationDetails (the post-submission view), just without an Application
  // ID/Status header, and ending in "Proceed to Payment" instead of a read-only view.
  function ScreenReview() {
    const isProvisional = serviceType === "provisional";
    const isNew = serviceType === "new" || serviceType === "transfer-in";
    const isTransfer = serviceType === "transfer-out";
    const isRenewal = serviceType === "renewal";
    const isAddQual = serviceType === "add-qualification";
    const isTransferIn = serviceType === "transfer-in";
    const checklist = getChecklist(serviceType);
    const dash = v => v || "—";

    return (
      <div className="page-wide">
        <BackLink onClick={() => setScreen("doc-upload")} />
        <WizardRibbon step={4} />
        <div className="card">
          <div className="card-header">Review &amp; Submit — {SERVICES[serviceType].label}</div>
          <div className="card-body">
            <NoteBanner tone="blue">Please review every section below carefully — you won't be able to edit these details once payment is complete.</NoteBanner>

            {isProvisional ? (
              <>
                <div className="section-title">Personal Details</div>
                <div className="confirm-grid">
                  <div><span>First Name</span><strong>{dash(formData.firstName)}</strong></div>
                  <div><span>Middle Name</span><strong>{dash(formData.middleName)}</strong></div>
                  <div><span>Last Name</span><strong>{dash(formData.lastName)}</strong></div>
                  <div><span>Father Name</span><strong>{dash(formData.fatherName)}</strong></div>
                  <div><span>Date Of Birth</span><strong>{dash(formData.dob)}</strong></div>
                  <div><span>Gender</span><strong>{dash(formData.gender)}</strong></div>
                </div>

                <div className="section-title">Residential Address</div>
                <div className="confirm-grid">
                  <div><span>Area Type</span><strong>{dash(formData.resAreaType)}</strong></div>
                  <div><span>State</span><strong>{dash(formData.resState)}</strong></div>
                  <div><span>District</span><strong>{dash(formData.resDistrict)}</strong></div>
                  {formData.resAreaType === "Rural" ? (
                    <>
                      <div><span>Block</span><strong>{dash(formData.resBlock)}</strong></div>
                      <div><span>Panchayat</span><strong>{dash(formData.resPanchayat)}</strong></div>
                      <div><span>Gram</span><strong>{dash(formData.resGram)}</strong></div>
                    </>
                  ) : (
                    <>
                      <div><span>City</span><strong>{dash(formData.resCity)}</strong></div>
                      <div><span>Ward</span><strong>{dash(formData.resWard)}</strong></div>
                    </>
                  )}
                  <div><span>Pin Code</span><strong>{dash(formData.resPincode)}</strong></div>
                  <div><span>Post Office</span><strong>{dash(formData.resPostOffice)}</strong></div>
                  <div><span>Complete Address</span><strong>{dash(formData.resAddress)}</strong></div>
                </div>

                <div className="section-title">Permanent Address</div>
                <div className="confirm-grid">
                  <div><span>Area Type</span><strong>{dash(formData.permAreaType)}</strong></div>
                  <div><span>State</span><strong>{dash(formData.permState)}</strong></div>
                  <div><span>District</span><strong>{dash(formData.permDistrict)}</strong></div>
                  {formData.permAreaType === "Rural" ? (
                    <>
                      <div><span>Block</span><strong>{dash(formData.permBlock)}</strong></div>
                      <div><span>Panchayat</span><strong>{dash(formData.permPanchayat)}</strong></div>
                      <div><span>Gram</span><strong>{dash(formData.permGram)}</strong></div>
                    </>
                  ) : (
                    <>
                      <div><span>City</span><strong>{dash(formData.permCity)}</strong></div>
                      <div><span>Ward</span><strong>{dash(formData.permWard)}</strong></div>
                    </>
                  )}
                  <div><span>Pin Code</span><strong>{dash(formData.permPincode)}</strong></div>
                  <div><span>Post Office</span><strong>{dash(formData.permPostOffice)}</strong></div>
                  <div><span>Complete Address</span><strong>{dash(formData.permAddress)}</strong></div>
                </div>

                <div className="section-title">Contact Details</div>
                <div className="confirm-grid">
                  <div><span>Preferred Address</span><strong>{dash(formData.preferredAddress)}</strong></div>
                  <div><span>Email Id</span><strong>{dash(formData.email)}</strong></div>
                  <div><span>Primary Mobile No.</span><strong>{dash(formData.mobile1)}</strong></div>
                  <div><span>Alternate Mobile Number</span><strong>{dash(formData.mobile2)}</strong></div>
                </div>

                <div className="section-title">Qualification</div>
                <div className="confirm-grid">
                  <div><span>Roll No</span><strong>{dash(formData.rollNo)}</strong></div>
                  <div><span>University Enrollment No</span><strong>{dash(formData.universityEnrollmentNo)}</strong></div>
                  <div><span>Degree Name</span><strong>{dash(formData.provDegreeName)}</strong></div>
                  <div><span>Name of University</span><strong>{dash(formData.provUniversityName)}</strong></div>
                  <div><span>Name of College</span><strong>{dash(formData.provCollegeName)}</strong></div>
                  <div><span>Passing Year</span><strong>{dash(formData.provPassingYear)}</strong></div>
                </div>
              </>
            ) : isNew ? (
              <>
                <div className="section-title">Personal Details</div>
                <div className="confirm-grid">
                  <div><span>First Name</span><strong>{dash(formData.firstName)}</strong></div>
                  <div><span>Middle Name</span><strong>{dash(formData.middleName)}</strong></div>
                  <div><span>Last Name</span><strong>{dash(formData.lastName)}</strong></div>
                  <div><span>Father Name</span><strong>{dash(formData.fatherName)}</strong></div>
                  <div><span>Date Of Birth</span><strong>{dash(formData.dob)}</strong></div>
                  <div><span>Gender</span><strong>{dash(formData.gender)}</strong></div>
                  <div><span>Organization</span><strong>{dash(formData.organization)}</strong></div>
                  <div><span>Department</span><strong>{dash(formData.department)}</strong></div>
                  <div><span>Designation</span><strong>{dash(formData.designation)}</strong></div>
                  <div><span>Sector</span><strong>{dash(formData.sector)}</strong></div>
                </div>

                <div className="section-title">Residential Address</div>
                <div className="confirm-grid">
                  <div><span>Area Type</span><strong>{dash(formData.resAreaType)}</strong></div>
                  <div><span>State</span><strong>{dash(formData.resState)}</strong></div>
                  <div><span>District</span><strong>{dash(formData.resDistrict)}</strong></div>
                  {formData.resAreaType === "Rural" ? (
                    <>
                      <div><span>Block</span><strong>{dash(formData.resBlock)}</strong></div>
                      <div><span>Panchayat</span><strong>{dash(formData.resPanchayat)}</strong></div>
                      <div><span>Gram</span><strong>{dash(formData.resGram)}</strong></div>
                    </>
                  ) : (
                    <>
                      <div><span>City</span><strong>{dash(formData.resCity)}</strong></div>
                      <div><span>Ward</span><strong>{dash(formData.resWard)}</strong></div>
                    </>
                  )}
                  <div><span>Pin Code</span><strong>{dash(formData.resPincode)}</strong></div>
                  <div><span>Post Office</span><strong>{dash(formData.resPostOffice)}</strong></div>
                  <div><span>Complete Address</span><strong>{dash(formData.resAddress)}</strong></div>
                </div>

                <div className="section-title">Professional Address</div>
                <div className="confirm-grid">
                  <div><span>Area Type</span><strong>{dash(formData.proAreaType)}</strong></div>
                  <div><span>State</span><strong>{dash(formData.proState)}</strong></div>
                  <div><span>District</span><strong>{dash(formData.proDistrict)}</strong></div>
                  {formData.proAreaType === "Rural" ? (
                    <>
                      <div><span>Block</span><strong>{dash(formData.proBlock)}</strong></div>
                      <div><span>Panchayat</span><strong>{dash(formData.proPanchayat)}</strong></div>
                      <div><span>Gram</span><strong>{dash(formData.proGram)}</strong></div>
                    </>
                  ) : (
                    <>
                      <div><span>City</span><strong>{dash(formData.proCity)}</strong></div>
                      <div><span>Ward</span><strong>{dash(formData.proWard)}</strong></div>
                    </>
                  )}
                  <div><span>Pin Code</span><strong>{dash(formData.proPincode)}</strong></div>
                  <div><span>Post Office</span><strong>{dash(formData.proPostOffice)}</strong></div>
                  <div><span>Complete Address</span><strong>{dash(formData.proAddress)}</strong></div>
                </div>

                <div className="section-title">Permanent Address</div>
                <div className="confirm-grid">
                  <div><span>Area Type</span><strong>{dash(formData.permAreaType)}</strong></div>
                  <div><span>State</span><strong>{dash(formData.permState)}</strong></div>
                  <div><span>District</span><strong>{dash(formData.permDistrict)}</strong></div>
                  {formData.permAreaType === "Rural" ? (
                    <>
                      <div><span>Block</span><strong>{dash(formData.permBlock)}</strong></div>
                      <div><span>Panchayat</span><strong>{dash(formData.permPanchayat)}</strong></div>
                      <div><span>Gram</span><strong>{dash(formData.permGram)}</strong></div>
                    </>
                  ) : (
                    <>
                      <div><span>City</span><strong>{dash(formData.permCity)}</strong></div>
                      <div><span>Ward</span><strong>{dash(formData.permWard)}</strong></div>
                    </>
                  )}
                  <div><span>Pin Code</span><strong>{dash(formData.permPincode)}</strong></div>
                  <div><span>Post Office</span><strong>{dash(formData.permPostOffice)}</strong></div>
                  <div><span>Complete Address</span><strong>{dash(formData.permAddress)}</strong></div>
                </div>

                <div className="section-title">Contact Details</div>
                <div className="confirm-grid">
                  <div><span>Preferred Address</span><strong>{dash(formData.preferredAddress)}</strong></div>
                  <div><span>Land-Line No.</span><strong>{dash(formData.landline)}</strong></div>
                  <div><span>Primary Mobile No.</span><strong>{dash(formData.mobile1)}</strong></div>
                  <div><span>Alternate Mobile Number</span><strong>{dash(formData.mobile2)}</strong></div>
                  <div><span>Fax No.</span><strong>{dash(formData.fax)}</strong></div>
                  <div><span>Email Id</span><strong>{dash(formData.email)}</strong></div>
                </div>

                <div className="section-title">Qualification</div>
                <div className="confirm-grid">
                  <div><span>Degree Name</span><strong>B.V.SC.&amp; A.H.</strong></div>
                  <div><span>Name of University</span><strong>{dash(formData.qualBvscUniversity)}</strong></div>
                  <div><span>Name of College</span><strong>{dash(formData.qualBvscCollege)}</strong></div>
                  <div><span>Passing Year</span><strong>{dash(formData.qualBvscYear)}</strong></div>
                  <div><span>Graduation Degree / PDC Date</span><strong>{dash(formData.gradDate)}</strong></div>
                  <div><span>Degree Id</span><strong>{dash(formData.degreeId)}</strong></div>
                </div>

                {isTransferIn && (
                  <>
                    <div className="section-title">Previous State Council Details <span className="section-title-tag">NOC Required</span></div>
                    <div className="confirm-grid">
                      <div><span>Previous State Council Name</span><strong>{dash(formData.nocPrevCouncilName)}</strong></div>
                      <div><span>Previous Registration Number</span><strong>{dash(formData.nocPrevRegNo)}</strong></div>
                      <div><span>Previous Registration Date</span><strong>{dash(formData.nocPrevRegDate)}</strong></div>
                      <div><span>Details</span><strong>{dash(formData.nocDetails)}</strong></div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="section-title">Applicant Details</div>
                <div className="confirm-grid">
                  <div><span>Full Name</span><strong>{dash(formData.fullName)}</strong></div>
                  <div><span>College Name</span><strong>{dash(formData.collegeName)}</strong></div>
                  <div><span>Father's / Husband's Name</span><strong>{dash(formData.guardianName)}</strong></div>
                  <div><span>Date of Birth</span><strong>{dash(formData.dob)}</strong></div>
                  <div><span>Gender</span><strong>{dash(formData.gender)}</strong></div>
                  <div><span>Category</span><strong>{dash(formData.category)}</strong></div>
                  <div><span>Address</span><strong>{dash(formData.address)}</strong></div>
                </div>

                <div className="section-title">Qualification Details</div>
                <div className="confirm-grid">
                  <div><span>Degree</span><strong>{dash(formData.degree)}</strong></div>
                  <div><span>University</span><strong>{dash(formData.university)}</strong></div>
                  <div><span>Year of Passing</span><strong>{dash(formData.yearOfPassing)}</strong></div>
                </div>

                <div className="section-title">ID Proof</div>
                <div className="confirm-grid">
                  <div><span>ID Proof Type</span><strong>{dash(formData.idProofType)}</strong></div>
                  <div><span>ID Proof Number</span><strong>{dash(formData.idProofNumber)}</strong></div>
                </div>

                {isTransfer && (
                  <>
                    <div className="section-title">Transfer Details</div>
                    <div className="confirm-grid">
                      <div><span>Reason for Transfer</span><strong>{dash(formData.transferReason)}</strong></div>
                    </div>
                  </>
                )}
                {isRenewal && (
                  <>
                    <div className="section-title">Renewal Details</div>
                    <div className="confirm-grid">
                      <div><span>Renewal Period Requested</span><strong>{dash(formData.renewalPeriod)}</strong></div>
                    </div>
                  </>
                )}
                {isAddQual && (
                  <>
                    <div className="section-title">Qualification to be Added</div>
                    <div className="confirm-grid">
                      <div><span>Existing Registration Number</span><strong>{dash(formData.existingRegNo)}</strong></div>
                      <div><span>Degree / Qualification</span><strong>{dash(formData.addlQualDegree)}</strong></div>
                      <div><span>Specialization / Subject</span><strong>{dash(formData.addlQualSpecialization)}</strong></div>
                      <div><span>University</span><strong>{dash(formData.addlQualUniversity)}</strong></div>
                      <div><span>College / Institute</span><strong>{dash(formData.addlQualCollege)}</strong></div>
                      <div><span>Year of Passing</span><strong>{dash(formData.addlQualYear)}</strong></div>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="section-title">Documents</div>
            <div className="confirm-grid">
              {!isProvisional && !isNew && (
                <>
                  <div><span>Photograph</span><strong>{dash(photoFile)}</strong></div>
                  <div><span>Signature</span><strong>{dash(sigFile)}</strong></div>
                </>
              )}
              {checklist.map(c => (
                <div key={c.key}><span>{c.label}</span><strong>{dash(isProvisional ? documents[c.key] : documents[c.key]?.fileName)}</strong></div>
              ))}
            </div>

            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => setScreen("doc-upload")}><ChevronLeft size={16} /> Back</button>
              <button className="btn btn-primary" onClick={() => setScreen("payment")}>Proceed to Payment <ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ScreenPayment() {
    const isProvisional = serviceType === "provisional";
    const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));

    function handleProceed() {
      if (paymentMethod === "online") setScreen("payment-online");
      else {
        const c = genChallan();
        setChallanNumber(c);
        setScreen("payment-offline");
      }
    }

    return (
      <div className="page-narrow">
        <WizardRibbon step={5} />
        <div className="card">
          <div className="card-header">Payment</div>
          <div className="card-body">
            <div className="fee-summary">
              <span>Application Fee — {SERVICES[serviceType].label}</span>
              <strong>₹ {SERVICES[serviceType].fee.toFixed(2)}</strong>
            </div>
            <div className="radio-card-group">
              <div className={`radio-card ${paymentMethod === "online" ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => setPaymentMethod("online")}>
                <CreditCard size={20} />
                <div>
                  <div className="radio-card-title">Online Payment</div>
                  <div className="radio-card-desc">Pay instantly via UPI / Card / Net Banking.</div>
                </div>
              </div>
              <div className={`radio-card ${paymentMethod === "offline" ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => setPaymentMethod("offline")}>
                <Landmark size={20} />
                <div>
                  <div className="radio-card-title">Offline Payment</div>
                  <div className="radio-card-desc">Generate a Challan and pay at a designated bank / kiosk.</div>
                </div>
              </div>
            </div>

            {isProvisional && paymentMethod === "offline" && (
              <>
                <div className="section-title">Payment</div>
                <div className="two-col-grid">
                  <Field label="Cheque/DD No">
                    <input className="form-input" value={formData.chequeDDNo} onChange={e => set("chequeDDNo", e.target.value)} />
                  </Field>
                  <Field label="Bank Name">
                    <input className="form-input" value={formData.bankName} onChange={e => set("bankName", e.target.value)} />
                  </Field>
                  <Field label="Payment Date">
                    <input className="form-input" type="date" value={formData.paymentDate} onChange={e => set("paymentDate", e.target.value)} />
                  </Field>
                </div>
              </>
            )}

            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => setScreen("review")}><ChevronLeft size={16} /> Back</button>
              <button className="btn btn-primary" onClick={handleProceed}>Proceed <ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ScreenPaymentOnline() {
    return (
      <div className="page-narrow">
        <div className="card">
          <div className="card-header">Mock Payment Gateway</div>
          <div className="card-body" style={{ textAlign: "center" }}>
            <p className="muted-text">Amount payable: <strong>₹ {SERVICES[serviceType].fee.toFixed(2)}</strong></p>
            <p className="form-hint" style={{ marginBottom: 20 }}>Prototype demo — choose an outcome to preview the resulting screen.</p>
            <div className="demo-btn-row">
              <button className="btn btn-primary" onClick={() => {
                const id = genAppId(serviceType);
                setApplicationId(id);
                setScreen("payment-result-success");
              }}>Simulate Payment Success</button>
              <button className="btn btn-danger" onClick={() => setScreen("payment-result-failure")}>Simulate Payment Failure</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ScreenPaymentSuccess() {
    return (
      <div className="page-narrow">
        <div className="result-panel result-success">
          <CheckCircle2 size={44} />
          <h2>Payment Successful</h2>
          <p>Your application status is now <strong>Submitted – Payment Confirmed.</strong></p>
          <button className="btn btn-primary" onClick={() => {
            const id = applicationId || genAppId(serviceType);
            setApplicationId(id);
            syncProfileFromForm();
            setAppStatus("submitted_payment_confirmed");
            setStatusHistory([{ code: "submitted_payment_confirmed", time: nowStamp() }]);
            pushNotification(`Submitted – Payment Confirmed — Application ${id}`);
            setScreen("confirmation");
          }}>Continue</button>
        </div>
      </div>
    );
  }

  function ScreenPaymentFailure() {
    return (
      <div className="page-narrow">
        <div className="result-panel result-failure">
          <XCircle size={44} />
          <h2>Payment Failed</h2>
          <p>Your payment could not be completed. No amount has been deducted. Please retry, or choose offline payment instead.</p>
          <div className="demo-btn-row">
            <button className="btn btn-primary" onClick={() => setScreen("payment-online")}><RefreshCw size={15} /> Retry Payment</button>
            <button className="btn btn-outline" onClick={() => setScreen("payment")}>Choose Offline Instead</button>
          </div>
        </div>
      </div>
    );
  }

  function ScreenPaymentOffline() {
    return (
      <div className="page-narrow">
        <div className="card">
          <div className="card-header">Offline Payment — Challan Generated</div>
          <div className="card-body" style={{ textAlign: "center" }}>
            <div className="challan-box">
              <span className="challan-label">Challan / Payment Reference Number</span>
              <span className="challan-number">{challanNumber}</span>
              <span className="challan-amount">₹ {SERVICES[serviceType].fee.toFixed(2)}</span>
            </div>
            <NoteBanner tone="amber">
              Your application will be visible to the office for processing only after your offline payment receipt is confirmed by the office. Please retain your Challan/Reference Number.
            </NoteBanner>
            <button className="btn btn-primary btn-block" onClick={() => {
              const id = genAppId(serviceType);
              setApplicationId(id);
              syncProfileFromForm();
              setAppStatus("submitted_payment_pending");
              setStatusHistory([{ code: "submitted_payment_pending", time: nowStamp() }]);
              pushNotification(`Submitted – Payment Confirmation Pending — Application ${id}`);
              setScreen("confirmation");
            }}>I Have Noted the Challan Number — Continue</button>
          </div>
        </div>
      </div>
    );
  }

  function ScreenConfirmation() {
    return (
      <div className="page-narrow">
        <div className="result-panel result-success">
          <CheckCircle2 size={44} />
          <h2>Application Submitted</h2>
          <div className="confirm-grid">
            <div><span>Application ID</span><strong>{applicationId}</strong></div>
            <div><span>Service Type</span><strong>{SERVICES[serviceType].label}</strong></div>
            <div><span>Status</span><StatusBadge code={appStatus} /></div>
          </div>
          <div className="next-steps">
            <div className="section-title" style={{ textAlign: "left" }}>Next Steps</div>
            <ul>
              <li>Track your application status anytime from the dashboard.</li>
              <li>You will receive SMS and email updates at every stage.</li>
              <li>Keep your Application ID{paymentMethod === "offline" ? " and Challan Number" : ""} safe for reference.</li>
            </ul>
          </div>
          <div className="demo-btn-row">
            <button className="btn btn-primary" onClick={() => setScreen("track-status")}>Track Application Status</button>
            <button className="btn btn-outline" onClick={() => setScreen("dashboard")}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  function ScreenDashboard() {
    const hasNewRegApplication = applicationId && serviceType === "new";
    // True once the citizen has a completed Provisional Registration in hand — either
    // via the demo shortcut (provisionalRecord) or by finishing one through the normal
    // apply flow (the current application slot itself is Provisional & issued).
    const provisionalCompletedInFlow = serviceType === "provisional" && appStatus === "certificate_issued";
    const canApplyForNewReg = (provisionalRecord || provisionalCompletedInFlow) && !hasNewRegApplication;

    return (
      <div className="page-narrow">
        <div className="dash-greeting-row">
          <div className="dash-avatar">{getInitials(profile.fullName)}</div>
          <div>
            <h2 className="dash-greeting">Welcome, {profile.fullName}</h2>
            <p className="muted-text">{profile.mobile ? `Mobile: ${profile.mobile}` : ""} {profile.email ? ` · ${profile.email}` : ""}</p>
          </div>
        </div>

        {existingRegRecord && (() => {
          const certList = decoratedCertHistory();
          const current = certList[certList.length - 1];
          return (
            <>
              {showCertDemoPanel && (
                <div className="demo-panel" style={{ marginBottom: 16 }}>
                  <div className="demo-panel-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Prototype Controls — simulate certificate state</span>
                    <button className="gh-icon-btn" style={{ width: 20, height: 20, background: "transparent", color: "var(--mp-gray-600)" }} onClick={() => setShowCertDemoPanel(false)}><X size={13} /></button>
                  </div>
                  <div className="demo-panel-body">
                    {["active", "expiring", "expired"].map(s => (
                      <button key={s} className={`btn btn-sm ${certScenario === s ? "btn-primary" : "btn-outline"}`} onClick={() => setCertScenario(s)}>
                        {s === "active" ? "Active" : s === "expiring" ? "Expiring Soon" : "Expired"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="card app-card app-card-accent-teal" style={{ marginBottom: 16 }}>
                <div className="app-card-top">
                  <div>
                    <div className="app-card-id">{current.certNo}</div>
                    <div className="app-card-service">{current.kind}</div>
                  </div>
                  <CertLifecycleBadge status={current.status} />
                </div>
                <div className="cert-hero-body">
                  <div className="cert-hero-info">
                    <div className="cert-hero-row"><span>Registration No.</span><strong>{existingRegRecord.regNo}</strong></div>
                    <div className="cert-hero-row"><span>Issue Date</span><strong>{formatLongDate(current.issueDate)}</strong></div>
                    <div className="cert-hero-row"><span>Valid Until</span><strong>{formatLongDate(current.validUntil)}</strong></div>
                  </div>
                  <CertCountdownPanel cert={current} />
                </div>
                <div className="app-card-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => { setCertViewerId(current.id); setCertViewerTab("digital"); }}>View Certificate</button>
                  <button className="btn btn-outline btn-sm" onClick={() => setScreen("existing-reg-application-details")}>View Application Details</button>
                  <button className="btn btn-outline btn-sm" onClick={() => openCertDuplicate(current.id)}>Apply for Duplicate</button>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    setServiceType("renewal");
                    setRenewalChoices({ residentialAddress: false, professionalAddress: false, photo: false, otherDocument: false, qualification: false });
                    setPaymentMethod("offline");
                    setScreen("renewal-choices");
                  }}>Apply for Renewal</button>
                  <button className="btn btn-outline btn-sm" onClick={() => { setServiceType("add-qualification"); setScreen("app-form"); }}>Addition of Qualification</button>
                  <button className="btn btn-outline-danger btn-sm" onClick={() => { setServiceType("transfer-out"); setScreen("app-form"); }}>Transfer Out of Madhya Pradesh</button>
                </div>
              </div>

              <div className="section-title" style={{ marginTop: 4 }}>Certificate History</div>
              <div className="card table-card" style={{ marginBottom: 16 }}>
                <div className="table-scroll">
                  <table className="cert-history-table">
                    <thead>
                      <tr>
                        <th>Certificate</th><th>Certificate No.</th><th>Issue Date</th><th>Valid Until</th><th>Status</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certList.map(c => (
                        <tr key={c.id}>
                          <td><div className="cert-history-kind">{c.kind}</div></td>
                          <td className="cert-history-mono">{c.certNo}</td>
                          <td>{formatLongDate(c.issueDate)}</td>
                          <td>{formatLongDate(c.validUntil)}</td>
                          <td><CertLifecycleBadge status={c.status} /></td>
                          <td>
                            <div className="cert-history-actions">
                              <button className="btn btn-outline btn-sm" onClick={() => { setCertViewerId(c.id); setCertViewerTab("digital"); }}>View</button>
                              <button className="btn btn-outline btn-sm" onClick={() => openCertDuplicate(c.id)}>Apply for Duplicate</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="section-title">Application History</div>
              {certApplications.length === 0 ? (
                <div className="card" style={{ marginBottom: 16 }}><div className="card-body muted-text">No applications yet.</div></div>
              ) : (
                <div className="cert-app-list" style={{ marginBottom: 16 }}>
                  {certApplications.map(a => (
                    <div className="cert-app-row" role="button" tabIndex={0} key={a.id} onClick={() => { setCertSelectedAppId(a.id); setScreen("cert-application-detail"); }}>
                      <div className="cert-app-row-body">
                        <div className="cert-app-row-title">{CERT_APP_KIND_LABEL[a.kind]}</div>
                        <div className="cert-app-row-sub">{a.appNo} · Submitted {a.submittedOn}</div>
                      </div>
                      <CertAppBadge status={a.status} />
                      <ChevronRight size={16} className="cert-app-row-arrow" />
                    </div>
                  ))}
                </div>
              )}
            </>
          );
        })()}

        {provisionalRecord && (
          <div className="card app-card app-card-accent-purple" style={{ marginBottom: 16 }}>
            <div className="app-card-top">
              <div>
                <div className="app-card-id">{provisionalRecord.certNo}</div>
                <div className="app-card-service">{SERVICES.provisional.label}</div>
              </div>
              <StatusBadge code="certificate_issued" />
            </div>
            <div className="app-card-note">
              <NoteBanner tone="blue">
                Digital certificate eSigned and delivered on {provisionalRecord.issueDate}. Provisional Registration
                is issued digitally only — there is no physical copy or Speed Post dispatch for this service.
              </NoteBanner>
            </div>
            <div className="app-card-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setScreen("provisional-application-details")}>View Application Details</button>
              <button className="btn btn-outline btn-sm" onClick={() => setScreen("provisional-certificate")}>View Certificate</button>
              {canApplyForNewReg && (
                <button className="btn btn-primary btn-sm" onClick={applyForNewRegistration}>Apply for New Registration</button>
              )}
            </div>
          </div>
        )}

        {/* Provisional Certificate History — the counterpart, for a citizen who logged
            in with a Provisional Certificate Number, of the Certificate History table
            that Registration Number login gets above. Provisional Registration is a
            one-time, digital-only certificate, so this lists just that one row. */}
        {provisionalRecord && (
          <>
            <div className="section-title" style={{ marginTop: 4 }}>Provisional Certificate History</div>
            <div className="card table-card" style={{ marginBottom: 16 }}>
              <div className="table-scroll">
                <table className="cert-history-table">
                  <thead>
                    <tr>
                      <th>Certificate</th><th>Certificate No.</th><th>Issue Date</th><th>College</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><div className="cert-history-kind">{SERVICES.provisional.label}</div></td>
                      <td className="cert-history-mono">{provisionalRecord.certNo}</td>
                      <td>{formatLongDate(provisionalRecord.issueDate)}</td>
                      <td>{provisionalRecord.provCollegeName || "—"}</td>
                      <td><StatusBadge code="certificate_issued" /></td>
                      <td>
                        <div className="cert-history-actions">
                          <button className="btn btn-outline btn-sm" onClick={() => setScreen("provisional-certificate")}>View</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setScreen("provisional-application-details")}>Application Details</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {applicationId ? (
          <div className="card app-card">
            <div className="app-card-top">
              <div>
                <div className="app-card-id">{applicationId}</div>
                <div className="app-card-service">{SERVICES[serviceType].label}</div>
              </div>
              <StatusBadge code={appStatus} />
            </div>
            {provisionalCompletedInFlow && (
              <div className="app-card-note">
                <NoteBanner tone="blue">
                  Provisional Registration is issued digitally only — there is no physical copy or Speed Post
                  dispatch for this service. You can now apply for New Registration.
                </NoteBanner>
              </div>
            )}
            <div className="app-card-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setScreen("track-status")}>Track Status</button>
              <button className="btn btn-outline btn-sm" onClick={() => setScreen("application-details")}>View Application Details</button>
              <button className="btn btn-outline btn-sm" onClick={() => setScreen("certificate")}>View Certificate</button>
              {canApplyForNewReg && !provisionalRecord && (
                <button className="btn btn-primary btn-sm" onClick={applyForNewRegistration}>Apply for New Registration</button>
              )}
            </div>
          </div>
        ) : (
          !existingRegRecord && !provisionalRecord && (
            <div className="card"><div className="card-body muted-text">You have no active applications yet.</div></div>
          )
        )}

        {!provisionalRecord && !existingRegRecord && (
          <div className="dashboard-grid">
            <div className="dash-tile" role="button" tabIndex={0} onClick={() => setScreen("service-select")}>
              <div className="dash-tile-icon"><FileText size={18} /></div><span>Start New Application</span>
            </div>
            <div className="dash-tile" role="button" tabIndex={0} onClick={() => applicationId && setScreen("track-status")}>
              <div className="dash-tile-icon"><Truck size={18} /></div><span>Track Application Status</span>
            </div>
            <div className="dash-tile" role="button" tabIndex={0} onClick={() => applicationId && setScreen("certificate")}>
              <div className="dash-tile-icon"><Award size={18} /></div><span>Certificate</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  function ScreenApplicationDetails() {
    const [detailTab, setDetailTab] = useState("application");
    if (!applicationId) {
      return (
        <div className="page-narrow">
          <BackLink onClick={goDashboard} />
          <div className="card"><div className="card-body muted-text">No application found.</div></div>
        </div>
      );
    }
    const isTransfer = serviceType === "transfer-out";
    const isRenewal = serviceType === "renewal";
    const isAddQual = serviceType === "add-qualification";
    const isProvisional = serviceType === "provisional";
    const isNew = serviceType === "new" || serviceType === "transfer-in";
    const isTransferIn = serviceType === "transfer-in";
    const dash = v => v || "—";
    return (
      <div className="page-narrow">
        <BackLink onClick={goDashboard} />
        <div className="card">
          <div className="card-header">Application Details — {SERVICES[serviceType].label}</div>
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <div className="confirm-grid" style={{ marginBottom: 20 }}>
              <div><span>Application ID</span><strong>{applicationId}</strong></div>
              <div><span>Status</span><StatusBadge code={appStatus} /></div>
            </div>
          </div>

          <div className="tabs">
            <button type="button" className={`tab-btn ${detailTab === "application" ? "active" : ""}`} onClick={() => setDetailTab("application")}>Application Details</button>
            <button type="button" className={`tab-btn ${detailTab === "profile" ? "active" : ""}`} onClick={() => setDetailTab("profile")}>Applicant Profile & Past Details</button>
          </div>

          <div className="card-body">
            {detailTab === "application" ? (
              isProvisional ? (
                <>
                  <div className="section-title">Qualification</div>
                  <div className="confirm-grid">
                    <div><span>Roll No</span><strong>{dash(formData.rollNo)}</strong></div>
                    <div><span>University Enrollment No</span><strong>{dash(formData.universityEnrollmentNo)}</strong></div>
                    <div><span>Degree Name</span><strong>{dash(formData.provDegreeName)}</strong></div>
                    <div><span>Name of University</span><strong>{dash(formData.provUniversityName)}</strong></div>
                    <div><span>Name of College</span><strong>{dash(formData.provCollegeName)}</strong></div>
                    <div><span>Passing Year</span><strong>{dash(formData.provPassingYear)}</strong></div>
                  </div>

                  <div className="section-title">Documents</div>
                  <div className="confirm-grid">
                    {getChecklist(serviceType).map(c => (
                      <div key={c.key}><span>{c.label}</span><strong>{dash(documents[c.key])}</strong></div>
                    ))}
                  </div>

                  <div className="section-title">Payment</div>
                  <div className="confirm-grid">
                    <div><span>Payment Type</span><strong>{dash(paymentMethod === "online" ? "Online Payment" : paymentMethod === "offline" ? "Offline Payment" : "")}</strong></div>
                    <div><span>Payable Amount</span><strong>₹ {SERVICES.provisional.fee.toFixed(2)}</strong></div>
                    {paymentMethod === "offline" && (
                      <>
                        <div><span>Cheque/DD No</span><strong>{dash(formData.chequeDDNo)}</strong></div>
                        <div><span>Bank Name</span><strong>{dash(formData.bankName)}</strong></div>
                        <div><span>Payment Date</span><strong>{dash(formData.paymentDate)}</strong></div>
                      </>
                    )}
                  </div>
                </>
              ) : isNew ? (
                <>
                  <div className="section-title">Qualification</div>
                  <div className="confirm-grid">
                    <div><span>Degree Name</span><strong>B.V.SC.&amp; A.H.</strong></div>
                    <div><span>Name of University</span><strong>{dash(formData.qualBvscUniversity)}</strong></div>
                    <div><span>Name of College</span><strong>{dash(formData.qualBvscCollege)}</strong></div>
                    <div><span>Passing Year</span><strong>{dash(formData.qualBvscYear)}</strong></div>
                    <div><span>Graduation Degree / PDC Date</span><strong>{dash(formData.gradDate)}</strong></div>
                    <div><span>Degree Id</span><strong>{dash(formData.degreeId)}</strong></div>
                  </div>

                  {isTransferIn && (
                    <>
                      <div className="section-title">Previous State Council Details (NOC)</div>
                      <div className="confirm-grid">
                        <div><span>Previous State Council Name</span><strong>{dash(formData.nocPrevCouncilName)}</strong></div>
                        <div><span>Previous Registration Number</span><strong>{dash(formData.nocPrevRegNo)}</strong></div>
                        <div><span>Previous Registration Date</span><strong>{dash(formData.nocPrevRegDate)}</strong></div>
                        <div><span>Details</span><strong>{dash(formData.nocDetails)}</strong></div>
                      </div>
                    </>
                  )}

                  <div className="section-title">Documents</div>
                  <div className="confirm-grid">
                    {getChecklist(serviceType).map(c => (
                      <div key={c.key}><span>{c.label}</span><strong>{dash(documents[c.key])}</strong></div>
                    ))}
                  </div>

                  <div className="section-title">Payment</div>
                  <div className="confirm-grid">
                    <div><span>Payment Type</span><strong>{dash(paymentMethod === "online" ? "Online Payment" : paymentMethod === "offline" ? "Offline Payment" : "")}</strong></div>
                    <div><span>Payable Amount</span><strong>₹ {SERVICES[serviceType].fee.toFixed(2)}</strong></div>
                    {paymentMethod === "offline" && (
                      <>
                        <div><span>Cheque/DD No</span><strong>{dash(formData.chequeDDNo)}</strong></div>
                        <div><span>Bank Name</span><strong>{dash(formData.bankName)}</strong></div>
                        <div><span>Payment Date</span><strong>{dash(formData.paymentDate)}</strong></div>
                      </>
                    )}
                  </div>
                </>
              ) : (
              <>
                <div className="section-title">Qualification Details</div>
                <div className="confirm-grid">
                  <div><span>Degree</span><strong>{dash(formData.degree)}</strong></div>
                  <div><span>University</span><strong>{dash(formData.university)}</strong></div>
                  <div><span>Year of Passing</span><strong>{dash(formData.yearOfPassing)}</strong></div>
                </div>

                <div className="section-title">ID Proof</div>
                <div className="confirm-grid">
                  <div><span>ID Proof Type</span><strong>{dash(formData.idProofType)}</strong></div>
                  <div><span>ID Proof Number</span><strong>{dash(formData.idProofNumber)}</strong></div>
                </div>

                {isTransfer && (
                  <>
                    <div className="section-title">Transfer Details</div>
                    <div className="confirm-grid">
                      <div><span>Reason for Transfer</span><strong>{dash(formData.transferReason)}</strong></div>
                    </div>
                  </>
                )}
                {isRenewal && (
                  <>
                    <div className="section-title">Renewal Details</div>
                    <div className="confirm-grid">
                      <div><span>Renewal Period Requested</span><strong>{dash(formData.renewalPeriod)}</strong></div>
                    </div>
                  </>
                )}

                <div className="section-title">Documents</div>
                <div className="confirm-grid">
                  <div><span>Photograph</span><strong>{dash(photoFile)}</strong></div>
                  <div><span>Signature</span><strong>{dash(sigFile)}</strong></div>
                  {getChecklist(serviceType).map(c => (
                    <div key={c.key}><span>{c.label}</span><strong>{dash(documents[c.key])}</strong></div>
                  ))}
                </div>
              </>
              )
            ) : isProvisional ? (
              <>
                <div className="section-title">Personal Details</div>
                <div className="confirm-grid">
                  <div><span>First Name</span><strong>{dash(formData.firstName)}</strong></div>
                  <div><span>Middle Name</span><strong>{dash(formData.middleName)}</strong></div>
                  <div><span>Last Name</span><strong>{dash(formData.lastName)}</strong></div>
                  <div><span>Father Name</span><strong>{dash(formData.fatherName)}</strong></div>
                  <div><span>Date Of Birth</span><strong>{dash(formData.dob)}</strong></div>
                  <div><span>Gender</span><strong>{dash(formData.gender)}</strong></div>
                </div>

                <div className="section-title">Residential Address</div>
                <div className="confirm-grid">
                  <div><span>Area Type</span><strong>{dash(formData.resAreaType)}</strong></div>
                  <div><span>State</span><strong>{dash(formData.resState)}</strong></div>
                  <div><span>District</span><strong>{dash(formData.resDistrict)}</strong></div>
                  {formData.resAreaType === "Rural" ? (
                    <>
                      <div><span>Block</span><strong>{dash(formData.resBlock)}</strong></div>
                      <div><span>Panchayat</span><strong>{dash(formData.resPanchayat)}</strong></div>
                      <div><span>Gram</span><strong>{dash(formData.resGram)}</strong></div>
                    </>
                  ) : (
                    <>
                      <div><span>City</span><strong>{dash(formData.resCity)}</strong></div>
                      <div><span>Ward</span><strong>{dash(formData.resWard)}</strong></div>
                    </>
                  )}
                  <div><span>Pin Code</span><strong>{dash(formData.resPincode)}</strong></div>
                  <div><span>Post Office</span><strong>{dash(formData.resPostOffice)}</strong></div>
                  <div><span>Complete Address</span><strong>{dash(formData.resAddress)}</strong></div>
                </div>

                <div className="section-title">Permanent Address</div>
                <div className="confirm-grid">
                  <div><span>Area Type</span><strong>{dash(formData.permAreaType)}</strong></div>
                  <div><span>State</span><strong>{dash(formData.permState)}</strong></div>
                  <div><span>District</span><strong>{dash(formData.permDistrict)}</strong></div>
                  {formData.permAreaType === "Rural" ? (
                    <>
                      <div><span>Block</span><strong>{dash(formData.permBlock)}</strong></div>
                      <div><span>Panchayat</span><strong>{dash(formData.permPanchayat)}</strong></div>
                      <div><span>Gram</span><strong>{dash(formData.permGram)}</strong></div>
                    </>
                  ) : (
                    <>
                      <div><span>City</span><strong>{dash(formData.permCity)}</strong></div>
                      <div><span>Ward</span><strong>{dash(formData.permWard)}</strong></div>
                    </>
                  )}
                  <div><span>Pin Code</span><strong>{dash(formData.permPincode)}</strong></div>
                  <div><span>Post Office</span><strong>{dash(formData.permPostOffice)}</strong></div>
                  <div><span>Complete Address</span><strong>{dash(formData.permAddress)}</strong></div>
                </div>

                <div className="section-title">Contact Details</div>
                <div className="confirm-grid">
                  <div><span>Preferred Address</span><strong>{dash(formData.preferredAddress)}</strong></div>
                  <div><span>Email Id</span><strong>{dash(formData.email)}</strong></div>
                  <div><span>Primary Mobile No.</span><strong>{dash(formData.mobile1)}</strong></div>
                  <div><span>Alternate Mobile Number</span><strong>{dash(formData.mobile2)}</strong></div>
                </div>

                <p className="muted-text small-muted">This is the applicant's first application with MPSVC — no past registrations on file.</p>
              </>
            ) : isNew ? (
              <>
                <div className="section-title">Personal Details</div>
                <div className="confirm-grid">
                  <div><span>First Name</span><strong>{dash(formData.firstName)}</strong></div>
                  <div><span>Middle Name</span><strong>{dash(formData.middleName)}</strong></div>
                  <div><span>Last Name</span><strong>{dash(formData.lastName)}</strong></div>
                  <div><span>Father Name</span><strong>{dash(formData.fatherName)}</strong></div>
                  <div><span>Date Of Birth</span><strong>{dash(formData.dob)}</strong></div>
                  <div><span>Gender</span><strong>{dash(formData.gender)}</strong></div>
                  <div><span>Organization</span><strong>{dash(formData.organization)}</strong></div>
                  <div><span>Department</span><strong>{dash(formData.department)}</strong></div>
                  <div><span>Designation</span><strong>{dash(formData.designation)}</strong></div>
                  <div><span>Sector</span><strong>{dash(formData.sector)}</strong></div>
                </div>

                <div className="section-title">Residential Address</div>
                <div className="confirm-grid">
                  <div><span>Area Type</span><strong>{dash(formData.resAreaType)}</strong></div>
                  <div><span>State</span><strong>{dash(formData.resState)}</strong></div>
                  <div><span>District</span><strong>{dash(formData.resDistrict)}</strong></div>
                  {formData.resAreaType === "Rural" ? (
                    <>
                      <div><span>Block</span><strong>{dash(formData.resBlock)}</strong></div>
                      <div><span>Panchayat</span><strong>{dash(formData.resPanchayat)}</strong></div>
                      <div><span>Gram</span><strong>{dash(formData.resGram)}</strong></div>
                    </>
                  ) : (
                    <>
                      <div><span>City</span><strong>{dash(formData.resCity)}</strong></div>
                      <div><span>Ward</span><strong>{dash(formData.resWard)}</strong></div>
                    </>
                  )}
                  <div><span>Pin Code</span><strong>{dash(formData.resPincode)}</strong></div>
                  <div><span>Post Office</span><strong>{dash(formData.resPostOffice)}</strong></div>
                  <div><span>Complete Address</span><strong>{dash(formData.resAddress)}</strong></div>
                </div>

                <div className="section-title">Professional Address</div>
                <div className="confirm-grid">
                  <div><span>Area Type</span><strong>{dash(formData.proAreaType)}</strong></div>
                  <div><span>State</span><strong>{dash(formData.proState)}</strong></div>
                  <div><span>District</span><strong>{dash(formData.proDistrict)}</strong></div>
                  {formData.proAreaType === "Rural" ? (
                    <>
                      <div><span>Block</span><strong>{dash(formData.proBlock)}</strong></div>
                      <div><span>Panchayat</span><strong>{dash(formData.proPanchayat)}</strong></div>
                      <div><span>Gram</span><strong>{dash(formData.proGram)}</strong></div>
                    </>
                  ) : (
                    <>
                      <div><span>City</span><strong>{dash(formData.proCity)}</strong></div>
                      <div><span>Ward</span><strong>{dash(formData.proWard)}</strong></div>
                    </>
                  )}
                  <div><span>Pin Code</span><strong>{dash(formData.proPincode)}</strong></div>
                  <div><span>Post Office</span><strong>{dash(formData.proPostOffice)}</strong></div>
                  <div><span>Complete Address</span><strong>{dash(formData.proAddress)}</strong></div>
                </div>

                <div className="section-title">Permanent Address</div>
                <div className="confirm-grid">
                  <div><span>Area Type</span><strong>{dash(formData.permAreaType)}</strong></div>
                  <div><span>State</span><strong>{dash(formData.permState)}</strong></div>
                  <div><span>District</span><strong>{dash(formData.permDistrict)}</strong></div>
                  {formData.permAreaType === "Rural" ? (
                    <>
                      <div><span>Block</span><strong>{dash(formData.permBlock)}</strong></div>
                      <div><span>Panchayat</span><strong>{dash(formData.permPanchayat)}</strong></div>
                      <div><span>Gram</span><strong>{dash(formData.permGram)}</strong></div>
                    </>
                  ) : (
                    <>
                      <div><span>City</span><strong>{dash(formData.permCity)}</strong></div>
                      <div><span>Ward</span><strong>{dash(formData.permWard)}</strong></div>
                    </>
                  )}
                  <div><span>Pin Code</span><strong>{dash(formData.permPincode)}</strong></div>
                  <div><span>Post Office</span><strong>{dash(formData.permPostOffice)}</strong></div>
                  <div><span>Complete Address</span><strong>{dash(formData.permAddress)}</strong></div>
                </div>

                <div className="section-title">Contact Details</div>
                <div className="confirm-grid">
                  <div><span>Preferred Address</span><strong>{dash(formData.preferredAddress)}</strong></div>
                  <div><span>Land-Line No.</span><strong>{dash(formData.landline)}</strong></div>
                  <div><span>Primary Mobile No.</span><strong>{dash(formData.mobile1)}</strong></div>
                  <div><span>Alternate Mobile Number</span><strong>{dash(formData.mobile2)}</strong></div>
                  <div><span>Fax No.</span><strong>{dash(formData.fax)}</strong></div>
                  <div><span>Email Id</span><strong>{dash(formData.email)}</strong></div>
                </div>

                {provisionalRecord ? (
                  <>
                    <div className="section-title">Past Details — Provisional Registration</div>
                    <div className="confirm-grid">
                      <div><span>Provisional Certificate No.</span><strong>{provisionalRecord.certNo}</strong></div>
                      <div><span>Issue Date</span><strong>{provisionalRecord.issueDate}</strong></div>
                    </div>
                  </>
                ) : (
                  <p className="muted-text small-muted">No past applications or prior registrations on file for this applicant.</p>
                )}
              </>
            ) : (
              <>
                <div className="section-title">Applicant Details</div>
                <div className="confirm-grid">
                  <div><span>Full Name</span><strong>{dash(formData.fullName)}</strong></div>
                  <div><span>College Name</span><strong>{dash(formData.collegeName)}</strong></div>
                  <div><span>Father's / Husband's Name</span><strong>{dash(formData.guardianName)}</strong></div>
                  <div><span>Date of Birth</span><strong>{dash(formData.dob)}</strong></div>
                  <div><span>Gender</span><strong>{dash(formData.gender)}</strong></div>
                  <div><span>Category</span><strong>{dash(formData.category)}</strong></div>
                  <div><span>Address</span><strong>{dash(formData.address)}</strong></div>
                </div>

                {isTransfer && (
                  <>
                    <div className="section-title">Past Details — Previous State Council</div>
                    <div className="confirm-grid">
                      <div><span>Previous State Council Name</span><strong>{dash(formData.prevCouncilName)}</strong></div>
                      <div><span>Previous Registration Number</span><strong>{dash(formData.prevRegNo)}</strong></div>
                      <div><span>Previous Registration Date</span><strong>{dash(formData.prevRegDate)}</strong></div>
                    </div>
                  </>
                )}
                {isRenewal && (
                  <>
                    <div className="section-title">Past Details — Existing Registration</div>
                    <div className="confirm-grid">
                      <div><span>Existing Registration Number</span><strong>{dash(formData.existingRegNo)}</strong></div>
                      <div><span>Registration Valid Till</span><strong>{dash(formData.existingRegValidTill)}</strong></div>
                    </div>
                  </>
                )}
                {isAddQual && (
                  <>
                    <div className="section-title">Qualification to be Added</div>
                    <div className="confirm-grid">
                      <div><span>Degree / Qualification</span><strong>{dash(formData.addlQualDegree)}</strong></div>
                      <div><span>Specialization / Subject</span><strong>{dash(formData.addlQualSpecialization)}</strong></div>
                      <div><span>University</span><strong>{dash(formData.addlQualUniversity)}</strong></div>
                      <div><span>College / Institute</span><strong>{dash(formData.addlQualCollege)}</strong></div>
                      <div><span>Year of Passing</span><strong>{dash(formData.addlQualYear)}</strong></div>
                    </div>
                    <div className="section-title">Past Details — Existing Registration</div>
                    <div className="confirm-grid">
                      <div><span>Existing Registration Number</span><strong>{dash(formData.existingRegNo)}</strong></div>
                      <div><span>Registration Valid Till</span><strong>{dash(formData.existingRegValidTill)}</strong></div>
                    </div>
                  </>
                )}

                {provisionalRecord ? (
                  <>
                    <div className="section-title">Past Details — Provisional Registration</div>
                    <div className="confirm-grid">
                      <div><span>Provisional Certificate No.</span><strong>{provisionalRecord.certNo}</strong></div>
                      <div><span>Issue Date</span><strong>{provisionalRecord.issueDate}</strong></div>
                    </div>
                  </>
                ) : (!isTransfer && !isRenewal && !isAddQual) && (
                  <p className="muted-text small-muted">No past applications or prior registrations on file for this applicant.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function ScreenProvisionalApplicationDetails() {
    const [detailTab, setDetailTab] = useState("application");
    if (!provisionalRecord) {
      return (
        <div className="page-narrow">
          <BackLink onClick={goDashboard} />
          <div className="card"><div className="card-body muted-text">No Provisional Registration found.</div></div>
        </div>
      );
    }
    const r = provisionalRecord;
    return (
      <div className="page-narrow">
        <BackLink onClick={goDashboard} />
        <div className="card">
          <div className="card-header">Application Details — {SERVICES.provisional.label}</div>
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <div className="confirm-grid" style={{ marginBottom: 20 }}>
              <div><span>Provisional Certificate No.</span><strong>{r.certNo}</strong></div>
              <div><span>Status</span><StatusBadge code="certificate_issued" /></div>
            </div>
          </div>

          <div className="tabs">
            <button type="button" className={`tab-btn ${detailTab === "application" ? "active" : ""}`} onClick={() => setDetailTab("application")}>Application Details</button>
            <button type="button" className={`tab-btn ${detailTab === "profile" ? "active" : ""}`} onClick={() => setDetailTab("profile")}>Applicant Profile & Past Details</button>
          </div>

          <div className="card-body">
            {detailTab === "application" ? (
              <>
                <div className="section-title">Qualification Details</div>
                <div className="confirm-grid">
                  <div><span>Degree</span><strong>{r.degree}</strong></div>
                  <div><span>University</span><strong>{r.university}</strong></div>
                  <div><span>Year of Passing</span><strong>{r.yearOfPassing}</strong></div>
                </div>

                <div className="section-title">Certificate</div>
                <div className="confirm-grid">
                  <div><span>Issue Date</span><strong>{r.issueDate}</strong></div>
                </div>
              </>
            ) : (
              <>
                <div className="section-title">Applicant Details</div>
                <div className="confirm-grid">
                  <div><span>Full Name</span><strong>{r.fullName}</strong></div>
                  <div><span>College Name</span><strong>{r.collegeName}</strong></div>
                  <div><span>Father's / Husband's Name</span><strong>{r.guardianName}</strong></div>
                  <div><span>Date of Birth</span><strong>{r.dob}</strong></div>
                  <div><span>Gender</span><strong>{r.gender}</strong></div>
                  <div><span>Category</span><strong>{r.category}</strong></div>
                  <div><span>Address</span><strong>{r.address}</strong></div>
                </div>

                <div className="section-title">Contact</div>
                <div className="confirm-grid">
                  <div><span>Mobile</span><strong>{r.mobile}</strong></div>
                  <div><span>Email</span><strong>{r.email}</strong></div>
                </div>

                <p className="muted-text small-muted">This is the applicant's first application with MPSVC — no past registrations on file.</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function ScreenExistingRegApplicationDetails() {
    const [detailTab, setDetailTab] = useState("application");
    if (!existingRegRecord) {
      return (
        <div className="page-narrow">
          <BackLink onClick={goDashboard} />
          <div className="card"><div className="card-body muted-text">No Registration found.</div></div>
        </div>
      );
    }
    const r = existingRegRecord;
    return (
      <div className="page-narrow">
        <BackLink onClick={goDashboard} />
        <div className="card">
          <div className="card-header">Application Details — {SERVICES.new.label}</div>
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <div className="confirm-grid" style={{ marginBottom: 20 }}>
              <div><span>Application ID</span><strong>{r.applicationId}</strong></div>
              <div><span>Registration No.</span><strong>{r.regNo}</strong></div>
              <div><span>Status</span><StatusBadge code="dispatched" /></div>
            </div>
          </div>

          <div className="tabs">
            <button type="button" className={`tab-btn ${detailTab === "application" ? "active" : ""}`} onClick={() => setDetailTab("application")}>Application Details</button>
            <button type="button" className={`tab-btn ${detailTab === "profile" ? "active" : ""}`} onClick={() => setDetailTab("profile")}>Applicant Profile & Past Details</button>
          </div>

          <div className="card-body">
            {detailTab === "application" ? (
              <>
                <div className="section-title">Qualification Details</div>
                <div className="confirm-grid">
                  <div><span>Degree</span><strong>{r.degree}</strong></div>
                  <div><span>University</span><strong>{r.university}</strong></div>
                  <div><span>Year of Passing</span><strong>{r.yearOfPassing}</strong></div>
                </div>

                <div className="section-title">ID Proof</div>
                <div className="confirm-grid">
                  <div><span>ID Proof Type</span><strong>{r.idProofType}</strong></div>
                  <div><span>ID Proof Number</span><strong>{r.idProofNumber}</strong></div>
                </div>

                <div className="section-title">Certificate</div>
                <div className="confirm-grid">
                  <div><span>Digital Issue Date</span><strong>{r.issueDate}</strong></div>
                  <div><span>Physical Dispatch Date</span><strong>{r.dispatchDate}</strong></div>
                  <div><span>Valid Till</span><strong>{r.existingRegValidTill}</strong></div>
                </div>
              </>
            ) : (
              <>
                <div className="section-title">Applicant Details</div>
                <div className="confirm-grid">
                  <div><span>Full Name</span><strong>{r.fullName}</strong></div>
                  <div><span>College Name</span><strong>{r.collegeName}</strong></div>
                  <div><span>Father's / Husband's Name</span><strong>{r.guardianName}</strong></div>
                  <div><span>Date of Birth</span><strong>{r.dob}</strong></div>
                  <div><span>Gender</span><strong>{r.gender}</strong></div>
                  <div><span>Category</span><strong>{r.category}</strong></div>
                  <div><span>Address</span><strong>{r.address}</strong></div>
                </div>

                <div className="section-title">Contact</div>
                <div className="confirm-grid">
                  <div><span>Mobile</span><strong>{r.mobile}</strong></div>
                  <div><span>Email</span><strong>{r.email}</strong></div>
                </div>

                <p className="muted-text small-muted">No past applications on file — this was the applicant's original registration with MPSVC.</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function ScreenCertApplicationDetail() {
    const app = findCertApplication(certSelectedAppId);
    if (!app) {
      return (
        <div className="page-narrow">
          <BackLink onClick={goDashboard} />
          <div className="card"><div className="card-body muted-text">No application found.</div></div>
        </div>
      );
    }
    const rejected = app.status === "rejected";
    const steps = [
      { code: "submitted", label: "Submitted" },
      { code: "under_review", label: "Under Review" },
      { code: rejected ? "rejected" : "approved", label: rejected ? "Rejected" : "Approved" },
    ];
    const stepIndexMap = { submitted: 0, under_review: 1, approved: 2, rejected: 2 };
    const currentIdx = stepIndexMap[app.status] ?? 0;
    const relatedCert = app.relatedCertId ? findCertHistoryEntry(app.relatedCertId) : null;

    return (
      <div className="page-narrow">
        <BackLink onClick={goDashboard} />
        <div className="card">
          <div className="card-header">{CERT_APP_KIND_LABEL[app.kind]}</div>
          <div className="card-body">
            <div className="confirm-grid" style={{ marginBottom: 20 }}>
              <div><span>Application No.</span><strong>{app.appNo}</strong></div>
              <div><span>Submitted On</span><strong>{app.submittedOn}</strong></div>
              <div><span>Status</span><CertAppBadge status={app.status} /></div>
            </div>

            <div className="stepper-vertical">
              {steps.map((s, i) => {
                const done = i < currentIdx || (i === currentIdx && !rejected);
                const active = i === currentIdx;
                const failed = rejected && i === currentIdx;
                return (
                  <div className="stepper-item" key={s.code}>
                    <div className="stepper-marker">
                      <div className={`stepper-dot ${failed ? "stepper-dot-done" : done ? "stepper-dot-done" : active ? "stepper-dot-active" : ""}`} style={failed ? { background: "var(--mp-red)" } : undefined}>
                        {failed ? <X size={12} /> : done ? <Check size={12} /> : <span className="stepper-dot-num">{i + 1}</span>}
                      </div>
                      {i < steps.length - 1 && <div className={`stepper-line ${i < currentIdx ? "stepper-line-done" : ""}`} />}
                    </div>
                    <div className="stepper-content">
                      <div className={`stepper-title ${done || failed ? "" : "stepper-title-muted"}`}>{s.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

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
                    Transfer Out of Madhya Pradesh Approved — registration transferred out. Renewal through
                    Madhya Pradesh is no longer available.
                  </NoteBanner>
                )}
              </>
            )}

            <div className="section-title">Timeline</div>
            <div className="confirm-grid" style={{ gridTemplateColumns: "1fr" }}>
              {app.timeline.map((h, i) => (
                <div key={i}><span>{CERT_APP_STATUS_META[h.status]?.label || h.status}</span><strong>{h.time}</strong></div>
              ))}
            </div>

            {app.status === "under_review" && (
              <div className="demo-panel" style={{ marginTop: 18 }}>
                <div className="demo-panel-title">Prototype Controls — simulate office action</div>
                <div className="demo-panel-body">
                  <button className="btn btn-outline btn-sm" onClick={() => advanceCertApplication(app.id, "approved")}>Move to Approved</button>
                  <button className="btn btn-danger btn-sm" onClick={() => advanceCertApplication(app.id, "rejected")}>Move to Rejected</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function ScreenTrackStatus() {
    if (!appStatus) {
      return (
        <div className="page-narrow">
          <BackLink onClick={goDashboard} />
          <div className="card"><div className="card-body muted-text">No application found. Submit an application to track its status here.</div></div>
        </div>
      );
    }
    const isOffline = paymentMethod === "offline";
    // Provisional Registration is digital-only — it never gets a physical certificate
    // or Speed Post dispatch, so that step is dropped from its tracker entirely.
    const hasDispatchStep = serviceType !== "provisional";
    const steps = (isOffline
      ? [
          { code: "submitted_payment_pending", label: "Submitted (Payment Confirmation Pending)" },
          { code: "payment_confirmed", label: "Payment Confirmed" },
          { code: "under_scrutiny", label: "Under Scrutiny" },
          { code: "approved", label: "Approved" },
          { code: "certificate_issued", label: "Digital Certificate Issued (eSign)" },
          { code: "dispatched", label: "Physical Certificate Dispatched via Speed Post" },
        ]
      : [
          { code: "submitted_payment_confirmed", label: "Submitted — Payment Confirmed" },
          { code: "under_scrutiny", label: "Under Scrutiny" },
          { code: "approved", label: "Approved" },
          { code: "certificate_issued", label: "Digital Certificate Issued (eSign)" },
          { code: "dispatched", label: "Physical Certificate Dispatched via Speed Post" },
        ]
    ).filter(s => hasDispatchStep || s.code !== "dispatched");
    const flatCodes = steps.map(s => s.code);
    const effectiveCode = appStatus === "sent_back" ? "under_scrutiny" : appStatus;
    const currentIdx = flatCodes.indexOf(effectiveCode);
    const histFor = code => statusHistory.find(h => h.code === code);

    return (
      <div className="page-narrow">
        <BackLink onClick={goDashboard} />
        <div className="card">
          <div className="card-header">Track Application Status</div>
          <div className="card-body">
            <div className="confirm-grid" style={{ marginBottom: 20 }}>
              <div><span>Application ID</span><strong>{applicationId}</strong></div>
              <div><span>Service Type</span><strong>{SERVICES[serviceType].label}</strong></div>
              <div><span>Current Status</span><StatusBadge code={appStatus} /></div>
            </div>

            <NoteBanner tone="blue">
              {hasDispatchStep
                ? "The physical certificate is dispatched only via India Post Speed Post. No other courier service is used."
                : "Provisional Registration is issued as a digital certificate only — there is no physical copy or Speed Post dispatch for this service."}
            </NoteBanner>

            <div className="stepper-vertical">
              {steps.map((s, i) => {
                const done = i < currentIdx || (i === currentIdx && appStatus !== "sent_back");
                const active = i === currentIdx;
                const h = histFor(s.code);
                return (
                  <div className="stepper-item" key={s.code}>
                    <div className="stepper-marker">
                      <div className={`stepper-dot ${done ? "stepper-dot-done" : active ? "stepper-dot-active" : ""}`}>
                        {done ? <Check size={12} /> : <span className="stepper-dot-num">{i + 1}</span>}
                      </div>
                      {i < steps.length - 1 && <div className={`stepper-line ${i < currentIdx ? "stepper-line-done" : ""}`} />}
                    </div>
                    <div className="stepper-content">
                      <div className={`stepper-title ${done ? "" : "stepper-title-muted"}`}>{s.label}</div>
                      {h && <div className="stepper-time">{h.time}</div>}
                      {s.code === "under_scrutiny" && appStatus === "sent_back" && (
                        <div className="sentback-box">
                          <AlertTriangle size={15} />
                          <div>
                            <div style={{ fontWeight: 600 }}>Sent Back for Correction</div>
                            <div className="small-muted">{sentBackRemarks || "Please review and correct the flagged details."}</div>
                            <div className="small-muted" style={{ marginTop: 4 }}>In the full workflow this reopens the Application Form for edits (simplified in this prototype).</div>
                            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => updateStatus("under_scrutiny")}>
                              Resubmit Application
                            </button>
                          </div>
                        </div>
                      )}
                      {s.code === "certificate_issued" && certificateIssueDate && <div className="small-muted">eSigned on {certificateIssueDate}</div>}
                      {s.code === "dispatched" && dispatchDate && <div className="small-muted">Dispatched {dispatchDate}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            <DemoControls />
          </div>
        </div>
      </div>
    );
  }

  function DemoControls() {
    return (
      <div className="demo-panel">
        <div className="demo-panel-title">Prototype Controls — simulate office actions</div>
        <div className="demo-panel-body">
          {appStatus === "submitted_payment_pending" && (
            <button className="btn btn-outline btn-sm" onClick={() => updateStatus("payment_confirmed")}>Confirm Offline Payment Receipt</button>
          )}
          {(appStatus === "submitted_payment_confirmed" || appStatus === "payment_confirmed") && (
            <button className="btn btn-outline btn-sm" onClick={() => updateStatus("under_scrutiny")}>Move to Under Scrutiny</button>
          )}
          {appStatus === "under_scrutiny" && (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => updateStatus("approved")}>Approve Application</button>
              <div className="demo-remarks-row">
                <input className="form-input form-input-sm" placeholder="Correction remarks…" value={remarksDraft} onChange={e => setRemarksDraft(e.target.value)} />
                <button className="btn btn-danger btn-sm" onClick={() => {
                  setSentBackRemarks(remarksDraft || "Uploaded qualification document is unclear — please re-upload.");
                  updateStatus("sent_back");
                  setRemarksDraft("");
                }}>Send Back for Correction</button>
              </div>
            </>
          )}
          {appStatus === "approved" && (
            <button className="btn btn-outline btn-sm" onClick={() => {
              const reg = genRegNo(serviceType);
              setRegistrationNo(reg);
              setCertificateIssueDate(todayDate());
              updateStatus("certificate_issued");
            }}>Issue Digital Certificate (eSign)</button>
          )}
          {appStatus === "certificate_issued" && (
            serviceType === "provisional" ? (
              <div className="small-muted">Provisional Registration certificate delivered digitally. No physical dispatch applicable — application lifecycle complete.</div>
            ) : (
              <div className="demo-remarks-row">
                <input className="form-input form-input-sm" placeholder="Speed Post tracking number…" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} />
                <button className="btn btn-outline btn-sm" onClick={() => {
                  if (!trackingNumber) setTrackingNumber("EM" + Math.floor(100000000 + Math.random() * 899999999) + "IN");
                  setDispatchDate(todayDate());
                  updateStatus("dispatched");
                }}>Dispatch Physical Certificate</button>
              </div>
            )
          )}
          {appStatus === "dispatched" && <div className="small-muted">Application lifecycle complete.</div>}
        </div>
      </div>
    );
  }

  function ScreenCertificate() {
    if (!appStatus) {
      return (
        <div className="page-narrow">
          <BackLink onClick={goDashboard} />
          <div className="card"><div className="card-body muted-text">No application found.</div></div>
        </div>
      );
    }
    const issued = ["certificate_issued", "dispatched"].includes(appStatus);
    // Provisional Registration is digital-only — no physical copy is ever printed or
    // dispatched, so the Physical Certificate tab doesn't apply to it.
    const hasPhysicalCert = serviceType !== "provisional";
    const activeCertTab = hasPhysicalCert ? certTab : "digital";
    return (
      <div className="page-narrow">
        <BackLink onClick={goDashboard} />
        <div className="card">
          <div className="card-header">Certificate</div>
          {hasPhysicalCert ? (
            <div className="tabs">
              <button className={`tab-btn ${activeCertTab === "digital" ? "active" : ""}`} onClick={() => setCertTab("digital")}>Digital Certificate</button>
              <button className={`tab-btn ${activeCertTab === "physical" ? "active" : ""}`} onClick={() => setCertTab("physical")}>Physical Certificate</button>
            </div>
          ) : (
            <div className="card-body" style={{ paddingBottom: 0 }}>
              <NoteBanner tone="blue">
                Provisional Registration is issued as a digital certificate only — there is no physical copy or Speed Post dispatch for this service.
              </NoteBanner>
            </div>
          )}
          <div className="card-body">
            {activeCertTab === "digital" && (
              issued ? (
                <div className="cert-preview-wrap">
                  <div className="certificate-card">
                    <div className="certificate-card-head">
                      <ShieldCheck size={18} /> MPSVC — Digital Certificate of Registration
                    </div>
                    <div className="certificate-card-body">
                      <div><span>Registration No.</span><strong>{registrationNo}</strong></div>
                      <div><span>Name</span><strong>{applicantDisplayName()}</strong></div>
                      <div><span>Service</span><strong>{SERVICES[serviceType].label}</strong></div>
                      <div><span>Issue Date</span><strong>{certificateIssueDate}</strong></div>
                      <div><span>Approving Authority eSign</span><strong>Registrar, MPSVC (eSigned)</strong></div>
                    </div>
                    <div className="certificate-card-foot">
                      <div className="cert-qr"><QrCode size={40} /></div>
                      <span className="small-muted">Scan to verify portal</span>
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowCertPreview(true)}><Download size={15} /> Download / View PDF</button>
                </div>
              ) : (
                <div className="muted-text">Your digital certificate will be available immediately after approval and eSign. Current status: <StatusBadge code={appStatus} /></div>
              )
            )}
            {hasPhysicalCert && activeCertTab === "physical" && (
              <div className="phys-cert-panel">
                <NoteBanner tone="blue">
                  The physical certificate is dispatched only via India Post Speed Post. No other courier service is used.
                </NoteBanner>
                {appStatus === "dispatched" ? (
                  <div className="confirm-grid">
                    <div><span>Dispatch Status</span><strong>Dispatched</strong></div>
                    <div><span>Dispatch Date</span><strong>{dispatchDate}</strong></div>
                  </div>
                ) : (
                  <div className="muted-text">Your sealed hard copy has not been dispatched yet. You'll see the Speed Post tracking reference here once the office dispatches it.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function ScreenProvisionalCertificate() {
    if (!provisionalRecord) {
      return (
        <div className="page-narrow">
          <BackLink onClick={goDashboard} />
          <div className="card"><div className="card-body muted-text">No Provisional Registration found.</div></div>
        </div>
      );
    }
    return (
      <div className="page-narrow">
        <BackLink onClick={goDashboard} />
        <div className="card">
          <div className="card-header">Certificate</div>
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <NoteBanner tone="blue">
              Provisional Registration is issued as a digital certificate only — there is no physical copy or Speed Post dispatch for this service.
            </NoteBanner>
          </div>
          <div className="card-body">
            <div className="cert-preview-wrap">
              <div className="certificate-card">
                <div className="certificate-card-head">
                  <ShieldCheck size={18} /> MPSVC — Provisional Certificate of Registration
                </div>
                <div className="certificate-card-body">
                  <div><span>Provisional Certificate No.</span><strong>{provisionalRecord.certNo}</strong></div>
                  <div><span>Name</span><strong>{provisionalRecord.fullName}</strong></div>
                  <div><span>Service</span><strong>{SERVICES.provisional.label}</strong></div>
                  <div><span>Issue Date</span><strong>{provisionalRecord.issueDate}</strong></div>
                  <div><span>Approving Authority eSign</span><strong>Registrar, MPSVC (eSigned)</strong></div>
                </div>
                <div className="certificate-card-foot">
                  <div className="cert-qr"><QrCode size={40} /></div>
                  <span className="small-muted">Scan to verify on portal</span>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowCertPreview(true)}><Download size={15} /> Download / View PDF</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function CertHistoryViewerModal() {
    const cert = certViewerId ? findCertHistoryEntry(certViewerId) : null;
    if (!cert) return null;
    return (
      <div className="modal-backdrop" onClick={() => setCertViewerId(null)}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <span>Certificate Viewer</span>
            <button className="gh-icon-btn" style={{ background: "var(--mp-gray-100)", color: "var(--mp-gray-600)", width: 24, height: 24 }} onClick={() => setCertViewerId(null)}><X size={15} /></button>
          </div>
          <div className="tabs">
            <button className={`tab-btn ${certViewerTab === "digital" ? "active" : ""}`} onClick={() => setCertViewerTab("digital")}>Digital Certificate</button>
            <button className={`tab-btn ${certViewerTab === "physical" ? "active" : ""}`} onClick={() => setCertViewerTab("physical")}>Physical Certificate</button>
          </div>
          <div className="modal-body">
            {certViewerTab === "digital" && (
              <div className="cert-preview-wrap">
                <div className="certificate-card">
                  <div className="certificate-card-head">
                    <ShieldCheck size={18} /> MPSVC — {cert.kind}
                  </div>
                  <div className="certificate-card-body">
                    <div><span>Registration No.</span><strong>{existingRegRecord?.regNo}</strong></div>
                    <div><span>Certificate No.</span><strong>{cert.certNo}</strong></div>
                    <div><span>Name</span><strong>{existingRegRecord?.fullName}</strong></div>
                    <div><span>Issue Date</span><strong>{cert.issueDate}</strong></div>
                    <div><span>Valid Until</span><strong>{cert.validUntil}</strong></div>
                    <div><span>Approving Authority eSign</span><strong>Registrar, MPSVC (eSigned)</strong></div>
                  </div>
                  <div className="certificate-card-foot">
                    <div className="cert-qr"><QrCode size={40} /></div>
                    <span className="small-muted">Scan to verify on portal</span>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => pushNotification("Certificate downloaded (simulated).")}><Download size={15} /> Download / View PDF</button>
              </div>
            )}
            {certViewerTab === "physical" && (
              <div className="phys-cert-panel">
                <NoteBanner tone="blue">
                  The physical certificate is dispatched only via India Post Speed Post. No other courier service is used.
                </NoteBanner>
                <div className="confirm-grid">
                  <div><span>Dispatch Status</span><strong>Dispatched &amp; Received</strong></div>
                  <div><span>Dispatch Date</span><strong>{cert.dispatchDate}</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function CertDuplicateModal() {
    const cert = certDupCertId ? findCertHistoryEntry(certDupCertId) : null;
    if (!cert) return null;
    return (
      <div className="modal-backdrop" onClick={closeCertDuplicate}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <span>Apply for Duplicate Certificate</span>
            <button className="gh-icon-btn" style={{ background: "var(--mp-gray-100)", color: "var(--mp-gray-600)", width: 24, height: 24 }} onClick={closeCertDuplicate}><X size={15} /></button>
          </div>
          <div className="modal-body">
            <Field label="Selected Certificate">
              <div className="muted-text" style={{ fontWeight: 600 }}>{cert.kind} — {cert.certNo}</div>
            </Field>
            <Field label="Reason">
              <select className="form-input" value={certDupReason} onChange={e => setCertDupReason(e.target.value)}>
                {DUPLICATE_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Additional Details">
              <textarea className="form-input" rows={3} value={certDupDetails} onChange={e => setCertDupDetails(e.target.value)} />
            </Field>
          </div>
          <div className="app-card-actions" style={{ justifyContent: "flex-end", borderTop: "1px solid var(--mp-gray-200)" }}>
            <button className="btn btn-outline" onClick={closeCertDuplicate}>Cancel</button>
            <button className="btn btn-primary" onClick={submitCertDuplicate}><Send size={15} /> Submit Application</button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------- Small helpers ---------------------------- */

  function BackLink({ onClick }) {
    return <button className="back-link" onClick={onClick}><ArrowLeft size={14} /> Back</button>;
  }

  function UploadBox({ icon, label, fileName, onPick, format, hint }) {
    return (
      <div className="upload-box">
        <div className="upload-box-icon">{icon}</div>
        <div className="upload-box-body">
          <div className="upload-box-label">{label}</div>
          <div className="upload-box-file">{fileName || "No file selected"}</div>
          {hint && <div className="form-hint">{hint}</div>}
        </div>
        <label className="upload-btn">
          <Upload size={13} /> {fileName ? "Replace" : "Upload"}
          <input type="file" hidden accept={UPLOAD_ACCEPT[format]} onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f.name); }} />
        </label>
      </div>
    );
  }

  /* ---------------------------- Router ---------------------------- */

  function renderScreen() {
    switch (screen) {
      case "login": return <ScreenLogin />;
      case "college-check": return <ScreenCollegeCheck />;
      case "existing-login": return <ScreenExistingLogin />;
      case "prov-cert-otp": return <ScreenProvCertOtp />;
      case "regno-otp": return <ScreenRegnoOtp />;
      case "forgot-regno": return <ScreenForgotRegno />;
      case "forgot-regno-result": return <ScreenForgotRegnoResult />;
      case "contact-admin": return <ScreenContactAdmin />;
      case "service-select": return <ScreenServiceSelect options={availableServices()} />;
      case "renewal-choices": return <ScreenRenewalChoices />;
      case "app-form": return <ScreenAppForm />;
      case "doc-upload": return <ScreenDocUpload />;
      case "review": return <ScreenReview />;
      case "payment": return <ScreenPayment />;
      case "payment-online": return <ScreenPaymentOnline />;
      case "payment-result-success": return <ScreenPaymentSuccess />;
      case "payment-result-failure": return <ScreenPaymentFailure />;
      case "payment-offline": return <ScreenPaymentOffline />;
      case "confirmation": return <ScreenConfirmation />;
      case "dashboard": return <ScreenDashboard />;
      case "track-status": return <ScreenTrackStatus />;
      case "application-details": return <ScreenApplicationDetails />;
      case "certificate": return <ScreenCertificate />;
      case "provisional-certificate": return <ScreenProvisionalCertificate />;
      case "provisional-application-details": return <ScreenProvisionalApplicationDetails />;
      case "existing-reg-application-details": return <ScreenExistingRegApplicationDetails />;
      case "cert-application-detail": return <ScreenCertApplicationDetail />;
      default: return <ScreenLogin />;
    }
  }

  return (
    <div className="mpsvc-root">
      <style>{CSS}</style>
      <GovHeader
        loggedIn={loggedIn}
        profile={profile}
        notifications={notifications}
        notifOpen={notifOpen}
        setNotifOpen={setNotifOpen}
        onLogout={resetAll}
        onHome={() => loggedIn && setScreen("dashboard")}
      />
      <main className="mpsvc-main">{renderScreen()}</main>
      <footer className="mpsvc-footer">
        Madhya Pradesh State Veterinary Council · Citizen Portal (Prototype) · Helpline: 0755-XXXXXXX
      </footer>

      {showCertPreview && (() => {
        const p = screen === "provisional-certificate"
          ? {
              serviceLabel: SERVICES.provisional.label,
              name: provisionalRecord?.fullName,
              regNo: provisionalRecord?.certNo,
              issueDate: provisionalRecord?.issueDate,
            }
          : {
              serviceLabel: SERVICES[serviceType]?.label,
              name: applicantDisplayName(),
              regNo: registrationNo,
              issueDate: certificateIssueDate,
            };
        return (
        <div className="modal-backdrop" onClick={() => setShowCertPreview(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span>Digital Certificate Preview</span>
              <button className="gh-icon-btn" onClick={() => setShowCertPreview(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="certificate-full">
                <div className="certificate-full-emblem">MP</div>
                <div className="certificate-full-title">Madhya Pradesh State Veterinary Council</div>
                <div className="certificate-full-sub">Certificate of {p.serviceLabel}</div>
                <div className="certificate-full-divider" />
                <p>This is to certify that</p>
                <p className="certificate-full-name">{p.name}</p>
                <p>has been granted registration under the Madhya Pradesh State Veterinary Council.</p>
                <div className="certificate-full-grid">
                  <div><span>Registration No.</span><strong>{p.regNo}</strong></div>
                  <div><span>Issue Date</span><strong>{p.issueDate}</strong></div>
                </div>
                <div className="certificate-full-foot">
                  <div className="cert-qr"><QrCode size={44} /></div>
                  <div className="certificate-full-sign">
                    <div className="sign-line" />
                    Registrar, MPSVC<br /><span className="small-muted">Digitally eSigned</span>
                  </div>
                </div>
              </div>
              <p className="form-hint" style={{ textAlign: "center", marginTop: 10 }}>Prototype preview — use your browser's Print / Save as PDF to export.</p>
            </div>
          </div>
        </div>
        );
      })()}

      <CertHistoryViewerModal />
      <CertDuplicateModal />
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Stylesheet                                                              */
/* ---------------------------------------------------------------------- */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Inter:wght@400;500;600;700&display=swap');

:root {
  --mp-blue-900: #0A3D62;
  --mp-blue-800: #0D4A78;
  --mp-blue-700: #145DA0;
  --mp-blue-600: #1C6FB8;
  --mp-blue-50: #EEF5FC;
  --mp-saffron: #E8730A;
  --mp-saffron-dark: #C25E00;
  --mp-saffron-50: #FDF0E2;
  --mp-green: #1E7B34;
  --mp-green-50: #E8F5EA;
  --mp-red: #C0392B;
  --mp-amber-bg: #FFF6DD;
  --mp-amber-text: #7A5900;
  --mp-blue-note-bg: #E8F1FB;
  --mp-blue-note-text: #0A3D62;
  --mp-gray-900: #1F2937;
  --mp-gray-600: #586374;
  --mp-gray-400: #94A0AF;
  --mp-gray-200: #E3E7EC;
  --mp-gray-100: #F1F3F6;
  --mp-gray-50: #F7F8FA;
  --mp-paper: #F5F6F2;
  --mp-white: #FFFFFF;
  --radius: 12px;
  --radius-sm: 8px;
  --radius-pill: 999px;
  --shadow-sm: 0 1px 3px rgba(15,35,55,0.05);
  --shadow-md: 0 6px 20px rgba(15,35,55,0.07);
  --shadow-lg: 0 16px 40px rgba(15,35,55,0.12);
}
.mpsvc-root * { box-sizing: border-box; }
.mpsvc-root {
  font-family: 'Inter', 'Segoe UI', 'Noto Sans', Roboto, Arial, sans-serif;
  color: var(--mp-gray-900);
  background: var(--mp-paper);
  min-height: 100%;
  display: flex;
  flex-direction: column;
}
.mpsvc-root h1, .mpsvc-root h2, .mpsvc-root .dash-greeting, .mpsvc-root .login-option-title, .mpsvc-root .gh-title-en {
  font-family: 'Merriweather', Georgia, serif;
}
.mpsvc-main { flex: 1; padding: 32px 16px 56px; }
.mpsvc-footer {
  text-align: center; font-size: 12px; color: var(--mp-gray-600);
  padding: 18px; border-top: 1px solid var(--mp-gray-200); background: var(--mp-white);
}

/* Header */
.gh-tricolor { height: 4px; background: linear-gradient(90deg, var(--mp-saffron) 0 33%, #fff 33% 66%, var(--mp-green) 66% 100%); }
.gh-main {
  background: linear-gradient(135deg, var(--mp-blue-900), #0B3455); color: #fff; display: flex; align-items: center;
  justify-content: space-between; padding: 13px 22px; flex-wrap: wrap; gap: 10px;
}
.gh-brand { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.gh-emblem {
  width: 38px; height: 38px; border-radius: 50%; background: var(--mp-saffron);
  color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;
  border: 2px solid rgba(255,255,255,0.85); box-shadow: 0 2px 8px rgba(0,0,0,0.25);
}
.gh-titles { display: flex; flex-direction: column; line-height: 1.3; }
.gh-title-hi { font-size: 13px; opacity: 0.88; }
.gh-title-en { font-size: 13px; font-weight: 700; letter-spacing: 0.1px; }
.gh-right { display: flex; align-items: center; gap: 12px; position: relative; }
.gh-lang { font-size: 12px; opacity: 0.9; }
.gh-lang-muted { opacity: 0.55; }
.gh-icon-btn { background: rgba(255,255,255,0.12); border: none; color: #fff; width: 33px; height: 33px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; transition: background .15s; }
.gh-icon-btn:hover { background: rgba(255,255,255,0.24); }
.gh-dot { position: absolute; top: 5px; right: 6px; width: 8px; height: 8px; border-radius: 50%; background: var(--mp-saffron); border: 1.5px solid var(--mp-blue-900); }
.gh-user-chip { display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,0.14); padding: 6px 12px; border-radius: var(--radius-pill); font-size: 12.5px; font-weight: 500; }
.gh-notif-wrap { position: relative; }

.notif-panel { position: absolute; right: 0; top: 40px; width: 300px; background: #fff; color: var(--mp-gray-900); border-radius: var(--radius); box-shadow: 0 10px 30px rgba(0,0,0,0.18); z-index: 40; overflow: hidden; border: 1px solid var(--mp-gray-200); }
.notif-panel-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px 4px; font-weight: 700; }
.notif-panel-head .gh-icon-btn { background: var(--mp-gray-100); color: var(--mp-gray-600); width: 24px; height: 24px; }
.notif-panel-sub { padding: 0 14px 8px; font-size: 11.5px; color: var(--mp-gray-600); }
.notif-list { max-height: 280px; overflow-y: auto; border-top: 1px solid var(--mp-gray-200); }
.notif-item { display: flex; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--mp-gray-100); }
.notif-item-icon { width: 22px; height: 22px; border-radius: 50%; background: var(--mp-blue-50); color: var(--mp-blue-700); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.notif-item-msg { font-size: 12.5px; line-height: 1.35; }
.notif-item-time { font-size: 11px; color: var(--mp-gray-600); margin-top: 2px; }
.notif-empty { padding: 20px 14px; text-align: center; color: var(--mp-gray-600); font-size: 12.5px; }

/* Layout widths */
.page-narrow { max-width: 560px; margin: 0 auto; }
.page-wide { max-width: 820px; margin: 0 auto; }

/* Entry hero */
.entry-hero { text-align: center; margin-bottom: 32px; }
.entry-hero-badge {
  width: 56px; height: 56px; border-radius: 50%; background: var(--mp-blue-50); color: var(--mp-blue-700);
  display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; box-shadow: var(--shadow-sm);
}
.entry-hero h1 { font-size: 25px; font-weight: 900; color: var(--mp-blue-900); margin: 0 0 10px; letter-spacing: -0.2px; }
.entry-hero p { color: var(--mp-gray-600); font-size: 14.5px; margin: 0 auto; max-width: 420px; line-height: 1.6; }

/* Login options */
.login-options { display: flex; flex-direction: column; gap: 12px; }
.login-options-label { margin-top: 8px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--mp-gray-600); }
.login-option-card {
  display: flex; align-items: center; gap: 16px; background: #fff; border: 1px solid var(--mp-gray-200);
  border-radius: var(--radius); padding: 18px 20px; cursor: pointer; box-shadow: var(--shadow-sm);
  transition: border-color .15s, box-shadow .15s, transform .15s;
}
.login-option-card:hover { border-color: var(--mp-blue-600); box-shadow: var(--shadow-md); transform: translateY(-2px); }
.login-option-card:hover .login-option-arrow { transform: translateX(3px); color: var(--mp-blue-700); }
.login-option-icon {
  width: 46px; height: 46px; border-radius: 50%; background: var(--mp-blue-50); color: var(--mp-blue-700);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.login-option-card-staff .login-option-icon { background: var(--mp-saffron-50); color: var(--mp-saffron-dark); }
.login-option-card-regno .login-option-icon { background: var(--mp-green-50); color: var(--mp-green); }
.login-option-body { flex: 1; }
.login-option-title { font-weight: 700; font-size: 15.5px; color: var(--mp-blue-900); }
.login-option-desc { font-size: 12.5px; color: var(--mp-gray-600); margin-top: 3px; line-height: 1.4; }

.login-option-arrow { color: var(--mp-gray-400); flex-shrink: 0; transition: transform .15s, color .15s; }

/* Login method toggle (Mobile Number / Registration Number) */
.login-method-toggle { display: flex; gap: 8px; margin-bottom: 20px; }
.login-method-tab {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--radius-pill);
  border: 1.5px solid var(--mp-gray-200); background: #fff; color: var(--mp-gray-600); font-size: 12.5px;
  font-weight: 600; cursor: pointer; font-family: inherit; transition: background .15s, border-color .15s, color .15s;
}
.login-method-tab:hover { border-color: var(--mp-blue-600); }
.login-method-tab-active { background: var(--mp-blue-700); border-color: var(--mp-blue-700); color: #fff; cursor: default; }
.login-method-tab-active:hover { border-color: var(--mp-blue-700); }

/* Mobile Number / Registration Number — what each login method is for */
.login-info-panel { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.login-info-block { background: var(--mp-gray-50); border: 1px solid var(--mp-gray-200); border-radius: var(--radius); padding: 12px 14px; }
.login-info-label { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--mp-blue-700); text-transform: uppercase; letter-spacing: .3px; }
.login-info-label-regno { color: var(--mp-green); }
.login-info-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.login-info-chip { font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: var(--radius-pill); background: var(--mp-blue-note-bg); color: var(--mp-blue-note-text); }
.login-info-chip-regno { background: var(--mp-green-50); color: var(--mp-green); }
.login-info-note { font-size: 12px; color: var(--mp-gray-600); margin: 9px 0 0; line-height: 1.5; }

/* Demo shortcut */
.demo-shortcut { margin-top: 26px; display: flex; align-items: center; gap: 12px; background: var(--mp-amber-bg); border: 1px dashed #E3C066; border-radius: var(--radius); padding: 13px 16px; text-align: left; cursor: pointer; width: 100%; transition: box-shadow .15s; }
.demo-shortcut:hover { box-shadow: var(--shadow-sm); }
.demo-shortcut-icon { width: 30px; height: 30px; border-radius: 50%; background: #FCE8B0; color: var(--mp-amber-text); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.demo-shortcut-body { flex: 1; }
.demo-shortcut-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--mp-amber-text); opacity: 0.75; }
.demo-shortcut-title { font-size: 13px; font-weight: 600; color: var(--mp-amber-text); margin-top: 1px; }

/* Cards */
.card { background: #fff; border: 1px solid var(--mp-gray-200); border-radius: var(--radius); overflow: hidden; margin-bottom: 18px; box-shadow: var(--shadow-sm); }
.card-header { background: var(--mp-blue-50); color: var(--mp-blue-900); font-weight: 700; font-size: 15px; padding: 16px 20px; border-bottom: 1px solid var(--mp-gray-200); font-family: 'Merriweather', Georgia, serif; }
.card-header-icon { display: flex; align-items: center; gap: 9px; }
.card-header-icon svg { color: var(--mp-blue-700); flex-shrink: 0; }
.card-body { padding: 20px; }

.back-link { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: var(--mp-blue-700); font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 14px; }
.back-link:hover { text-decoration: underline; }

/* Forms */
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 12.5px; font-weight: 600; color: var(--mp-gray-900); margin-bottom: 6px; }
.required-star { color: var(--mp-red); margin-left: 3px; }
.form-input { width: 100%; padding: 11px 13px; border: 1.5px solid var(--mp-gray-200); border-radius: var(--radius-sm); font-size: 14px; background: #fff; color: var(--mp-gray-900); font-family: inherit; transition: border-color .15s, box-shadow .15s; }
.form-input:focus { outline: none; border-color: var(--mp-blue-600); box-shadow: 0 0 0 3px rgba(20,93,160,0.1); }
.form-input-sm { padding: 7px 10px; font-size: 12.5px; }
.form-hint { font-size: 11.5px; color: var(--mp-gray-600); margin-top: 5px; }
.form-error { color: var(--mp-red); font-size: 12.5px; margin: -6px 0 12px; }
.muted-text { color: var(--mp-gray-600); font-size: 13px; }
.small-muted { color: var(--mp-gray-600); font-size: 11.5px; }
.two-col-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
.section-title { font-weight: 700; font-size: 13px; color: var(--mp-blue-900); margin: 18px 0 10px; padding-bottom: 6px; border-bottom: 2px solid var(--mp-blue-50); display: flex; align-items: center; gap: 8px; }
.section-title-tag { font-size: 10.5px; font-weight: 600; background: var(--mp-amber-bg); color: var(--mp-amber-text); padding: 2px 8px; border-radius: 20px; }
.form-actions { display: flex; justify-content: space-between; margin-top: 22px; }
.checkbox-row { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: var(--mp-gray-600); margin: 6px 0 18px; padding: 10px 12px; background: var(--mp-gray-50); border-radius: var(--radius-sm); }
.checkbox-row input { accent-color: var(--mp-blue-700); width: 15px; height: 15px; flex-shrink: 0; }
.radio-inline-group { display: flex; gap: 18px; }
.radio-inline { display: flex; align-items: center; gap: 6px; font-size: 13px; }

/* Buttons */
.btn { border: none; border-radius: var(--radius-sm); padding: 11px 20px; font-size: 13.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; justify-content: center; font-family: inherit; transition: background .15s, box-shadow .15s, transform .1s; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn:active:not(:disabled) { transform: translateY(1px); }
.btn-primary { background: var(--mp-blue-700); color: #fff; box-shadow: var(--shadow-sm); }
.btn-primary:hover:not(:disabled) { background: var(--mp-blue-900); box-shadow: var(--shadow-md); }
.btn-outline { background: #fff; color: var(--mp-blue-700); border: 1.5px solid var(--mp-blue-700); }
.btn-outline:hover:not(:disabled) { background: var(--mp-blue-50); }
.btn-danger { background: var(--mp-red); color: #fff; }
.btn-danger:hover:not(:disabled) { background: #a53225; }
.btn-outline-danger { background: #fff; color: var(--mp-red); border: 1.5px solid #F0C9C2; }
.btn-outline-danger:hover:not(:disabled) { background: #FBE3E1; }
.btn-block { width: 100%; margin-top: 8px; }
.btn-sm { padding: 7px 13px; font-size: 12px; }
.btn-link { background: none; color: var(--mp-blue-700); text-decoration: underline; padding: 8px 0; font-size: 12.5px; }

/* Note banner */
.note-banner { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 4px; font-size: 12.5px; line-height: 1.5; margin-bottom: 18px; }
.note-banner-amber { background: var(--mp-amber-bg); color: var(--mp-amber-text); border: 1px solid #F0DFA0; }
.note-banner-blue { background: var(--mp-blue-note-bg); color: var(--mp-blue-note-text); border: 1px solid #C9DEF3; }
.note-banner-icon { flex-shrink: 0; margin-top: 1px; }

/* Wizard ribbon */
.wizard-ribbon { display: flex; align-items: center; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px; }
.wizard-step { display: flex; align-items: center; flex: 1; min-width: 90px; }
.wizard-dot { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.wizard-dot-todo { background: var(--mp-gray-200); color: var(--mp-gray-600); }
.wizard-dot-active { background: var(--mp-blue-700); color: #fff; }
.wizard-dot-done { background: var(--mp-green); color: #fff; }
.wizard-label { font-size: 11px; margin-left: 7px; white-space: nowrap; }
.wizard-label-todo { color: var(--mp-gray-600); }
.wizard-label-active { color: var(--mp-blue-900); font-weight: 700; }
.wizard-label-done { color: var(--mp-green); font-weight: 600; }
.wizard-connector { flex: 1; height: 2px; background: var(--mp-gray-200); margin: 0 8px; }
.wizard-connector-done { background: var(--mp-green); }

/* Service select */
.service-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
.service-card { display: flex; align-items: center; gap: 12px; border: 1px solid var(--mp-gray-200); border-radius: var(--radius); padding: 14px; cursor: pointer; color: var(--mp-blue-700); }
.service-card:hover { border-color: var(--mp-blue-700); background: var(--mp-blue-50); }
.service-card-label { flex: 1; font-weight: 600; font-size: 13.5px; color: var(--mp-gray-900); }
.service-card-sub { font-weight: 400; font-size: 12px; color: var(--mp-gray-600); margin-top: 2px; line-height: 1.4; }
.service-card-arrow { color: var(--mp-gray-400); }

/* Upload box */
.upload-box { display: flex; align-items: center; gap: 10px; border: 1px dashed var(--mp-gray-200); border-radius: 4px; padding: 10px 12px; margin-bottom: 12px; background: var(--mp-gray-50); }
.upload-box-icon { color: var(--mp-blue-700); }
.upload-box-body { flex: 1; }
.upload-box-label { font-size: 12.5px; font-weight: 600; }
.upload-box-file { font-size: 11.5px; color: var(--mp-gray-600); }
.upload-btn { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; color: var(--mp-blue-700); border: 1px solid var(--mp-blue-700); border-radius: 20px; padding: 6px 12px; cursor: pointer; background: #fff; white-space: nowrap; }
.upload-btn:hover { background: var(--mp-blue-50); }

/* Checklist */
.checklist { display: flex; flex-direction: column; gap: 10px; }
.checklist-item { display: flex; align-items: center; gap: 12px; border: 1px solid var(--mp-gray-200); border-radius: 4px; padding: 12px 14px; }
.checklist-body { flex: 1; }
.checklist-label { font-size: 13px; font-weight: 600; }
.checklist-filename { font-size: 11.5px; color: var(--mp-gray-600); }
.icon-good { color: var(--mp-green); }
.icon-muted { color: var(--mp-gray-400); }

/* Payment */
.fee-summary { display: flex; justify-content: space-between; align-items: center; background: var(--mp-blue-50); border-radius: 4px; padding: 12px 16px; font-size: 13.5px; margin-bottom: 18px; color: var(--mp-blue-900); }
.radio-card-group { display: flex; flex-direction: column; gap: 10px; margin-bottom: 4px; }
.radio-card { display: flex; align-items: center; gap: 12px; border: 1.5px solid var(--mp-gray-200); border-radius: var(--radius); padding: 14px; cursor: pointer; color: var(--mp-blue-700); }
.radio-card.selected { border-color: var(--mp-blue-700); background: var(--mp-blue-50); }
.radio-card.disabled { cursor: not-allowed; opacity: 0.55; background: var(--mp-gray-50); }
.radio-card-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--mp-gray-600); background: var(--mp-gray-100); border-radius: 3px; padding: 2px 7px; margin-left: auto; }
.radio-card-title { font-weight: 700; font-size: 13.5px; color: var(--mp-gray-900); }
.radio-card-desc { font-size: 12px; color: var(--mp-gray-600); margin-top: 2px; }
.demo-btn-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

/* Result panels */
.result-panel { background: #fff; border: 1px solid var(--mp-gray-200); border-radius: var(--radius); padding: 32px 24px; text-align: center; }
.result-panel h2 { margin: 12px 0 6px; font-size: 19px; }
.result-panel p { color: var(--mp-gray-600); font-size: 13.5px; margin-bottom: 20px; }
.result-success { color: var(--mp-green); }
.result-success h2 { color: var(--mp-gray-900); }
.result-failure { color: var(--mp-red); }
.result-failure h2 { color: var(--mp-gray-900); }
.confirm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; text-align: left; background: var(--mp-gray-50); border-radius: 4px; padding: 16px; margin: 16px 0; }
.confirm-grid div { display: flex; flex-direction: column; gap: 3px; }
.confirm-grid span { font-size: 11px; color: var(--mp-gray-600); text-transform: uppercase; letter-spacing: 0.3px; }
.confirm-grid strong { font-size: 13.5px; color: var(--mp-gray-900); }
.next-steps { text-align: left; background: var(--mp-blue-50); border-radius: 4px; padding: 16px; margin-bottom: 20px; }
.next-steps ul { margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--mp-gray-900); line-height: 1.8; }

/* Challan */
.challan-box { border: 2px dashed var(--mp-saffron); border-radius: 6px; padding: 20px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 18px; background: #FFFBF3; }
.challan-label { font-size: 11.5px; color: var(--mp-gray-600); text-transform: uppercase; }
.challan-number { font-size: 22px; font-weight: 800; color: var(--mp-saffron-dark); letter-spacing: 0.5px; }
.challan-amount { font-size: 13px; color: var(--mp-gray-900); margin-top: 4px; }

/* Status badge */
.status-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: var(--radius-pill); white-space: nowrap; }
.status-badge::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.status-pending { background: #FFF1D6; color: #8A5A00; }
.status-confirmed { background: #DCF3E3; color: var(--mp-green); }
.status-scrutiny { background: #E3ECFB; color: var(--mp-blue-700); }
.status-sentback { background: #FBE3E1; color: var(--mp-red); }
.status-approved { background: #DCF3E3; color: var(--mp-green); }
.status-issued { background: #E7E1FA; color: #5B36B8; }
.status-dispatched { background: #DCEEF3; color: #157089; }
.status-active { background: #DCF3E3; color: var(--mp-green); }
.status-expiring { background: #FFF1D6; color: #8A5A00; }
.status-expired { background: #FBE3E1; color: var(--mp-red); }
.status-superseded { background: var(--mp-gray-100); color: var(--mp-gray-600); }

/* Dashboard */
.dash-greeting-row { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
.dash-avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--mp-blue-900); color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Merriweather', serif; font-weight: 700; font-size: 16px; flex-shrink: 0; box-shadow: var(--shadow-sm); }
.dash-greeting { font-size: 19px; font-weight: 700; color: var(--mp-blue-900); margin: 0 0 3px; }
.app-card { padding: 0; box-shadow: var(--shadow-sm); border-left: 3px solid var(--mp-blue-700); transition: box-shadow .15s; }
.app-card:hover { box-shadow: var(--shadow-md); }
.app-card-accent-purple { border-left-color: #5B36B8; }
.app-card-accent-teal { border-left-color: #157089; }
.app-card-top { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 20px 8px; gap: 10px; }
.app-card-id { font-weight: 700; font-size: 14.5px; color: var(--mp-blue-900); font-family: 'Merriweather', serif; }
.app-card-service { font-size: 12.5px; color: var(--mp-gray-600); margin-top: 3px; }
.app-card-actions { display: flex; gap: 10px; padding: 12px 20px 20px; flex-wrap: wrap; }
.app-card-note { padding: 0 20px 4px; }
.app-card-note .note-banner { margin-bottom: 0; }
.dashboard-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 18px; }
.dash-tile {
  background: #fff; border: 1px solid var(--mp-gray-200); border-radius: var(--radius); padding: 20px 12px;
  display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; font-size: 12.5px;
  font-weight: 600; color: var(--mp-gray-900); cursor: pointer; box-shadow: var(--shadow-sm);
  transition: box-shadow .15s, transform .15s, border-color .15s;
}
.dash-tile:hover { border-color: var(--mp-blue-600); box-shadow: var(--shadow-md); transform: translateY(-2px); }
.dash-tile-icon { width: 40px; height: 40px; border-radius: 50%; background: var(--mp-blue-50); color: var(--mp-blue-700); display: flex; align-items: center; justify-content: center; }

/* Certificate hero + countdown (Registration Number login) */
.cert-hero-body { display: grid; grid-template-columns: 1fr 200px; gap: 18px; padding: 4px 20px 4px; align-items: stretch; }
.cert-hero-info { display: flex; flex-direction: column; gap: 9px; justify-content: center; }
.cert-hero-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 12.5px; color: var(--mp-gray-600); }
.cert-hero-row strong { color: var(--mp-gray-900); font-weight: 600; font-size: 13.5px; }
.cert-countdown { border-radius: var(--radius-sm); padding: 14px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; }
.cert-countdown-active { background: #DCF3E3; color: var(--mp-green); }
.cert-countdown-expiring { background: #FFF1D6; color: #8A5A00; }
.cert-countdown-expired { background: #FBE3E1; color: var(--mp-red); }
.cert-countdown-title { font-weight: 700; font-size: 12px; margin-top: 3px; }
.cert-countdown-value { font-size: 26px; font-weight: 800; font-family: 'Merriweather', serif; line-height: 1.1; margin-top: 1px; }
.cert-countdown-sub { font-size: 11px; opacity: 0.85; }

/* Certificate history table */
.table-card { padding: 0; }
.table-scroll { overflow-x: auto; }
.cert-history-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.cert-history-table th { text-align: left; padding: 11px 16px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--mp-gray-600); font-weight: 700; background: var(--mp-gray-50); border-bottom: 1px solid var(--mp-gray-200); white-space: nowrap; }
.cert-history-table td { padding: 13px 16px; border-bottom: 1px solid var(--mp-gray-200); vertical-align: middle; white-space: nowrap; }
.cert-history-table tbody tr:last-child td { border-bottom: none; }
.cert-history-table tbody tr:hover { background: var(--mp-gray-50); }
.cert-history-kind { font-weight: 700; color: var(--mp-blue-900); }
.cert-history-mono { font-family: 'Courier New', monospace; font-size: 12px; }
.cert-history-actions { display: flex; gap: 6px; }

/* Application history (cert applications) */
.cert-app-list { display: flex; flex-direction: column; gap: 10px; }
.cert-app-row { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid var(--mp-gray-200); border-radius: var(--radius); padding: 14px 16px; cursor: pointer; box-shadow: var(--shadow-sm); transition: box-shadow .15s; }
.cert-app-row:hover { box-shadow: var(--shadow-md); }
.cert-app-row-body { flex: 1; min-width: 0; }
.cert-app-row-title { font-weight: 600; font-size: 13px; color: var(--mp-gray-900); }
.cert-app-row-sub { font-size: 11.5px; color: var(--mp-gray-600); margin-top: 2px; }
.cert-app-row-arrow { color: var(--mp-gray-400); flex-shrink: 0; }

/* Stepper */
.stepper-vertical { margin-top: 6px; }
.stepper-item { display: flex; gap: 14px; }
.stepper-marker { display: flex; flex-direction: column; align-items: center; }
.stepper-dot { width: 26px; height: 26px; border-radius: 50%; background: var(--mp-gray-200); color: var(--mp-gray-600); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.stepper-dot-done { background: var(--mp-green); color: #fff; }
.stepper-dot-active { background: var(--mp-blue-700); color: #fff; }
.stepper-line { width: 2px; flex: 1; min-height: 28px; background: var(--mp-gray-200); }
.stepper-line-done { background: var(--mp-green); }
.stepper-content { padding-bottom: 22px; flex: 1; }
.stepper-title { font-weight: 700; font-size: 13.5px; }
.stepper-title-muted { color: var(--mp-gray-600); font-weight: 600; }
.stepper-time { font-size: 11px; color: var(--mp-gray-600); margin-top: 2px; }
.sentback-box { display: flex; gap: 8px; background: #FBE3E1; color: var(--mp-red); padding: 10px 12px; border-radius: 4px; margin-top: 8px; font-size: 12px; }

/* Demo controls */
.demo-panel { border: 1.5px dashed var(--mp-gray-400); border-radius: 6px; padding: 14px 16px; margin-top: 10px; background: var(--mp-gray-50); }
.demo-panel-title { font-size: 11px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; color: var(--mp-gray-600); margin-bottom: 10px; }
.demo-panel-body { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.demo-remarks-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

/* Tabs */
.tabs { display: flex; border-bottom: 1px solid var(--mp-gray-200); padding: 0 18px; }
.tab-btn { background: none; border: none; padding: 12px 6px; margin-right: 22px; font-size: 13px; font-weight: 600; color: var(--mp-gray-600); cursor: pointer; border-bottom: 2.5px solid transparent; }
.tab-btn.active { color: var(--mp-blue-700); border-bottom-color: var(--mp-blue-700); }

/* Certificate */
.cert-preview-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.certificate-card { width: 100%; border: 1.5px solid var(--mp-blue-700); border-radius: 6px; overflow: hidden; }
.certificate-card-head { background: var(--mp-blue-900); color: #fff; padding: 12px 16px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.certificate-card-body { padding: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.certificate-card-body div { display: flex; flex-direction: column; gap: 2px; }
.certificate-card-body span { font-size: 10.5px; color: var(--mp-gray-600); text-transform: uppercase; }
.certificate-card-body strong { font-size: 13px; }
.certificate-card-foot { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-top: 1px dashed var(--mp-gray-200); }
.cert-qr { width: 46px; height: 46px; border: 1px solid var(--mp-gray-200); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--mp-gray-900); }
.phys-cert-panel { display: flex; flex-direction: column; gap: 4px; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,25,35,0.55); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
.modal-box { background: #fff; border-radius: 8px; max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto; }
.modal-head { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--mp-gray-200); font-weight: 700; font-size: 14px; }
.modal-body { padding: 20px; }
.certificate-full { border: 3px double var(--mp-blue-700); border-radius: 6px; padding: 26px 22px; text-align: center; }
.certificate-full-emblem { width: 42px; height: 42px; border-radius: 50%; background: var(--mp-saffron); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; margin: 0 auto 10px; }
.certificate-full-title { font-weight: 800; color: var(--mp-blue-900); font-size: 15px; }
.certificate-full-sub { font-size: 12.5px; color: var(--mp-gray-600); margin-top: 2px; }
.certificate-full-divider { height: 2px; background: var(--mp-amber-bg); margin: 14px auto; width: 60%; }
.certificate-full p { font-size: 12.5px; color: var(--mp-gray-600); margin: 6px 0; }
.certificate-full-name { font-size: 18px !important; font-weight: 700; color: var(--mp-gray-900) !important; }
.certificate-full-grid { display: flex; justify-content: center; gap: 30px; margin: 16px 0; }
.certificate-full-grid div { display: flex; flex-direction: column; }
.certificate-full-grid span { font-size: 10px; color: var(--mp-gray-600); text-transform: uppercase; }
.certificate-full-grid strong { font-size: 12.5px; }
.certificate-full-foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; }
.certificate-full-sign { font-size: 11px; text-align: center; }
.sign-line { width: 90px; border-top: 1px solid var(--mp-gray-900); margin-bottom: 4px; }

@media (max-width: 640px) {
  .two-col-grid { grid-template-columns: 1fr; }
  .confirm-grid { grid-template-columns: 1fr; }
  .certificate-card-body { grid-template-columns: 1fr; }
  .dashboard-grid { grid-template-columns: 1fr 1fr; }
  .gh-title-en { display: none; }
}
`;
