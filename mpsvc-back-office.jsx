import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, FileClock, Undo2, Send, CheckCircle2, XCircle, Printer, Truck,
  Search as SearchIcon, LogOut, ChevronRight, ChevronDown, ChevronLeft, FileText,
  ClipboardCheck, History as HistoryIcon, Landmark, Eye, AlertTriangle, ShieldCheck,
  Calendar, X, Menu, IndianRupee, Stamp, Paperclip, GraduationCap, Building2, Phone,
  Mail, MapPin, BadgeCheck, Circle, PackageCheck, ArrowLeft, RotateCcw,
  KeyRound, Fingerprint, Filter, SlidersHorizontal, FileSpreadsheet, Plus, FileImage, Flag,
  QrCode,
} from "lucide-react";

/* ============================== TOKENS ============================== */
const C = {
  ink: "#20242B",
  inkSoft: "#524C3E",
  paper: "#ECEEE4",
  paperAlt: "#F8F7F1",
  card: "#FFFFFF",
  navy: "#1C3D5A",
  navyDeep: "#122B40",
  navySoft: "#E5EBEF",
  seal: "#A2762A",
  sealSoft: "#F1E7D2",
  forest: "#2F6B4F",
  forestSoft: "#E1EDE5",
  rust: "#9C4423",
  rustSoft: "#F2E1D5",
  line: "#D9D4C3",
  lineSoft: "#E7E3D5",
  muted: "#847E6C",
};

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Spectral:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Devanagari:wght@400;500;600&display=swap');";

const F = {
  display: "'Spectral', Georgia, serif",
  body: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
  dev: "'IBM Plex Sans Devanagari', 'IBM Plex Sans', sans-serif",
};

/* ============================== STATUS MODEL ============================== */
const ST = {
  PENDING_PAYMENT: "pending_payment_confirmation",
  PENDING_SCRUTINY: "pending_scrutiny",
  SENT_BACK_APPLICANT: "sent_back_to_applicant",
  FORWARDED: "forwarded_to_approval",
  PENDING_DISPATCH: "pending_print_dispatch",
  PRINTED_SEALED: "printed_sealed",
  DISPATCHED: "dispatched",
  CLOSED: "closed",
  REJECTED: "rejected",
};

const STATUS_META = {
  [ST.PENDING_PAYMENT]: { label: "Awaiting Payment Confirmation", color: C.rust, bg: C.rustSoft },
  [ST.PENDING_SCRUTINY]: { label: "Pending at Scrutiny Officer", color: C.seal, bg: C.sealSoft },
  [ST.SENT_BACK_APPLICANT]: { label: "Sent Back to Applicant", color: C.rust, bg: C.rustSoft },
  [ST.FORWARDED]: { label: "Pending Approval", color: C.navy, bg: C.navySoft },
  [ST.PENDING_DISPATCH]: { label: "Approved — Pending Certificate Upload", color: C.forest, bg: C.forestSoft },
  [ST.PRINTED_SEALED]: { label: "Printed & Sealed", color: C.navy, bg: C.navySoft },
  [ST.DISPATCHED]: { label: "Dispatched via Speed Post", color: C.forest, bg: C.forestSoft },
  [ST.CLOSED]: { label: "Closed — Certificate Issued", color: C.forest, bg: C.forestSoft },
  [ST.REJECTED]: { label: "Rejected", color: C.rust, bg: C.rustSoft },
};

const STAGES = ["Payment", "Scrutiny", "Approval", "Publish", "Certificate Upload"];

function completedCount(status) {
  switch (status) {
    case ST.PENDING_PAYMENT: return 0;
    case ST.PENDING_SCRUTINY:
    case ST.SENT_BACK_APPLICANT: return 1;
    case ST.FORWARDED: return 2;
    case ST.PENDING_DISPATCH:
    case ST.PRINTED_SEALED: return 4;
    case ST.DISPATCHED:
    case ST.CLOSED: return 5;
    default: return 0;
  }
}

/* ============================== SERVICE TYPE FILTERS ============================== */
// Official MPSVC service categories. Both the Scrutiny Officer and the Approving
// Authority dashboards filter their queues by these categories.
const SERVICE_FILTERS = [
  { key: "provisional", label: "Provisional Registration", match: (t) => t === "Provisional Registration" },
  { key: "new_transfer_in", label: "New Registration / Transfer-In M.P.", match: (t) => t === "New Registration" || t === "Transfer-In" },
  { key: "renewal", label: "Renewal Registration", match: (t) => t === "Renewal" },
  { key: "transfer_out", label: "Transfer Out of M.P.", match: (t) => t === "Transfer-Out" },
  { key: "duplicate", label: "Duplicate Certificate", match: (t) => t === "Duplicate Certificate" },
  { key: "addition_qualification", label: "Addition of Qualification", match: (t) => t === "Addition of Qualification" },
];

function filterAppsByService(apps, filterKey) {
  if (filterKey === "all") return apps;
  const f = SERVICE_FILTERS.find((f) => f.key === filterKey);
  return f ? apps.filter((a) => f.match(a.serviceType)) : apps;
}

const MAKER_NAME = "Ramesh Ahirwar";
const MAKER_DESIG = "Scrutiny Officer · MPSVC Bhopal";
const CHECKER_NAME = "Dr. Suman Mehta";
const CHECKER_DESIG = "Approving Authority · MPSVC Bhopal";

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " + dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// The digital certificate is generated the moment an application is approved (as soon as
// app.regNo is assigned by approveAndSign) — it exists independently of the physical
// sealed-certificate dispatch track, which some service types additionally go through.
function certNoFor(app) {
  return "MP-CERT-" + String(app.regNo || "").replace(/\//g, "-");
}
function printCertificate(app) {
  const win = window.open("", "_blank", "width=760,height=900");
  if (!win) return; // popup blocked
  win.document.write(`<!doctype html><html><head><title>MPSVC Digital Certificate — ${escapeHtml(app.applicantName)}</title><style>
    body{font-family:Arial,sans-serif;color:#20242B;padding:32px;}
    .cert{border:2px solid #1F3A5F;border-radius:8px;overflow:hidden;max-width:560px;margin:0 auto;}
    .cert-head{background:#1F3A5F;color:#fff;padding:16px 20px;font-size:15px;font-weight:700;}
    .cert-body{padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px;}
    .cert-body div{display:flex;flex-direction:column;gap:2px;}
    .cert-body span{font-size:10.5px;color:#666;text-transform:uppercase;letter-spacing:0.3px;}
    .cert-body strong{font-size:13.5px;}
    .cert-foot{padding:14px 20px;border-top:1px dashed #ccc;font-size:11px;color:#666;}
    .banner{max-width:560px;margin:0 auto 16px;font-size:11.5px;color:#8A5A00;background:#FFF4E5;border:1px solid #F0B961;border-radius:6px;padding:10px 14px;}
    @media print{ body{padding:0;} .banner{display:none;} }
  </style></head><body>
    <div class="banner">Non-sealed digital certificate — no physical signature or council seal. Where a sealed physical certificate is required, it is tracked and dispatched separately.</div>
    <div class="cert">
      <div class="cert-head">MPSVC &mdash; ${escapeHtml(app.serviceType)} &mdash; Digital Certificate</div>
      <div class="cert-body">
        <div><span>Certificate No.</span><strong>${escapeHtml(certNoFor(app))}</strong></div>
        <div><span>Registration No.</span><strong>${escapeHtml(app.regNo || "—")}</strong></div>
        <div><span>Name</span><strong>${escapeHtml(app.applicantName)}</strong></div>
        <div><span>Service</span><strong>${escapeHtml(app.serviceType)}</strong></div>
        <div><span>Issue Date</span><strong>${escapeHtml(fmtDate(app.approval?.signedOn))}</strong></div>
        <div><span>Approving Authority</span><strong>Registrar, MPSVC (eSigned)</strong></div>
      </div>
      <div class="cert-foot">Non-Sealed &mdash; Digital Copy. Verify this certificate on the MPSVC citizen portal using the Registration No. above.</div>
    </div>
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

/* ============================== SEED DATA ============================== */
function doc(label, fileName) { return { label, fileName }; }
function entry(actor, role, action, date, remarks) { return { actor, role, action, date, remarks: remarks || "" }; }

function baseChecklist(offline) {
  const items = [
    { id: "name_match", label: "Applicant name matches identity proof" },
    { id: "dob_match", label: "Date of birth matches identity proof" },
    { id: "qualification_valid", label: "Degree / qualification certificate authentic" },
    { id: "institution_recognized", label: "College / institution recognised by MPSVC" },
    { id: "address_valid", label: "Address proof valid and current" },
    { id: "photo_match", label: "Photograph matches applicant" },
  ];
  if (offline) items.push({ id: "payment_match", label: "Challan amount matches prescribed fee" });
  return items;
}

const RAW = [
  {
    id: "MPSVC-2026-0142", applicantName: "Aditya Sharma", serviceType: "New Registration",
    mobile: "9826xx1142", email: "aditya.sharma142@example.in",
    dob: "1999-04-12", fatherName: "Mahesh Sharma", gender: "Male",
    address: "Ward 12, Napier Town, Jabalpur, MP",
    college: "College of Veterinary Science & A.H., Jabalpur", degree: "B.V.Sc & A.H.", year: "2025",
    mode: "Offline", amount: 1500, challan: "CHL-88213", challanDate: "2026-07-28",
    submitted: "2026-07-27", status: ST.PENDING_PAYMENT, regNo: null,
    // Complete field set collected on the citizen-side New Registration form — shown in
    // full to the office user on the Application Details / Applicant Profile tabs.
    newRegDetails: {
      firstName: "Aditya", middleName: "", lastName: "Sharma",
      organization: "", department: "", designation: "", sector: "Self-Employed",
      resAddress: "Ward 12, Napier Town", resAreaType: "Urban", resCity: "Jabalpur", resWard: "Ward 12", resPostOffice: "Jabalpur G.P.O.",
      resState: "Madhya Pradesh", resDistrict: "Jabalpur", resPincode: "482001",
      proAddress: "", proAreaType: "", proState: "Madhya Pradesh", proDistrict: "", proPincode: "",
      permAddress: "Ward 12, Napier Town", permAreaType: "Urban", permCity: "Jabalpur", permWard: "Ward 12", permPostOffice: "Jabalpur G.P.O.",
      permState: "Madhya Pradesh", permDistrict: "Jabalpur", permPincode: "482001",
      preferredAddress: "Residential Address", landline: "", mobile2: "", fax: "",
      qualBvscUniversity: "Nanaji Deshmukh Veterinary Science University, Jabalpur",
      qualBvscCollege: "College of Veterinary Science & A.H., Jabalpur", qualBvscYear: "2025",
      gradDate: "2025-06-15", degreeId: "NDVSU/2025/00812",
    },
    log: [entry("Aditya Sharma", "system", "Application submitted online", "2026-07-27")],
  },
  {
    id: "MPSVC-2026-0139", applicantName: "Kavita Joshi", serviceType: "Renewal",
    mobile: "9827xx3390", email: "kavita.joshi@example.in",
    dob: "1988-11-02", fatherName: "Ramniwas Joshi", gender: "Female",
    address: "Shastri Nagar, Bhopal, MP",
    college: "Nanaji Deshmukh Veterinary Science University, Jabalpur", degree: "B.V.Sc & A.H.", year: "2011",
    mode: "Offline", amount: 800, challan: "CHL-88109", challanDate: "2026-07-25",
    submitted: "2026-07-24", status: ST.PENDING_PAYMENT, regNo: "MPVC/2011/02214",
    log: [entry("Kavita Joshi", "system", "Renewal application submitted online", "2026-07-24")],
  },
  {
    id: "MPSVC-2026-0138", applicantName: "Ramesh Patel", serviceType: "Transfer-In",
    mobile: "9425xx7712", email: "ramesh.patel@example.in",
    dob: "1992-02-18", fatherName: "Govind Patel", gender: "Male",
    address: "Sector 4, Kota, Rajasthan (relocating to Indore, MP)",
    college: "College of Veterinary & Animal Science, Bikaner", degree: "B.V.Sc & A.H.", year: "2016",
    mode: "Online", amount: 1200, challan: "TXN-55921", challanDate: "2026-07-30",
    submitted: "2026-07-30", status: ST.PENDING_SCRUTINY, regNo: null,
    newRegDetails: {
      firstName: "Ramesh", middleName: "", lastName: "Patel",
      organization: "", department: "", designation: "", sector: "Private",
      resAddress: "Sector 4", resAreaType: "Urban", resCity: "Indore", resWard: "Ward 9", resPostOffice: "Indore G.P.O.",
      resState: "Madhya Pradesh", resDistrict: "Indore", resPincode: "452001",
      proAddress: "", proAreaType: "", proState: "Madhya Pradesh", proDistrict: "", proPincode: "",
      permAddress: "Sector 4", permAreaType: "Urban", permCity: "Kota", permWard: "Ward 4", permPostOffice: "Kota G.P.O.",
      permState: "Rajasthan", permDistrict: "Kota", permPincode: "324001",
      preferredAddress: "Residential Address", landline: "", mobile2: "", fax: "",
      qualBvscUniversity: "Rajasthan University of Veterinary and Animal Sciences, Bikaner",
      qualBvscCollege: "College of Veterinary & Animal Science, Bikaner", qualBvscYear: "2016",
      gradDate: "2016-06-12", degreeId: "RAJUVAS/2016/00287",
      nocPrevCouncilName: "Rajasthan Veterinary Council", nocPrevRegNo: "RVC/2016/04521", nocPrevRegDate: "2016-08-20",
      nocDetails: "NOC issued by Rajasthan Veterinary Council on relocation for employment; no disciplinary proceedings pending.",
    },
    log: [
      entry("Ramesh Patel", "system", "Transfer-In application submitted online", "2026-07-30"),
      entry("Payment Gateway", "system", "Online payment confirmed automatically", "2026-07-30"),
    ],
  },
  {
    id: "MPSVC-2026-0135", applicantName: "Sunita Verma", serviceType: "Provisional Registration",
    mobile: "8871xx4420", email: "sunita.verma@example.in",
    dob: "2001-06-25", fatherName: "Om Prakash Verma", gender: "Female",
    address: "Civil Lines, Rewa, MP",
    college: "College of Veterinary Science, Rewa", degree: "B.V.Sc & A.H. (Final Year)", year: "2026",
    mode: "Offline", amount: 15, challan: "CHL-87990", challanDate: "2026-07-22",
    submitted: "2026-07-21", status: ST.PENDING_SCRUTINY, regNo: null,
    // Complete field set collected on the citizen-side Provisional Registration form —
    // shown in full to the office user on the Application Details / Applicant Profile tabs.
    provisionalDetails: {
      firstName: "Sunita", middleName: "", lastName: "Verma",
      resAddress: "45, Civil Lines", resAreaType: "Urban", resCity: "Rewa", resWard: "Ward 5", resPostOffice: "Rewa G.P.O.",
      resState: "Madhya Pradesh", resDistrict: "Rewa", resPincode: "486001",
      sameAsResidential: true,
      permAddress: "45, Civil Lines", permAreaType: "Urban", permCity: "Rewa", permWard: "Ward 5", permPostOffice: "Rewa G.P.O.",
      permState: "Madhya Pradesh", permDistrict: "Rewa", permPincode: "486001",
      preferredAddress: "Residential Address", mobile1: "8871xx4420", mobile2: "",
      rollNo: "RW2026112", universityEnrollmentNo: "NDVSU/2026/1187",
      provDegreeName: "B.V.SC.& A.H.", provUniversityName: "Nanaji Deshmukh University of Veterinary Sciences, Jabalpur",
      provPassingYear: "2026-2027",
    },
    log: [
      entry("Sunita Verma", "system", "Provisional registration application submitted online", "2026-07-21"),
      entry(MAKER_NAME, "maker", "Confirmed offline payment receipt (Challan CHL-87990)", "2026-07-23"),
    ],
  },
  {
    id: "MPSVC-2026-0133", applicantName: "Deepak Chouhan", serviceType: "New Registration",
    mobile: "7000xx9981", email: "deepak.chouhan@example.in",
    dob: "1997-09-09", fatherName: "Rajendra Chouhan", gender: "Male",
    address: "Palasia, Indore, MP",
    college: "College of Veterinary Science & A.H., Mhow", degree: "B.V.Sc & A.H.", year: "2024",
    mode: "Online", amount: 1500, challan: "TXN-55488", challanDate: "2026-07-18",
    submitted: "2026-07-18", status: ST.PENDING_SCRUTINY, regNo: null, returnedByApproval: true,
    newRegDetails: {
      firstName: "Deepak", middleName: "", lastName: "Chouhan",
      organization: "", department: "", designation: "", sector: "Private",
      resAddress: "12, Palasia", resAreaType: "Urban", resCity: "Indore", resWard: "Ward 34", resPostOffice: "Indore G.P.O.",
      resState: "Madhya Pradesh", resDistrict: "Indore", resPincode: "452001",
      proAddress: "", proAreaType: "", proState: "Madhya Pradesh", proDistrict: "", proPincode: "",
      permAddress: "12, Palasia", permAreaType: "Urban", permCity: "Indore", permWard: "Ward 34", permPostOffice: "Indore G.P.O.",
      permState: "Madhya Pradesh", permDistrict: "Indore", permPincode: "452001",
      preferredAddress: "Residential Address", landline: "", mobile2: "", fax: "",
      qualBvscUniversity: "Nanaji Deshmukh Veterinary Science University, Jabalpur",
      qualBvscCollege: "College of Veterinary Science & A.H., Mhow", qualBvscYear: "2024",
      gradDate: "2024-06-20", degreeId: "NDVSU/2024/00534",
    },
    scrutiny: { checklist: { name_match: true, dob_match: true, qualification_valid: true, institution_recognized: true, address_valid: true, photo_match: true }, remarks: "All documents verified against originals. Degree certificate and address proof consistent with application form." },
    log: [
      entry("Deepak Chouhan", "system", "Application submitted online", "2026-07-18"),
      entry("Payment Gateway", "system", "Online payment confirmed automatically", "2026-07-18"),
      entry(MAKER_NAME, "maker", "Verification completed and forwarded to Approving Authority", "2026-07-20", "All documents verified against originals."),
      entry(CHECKER_NAME, "checker", "Sent back to Scrutiny Officer", "2026-07-22", "Degree certificate appears to be a photocopy, not a self-attested scan. Please have the applicant re-upload a self-attested copy before re-forwarding."),
    ],
  },
  {
    id: "MPSVC-2026-0128", applicantName: "Priya Malviya", serviceType: "Renewal",
    mobile: "9926xx1187", email: "priya.malviya@example.in",
    dob: "1985-01-30", fatherName: "Ashok Malviya", gender: "Female",
    address: "Vijay Nagar, Indore, MP",
    college: "College of Veterinary Science & A.H., Mhow", degree: "B.V.Sc & A.H.", year: "2009",
    mode: "Offline", amount: 800, challan: "CHL-87711", challanDate: "2026-07-10",
    submitted: "2026-07-09", status: ST.SENT_BACK_APPLICANT, regNo: "MPVC/2010/01180",
    log: [
      entry("Priya Malviya", "system", "Renewal application submitted online", "2026-07-09"),
      entry(MAKER_NAME, "maker", "Confirmed offline payment receipt (Challan CHL-87711)", "2026-07-11"),
      entry(MAKER_NAME, "maker", "Returned to applicant for correction", "2026-07-13", "Uploaded address proof is more than 6 months old. Please upload a current utility bill or bank statement."),
    ],
  },
  {
    id: "MPSVC-2026-0125", applicantName: "Manoj Tiwari", serviceType: "Transfer-Out",
    mobile: "9425xx0093", email: "manoj.tiwari@example.in",
    dob: "1990-03-14", fatherName: "Ram Tiwari", gender: "Male",
    address: "Katni, MP (relocating to Raipur, Chhattisgarh)",
    college: "Nanaji Deshmukh Veterinary Science University, Jabalpur", degree: "B.V.Sc & A.H.", year: "2013",
    mode: "Online", amount: 1000, challan: "TXN-54932", challanDate: "2026-07-05",
    submitted: "2026-07-05", status: ST.SENT_BACK_APPLICANT, regNo: "MPVC/2012/00742",
    log: [
      entry("Manoj Tiwari", "system", "Transfer-Out application submitted online", "2026-07-05"),
      entry("Payment Gateway", "system", "Online payment confirmed automatically", "2026-07-05"),
      entry(MAKER_NAME, "maker", "Returned to applicant for correction", "2026-07-07", "Passport-size photograph does not meet the specification (white background required). Please re-upload."),
    ],
  },
  {
    id: "MPSVC-2026-0121", applicantName: "Anjali Rathore", serviceType: "New Registration",
    mobile: "9827xx5541", email: "anjali.rathore@example.in",
    dob: "1998-12-01", fatherName: "Digvijay Rathore", gender: "Female",
    address: "Rajendra Nagar, Bhopal, MP",
    college: "Nanaji Deshmukh Veterinary Science University, Jabalpur", degree: "B.V.Sc & A.H.", year: "2025",
    mode: "Online", amount: 1500, challan: "TXN-54810", challanDate: "2026-06-29",
    submitted: "2026-06-29", status: ST.FORWARDED, regNo: null,
    newRegDetails: {
      firstName: "Anjali", middleName: "", lastName: "Rathore",
      organization: "Madhya Pradesh Animal Husbandry Department", department: "Veterinary Services",
      designation: "Junior Veterinary Officer (Probationary)", sector: "Government",
      resAddress: "Rajendra Nagar", resAreaType: "Urban", resCity: "Bhopal", resWard: "Ward 22", resPostOffice: "Bhopal G.P.O.",
      resState: "Madhya Pradesh", resDistrict: "Bhopal", resPincode: "462001",
      proAddress: "Veterinary Hospital, Rajendra Nagar", proAreaType: "Urban", proCity: "Bhopal", proWard: "Ward 22", proPostOffice: "Bhopal G.P.O.",
      proState: "Madhya Pradesh", proDistrict: "Bhopal", proPincode: "462001",
      permAddress: "Rajendra Nagar", permAreaType: "Urban", permCity: "Bhopal", permWard: "Ward 22", permPostOffice: "Bhopal G.P.O.",
      permState: "Madhya Pradesh", permDistrict: "Bhopal", permPincode: "462001",
      preferredAddress: "Residential Address", landline: "", mobile2: "", fax: "",
      qualBvscUniversity: "Nanaji Deshmukh Veterinary Science University, Jabalpur",
      qualBvscCollege: "Nanaji Deshmukh Veterinary Science University, Jabalpur", qualBvscYear: "2025",
      gradDate: "2025-05-10", degreeId: "NDVSU/2025/00721",
    },
    scrutiny: { checklist: { name_match: true, dob_match: true, qualification_valid: true, institution_recognized: true, address_valid: true, photo_match: true }, remarks: "Original documents tallied with uploaded scans at the counter verification. No discrepancies found." },
    log: [
      entry("Anjali Rathore", "system", "Application submitted online", "2026-06-29"),
      entry("Payment Gateway", "system", "Online payment confirmed automatically", "2026-06-29"),
      entry(MAKER_NAME, "maker", "Verification completed and forwarded to Approving Authority", "2026-07-01", "Original documents tallied with uploaded scans."),
    ],
  },
  {
    id: "MPSVC-2026-0119", applicantName: "Vikram Solanki", serviceType: "Provisional Registration",
    mobile: "9977xx3312", email: "vikram.solanki@example.in",
    dob: "2002-05-19", fatherName: "Bhagwan Solanki", gender: "Male",
    address: "Napier Town, Jabalpur, MP",
    college: "College of Veterinary Science & A.H., Jabalpur", degree: "B.V.Sc & A.H. (Final Year)", year: "2026",
    mode: "Offline", amount: 15, challan: "CHL-87340", challanDate: "2026-06-20",
    submitted: "2026-06-19", status: ST.FORWARDED, regNo: null,
    provisionalDetails: {
      firstName: "Vikram", middleName: "", lastName: "Solanki",
      resAddress: "18, Napier Town", resAreaType: "Urban", resCity: "Jabalpur", resWard: "Ward 12", resPostOffice: "Jabalpur G.P.O.",
      resState: "Madhya Pradesh", resDistrict: "Jabalpur", resPincode: "482001",
      sameAsResidential: true,
      permAddress: "18, Napier Town", permAreaType: "Urban", permCity: "Jabalpur", permWard: "Ward 12", permPostOffice: "Jabalpur G.P.O.",
      permState: "Madhya Pradesh", permDistrict: "Jabalpur", permPincode: "482001",
      preferredAddress: "Residential Address", mobile1: "9977xx3312", mobile2: "",
      rollNo: "JBP2026078", universityEnrollmentNo: "NDVSU/2026/0781",
      provDegreeName: "B.V.SC.& A.H.", provUniversityName: "Nanaji Deshmukh University of Veterinary Sciences, Jabalpur",
      provPassingYear: "2026-2027",
    },
    scrutiny: { checklist: { name_match: true, dob_match: true, qualification_valid: true, institution_recognized: true, address_valid: true, photo_match: true, payment_match: true }, remarks: "Bonafide certificate from the college verified by phone with the exam section. In order." },
    log: [
      entry("Vikram Solanki", "system", "Provisional registration application submitted online", "2026-06-19"),
      entry(MAKER_NAME, "maker", "Confirmed offline payment receipt (Challan CHL-87340)", "2026-06-21"),
      entry(MAKER_NAME, "maker", "Verification completed and forwarded to Approving Authority", "2026-06-24", "Bonafide certificate verified by phone with the college exam section."),
    ],
  },
  {
    id: "MPSVC-2026-0110", applicantName: "Rahul Nema", serviceType: "New Registration",
    mobile: "9926xx7743", email: "rahul.nema@example.in",
    dob: "1996-08-08", fatherName: "Suresh Nema", gender: "Male",
    address: "Saket Nagar, Bhopal, MP",
    college: "Nanaji Deshmukh Veterinary Science University, Jabalpur", degree: "B.V.Sc & A.H.", year: "2023",
    mode: "Offline", amount: 1500, challan: "CHL-86602", challanDate: "2026-06-02",
    submitted: "2026-06-01", status: ST.PENDING_DISPATCH, regNo: "MPVC/2026/01049",
    newRegDetails: {
      firstName: "Rahul", middleName: "", lastName: "Nema",
      organization: "", department: "", designation: "", sector: "Private",
      resAddress: "Saket Nagar", resAreaType: "Urban", resCity: "Bhopal", resWard: "Ward 15", resPostOffice: "Bhopal G.P.O.",
      resState: "Madhya Pradesh", resDistrict: "Bhopal", resPincode: "462024",
      proAddress: "", proAreaType: "", proState: "Madhya Pradesh", proDistrict: "", proPincode: "",
      permAddress: "Saket Nagar", permAreaType: "Urban", permCity: "Bhopal", permWard: "Ward 15", permPostOffice: "Bhopal G.P.O.",
      permState: "Madhya Pradesh", permDistrict: "Bhopal", permPincode: "462024",
      preferredAddress: "Residential Address", landline: "", mobile2: "", fax: "",
      qualBvscUniversity: "Nanaji Deshmukh Veterinary Science University, Jabalpur",
      qualBvscCollege: "Nanaji Deshmukh Veterinary Science University, Jabalpur", qualBvscYear: "2023",
      gradDate: "2023-06-01", degreeId: "NDVSU/2023/00398",
    },
    scrutiny: { checklist: { name_match: true, dob_match: true, qualification_valid: true, institution_recognized: true, address_valid: true, photo_match: true, payment_match: true }, remarks: "All original documents verified at the counter. Recommended for approval." },
    approval: { remarks: "Verified against Scrutiny Officer's notes. Approved.", signedOn: "2026-06-08" },
    log: [
      entry("Rahul Nema", "system", "Application submitted online", "2026-06-01"),
      entry(MAKER_NAME, "maker", "Confirmed offline payment receipt (Challan CHL-86602)", "2026-06-03"),
      entry(MAKER_NAME, "maker", "Verification completed and forwarded to Approving Authority", "2026-06-05", "All original documents verified at the counter."),
      entry(CHECKER_NAME, "checker", "Approved. Certificate published to citizen portal.", "2026-06-08", "Verified against Scrutiny Officer's notes."),
      entry("System", "system", "Pending Print & Dispatch task created", "2026-06-08"),
    ],
  },
  {
    id: "MPSVC-2026-0108", applicantName: "Shalini Agrawal", serviceType: "Renewal",
    mobile: "9425xx6602", email: "shalini.agrawal@example.in",
    dob: "1983-10-17", fatherName: "Naresh Agrawal", gender: "Female",
    address: "New Market, Bhopal, MP",
    college: "Nanaji Deshmukh Veterinary Science University, Jabalpur", degree: "B.V.Sc & A.H.", year: "2007",
    mode: "Online", amount: 800, challan: "TXN-53109", challanDate: "2026-05-20",
    submitted: "2026-05-20", status: ST.PRINTED_SEALED, regNo: "MPVC/2007/01893",
    scrutiny: { checklist: { name_match: true, dob_match: true, qualification_valid: true, institution_recognized: true, address_valid: true, photo_match: true }, remarks: "Renewal in order, no change in particulars since last renewal." },
    approval: { remarks: "Approved. No objections.", signedOn: "2026-05-26" },
    log: [
      entry("Shalini Agrawal", "system", "Renewal application submitted online", "2026-05-20"),
      entry("Payment Gateway", "system", "Online payment confirmed automatically", "2026-05-20"),
      entry(MAKER_NAME, "maker", "Verification completed and forwarded to Approving Authority", "2026-05-22", "Renewal in order, no change in particulars."),
      entry(CHECKER_NAME, "checker", "Approved. Certificate published to citizen portal.", "2026-05-26", "No objections."),
      entry("System", "system", "Pending Print & Dispatch task created", "2026-05-26"),
      entry("Dispatch Section", "checker", "Marked Printed & Sealed", "2026-05-29"),
    ],
  },
  {
    id: "MPSVC-2026-0104", applicantName: "Arvind Yadav", serviceType: "Transfer-In",
    mobile: "9027xx8834", email: "arvind.yadav@example.in",
    dob: "1994-07-23", fatherName: "Ram Singh Yadav", gender: "Male",
    address: "Sector 62, Noida, UP (relocating to Gwalior, MP)",
    college: "College of Veterinary Science, DUVASU, Mathura", degree: "B.V.Sc & A.H.", year: "2018",
    mode: "Offline", amount: 1200, challan: "CHL-85211", challanDate: "2026-04-14",
    submitted: "2026-04-13", status: ST.DISPATCHED, regNo: "MPVC/2026/01041", tracking: "EM123456789IN",
    newRegDetails: {
      firstName: "Arvind", middleName: "", lastName: "Yadav",
      organization: "", department: "", designation: "", sector: "Private",
      resAddress: "14, Ashok Colony", resAreaType: "Urban", resCity: "Gwalior", resWard: "Ward 7", resPostOffice: "Gwalior G.P.O.",
      resState: "Madhya Pradesh", resDistrict: "Gwalior", resPincode: "474001",
      proAddress: "", proAreaType: "", proState: "Madhya Pradesh", proDistrict: "", proPincode: "",
      permAddress: "Sector 62", permAreaType: "Urban", permCity: "Noida", permWard: "Sector 62", permPostOffice: "Noida S.O.",
      permState: "Uttar Pradesh", permDistrict: "Gautam Buddh Nagar", permPincode: "201301",
      preferredAddress: "Residential Address", landline: "", mobile2: "", fax: "",
      qualBvscUniversity: "DUVASU, Mathura", qualBvscCollege: "College of Veterinary Science, DUVASU, Mathura", qualBvscYear: "2018",
      gradDate: "2018-06-08", degreeId: "DUVASU/2018/00655",
      nocPrevCouncilName: "Uttar Pradesh Veterinary Council", nocPrevRegNo: "UPVC/2018/09214", nocPrevRegDate: "2018-08-02",
      nocDetails: "NOC issued by Uttar Pradesh Veterinary Council; applicant relocating to Gwalior, Madhya Pradesh for employment.",
    },
    scrutiny: { checklist: { name_match: true, dob_match: true, qualification_valid: true, institution_recognized: true, address_valid: true, photo_match: true, payment_match: true }, remarks: "NOC from UP Veterinary Council verified. In order." },
    approval: { remarks: "Approved.", signedOn: "2026-04-20" },
    log: [
      entry("Arvind Yadav", "system", "Transfer-In application submitted online", "2026-04-13"),
      entry(MAKER_NAME, "maker", "Confirmed offline payment receipt (Challan CHL-85211)", "2026-04-15"),
      entry(MAKER_NAME, "maker", "Verification completed and forwarded to Approving Authority", "2026-04-17", "NOC from UP Veterinary Council verified."),
      entry(CHECKER_NAME, "checker", "Approved. Certificate published to citizen portal.", "2026-04-20"),
      entry("System", "system", "Pending Print & Dispatch task created", "2026-04-20"),
      entry("Dispatch Section", "checker", "Marked Printed & Sealed", "2026-04-22"),
      entry("Dispatch Section", "checker", "Dispatched via Speed Post (EM123456789IN)", "2026-04-23"),
    ],
  },
  {
    id: "MPSVC-2026-0098", applicantName: "Meena Kushwaha", serviceType: "Provisional Registration",
    mobile: "8109xx2251", email: "meena.kushwaha@example.in",
    dob: "2003-01-11", fatherName: "Lakhan Kushwaha", gender: "Female",
    address: "Sanjay Nagar, Bhopal, MP",
    college: "Nanaji Deshmukh Veterinary Science University, Jabalpur", degree: "B.V.Sc & A.H. (Final Year)", year: "2026",
    mode: "Online", amount: 15, challan: "TXN-51877", challanDate: "2026-03-02",
    submitted: "2026-03-02", status: ST.DISPATCHED, regNo: "PROV/2026/00512", tracking: "EM998877665IN",
    provisionalDetails: {
      firstName: "Meena", middleName: "", lastName: "Kushwaha",
      resAddress: "22, Sanjay Nagar", resAreaType: "Urban", resCity: "Bhopal", resWard: "Ward 8", resPostOffice: "Ravindra Bhawan S.O.",
      resState: "Madhya Pradesh", resDistrict: "Bhopal", resPincode: "462016",
      sameAsResidential: false,
      permAddress: "Village Berasia Road", permAreaType: "Rural", permBlock: "Berasia", permPanchayat: "Nazirabad", permGram: "Manpur", permPostOffice: "Berasia S.O.",
      permState: "Madhya Pradesh", permDistrict: "Bhopal", permPincode: "462045",
      preferredAddress: "Residential Address", mobile1: "8109xx2251", mobile2: "9098xx7712",
      rollNo: "BPL2026034", universityEnrollmentNo: "NDVSU/2026/0341",
      provDegreeName: "B.V.SC.& A.H.", provUniversityName: "Nanaji Deshmukh University of Veterinary Sciences, Jabalpur",
      provPassingYear: "2025-2026",
    },
    scrutiny: { checklist: { name_match: true, dob_match: true, qualification_valid: true, institution_recognized: true, address_valid: true, photo_match: true }, remarks: "Bonafide certificate verified. In order." },
    approval: { remarks: "Approved.", signedOn: "2026-03-07" },
    log: [
      entry("Meena Kushwaha", "system", "Provisional registration application submitted online", "2026-03-02"),
      entry("Payment Gateway", "system", "Online payment confirmed automatically", "2026-03-02"),
      entry(MAKER_NAME, "maker", "Verification completed and forwarded to Approving Authority", "2026-03-04", "Bonafide certificate verified."),
      entry(CHECKER_NAME, "checker", "Approved. Certificate published to citizen portal.", "2026-03-07"),
      entry("System", "system", "Pending Print & Dispatch task created", "2026-03-07"),
      entry("Dispatch Section", "checker", "Marked Printed & Sealed", "2026-03-09"),
      entry("Dispatch Section", "checker", "Dispatched via Speed Post (EM998877665IN)", "2026-03-10"),
    ],
  },

  // ---- Historical / closed applications, kept so the office user can see an
  // applicant's full history (main registration, duplicate certificates, etc.) when
  // reviewing a later application from the same person — matched by mobile number.
  {
    id: "MPSVC-2011-0091", applicantName: "Kavita Joshi", serviceType: "New Registration",
    mobile: "9827xx3390", email: "kavita.joshi@example.in",
    dob: "1988-11-02", fatherName: "Ramniwas Joshi", gender: "Female",
    address: "Shastri Nagar, Bhopal, MP",
    college: "Nanaji Deshmukh Veterinary Science University, Jabalpur", degree: "B.V.Sc & A.H.", year: "2011",
    mode: "Offline", amount: 1500, challan: "CHL-41209", challanDate: "2011-04-19",
    submitted: "2011-04-18", status: ST.CLOSED, regNo: "MPVC/2011/02214",
    scrutiny: { checklist: { name_match: true, dob_match: true, qualification_valid: true, institution_recognized: true, address_valid: true, photo_match: true, payment_match: true }, remarks: "All original documents verified at the counter." },
    approval: { remarks: "Approved.", signedOn: "2011-05-02" },
    log: [
      entry("Kavita Joshi", "system", "Application submitted online", "2011-04-18"),
      entry(MAKER_NAME, "maker", "Confirmed offline payment receipt (Challan CHL-41209)", "2011-04-20"),
      entry(MAKER_NAME, "maker", "Verification completed and forwarded to Approving Authority", "2011-04-24", "All original documents verified at the counter."),
      entry(CHECKER_NAME, "checker", "Approved. Certificate published to citizen portal.", "2011-05-02"),
      entry("Dispatch Section", "checker", "Marked Printed & Sealed", "2011-05-05"),
      entry("Dispatch Section", "checker", "Dispatched via Speed Post (EM204471190IN)", "2011-05-07"),
      entry("Dispatch Section", "checker", "Uploaded certificate photo and closed the application", "2011-05-07"),
    ],
  },
  {
    id: "MPSVC-2023-0201", applicantName: "Kavita Joshi", serviceType: "Duplicate Certificate",
    mobile: "9827xx3390", email: "kavita.joshi@example.in",
    dob: "1988-11-02", fatherName: "Ramniwas Joshi", gender: "Female",
    address: "Shastri Nagar, Bhopal, MP",
    college: "Nanaji Deshmukh Veterinary Science University, Jabalpur", degree: "B.V.Sc & A.H.", year: "2011",
    mode: "Online", amount: 300, challan: "TXN-77410", challanDate: "2023-08-10",
    submitted: "2023-08-10", status: ST.CLOSED, regNo: "MPVC/2011/02214",
    scrutiny: { checklist: { name_match: true, dob_match: true, qualification_valid: true, institution_recognized: true, address_valid: true, photo_match: true }, remarks: "Original certificate reported lost; police complaint copy verified. Duplicate approved." },
    approval: { remarks: "Approved.", signedOn: "2023-08-18" },
    log: [
      entry("Kavita Joshi", "system", "Duplicate Certificate application submitted online", "2023-08-10"),
      entry("Payment Gateway", "system", "Online payment confirmed automatically", "2023-08-10"),
      entry(MAKER_NAME, "maker", "Verification completed and forwarded to Approving Authority", "2023-08-14", "Original certificate reported lost; police complaint copy verified."),
      entry(CHECKER_NAME, "checker", "Approved. Certificate published to citizen portal.", "2023-08-18"),
      entry("Dispatch Section", "checker", "Marked Printed & Sealed", "2023-08-21"),
      entry("Dispatch Section", "checker", "Dispatched via Speed Post (EM204471203IN)", "2023-08-22"),
      entry("Dispatch Section", "checker", "Uploaded certificate photo and closed the application", "2023-08-22"),
    ],
  },
  {
    id: "MPSVC-2010-0058", applicantName: "Priya Malviya", serviceType: "New Registration",
    mobile: "9926xx1187", email: "priya.malviya@example.in",
    dob: "1985-01-30", fatherName: "Ashok Malviya", gender: "Female",
    address: "Vijay Nagar, Indore, MP",
    college: "College of Veterinary Science & A.H., Mhow", degree: "B.V.Sc & A.H.", year: "2009",
    mode: "Offline", amount: 1500, challan: "CHL-38017", challanDate: "2009-12-03",
    submitted: "2009-12-02", status: ST.CLOSED, regNo: "MPVC/2010/01180",
    scrutiny: { checklist: { name_match: true, dob_match: true, qualification_valid: true, institution_recognized: true, address_valid: true, photo_match: true, payment_match: true }, remarks: "All original documents verified at the counter." },
    approval: { remarks: "Approved.", signedOn: "2010-01-15" },
    log: [
      entry("Priya Malviya", "system", "Application submitted online", "2009-12-02"),
      entry(MAKER_NAME, "maker", "Confirmed offline payment receipt (Challan CHL-38017)", "2009-12-05"),
      entry(MAKER_NAME, "maker", "Verification completed and forwarded to Approving Authority", "2009-12-10", "All original documents verified at the counter."),
      entry(CHECKER_NAME, "checker", "Approved. Certificate published to citizen portal.", "2010-01-15"),
      entry("Dispatch Section", "checker", "Marked Printed & Sealed", "2010-01-19"),
      entry("Dispatch Section", "checker", "Dispatched via Speed Post (EM118820074IN)", "2010-01-21"),
      entry("Dispatch Section", "checker", "Uploaded certificate photo and closed the application", "2010-01-21"),
    ],
  },
  {
    id: "MPSVC-2012-0054", applicantName: "Manoj Tiwari", serviceType: "New Registration",
    mobile: "9425xx0093", email: "manoj.tiwari@example.in",
    dob: "1990-03-14", fatherName: "Ram Tiwari", gender: "Male",
    address: "Katni, MP",
    college: "Nanaji Deshmukh Veterinary Science University, Jabalpur", degree: "B.V.Sc & A.H.", year: "2013",
    mode: "Online", amount: 1500, challan: "TXN-31820", challanDate: "2012-03-01",
    submitted: "2012-03-01", status: ST.CLOSED, regNo: "MPVC/2012/00742",
    scrutiny: { checklist: { name_match: true, dob_match: true, qualification_valid: true, institution_recognized: true, address_valid: true, photo_match: true }, remarks: "All original documents verified at the counter." },
    approval: { remarks: "Approved.", signedOn: "2012-03-20" },
    log: [
      entry("Manoj Tiwari", "system", "Application submitted online", "2012-03-01"),
      entry("Payment Gateway", "system", "Online payment confirmed automatically", "2012-03-01"),
      entry(MAKER_NAME, "maker", "Verification completed and forwarded to Approving Authority", "2012-03-06", "All original documents verified at the counter."),
      entry(CHECKER_NAME, "checker", "Approved. Certificate published to citizen portal.", "2012-03-20"),
      entry("Dispatch Section", "checker", "Marked Printed & Sealed", "2012-03-23"),
      entry("Dispatch Section", "checker", "Dispatched via Speed Post (EM118820511IN)", "2012-03-24"),
      entry("Dispatch Section", "checker", "Uploaded certificate photo and closed the application", "2012-03-24"),
    ],
  },
  {
    id: "MPSVC-2007-0063", applicantName: "Shalini Agrawal", serviceType: "New Registration",
    mobile: "9425xx6602", email: "shalini.agrawal@example.in",
    dob: "1983-10-17", fatherName: "Naresh Agrawal", gender: "Female",
    address: "New Market, Bhopal, MP",
    college: "Nanaji Deshmukh Veterinary Science University, Jabalpur", degree: "B.V.Sc & A.H.", year: "2007",
    mode: "Offline", amount: 1500, challan: "CHL-20933", challanDate: "2007-06-21",
    submitted: "2007-06-20", status: ST.CLOSED, regNo: "MPVC/2007/01893",
    scrutiny: { checklist: { name_match: true, dob_match: true, qualification_valid: true, institution_recognized: true, address_valid: true, photo_match: true, payment_match: true }, remarks: "All original documents verified at the counter." },
    approval: { remarks: "Approved.", signedOn: "2007-07-05" },
    log: [
      entry("Shalini Agrawal", "system", "Application submitted online", "2007-06-20"),
      entry(MAKER_NAME, "maker", "Confirmed offline payment receipt (Challan CHL-20933)", "2007-06-23"),
      entry(MAKER_NAME, "maker", "Verification completed and forwarded to Approving Authority", "2007-06-28", "All original documents verified at the counter."),
      entry(CHECKER_NAME, "checker", "Approved. Certificate published to citizen portal.", "2007-07-05"),
      entry("Dispatch Section", "checker", "Marked Printed & Sealed", "2007-07-08"),
      entry("Dispatch Section", "checker", "Dispatched via Speed Post (EM118820633IN)", "2007-07-09"),
      entry("Dispatch Section", "checker", "Uploaded certificate photo and closed the application", "2007-07-09"),
    ],
  },
];

function buildApp(r) {
  // Each service collects a different document set on the citizen form (see
  // getChecklist() in the citizen portal) — mirror it here so the office user sees
  // exactly what was asked for, instead of a generic list.
  let documents;
  if (r.serviceType === "Provisional Registration") {
    documents = [
      doc("University / Course Completion Certificate", "course_completion_certificate.pdf"),
      doc("Photo", "photo.jpg"),
    ];
    if (r.mode === "Offline") documents.push(doc("Payment Challan Copy", "challan_copy.pdf"));
  } else if (r.serviceType === "New Registration" || r.serviceType === "Transfer-In") {
    documents = [
      doc("Domicile Certificate", "domicile_certificate.pdf"),
      doc("Graduation Degree / PDC Certificate", "degree_certificate.pdf"),
      doc("Photo (Passport size, 3x4 cm)", "photo.jpg"),
      doc("10th Marksheet", "10th_marksheet.pdf"),
      doc("Others", "other.pdf"),
    ];
    if (r.serviceType === "Transfer-In") documents.push(doc("NOC Certificate (Transfer-In)", "noc.pdf"));
    if (r.mode === "Offline") documents.push(doc("Payment Challan Copy", "challan_copy.pdf"));
  } else {
    documents = [
      doc("Passport Photograph", "photograph.jpg"),
      doc("Identity Proof (Aadhaar)", "identity_proof.pdf"),
      doc("Degree / Qualification Certificate", "degree_certificate.pdf"),
      doc("Address Proof", "address_proof.pdf"),
    ];
    if (r.mode === "Offline") documents.push(doc("Payment Challan Copy", "challan_copy.pdf"));
    if (r.serviceType.includes("Transfer")) documents.push(doc("No Objection Certificate (Origin Council)", "noc.pdf"));
  }
  return {
    ...r,
    documents,
    checklistDef: baseChecklist(r.mode === "Offline"),
  };
}

const SEED_APPS = RAW.map(buildApp);

/* ============================== SMALL UI ATOMS ============================== */

function Seal({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" stroke={C.seal} strokeWidth="2" />
      <circle cx="32" cy="32" r="24" stroke={C.seal} strokeWidth="1" strokeDasharray="2 3" />
      <path d="M32 16 L36 27 L48 27 L38 34 L42 46 L32 39 L22 46 L26 34 L16 27 L28 27 Z"
        fill="none" stroke={C.seal} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="4" fill={C.seal} />
    </svg>
  );
}

function Badge({ status }) {
  const m = STATUS_META[status] || { label: status, color: C.muted, bg: C.paperAlt };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      style={{ background: m.bg, color: m.color, fontFamily: F.body }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

function Button({ children, variant = "primary", onClick, disabled, icon: Icon, type = "button", size = "md" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm";
  const styles = {
    primary: { background: C.navy, color: "#fff" },
    seal: { background: C.seal, color: "#fff" },
    forest: { background: C.forest, color: "#fff" },
    rust: { background: C.rust, color: "#fff" },
    ghost: { background: "transparent", color: C.navy, border: `1px solid ${C.line}` },
    subtle: { background: C.paperAlt, color: C.ink, border: `1px solid ${C.line}` },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes} hover:opacity-90`}
      style={{ ...styles[variant], fontFamily: F.body }}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

function SealStepper({ status }) {
  if (status === ST.REJECTED) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-4 py-3" style={{ background: C.rustSoft }}>
        <XCircle size={18} color={C.rust} />
        <span className="text-sm font-medium" style={{ color: C.rust, fontFamily: F.body }}>
          Application rejected — workflow halted
        </span>
      </div>
    );
  }
  const done = completedCount(status);
  const activeIdx = done < STAGES.length ? done : -1;
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-max">
        {STAGES.map((label, i) => {
          const isDone = i < done;
          const isActive = i === activeIdx;
          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1.5" style={{ width: 108 }}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center border-2"
                  style={{
                    borderColor: isDone || isActive ? C.seal : C.line,
                    background: isDone ? C.seal : "#fff",
                    color: isDone ? "#fff" : isActive ? C.seal : C.muted,
                  }}
                >
                  {isDone ? <CheckCircle2 size={18} /> : <span className="text-xs font-semibold" style={{ fontFamily: F.mono }}>{i + 1}</span>}
                </div>
                <span
                  className="text-[11px] text-center leading-tight"
                  style={{ color: isDone || isActive ? C.ink : C.muted, fontFamily: F.body, fontWeight: isActive ? 600 : 400 }}
                >
                  {label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className="h-[2px] flex-1 -mt-5" style={{ background: i < done ? C.seal : C.line, minWidth: 24 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {status === ST.PRINTED_SEALED && (
        <p className="text-xs mt-1" style={{ color: C.muted, fontFamily: F.body }}>Printed & sealed awaiting dispatch to applicant.</p>
      )}
      {status === ST.CLOSED && (
        <p className="text-xs mt-1" style={{ color: C.muted, fontFamily: F.body }}>Certificate photo uploaded — application closed and visible to the applicant.</p>
      )}
    </div>
  );
}

function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(18,20,16,0.45)" }} onMouseDown={onClose}>
      <div
        className="rounded-xl shadow-2xl w-full max-h-[88vh] overflow-y-auto"
        style={{ background: "#fff", maxWidth: width, fontFamily: F.body }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.line }}>
          <h3 className="text-base font-semibold" style={{ color: C.ink, fontFamily: F.display }}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: C.muted }}><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const isErr = toast.type === "error";
  return (
    <div
      className="fixed bottom-5 right-5 z-[60] rounded-lg shadow-xl px-4 py-3 flex items-start gap-2.5 max-w-sm"
      style={{ background: isErr ? C.rust : C.navyDeep, color: "#fff", fontFamily: F.body }}
    >
      {isErr ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
      <div className="text-sm leading-snug">{toast.message}</div>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="py-14 flex flex-col items-center justify-center text-center gap-2">
      <Circle size={22} style={{ color: C.line }} />
      <p className="text-sm" style={{ color: C.muted, fontFamily: F.body }}>{label}</p>
    </div>
  );
}

function QueueTable({ columns, rows, onRowClick, actions, emptyLabel }) {
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: C.line, background: C.card }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ fontFamily: F.body }}>
          <thead>
            <tr style={{ background: C.paperAlt }}>
              {columns.map((c) => (
                <th key={c.key} className="text-left px-4 py-3 font-medium whitespace-nowrap" style={{ color: C.muted, fontSize: 12, letterSpacing: "0.02em", textTransform: "uppercase" }}>
                  {c.label}
                </th>
              ))}
              {actions && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t hover:bg-black/[0.02] cursor-pointer"
                style={{ borderColor: C.lineSoft }}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 align-middle" style={{ color: C.ink }}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <EmptyState label={emptyLabel || "Nothing in this queue right now."} />}
    </div>
  );
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-1 border-b overflow-x-auto" style={{ borderColor: C.line }}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className="px-4 py-2.5 text-sm font-medium whitespace-nowrap flex items-center gap-2 -mb-px"
            style={{
              color: isActive ? C.navy : C.muted,
              borderBottom: isActive ? `2px solid ${C.seal}` : "2px solid transparent",
              fontFamily: F.body,
            }}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span
                className="text-[11px] rounded-full px-1.5 py-0.5 font-semibold"
                style={{ background: isActive ? C.sealSoft : C.paperAlt, color: isActive ? C.seal : C.muted }}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ServiceTypeFilterBar({ apps, active, onChange }) {
  const countFor = (key) => (key === "all" ? apps.length : filterAppsByService(apps, key).length);
  const chips = [{ key: "all", label: "All Service Types" }, ...SERVICE_FILTERS];
  return (
    <div className="rounded-xl border p-4 mb-5" style={{ borderColor: C.line, background: C.card }}>
      <div className="flex items-center gap-1.5 mb-3">
        <Filter size={14} color={C.seal} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted, fontFamily: F.body }}>Filter by Service Type</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => {
          const isActive = c.key === active;
          const count = countFor(c.key);
          return (
            <button
              key={c.key}
              onClick={() => onChange(c.key)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border whitespace-nowrap"
              style={{
                borderColor: isActive ? C.seal : C.line,
                background: isActive ? C.sealSoft : C.paperAlt,
                color: isActive ? C.seal : C.inkSoft,
                fontFamily: F.body,
              }}
            >
              {c.label}
              <span
                className="rounded-full px-1.5 text-[11px] font-semibold"
                style={{ background: isActive ? "#fff" : C.card, color: isActive ? C.seal : C.muted }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AppIdCell({ row }) {
  return (
    <div className="flex flex-col">
      <span className="font-medium" style={{ fontFamily: F.mono, fontSize: 12.5, color: C.navy }}>{row.id}</span>
      {row.returnedByApproval && (
        <span className="text-[11px] mt-0.5 inline-flex items-center gap-1 w-fit rounded px-1.5 py-0.5" style={{ background: C.rustSoft, color: C.rust }}>
          <RotateCcw size={10} /> Returned by Approving Authority
        </span>
      )}
    </div>
  );
}

// Fixed column set used by every queue table on the Scrutiny Officer and
// Approving Authority dashboards: Applicant, Service Type, Status, Submitted On,
// Application ID — plus a Review action supplied by the caller.
function officeColumns({ statusRender } = {}) {
  return [
    { key: "applicantName", label: "Applicant" },
    { key: "serviceType", label: "Service Type" },
    { key: "status", label: "Status", render: statusRender || ((r) => <Badge status={r.status} />) },
    { key: "submitted", label: "Submitted On", render: (r) => fmtDate(r.submitted) },
    { key: "id", label: "Application ID", render: (r) => <AppIdCell row={r} /> },
  ];
}

/* ============================== SECTION HEADER ============================== */
function SectionHeader({ eyebrow, title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: C.seal, fontFamily: F.body }}>{eyebrow}</p>}
        <h1 className="text-2xl" style={{ color: C.ink, fontFamily: F.display, fontWeight: 600 }}>{title}</h1>
        {subtitle && <p className="text-sm mt-1" style={{ color: C.muted, fontFamily: F.body }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/* ============================== LOGIN SCREEN ============================== */
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen w-full flex" style={{ background: C.paper }}>
      <style>{FONT_IMPORT}</style>
      {/* Hero panel */}
      <div className="hidden md:flex md:w-5/12 flex-col justify-between p-10" style={{ background: C.navyDeep }}>
        <div className="flex items-center gap-3">
          <div className="rounded-full p-2" style={{ background: "rgba(255,255,255,0.06)" }}>
            <Seal size={34} />
          </div>
          <div>
            <p className="text-white text-sm font-semibold tracking-wide" style={{ fontFamily: F.body }}>MPSVC</p>
            <p className="text-[11px]" style={{ color: "#B9C3CC", fontFamily: F.dev }}>Government of Madhya Pradesh</p>
          </div>
        </div>
        <div>
          <h1 className="text-white text-4xl leading-tight" style={{ fontFamily: F.display, fontWeight: 600 }}>
            Departmental<br />Back-Office
          </h1>
          <p className="mt-4 text-sm max-w-sm leading-relaxed" style={{ color: "#B9C3CC", fontFamily: F.body }}>
            Manage the complete veterinary registration workflow — renewal and transfer applications
            from payment confirmation through scrutiny, approval and Speed Post dispatch.
          </p>
          <div className="mt-8 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={16} color="#8FA6B8" />
              <span className="text-xs" style={{ color: "#8FA6B8", fontFamily: F.body }}>Scrutiny Officer</span>
            </div>
            <ChevronRight size={14} color="#5A6E7D" />
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} color="#8FA6B8" />
              <span className="text-xs" style={{ color: "#8FA6B8", fontFamily: F.body }}>Approving Authority</span>
            </div>
          </div>
        </div>
        <p className="text-[11px]" style={{ color: "#5A6E7D", fontFamily: F.body }}>Government of Madhya Pradesh Internal Staff Portal</p>
      </div>

      {/* Login form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-2 mb-8">
            <Seal size={30} />
            <div>
              <p className="font-semibold text-sm" style={{ color: C.ink, fontFamily: F.body }}>MPSVC Back-Office</p>
            </div>
          </div>

          <h2 className="text-xl mb-1" style={{ color: C.ink, fontFamily: F.display, fontWeight: 600 }}>Office sign in</h2>
          <p className="text-sm mb-6" style={{ color: C.muted, fontFamily: F.body }}>Access is routed automatically to your dashboard based on your role.</p>

          <form
            className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: C.line, background: C.card }}
            onSubmit={(e) => { e.preventDefault(); onLogin("maker"); }}
          >
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: C.inkSoft, fontFamily: F.body }}>Username</label>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2.5" style={{ borderColor: C.line }}>
                <KeyRound size={15} color={C.muted} />
                <input
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. scrutiny.bhopal01"
                  className="w-full outline-none text-sm bg-transparent" style={{ color: C.ink, fontFamily: F.body }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: C.inkSoft, fontFamily: F.body }}>Password</label>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2.5" style={{ borderColor: C.line }}>
                <Fingerprint size={15} color={C.muted} />
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  className="w-full outline-none text-sm bg-transparent" style={{ color: C.ink, fontFamily: F.body }}
                />
              </div>
            </div>
            <Button type="submit" variant="primary" size="md">
              <span className="w-full text-center">Sign in</span>
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-dashed p-4" style={{ borderColor: C.line }}>
            <p className="text-xs font-semibold mb-2" style={{ color: C.seal, fontFamily: F.body }}>PROTOTYPE QUICK ROLE PREVIEW</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => onLogin("maker")} className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:opacity-80" style={{ background: C.paperAlt, color: C.ink, fontFamily: F.body }}>
                <span className="flex items-center gap-2"><ClipboardCheck size={15} color={C.seal} /> Scrutiny Officer dashboard</span>
                <ChevronRight size={14} color={C.muted} />
              </button>
              <button onClick={() => onLogin("checker")} className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:opacity-80" style={{ background: C.paperAlt, color: C.ink, fontFamily: F.body }}>
                <span className="flex items-center gap-2"><ShieldCheck size={15} color={C.navy} /> Approving Authority dashboard</span>
                <ChevronRight size={14} color={C.muted} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== APP SHELL (TopBar + SideNav) ============================== */
function Shell({ session, screen, onNav, onLogout, children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMaker = session.role === "maker";

  const navItems = isMaker
    ? [
        { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { key: "search", label: "Search & Reports", icon: SearchIcon },
      ]
    : [
        { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { key: "search", label: "Search & Reports", icon: SearchIcon },
      ];

  const activeTop = ["dashboard", "review", "approval"].includes(screen) ? "dashboard" : screen;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.paper }}>
      <style>{FONT_IMPORT}</style>
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b" style={{ background: C.navyDeep, borderColor: C.navyDeep }}>
        <div className="flex items-center gap-3">
          <button className="md:hidden text-white p-1" onClick={() => setMobileNavOpen((v) => !v)}><Menu size={20} /></button>
          <Seal size={28} />
          <div className="leading-tight">
            <p className="text-white text-sm font-semibold" style={{ fontFamily: F.body }}>MPSVC Back-Office</p>
            <p className="text-[11px]" style={{ color: "#8FA6B8", fontFamily: F.body }}>Office User Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-white text-sm font-medium" style={{ fontFamily: F.body }}>{session.name}</p>
            <p className="text-[11px]" style={{ color: "#8FA6B8", fontFamily: F.body }}>{session.desig}</p>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ background: isMaker ? C.sealSoft : C.navySoft, color: isMaker ? C.seal : C.navy, fontFamily: F.body }}
          >
            {session.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </div>
          <button onClick={onLogout} className="p-2 rounded-md hover:bg-white/10" title="Log out">
            <LogOut size={17} color="#B9C3CC" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Side nav (desktop) */}
        <nav className="hidden md:flex md:flex-col w-56 shrink-0 border-r px-3 py-5 gap-1" style={{ borderColor: C.line, background: C.paperAlt }}>
          {navItems.map((item) => {
            const isActive = activeTop === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNav(item.key)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-left"
                style={{
                  background: isActive ? "#fff" : "transparent",
                  color: isActive ? C.navy : C.inkSoft,
                  boxShadow: isActive ? `0 0 0 1px ${C.line}` : "none",
                  fontFamily: F.body,
                }}
              >
                <item.icon size={17} color={isActive ? C.seal : C.muted} />
                {item.label}
              </button>
            );
          })}
          <div className="mt-6 rounded-lg p-3" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
            <p className="text-[11px] font-semibold mb-1" style={{ color: C.seal, fontFamily: F.body }}>ROLE</p>
            <p className="text-xs leading-snug" style={{ color: C.inkSoft, fontFamily: F.body }}>
              {isMaker ? "Scrutiny Officer — verifies documents and payment, forwards for approval." : "Approving Authority — grants final approval to applications forwarded by the Scrutiny Officer."}
            </p>
          </div>
        </nav>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex" onClick={() => setMobileNavOpen(false)}>
            <div className="w-64 h-full p-4 flex flex-col gap-1" style={{ background: C.paperAlt }} onClick={(e) => e.stopPropagation()}>
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => { onNav(item.key); setMobileNavOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-left"
                  style={{ background: activeTop === item.key ? "#fff" : "transparent", color: C.ink, fontFamily: F.body }}
                >
                  <item.icon size={17} color={C.seal} />
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex-1" style={{ background: "rgba(0,0,0,0.3)" }} />
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}

/* ============================== MAKER DASHBOARD ============================== */
// Every row opens the complete application form (ReviewScreen); the action available
// there (confirm/decline payment, forward, return, upload certificate & close) depends
// on the application's current stage.
function MakerDashboard({ apps, onOpenReview, onNav }) {
  const [tab, setTab] = useState("pending");
  const [serviceFilter, setServiceFilter] = useState("all");

  const filteredApps = filterAppsByService(apps, serviceFilter);

  const pendingPayment = filteredApps.filter((a) => a.status === ST.PENDING_PAYMENT);
  const pendingScrutiny = filteredApps.filter((a) => a.status === ST.PENDING_SCRUTINY);
  const sentBack = filteredApps.filter((a) => a.status === ST.SENT_BACK_APPLICANT);
  // Applications approved and sent back to the Scrutiny Officer to upload the certificate
  // photo and close out the case.
  const pendingCertificate = filteredApps.filter((a) => a.status === ST.PENDING_DISPATCH);
  const forwarded = filteredApps.filter((a) =>
    [ST.FORWARDED, ST.PENDING_DISPATCH, ST.PRINTED_SEALED, ST.DISPATCHED, ST.CLOSED].includes(a.status)
  );

  // "Pending" = items needing the Scrutiny Officer's action right now.
  const pending = [...pendingPayment, ...pendingScrutiny, ...pendingCertificate];

  const tabs = [
    { key: "pending", label: "Pending", count: pending.length },
    { key: "all", label: "All", count: filteredApps.length },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="Scrutiny Officer"
        title="Scrutiny Officer Dashboard"
        subtitle="Confirm offline payments, verify applications, and issue certificates once approved."
      />

      <ServiceTypeFilterBar apps={apps} active={serviceFilter} onChange={setServiceFilter} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Awaiting Payment", value: pendingPayment.length, color: C.rust },
          { label: "Pending at Scrutiny Officer", value: pendingScrutiny.length, color: C.seal },
          { label: "Sent Back", value: sentBack.length, color: C.rust },
          { label: "Awaiting Certificate Upload", value: pendingCertificate.length, color: C.forest },
          { label: "Forwarded", value: forwarded.length, color: C.navy },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.card }}>
            <p className="text-2xl font-semibold" style={{ color: s.color, fontFamily: F.display }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: C.muted, fontFamily: F.body }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border" style={{ borderColor: C.line, background: C.card }}>
        <div className="px-2 pt-2">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>
        <div className="p-4">
          {tab === "pending" && (
            <QueueTable
              emptyLabel="Nothing pending your action right now."
              columns={officeColumns()}
              rows={pending}
              onRowClick={(r) => onOpenReview(r.id)}
              actions={(r) => <Button size="sm" variant="primary" onClick={() => onOpenReview(r.id)} icon={Eye}>Review</Button>}
            />
          )}
          {tab === "all" && (
            <QueueTable
              emptyLabel="No applications match your filters."
              columns={officeColumns()}
              rows={filteredApps}
              onRowClick={(r) => onOpenReview(r.id)}
              actions={(r) => <Button size="sm" variant="primary" onClick={() => onOpenReview(r.id)} icon={Eye}>Review</Button>}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================== APPLICATION REVIEW SCREEN (MAKER) ============================== */
function ReviewScreen({ app, apps, onBack, onForward, onReturn, onConfirmPayment, onDeclinePayment, onCloseApplication, onViewHistory }) {
  const [screenTab, setScreenTab] = useState("application");
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnRemarks, setReturnRemarks] = useState("");
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineRemarks, setDeclineRemarks] = useState("");
  const [certPreview, setCertPreview] = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  const [fieldFlags, setFieldFlags] = useState({});
  const [digitalCertOpen, setDigitalCertOpen] = useState(false);

  const readOnly = app.status !== ST.PENDING_SCRUTINY;
  const flaggedCount = Object.keys(fieldFlags).length;

  function toggleFieldFlag(key, label) {
    setFieldFlags((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { label, comment: "" } };
    });
  }
  function setFieldFlagComment(key, comment) {
    setFieldFlags((prev) => (prev[key] ? { ...prev, [key]: { ...prev[key], comment } } : prev));
  }
  function openReturnWithFlags() {
    if (flaggedCount > 0) {
      const lines = Object.values(fieldFlags).map((flag) => `• ${flag.label}${flag.comment ? " — " + flag.comment : ""}`);
      setReturnRemarks("Please correct the following:\n" + lines.join("\n"));
    }
    setReturnOpen(true);
  }

  function handleCertFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCertPreview(reader.result);
    reader.readAsDataURL(file);
  }

  // Same flaggable field set shown on both the Application Details tab (so the
  // office user can flag while verifying, without switching tabs) and the
  // Applicant Profile tab.
  const flaggableProfileSection = app.provisionalDetails ? (
    <div className="rounded-xl border p-5 mb-5" style={{ borderColor: C.line, background: C.card }}>
      {!readOnly && (
        <div className="rounded-md px-3 py-2.5 mb-5" style={{ background: C.paperAlt }}>
          <p className="text-xs leading-relaxed" style={{ color: C.inkSoft, fontFamily: F.body }}>
            Flag any field or uploaded document that's incorrect or unclear. A comment is optional — flagging anything
            blocks forwarding; use Return to Applicant below to send it back for correction.
          </p>
        </div>
      )}
      <ProvisionalProfileFields
        app={app}
        flaggable={!readOnly}
        flags={fieldFlags}
        onToggleFlag={toggleFieldFlag}
        onFlagComment={setFieldFlagComment}
      />
    </div>
  ) : null;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: C.muted, fontFamily: F.body }}>
        <ArrowLeft size={15} /> Back to dashboard
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: C.seal, fontFamily: F.body }}>Application Review</p>
          <h1 className="text-2xl flex items-center gap-3 flex-wrap" style={{ color: C.ink, fontFamily: F.display, fontWeight: 600 }}>
            {app.applicantName}
            <span className="text-sm font-normal" style={{ fontFamily: F.mono, color: C.muted }}>{app.id}</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: C.muted, fontFamily: F.body }}>{app.serviceType} · Submitted {fmtDate(app.submitted)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={app.status} />
          {app.regNo && (
            <Button variant="ghost" size="sm" icon={ShieldCheck} onClick={() => setDigitalCertOpen(true)}>Certificate</Button>
          )}
          <Button variant="ghost" size="sm" icon={HistoryIcon} onClick={onViewHistory}>Audit Trail</Button>
        </div>
      </div>

      <div className="mb-5">
        <Tabs
          tabs={[
            { key: "application", label: "Application Details" },
            { key: "profile", label: "Applicant Profile" },
          ]}
          active={screenTab}
          onChange={setScreenTab}
        />
      </div>

      {screenTab === "application" ? (
        <>
          {flaggableProfileSection}
          <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.card }}>
            <FieldGroup icon={IndianRupee} title="Payment Details">
              <Field label="Mode" value={app.mode} />
              <Field label="Amount" value={`₹${app.amount}`} />
              <Field label="Challan / Reference No." value={app.challan} mono />
              <Field label="Challan Date" value={fmtDate(app.challanDate)} />
            </FieldGroup>

            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: C.ink, fontFamily: F.body }}>
              <Paperclip size={16} color={C.seal} /> Uploaded Documents
            </h3>
            <div className="space-y-2">
              {app.documents.map((d) => {
                const flagKey = `doc:${d.fileName}`;
                const flag = fieldFlags[flagKey];
                return (
                  <div key={d.fileName} className="rounded-md border px-3 py-2.5" style={{ borderColor: C.line }}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDocPreview(d)}
                        className="flex-1 min-w-0 flex items-center justify-between gap-2.5 text-left hover:bg-black/[0.02] rounded-md"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-9 rounded flex items-center justify-center shrink-0" style={{ background: C.paperAlt, border: `1px solid ${C.line}` }}>
                            <FileText size={14} color={C.muted} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm truncate" style={{ color: C.ink, fontFamily: F.body }}>{d.label}</p>
                            <p className="text-[11px] truncate" style={{ color: C.muted, fontFamily: F.mono }}>{d.fileName}</p>
                          </div>
                        </div>
                        <Eye size={15} color={C.muted} className="shrink-0" />
                      </button>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => toggleFieldFlag(flagKey, `Document — ${d.label}`)}
                          className="shrink-0 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium"
                          style={flag
                            ? { borderColor: C.rust, color: C.rust, background: C.rustSoft }
                            : { borderColor: C.line, color: C.inkSoft, background: "transparent" }}
                        >
                          {flag ? <CheckCircle2 size={13} /> : <Flag size={13} />}
                          {flag ? "Flagged" : "Flag issue"}
                        </button>
                      )}
                    </div>
                    {flag && (
                      <input
                        type="text"
                        value={flag.comment}
                        onChange={(e) => setFieldFlagComment(flagKey, e.target.value)}
                        placeholder="What's wrong with this document? (optional)"
                        className="w-full mt-2 rounded-md border px-3 py-2 text-sm outline-none"
                        style={{ borderColor: C.line, fontFamily: F.body, color: C.ink }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verification / action */}
          <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.card }}>
            {app.status === ST.PENDING_PAYMENT ? (
              /* Payment not yet confirmed — verification isn't relevant until it is. */
              <div>
                <div className="rounded-md px-3 py-2.5 mb-4 flex items-start gap-2.5" style={{ background: C.paperAlt }}>
                  <AlertTriangle size={15} color={C.rust} className="mt-0.5 shrink-0" />
                  <p className="text-xs leading-relaxed" style={{ color: C.inkSoft, fontFamily: F.body }}>
                    This is an offline application. Confirm that the challan amount shown above matches the treasury
                    receipt before it moves into scrutiny — or decline if the payment cannot be verified.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="seal" icon={CheckCircle2} onClick={() => onConfirmPayment(app.id)}>Confirm Payment Received</Button>
                  <Button variant="rust" icon={XCircle} onClick={() => setDeclineOpen(true)}>Decline Payment & Reject</Button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: C.ink, fontFamily: F.body }}>
                  <ClipboardCheck size={16} color={C.seal} /> Verification & Action
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: C.muted, fontFamily: F.body }}>
                  Review the applicant's details and uploaded documents above, and flag anything that's incorrect or
                  unclear. The application can only be returned to the applicant if at least one item is flagged;
                  otherwise, forward it.
                </p>

                {app.status === ST.PENDING_SCRUTINY ? (
                  <>
                    <div className="flex flex-wrap gap-2 mt-5">
                      <Button
                        variant="forest"
                        icon={Send}
                        disabled={flaggedCount > 0}
                        onClick={() => onForward(app.id, { checklist: {}, remarks: "" })}
                      >
                        Forward to Approving Authority
                      </Button>
                      <Button variant="rust" icon={Undo2} disabled={flaggedCount === 0} onClick={openReturnWithFlags}>
                        Return to Applicant
                      </Button>
                    </div>
                    {flaggedCount > 0 ? (
                      <p className="text-xs mt-2" style={{ color: C.rust, fontFamily: F.body }}>
                        {flaggedCount} item{flaggedCount > 1 ? "s" : ""} flagged as incorrect — this application must be returned to the applicant and cannot be forwarded.
                      </p>
                    ) : (
                      <p className="text-xs mt-2" style={{ color: C.muted, fontFamily: F.body }}>
                        Nothing flagged — flag a field or document above to return this application to the applicant.
                      </p>
                    )}
                  </>
                ) : app.status === ST.PENDING_DISPATCH ? (
                  <div className="mt-5">
                    <div className="rounded-md px-3 py-2.5 mb-3 flex items-start gap-2.5" style={{ background: C.forestSoft }}>
                      <FileImage size={15} color={C.forest} className="mt-0.5 shrink-0" />
                      <p className="text-xs leading-relaxed" style={{ color: C.ink, fontFamily: F.body }}>
                        This application was approved. Upload a photo of the signed certificate to close the case —
                        it becomes visible to the applicant on the citizen portal.
                      </p>
                    </div>
                    {certPreview && (
                      <div className="mb-3 rounded-md overflow-hidden border" style={{ borderColor: C.line }}>
                        <img src={certPreview} alt="Certificate preview" className="w-full max-h-56 object-contain" style={{ background: C.paperAlt }} />
                      </div>
                    )}
                    <label className="text-xs font-medium block mb-1.5" style={{ color: C.inkSoft, fontFamily: F.body }}>
                      Certificate Photo <span style={{ color: C.rust }}>*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCertFile}
                      className="w-full text-sm mb-3"
                      style={{ fontFamily: F.body, color: C.ink }}
                    />
                    <Button variant="forest" icon={PackageCheck} disabled={!certPreview} onClick={() => onCloseApplication(app.id, certPreview)}>
                      Upload Certificate & Close Application
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs mt-5 rounded-md px-3 py-2" style={{ background: C.paperAlt, color: C.muted, fontFamily: F.body }}>
                    This application is read-only at its current stage.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        </>
      ) : (
        <>
          <ApplicantHistoryPanel apps={apps} app={app} />
          {app.provisionalDetails ? (
            flaggableProfileSection
          ) : (
            <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.card }}>
              {app.newRegDetails ? (
                <NewRegistrationProfileFields app={app} />
              ) : (
                <>
                  <FieldGroup icon={User2Icon} title="Personal Details">
                    <Field label="Full Name" value={app.applicantName} />
                    <Field label="Date of Birth" value={fmtDate(app.dob)} />
                    <Field label="Father's Name" value={app.fatherName} />
                    <Field label="Gender" value={app.gender} />
                    <Field label="Mobile" value={app.mobile} icon={Phone} />
                    <Field label="Email" value={app.email} icon={Mail} />
                    <Field label="Address" value={app.address} icon={MapPin} wide />
                  </FieldGroup>
                  <FieldGroup icon={GraduationCap} title="Qualification & Institution">
                    <Field label="Degree" value={app.degree} />
                    <Field label="Year of Passing" value={app.year} />
                    <Field label="College / Institution" value={app.college} icon={Building2} wide />
                  </FieldGroup>
                </>
              )}
            </div>
          )}
        </>
      )}

      <Modal open={!!docPreview} onClose={() => setDocPreview(null)} title={docPreview?.label}>
        {docPreview && (
          <div>
            <div className="rounded-lg flex flex-col items-center justify-center py-14 border" style={{ background: C.paperAlt, borderColor: C.line }}>
              <FileText size={40} color={C.muted} />
              <p className="text-sm mt-3" style={{ color: C.inkSoft, fontFamily: F.body }}>{docPreview.fileName}</p>
              <p className="text-xs mt-1" style={{ color: C.muted, fontFamily: F.body }}>Simulated preview — the document viewer would render the uploaded file here.</p>
            </div>
          </div>
        )}
      </Modal>

      <RemarksModal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        title="Return to Applicant"
        description="The applicant will be notified and asked to correct and resubmit. Remarks are mandatory."
        actionLabel="Return to Applicant"
        actionVariant="rust"
        value={returnRemarks}
        onChange={setReturnRemarks}
        onSubmit={() => { onReturn(app.id, returnRemarks); setReturnOpen(false); }}
      />

      <RemarksModal
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title="Decline Payment & Reject Application"
        description="This permanently rejects the application because the payment could not be confirmed (e.g. challan mismatch, insufficient amount, or invalid reference). Remarks are mandatory and will be visible in the audit trail."
        actionLabel="Decline Payment & Reject"
        actionVariant="rust"
        value={declineRemarks}
        onChange={setDeclineRemarks}
        onSubmit={() => { onDeclinePayment(app.id, declineRemarks); setDeclineOpen(false); }}
      />

      <CertificateModal app={app} open={digitalCertOpen} onClose={() => setDigitalCertOpen(false)} />
    </div>
  );
}

function User2Icon(props) {
  // small inline person icon so FieldGroup headers stay visually consistent without an extra import name clash
  return (
    <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke={props.color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function FieldGroup({ icon: Icon, title, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Icon size={13} color={C.muted} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.muted, fontFamily: F.body }}>{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">{children}</div>
    </div>
  );
}
function Field({ label, value, wide, mono }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <p className="text-[11px]" style={{ color: C.muted, fontFamily: F.body }}>{label}</p>
      <p className="text-sm" style={{ color: C.ink, fontFamily: mono ? F.mono : F.body }}>{value}</p>
    </div>
  );
}

// Review-mode rendering for a profile field group: each field gets its own compact
// "Flag issue" toggle so the Scrutiny Officer can mark specific fields as incorrect
// (with an optional comment) instead of returning the whole application on a single
// generic remark. Laid out as a responsive grid (not one field per full-width row) so
// short fields like "Gender" or "Pin Code" don't each eat the full card width.
function FlaggableFieldGroup({ icon: Icon, title, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={13} color={C.muted} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.muted, fontFamily: F.body }}>{title}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">{children}</div>
    </div>
  );
}
function FlaggableField({ fieldKey, label, value, mono, wide, flag, onToggleFlag, onFlagComment }) {
  const flagged = !!flag;
  return (
    <div
      className={`rounded-md border px-2.5 py-2 ${wide ? "col-span-2 sm:col-span-3 lg:col-span-4" : ""}`}
      style={{ borderColor: flagged ? C.rust : C.line, background: flagged ? C.rustSoft : "transparent" }}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide truncate" style={{ color: C.muted, fontFamily: F.body }}>{label}</p>
          <p className="text-sm font-medium mt-0.5 truncate" title={value} style={{ color: C.ink, fontFamily: mono ? F.mono : F.body }}>{value}</p>
        </div>
        <button
          type="button"
          onClick={() => onToggleFlag(fieldKey, label)}
          title={flagged ? "Flagged as incorrect — click to unflag" : "Flag issue"}
          className="shrink-0 rounded p-1 hover:bg-black/[0.04]"
          style={{ color: flagged ? C.rust : C.muted }}
        >
          {flagged ? <CheckCircle2 size={14} /> : <Flag size={14} />}
        </button>
      </div>
      {flagged && (
        <input
          type="text"
          value={flag.comment}
          onChange={(e) => onFlagComment(fieldKey, e.target.value)}
          placeholder="What needs correction? (optional)"
          className="w-full mt-1.5 rounded border px-2 py-1 text-xs outline-none"
          style={{ borderColor: C.line, fontFamily: F.body, color: C.ink, background: C.card }}
        />
      )}
    </div>
  );
}

// Every field here — labels and grouping included — matches the citizen-facing
// Provisional Registration application form field-for-field (see
// ScreenProvisionalAppForm in mpsvc-prototype.jsx), so the office user reviews exactly
// what the citizen submitted, nothing summarized or renamed. Shown on both the
// Application Details and Applicant Profile tabs of the Scrutiny Officer's review screen.
function ProvisionalProfileFields({ app, flaggable, flags, onToggleFlag, onFlagComment }) {
  const pd = app.provisionalDetails;
  if (!pd) return null;

  if (flaggable) {
    const f = (fieldKey, label, value, mono, wide) => (
      <FlaggableField
        key={fieldKey}
        fieldKey={fieldKey}
        label={label}
        value={value}
        mono={mono}
        wide={wide}
        flag={flags[fieldKey]}
        onToggleFlag={onToggleFlag}
        onFlagComment={onFlagComment}
      />
    );
    return (
      <>
        <FlaggableFieldGroup icon={User2Icon} title="Personal Details">
          {f("firstName", "First Name", pd.firstName)}
          {f("middleName", "Middle Name", pd.middleName || "—")}
          {f("lastName", "Last Name", pd.lastName)}
          {f("fatherName", "Father Name", app.fatherName)}
          {f("dob", "Date Of Birth", fmtDate(app.dob))}
          {f("gender", "Gender", app.gender)}
        </FlaggableFieldGroup>
        <FlaggableFieldGroup icon={MapPin} title="Residential Address">
          {f("resAreaType", "Area Type", pd.resAreaType)}
          {f("resState", "State", pd.resState)}
          {f("resDistrict", "District", pd.resDistrict)}
          {pd.resAreaType === "Rural" ? (
            <>
              {f("resBlock", "Block", pd.resBlock)}
              {f("resPanchayat", "Panchayat", pd.resPanchayat)}
              {f("resGram", "Gram", pd.resGram)}
            </>
          ) : (
            <>
              {f("resCity", "City", pd.resCity)}
              {f("resWard", "Ward", pd.resWard)}
            </>
          )}
          {f("resPincode", "Pin Code", pd.resPincode, true)}
          {f("resPostOffice", "Post Office", pd.resPostOffice)}
          {f("resAddress", "Complete Address", pd.resAddress, false, true)}
        </FlaggableFieldGroup>
        <FlaggableFieldGroup icon={MapPin} title="Permanent Address">
          {f("permAreaType", "Area Type", pd.permAreaType)}
          {f("permState", "State", pd.permState)}
          {f("permDistrict", "District", pd.permDistrict)}
          {pd.permAreaType === "Rural" ? (
            <>
              {f("permBlock", "Block", pd.permBlock)}
              {f("permPanchayat", "Panchayat", pd.permPanchayat)}
              {f("permGram", "Gram", pd.permGram)}
            </>
          ) : (
            <>
              {f("permCity", "City", pd.permCity)}
              {f("permWard", "Ward", pd.permWard)}
            </>
          )}
          {f("permPincode", "Pin Code", pd.permPincode, true)}
          {f("permPostOffice", "Post Office", pd.permPostOffice)}
          {f("permAddress", "Complete Address", pd.permAddress, false, true)}
        </FlaggableFieldGroup>
        <FlaggableFieldGroup icon={Phone} title="Contact Details">
          {f("preferredAddress", "Preferred Address", pd.preferredAddress)}
          {f("email", "Email Id", app.email)}
          {f("mobile1", "Primary Mobile No.", pd.mobile1)}
          {f("mobile2", "Alternate Mobile Number", pd.mobile2 || "—")}
        </FlaggableFieldGroup>
        <FlaggableFieldGroup icon={GraduationCap} title="Qualification">
          {f("rollNo", "Roll No", pd.rollNo, true)}
          {f("universityEnrollmentNo", "University Enrollment No", pd.universityEnrollmentNo, true)}
          {f("provDegreeName", "Degree Name", pd.provDegreeName)}
          {f("provUniversityName", "Name of University", pd.provUniversityName, false, true)}
          {f("college", "Name of College", app.college, false, true)}
          {f("provPassingYear", "Passing Year", pd.provPassingYear)}
        </FlaggableFieldGroup>
      </>
    );
  }

  return (
    <>
      <FieldGroup icon={User2Icon} title="Personal Details">
        <Field label="First Name" value={pd.firstName} />
        <Field label="Middle Name" value={pd.middleName || "—"} />
        <Field label="Last Name" value={pd.lastName} />
        <Field label="Father Name" value={app.fatherName} />
        <Field label="Date Of Birth" value={fmtDate(app.dob)} />
        <Field label="Gender" value={app.gender} />
      </FieldGroup>
      <FieldGroup icon={MapPin} title="Residential Address">
        <Field label="Area Type" value={pd.resAreaType} />
        <Field label="State" value={pd.resState} />
        <Field label="District" value={pd.resDistrict} />
        {pd.resAreaType === "Rural" ? (
          <>
            <Field label="Block" value={pd.resBlock} />
            <Field label="Panchayat" value={pd.resPanchayat} />
            <Field label="Gram" value={pd.resGram} />
          </>
        ) : (
          <>
            <Field label="City" value={pd.resCity} />
            <Field label="Ward" value={pd.resWard} />
          </>
        )}
        <Field label="Pin Code" value={pd.resPincode} mono />
        <Field label="Post Office" value={pd.resPostOffice} />
        <Field label="Complete Address" value={pd.resAddress} wide />
      </FieldGroup>
      <FieldGroup icon={MapPin} title="Permanent Address">
        <Field label="Area Type" value={pd.permAreaType} />
        <Field label="State" value={pd.permState} />
        <Field label="District" value={pd.permDistrict} />
        {pd.permAreaType === "Rural" ? (
          <>
            <Field label="Block" value={pd.permBlock} />
            <Field label="Panchayat" value={pd.permPanchayat} />
            <Field label="Gram" value={pd.permGram} />
          </>
        ) : (
          <>
            <Field label="City" value={pd.permCity} />
            <Field label="Ward" value={pd.permWard} />
          </>
        )}
        <Field label="Pin Code" value={pd.permPincode} mono />
        <Field label="Post Office" value={pd.permPostOffice} />
        <Field label="Complete Address" value={pd.permAddress} wide />
      </FieldGroup>
      <FieldGroup icon={Phone} title="Contact Details">
        <Field label="Preferred Address" value={pd.preferredAddress} />
        <Field label="Email Id" value={app.email} />
        <Field label="Primary Mobile No." value={pd.mobile1} />
        <Field label="Alternate Mobile Number" value={pd.mobile2 || "—"} />
      </FieldGroup>
      <FieldGroup icon={GraduationCap} title="Qualification">
        <Field label="Roll No" value={pd.rollNo} mono />
        <Field label="University Enrollment No" value={pd.universityEnrollmentNo} mono />
        <Field label="Degree Name" value={pd.provDegreeName} />
        <Field label="Name of University" value={pd.provUniversityName} wide />
        <Field label="Name of College" value={app.college} wide />
        <Field label="Passing Year" value={pd.provPassingYear} />
      </FieldGroup>
    </>
  );
}

// The New Registration / Transfer-In citizen form collects an even larger field set
// than Provisional — Organization/Department/Sector, three full addresses
// (Residential/Professional/Permanent), a Qualification table, and NOC details when
// it's a transfer — see app.newRegDetails. Renders that complete set here so the
// office user sees exactly what the citizen submitted, not a generic summary.
function NewRegistrationProfileFields({ app }) {
  const nd = app.newRegDetails;
  if (!nd) return null;
  const addressGroup = (icon, title, prefix) => (
    <FieldGroup icon={icon} title={title}>
      <Field label="Area Type" value={nd[`${prefix}AreaType`] || "—"} />
      <Field label="State" value={nd[`${prefix}State`] || "—"} />
      <Field label="District" value={nd[`${prefix}District`] || "—"} />
      {nd[`${prefix}AreaType`] === "Rural" ? (
        <>
          <Field label="Block" value={nd[`${prefix}Block`] || "—"} />
          <Field label="Panchayat" value={nd[`${prefix}Panchayat`] || "—"} />
          <Field label="Gram" value={nd[`${prefix}Gram`] || "—"} />
        </>
      ) : (
        <>
          <Field label="City" value={nd[`${prefix}City`] || "—"} />
          <Field label="Ward" value={nd[`${prefix}Ward`] || "—"} />
        </>
      )}
      <Field label="Pin Code" value={nd[`${prefix}Pincode`] || "—"} mono />
      <Field label="Post Office" value={nd[`${prefix}PostOffice`] || "—"} />
      <Field label="Complete Address" value={nd[`${prefix}Address`] || "—"} wide />
    </FieldGroup>
  );
  return (
    <>
      <FieldGroup icon={User2Icon} title="Personal Details">
        <Field label="First Name" value={nd.firstName} />
        <Field label="Middle Name" value={nd.middleName || "—"} />
        <Field label="Last Name" value={nd.lastName} />
        <Field label="Father Name" value={app.fatherName} />
        <Field label="Date Of Birth" value={fmtDate(app.dob)} />
        <Field label="Gender" value={app.gender} />
        <Field label="Organization" value={nd.organization || "—"} />
        <Field label="Department" value={nd.department || "—"} />
        <Field label="Designation" value={nd.designation || "—"} />
        <Field label="Sector" value={nd.sector || "—"} />
      </FieldGroup>
      {addressGroup(MapPin, "Residential Address", "res")}
      {addressGroup(Building2, "Professional Address", "pro")}
      {addressGroup(MapPin, "Permanent Address", "perm")}
      <FieldGroup icon={Phone} title="Contact Details">
        <Field label="Preferred Address" value={nd.preferredAddress || "—"} />
        <Field label="Land-Line No." value={nd.landline || "—"} />
        <Field label="Primary Mobile No." value={app.mobile} />
        <Field label="Alternate Mobile Number" value={nd.mobile2 || "—"} />
        <Field label="Fax No." value={nd.fax || "—"} />
        <Field label="Email Id" value={app.email} />
      </FieldGroup>
      <FieldGroup icon={GraduationCap} title="Qualification">
        <Field label="Degree Name" value="B.V.SC.& A.H." />
        <Field label="Name of University" value={nd.qualBvscUniversity} wide />
        <Field label="Name of College" value={nd.qualBvscCollege || app.college} wide />
        <Field label="Passing Year" value={nd.qualBvscYear} />
        <Field label="Graduation Degree / PDC Date" value={fmtDate(nd.gradDate)} />
        <Field label="Degree Id" value={nd.degreeId} mono />
      </FieldGroup>
      {nd.nocPrevCouncilName && (
        <FieldGroup icon={ShieldCheck} title="Previous State Council Details (NOC)">
          <Field label="Previous State Council Name" value={nd.nocPrevCouncilName} />
          <Field label="Previous Registration Number" value={nd.nocPrevRegNo} mono />
          <Field label="Previous Registration Date" value={fmtDate(nd.nocPrevRegDate)} />
          <Field label="Details" value={nd.nocDetails} wide />
        </FieldGroup>
      )}
    </>
  );
}

// Shown above the two-column review layout — surfaces every other application this
// applicant has ever filed (matched by mobile number: main registration, renewals,
// duplicate certificates, transfers, etc.) so the office user can see the applicant's
// complete history without leaving the current application. Each entry can be opened
// in place to see its own summary and, where one was issued, its certificate.
function ApplicantHistoryPanel({ apps, app }) {
  const [viewing, setViewing] = useState(null);
  const others = apps.filter((a) => a.id !== app.id && a.mobile === app.mobile);

  return (
    <div className="rounded-xl border p-5 mb-6" style={{ borderColor: C.seal, background: C.sealSoft }}>
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: C.ink, fontFamily: F.body }}>
        <HistoryIcon size={16} color={C.seal} /> Applicant's Other Applications on File
      </h3>
      {others.length === 0 ? (
        <p className="text-sm" style={{ color: C.inkSoft, fontFamily: F.body }}>
          No other applications on file for this applicant — this is their only record with MPSVC.
        </p>
      ) : (
        <div className="space-y-2">
          {others.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 flex-wrap"
              style={{ background: "#fff", border: `1px solid ${C.line}` }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm font-medium" style={{ color: C.ink, fontFamily: F.body }}>{a.serviceType}</span>
                  <Badge status={a.status} />
                </div>
                <p className="text-[11px]" style={{ color: C.muted, fontFamily: F.body }}>
                  <span style={{ fontFamily: F.mono }}>{a.id}</span> · Submitted {fmtDate(a.submitted)}
                  {a.regNo && <> · Reg. No. <span style={{ fontFamily: F.mono }}>{a.regNo}</span></>}
                </p>
              </div>
              <Button variant="subtle" size="sm" icon={Eye} onClick={() => setViewing(a)}>View</Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${viewing.serviceType} — ${viewing.id}` : ""}>
        {viewing && (
          <div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Application ID" value={viewing.id} mono />
              <Field label="Status" value={<Badge status={viewing.status} />} />
              <Field label="Submitted On" value={fmtDate(viewing.submitted)} />
              <Field label="Approved On" value={viewing.approval?.signedOn ? fmtDate(viewing.approval.signedOn) : "—"} />
              <Field label="Registration No." value={viewing.regNo || "—"} mono />
              <Field label="Qualification" value={viewing.degree} />
            </div>
            {viewing.approval?.signedOn && (
              <div className="rounded-lg border-2 p-5" style={{ borderColor: C.seal, background: C.sealSoft }}>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck size={20} color={C.seal} />
                  <span className="text-sm font-semibold" style={{ color: C.ink, fontFamily: F.body }}>MPSVC — Certificate of {viewing.serviceType}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[11px]" style={{ color: C.muted, fontFamily: F.body }}>Registration No.</p><p className="text-sm font-medium" style={{ color: C.ink, fontFamily: F.mono }}>{viewing.regNo || "—"}</p></div>
                  <div><p className="text-[11px]" style={{ color: C.muted, fontFamily: F.body }}>Name</p><p className="text-sm font-medium" style={{ color: C.ink, fontFamily: F.body }}>{viewing.applicantName}</p></div>
                  <div><p className="text-[11px]" style={{ color: C.muted, fontFamily: F.body }}>Issue Date</p><p className="text-sm font-medium" style={{ color: C.ink, fontFamily: F.body }}>{fmtDate(viewing.approval.signedOn)}</p></div>
                  <div><p className="text-[11px]" style={{ color: C.muted, fontFamily: F.body }}>Approving Authority</p><p className="text-sm font-medium" style={{ color: C.ink, fontFamily: F.body }}>Registrar, MPSVC (eSigned)</p></div>
                </div>
                <p className="text-[11px] mt-3" style={{ color: C.muted, fontFamily: F.body }}>Simulated preview — the document viewer would render the original issued certificate here.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function RemarksModal({ open, onClose, title, description, actionLabel, actionVariant, value, onChange, onSubmit }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm mb-4" style={{ color: C.muted, fontFamily: F.body }}>{description}</p>
      <label className="text-xs font-medium block mb-1.5" style={{ color: C.inkSoft, fontFamily: F.body }}>Remarks <span style={{ color: C.rust }}>*</span></label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="Explain what needs to be corrected…"
        className="w-full rounded-md border px-3 py-2 text-sm outline-none"
        style={{ borderColor: C.line, fontFamily: F.body, color: C.ink }}
      />
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={actionVariant} disabled={!value.trim()} onClick={onSubmit}>{actionLabel}</Button>
      </div>
    </Modal>
  );
}

// Available to both the Scrutiny Officer and Approving Authority the moment an
// application is approved (app.regNo is set) — regardless of where it currently stands
// on the physical sealed-certificate dispatch track, since the two are independent.
function CertificateModal({ app, open, onClose }) {
  if (!app) return null;
  return (
    <Modal open={open} onClose={onClose} title="Digital Certificate">
      <div className="rounded-md px-3 py-2.5 mb-4 flex items-start gap-2.5" style={{ background: C.sealSoft }}>
        <ShieldCheck size={15} color={C.seal} className="mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed" style={{ color: C.inkSoft, fontFamily: F.body }}>
          This is a non-sealed digital certificate, generated automatically as soon as the application was approved.
          It's available to the applicant, Scrutiny Officer, and Approving Authority at any time — separate from any
          sealed physical certificate tracked under Certificate Dispatch.
        </p>
      </div>
      <div className="rounded-lg overflow-hidden border" style={{ borderColor: C.navy }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: C.navy, color: "#fff" }}>
          <ShieldCheck size={17} />
          <span className="text-sm font-semibold" style={{ fontFamily: F.body }}>MPSVC — {app.serviceType} — Digital Certificate</span>
        </div>
        <div className="grid grid-cols-2 gap-3.5 p-4">
          <CertField label="Certificate No." value={certNoFor(app)} />
          <CertField label="Registration No." value={app.regNo || "—"} />
          <CertField label="Name" value={app.applicantName} />
          <CertField label="Service" value={app.serviceType} />
          <CertField label="Issue Date" value={fmtDate(app.approval?.signedOn)} />
          <CertField label="Approving Authority" value="Registrar, MPSVC (eSigned)" />
        </div>
        <div className="px-4 py-3 flex items-center gap-2.5 border-t" style={{ borderColor: C.line }}>
          <QrCode size={32} color={C.muted} />
          <span className="text-xs" style={{ color: C.muted, fontFamily: F.body }}>Scan to verify on citizen portal · Non-Sealed — Digital Copy</span>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="primary" icon={Printer} onClick={() => printCertificate(app)}>Print / Download</Button>
      </div>
    </Modal>
  );
}
function CertField({ label, value }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wide" style={{ color: C.muted, fontFamily: F.body }}>{label}</p>
      <p className="text-sm font-medium mt-0.5" style={{ color: C.ink, fontFamily: F.body }}>{value}</p>
    </div>
  );
}

/* ============================== CHECKER DASHBOARD ============================== */
// Every row opens the complete application form (ApprovalScreen); it renders read-only
// with an Audit Trail link for any stage other than Pending Approval.
function CheckerDashboard({ apps, onOpenApproval }) {
  const [tab, setTab] = useState("pending");
  const [serviceFilter, setServiceFilter] = useState("all");

  const filteredApps = filterAppsByService(apps, serviceFilter);

  const pending = filteredApps.filter((a) => a.status === ST.FORWARDED);
  const sentBack = filteredApps.filter((a) => a.status === ST.PENDING_SCRUTINY && a.returnedByApproval);
  const approved = filteredApps.filter((a) => [ST.PENDING_DISPATCH, ST.PRINTED_SEALED, ST.DISPATCHED, ST.CLOSED].includes(a.status));

  const tabs = [
    { key: "pending", label: "Pending", count: pending.length },
    { key: "all", label: "All", count: filteredApps.length },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="Approving Authority"
        title="Approving Authority Dashboard"
        subtitle="Review scrutiny outcomes, approve, or send applications back for re-verification."
      />

      <ServiceTypeFilterBar apps={apps} active={serviceFilter} onChange={setServiceFilter} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Pending Approval", value: pending.length, color: C.navy },
          { label: "Sent Back to Scrutiny", value: sentBack.length, color: C.rust },
          { label: "Approved / Issued", value: approved.length, color: C.forest },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border p-4" style={{ borderColor: C.line, background: C.card }}>
            <p className="text-2xl font-semibold" style={{ color: s.color, fontFamily: F.display }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: C.muted, fontFamily: F.body }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border" style={{ borderColor: C.line, background: C.card }}>
        <div className="px-2 pt-2">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>
        <div className="p-4">
          {tab === "pending" && (
            <QueueTable
              emptyLabel="No applications awaiting your approval."
              columns={officeColumns()}
              rows={pending}
              onRowClick={(r) => onOpenApproval(r.id)}
              actions={(r) => <Button size="sm" variant="primary" onClick={() => onOpenApproval(r.id)} icon={Eye}>Review</Button>}
            />
          )}
          {tab === "all" && (
            <QueueTable
              emptyLabel="No applications match your filters."
              columns={officeColumns()}
              rows={filteredApps}
              onRowClick={(r) => onOpenApproval(r.id)}
              actions={(r) => <Button size="sm" variant="primary" onClick={() => onOpenApproval(r.id)} icon={Eye}>Review</Button>}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================== APPLICATION APPROVAL SCREEN (CHECKER) ============================== */
function ApprovalScreen({ app, apps, onBack, onApprove, onSendBack, onReject, onViewHistory, autoOpenCertificate, onAutoOpened }) {
  const [screenTab, setScreenTab] = useState("application");
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [sendBackRemarks, setSendBackRemarks] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [digitalCertOpen, setDigitalCertOpen] = useState(false);

  // The certificate is generated the instant the application is approved — show it
  // immediately rather than making the officer navigate back and reopen the application.
  useEffect(() => {
    if (autoOpenCertificate) {
      setDigitalCertOpen(true);
      onAutoOpened && onAutoOpened();
    }
  }, [autoOpenCertificate]);

  const readOnly = app.status !== ST.FORWARDED;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: C.muted, fontFamily: F.body }}>
        <ArrowLeft size={15} /> Back to dashboard
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: C.seal, fontFamily: F.body }}>Application Approval</p>
          <h1 className="text-2xl flex items-center gap-3 flex-wrap" style={{ color: C.ink, fontFamily: F.display, fontWeight: 600 }}>
            {app.applicantName}
            <span className="text-sm font-normal" style={{ fontFamily: F.mono, color: C.muted }}>{app.id}</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: C.muted, fontFamily: F.body }}>{app.serviceType} · Forwarded by {MAKER_NAME}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={app.status} />
          {app.regNo && (
            <Button variant="ghost" size="sm" icon={ShieldCheck} onClick={() => setDigitalCertOpen(true)}>Certificate</Button>
          )}
          <Button variant="ghost" size="sm" icon={HistoryIcon} onClick={onViewHistory}>Audit Trail</Button>
        </div>
      </div>

      <div className="mb-5">
        <Tabs
          tabs={[
            { key: "application", label: "Application Details" },
            { key: "profile", label: "Applicant Profile" },
          ]}
          active={screenTab}
          onChange={setScreenTab}
        />
      </div>

      {screenTab === "application" ? (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.card }}>
            <FieldGroup icon={IndianRupee} title="Payment Details">
              <Field label="Mode" value={app.mode} />
              <Field label="Amount" value={`₹${app.amount}`} />
              <Field label="Challan / Reference No." value={app.challan} mono />
            </FieldGroup>
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Paperclip size={13} color={C.muted} />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.muted, fontFamily: F.body }}>Documents on file</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {app.documents.map((d) => (
                  <span key={d.fileName} className="text-[11px] rounded px-2 py-1 flex items-center gap-1" style={{ background: C.paperAlt, color: C.inkSoft }}>
                    <FileText size={10} /> {d.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.card }}>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: C.ink, fontFamily: F.body }}>
              <ClipboardCheck size={16} color={C.seal} /> Scrutiny Officer's Verification Notes
            </h3>
            <div className="space-y-2 mb-4">
              {app.checklistDef.map((c) => {
                const checked = app.scrutiny?.checklist?.[c.id];
                return (
                  <div key={c.id} className="flex items-center gap-2.5">
                    {checked ? <BadgeCheck size={16} color={C.forest} /> : <Circle size={16} color={C.line} />}
                    <span className="text-sm" style={{ color: C.ink, fontFamily: F.body }}>{c.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="rounded-md px-3 py-2.5 mb-5" style={{ background: C.paperAlt }}>
              <p className="text-[11px] font-medium mb-1" style={{ color: C.muted, fontFamily: F.body }}>Scrutiny Officer's Remarks</p>
              <p className="text-sm" style={{ color: C.ink, fontFamily: F.body }}>{app.scrutiny?.remarks || "—"}</p>
            </div>

            {!readOnly ? (
              <>
                <label className="text-xs font-medium block mb-1.5" style={{ color: C.inkSoft, fontFamily: F.body }}>Your remarks (optional for approval)</label>
                <textarea
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  rows={3}
                  placeholder="Add any observations before approving…"
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none mb-4"
                  style={{ borderColor: C.line, fontFamily: F.body, color: C.ink }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="forest" icon={Stamp} onClick={() => onApprove(app.id, approvalRemarks)}>Approve</Button>
                  <Button variant="rust" icon={Undo2} onClick={() => setSendBackOpen(true)}>Send Back to Scrutiny Officer</Button>
                  <Button variant="ghost" icon={XCircle} onClick={() => setRejectOpen(true)}>Reject</Button>
                </div>
              </>
            ) : (
              <p className="text-xs rounded-md px-3 py-2" style={{ background: C.paperAlt, color: C.muted, fontFamily: F.body }}>
                {app.approval?.remarks ? `Approving Authority's remarks: "${app.approval.remarks}"` : "This application is read-only at its current stage."}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <ApplicantHistoryPanel apps={apps} app={app} />
          <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.card }}>
            {app.provisionalDetails ? (
              <ProvisionalProfileFields app={app} />
            ) : app.newRegDetails ? (
              <NewRegistrationProfileFields app={app} />
            ) : (
              <>
                <FieldGroup icon={User2Icon} title="Personal Details">
                  <Field label="Full Name" value={app.applicantName} />
                  <Field label="Date of Birth" value={fmtDate(app.dob)} />
                  <Field label="Father's Name" value={app.fatherName} />
                  <Field label="Gender" value={app.gender} />
                  <Field label="Mobile" value={app.mobile} />
                  <Field label="Email" value={app.email} />
                  <Field label="Address" value={app.address} wide />
                </FieldGroup>
                <FieldGroup icon={GraduationCap} title="Qualification & Institution">
                  <Field label="Degree" value={app.degree} />
                  <Field label="Year of Passing" value={app.year} />
                  <Field label="College / Institution" value={app.college} wide />
                </FieldGroup>
              </>
            )}
          </div>
        </>
      )}

      <RemarksModal
        open={sendBackOpen}
        onClose={() => setSendBackOpen(false)}
        title="Send Back to Scrutiny Officer"
        description="The application returns to the Pending at Scrutiny Officer queue for re-verification. Remarks are mandatory."
        actionLabel="Send Back to Scrutiny Officer"
        actionVariant="rust"
        value={sendBackRemarks}
        onChange={setSendBackRemarks}
        onSubmit={() => { onSendBack(app.id, sendBackRemarks); setSendBackOpen(false); }}
      />

      <RemarksModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Application"
        description="This permanently closes the application. Remarks are mandatory and will be visible in the audit trail."
        actionLabel="Reject Application"
        actionVariant="rust"
        value={rejectRemarks}
        onChange={setRejectRemarks}
        onSubmit={() => { onReject(app.id, rejectRemarks); setRejectOpen(false); }}
      />

      <CertificateModal app={app} open={digitalCertOpen} onClose={() => setDigitalCertOpen(false)} />
    </div>
  );
}

/* ============================== CERTIFICATE DISPATCH SCREEN ============================== */
function DispatchScreen({ apps, onMarkPrinted, onMarkDispatched, onOpenHistory }) {
  const [trackingTarget, setTrackingTarget] = useState(null);
  const [trackingNo, setTrackingNo] = useState("");

  const awaitingPrint = apps.filter((a) => a.status === ST.PENDING_DISPATCH);
  const awaitingDispatch = apps.filter((a) => a.status === ST.PRINTED_SEALED);
  const recentlyDispatched = apps
    .filter((a) => a.status === ST.DISPATCHED)
    .sort((a, b) => new Date(b.log[b.log.length - 1].date) - new Date(a.log[a.log.length - 1].date))
    .slice(0, 5);

  const cols = [
    { key: "id", label: "Application ID", render: (r) => <span style={{ fontFamily: F.mono, fontSize: 12.5, color: C.navy }}>{r.id}</span> },
    { key: "applicantName", label: "Applicant" },
    { key: "regNo", label: "Registration No.", render: (r) => <span style={{ fontFamily: F.mono, fontSize: 12.5 }}>{r.regNo || "—"}</span> },
    { key: "address", label: "Dispatch Address" },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="Certificate Dispatch"
        title="Print, Seal & Dispatch Queue"
        subtitle="Physical certificate fulfilment for approved applications, tracked separately from the digital certificate."
      />

      <div className="mb-8">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: C.ink, fontFamily: F.body }}>
          <PackageCheck size={16} color={C.seal} /> Awaiting Print & Seal
        </h3>
        <QueueTable
          emptyLabel="Nothing awaiting printing right now."
          columns={cols}
          rows={awaitingPrint}
          onRowClick={(r) => onOpenHistory(r.id)}
          actions={(r) => <Button size="sm" variant="seal" icon={Printer} onClick={() => onMarkPrinted(r.id)}>Mark Printed & Sealed</Button>}
        />
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: C.ink, fontFamily: F.body }}>
          <Truck size={16} color={C.seal} /> Printed & Sealed — Awaiting Speed Post
        </h3>
        <QueueTable
          emptyLabel="No sealed certificates awaiting dispatch."
          columns={cols}
          rows={awaitingDispatch}
          onRowClick={(r) => onOpenHistory(r.id)}
          actions={(r) => <Button size="sm" variant="forest" icon={Truck} onClick={() => { setTrackingTarget(r); setTrackingNo(""); }}>Dispatched via Speed Post</Button>}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: C.ink, fontFamily: F.body }}>
          <CheckCircle2 size={16} color={C.forest} /> Recently Dispatched
        </h3>
        <QueueTable
          emptyLabel="Nothing dispatched yet."
          columns={[
            { key: "id", label: "Application ID", render: (r) => <span style={{ fontFamily: F.mono, fontSize: 12.5, color: C.navy }}>{r.id}</span> },
            { key: "applicantName", label: "Applicant" },
            { key: "tracking", label: "Speed Post Tracking No.", render: (r) => <span style={{ fontFamily: F.mono, fontSize: 12.5 }}>{r.tracking}</span> },
          ]}
          rows={recentlyDispatched}
          onRowClick={(r) => onOpenHistory(r.id)}
        />
      </div>

      <Modal open={!!trackingTarget} onClose={() => setTrackingTarget(null)} title="Mark Dispatched via Speed Post">
        {trackingTarget && (
          <div>
            <p className="text-sm mb-4" style={{ color: C.muted, fontFamily: F.body }}>
              Once dispatched, the citizen-facing status for <b style={{ color: C.ink }}>{trackingTarget.applicantName}</b> ({trackingTarget.id})
              updates to "Dispatched via Speed Post" with the tracking number visible on the citizen portal.
            </p>
            <label className="text-xs font-medium block mb-1.5" style={{ color: C.inkSoft, fontFamily: F.body }}>
              Speed Post Tracking / Reference No. <span style={{ color: C.rust }}>*</span>
            </label>
            <input
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
              placeholder="e.g. EM123456789IN"
              className="w-full rounded-md border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: C.line, fontFamily: F.mono, color: C.ink }}
            />
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="ghost" onClick={() => setTrackingTarget(null)}>Cancel</Button>
              <Button
                variant="forest"
                icon={Truck}
                disabled={!trackingNo.trim()}
                onClick={() => { onMarkDispatched(trackingTarget.id, trackingNo.trim()); setTrackingTarget(null); }}
              >
                Confirm Dispatch
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================== HISTORY / AUDIT TRAIL SCREEN ============================== */
function roleColor(role) {
  if (role === "maker") return C.seal;
  if (role === "checker") return C.navy;
  return C.muted;
}
function roleLabel(role) {
  if (role === "maker") return "Scrutiny Officer";
  if (role === "checker") return "Approving Authority";
  return "System / Applicant";
}

function HistoryScreen({ app, onBack }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: C.muted, fontFamily: F.body }}>
        <ArrowLeft size={15} /> Back
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: C.seal, fontFamily: F.body }}>Audit Trail</p>
          <h1 className="text-2xl flex items-center gap-3 flex-wrap" style={{ color: C.ink, fontFamily: F.display, fontWeight: 600 }}>
            {app.applicantName}
            <span className="text-sm font-normal" style={{ fontFamily: F.mono, color: C.muted }}>{app.id}</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: C.muted, fontFamily: F.body }}>Complete review log — who acted, when, and remarks at each stage.</p>
        </div>
        <Badge status={app.status} />
      </div>

      <div className="rounded-xl border p-5 mb-6" style={{ borderColor: C.line, background: C.card }}>
        <SealStepper status={app.status} />
      </div>

      {app.certificatePhoto && (
        <div className="rounded-xl border p-5 mb-6" style={{ borderColor: C.line, background: C.card }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 flex-wrap" style={{ color: C.ink, fontFamily: F.body }}>
            <FileImage size={16} color={C.seal} /> Certificate Photo
            <span className="text-[11px] font-normal rounded-full px-2 py-0.5" style={{ background: C.forestSoft, color: C.forest }}>
              Visible to Applicant
            </span>
          </h3>
          <img
            src={app.certificatePhoto}
            alt="Uploaded certificate"
            className="w-full max-w-md max-h-80 object-contain rounded-md border"
            style={{ borderColor: C.line, background: C.paperAlt }}
          />
        </div>
      )}

      <div className="rounded-xl border p-6" style={{ borderColor: C.line, background: C.card }}>
        <div className="relative pl-2">
          {app.log.map((entry, i) => (
            <div key={i} className="relative pl-8 pb-7 last:pb-0">
              {i < app.log.length - 1 && (
                <div className="absolute left-[13px] top-6 bottom-0 w-px" style={{ background: C.line }} />
              )}
              <div
                className="absolute left-0 top-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "#fff", border: `2px solid ${roleColor(entry.role)}` }}
              >
                <Stamp size={13} color={roleColor(entry.role)} />
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-semibold" style={{ color: C.ink, fontFamily: F.body }}>{entry.actor}</span>
                <span className="text-[11px] rounded-full px-2 py-0.5" style={{ background: C.paperAlt, color: roleColor(entry.role), fontFamily: F.body }}>
                  {roleLabel(entry.role)}
                </span>
              </div>
              <p className="text-sm mb-1" style={{ color: C.ink, fontFamily: F.body }}>{entry.action}</p>
              {entry.remarks && (
                <p className="text-sm rounded-md px-3 py-2 inline-block" style={{ background: C.paperAlt, color: C.inkSoft, fontFamily: F.body }}>
                  “{entry.remarks}”
                </p>
              )}
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: C.muted, fontFamily: F.body }}>
                <Calendar size={11} /> {fmtDateTime(entry.date)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================== SEARCH & REPORTS — COLUMN CHOOSER ============================== */
// Optional report columns the user can tick on/off. Ticked columns are appended to the
// results table, in this fixed order. "Name" and "Registration No" are mandatory — they're
// always shown and can't be unticked. Fields with no equivalent in the application data
// model render as "—" so the picker still works even before that data is captured.
const COLUMN_CATALOG = [
  { key: "application_id", label: "Application ID", mandatory: false, defaultOn: false, value: (r) => r.id, render: (r) => <span style={{ fontFamily: F.mono, fontSize: 12.5, color: C.navy }}>{r.id}</span> },
  { key: "type_of_registration", label: "Type Of Registration", mandatory: false, defaultOn: true, render: (r) => r.serviceType },
  { key: "name", label: "Name", mandatory: true, defaultOn: true, render: (r) => r.applicantName },
  { key: "registration_no", label: "Registration No", mandatory: true, defaultOn: true, value: (r) => r.regNo || "—", render: (r) => <span style={{ fontFamily: F.mono, fontSize: 12.5 }}>{r.regNo || "—"}</span> },
  { key: "registration_date", label: "Registration Date", mandatory: false, defaultOn: true, render: (r) => (r.approval?.signedOn ? fmtDate(r.approval.signedOn) : "—") },
  { key: "fathers_name", label: "Father's Name", mandatory: false, defaultOn: true, render: () => "—" },
  { key: "dob", label: "Date of Birth", mandatory: false, defaultOn: false, render: (r) => fmtDate(r.dob) },
  { key: "fax_no", label: "Fax No", mandatory: false, defaultOn: true, render: () => "—" },
  { key: "email_id", label: "Email ID", mandatory: false, defaultOn: true, render: (r) => r.email },
  { key: "university", label: "University", mandatory: false, defaultOn: false, render: (r) => r.college },
  { key: "gender", label: "Gender", mandatory: false, defaultOn: false, render: () => "—" },
  { key: "phone_no", label: "Phone No", mandatory: false, defaultOn: false, render: () => "—" },
  { key: "mobile_no", label: "Mobile No", mandatory: false, defaultOn: false, render: (r) => r.mobile },
  { key: "organization", label: "Orgnaization", mandatory: false, defaultOn: false, render: () => "—" },
  { key: "department", label: "Department", mandatory: false, defaultOn: false, render: () => "—" },
  { key: "designation", label: "Designation", mandatory: false, defaultOn: false, render: () => "—" },
  { key: "college", label: "College", mandatory: false, defaultOn: false, render: (r) => r.college },
  { key: "year_of_passing", label: "Year of Passing", mandatory: false, defaultOn: false, render: (r) => r.year },
  { key: "sector", label: "Sector", mandatory: false, defaultOn: false, render: () => "—" },
  { key: "professional_address", label: "Professional Address", mandatory: false, defaultOn: false, render: () => "—" },
  { key: "permanent_address", label: "Permanent Address", mandatory: false, defaultOn: false, render: () => "—" },
  { key: "preferred_address", label: "Preferred Address", mandatory: false, defaultOn: true, render: (r) => r.address },
  { key: "date_of_last_renewal", label: "Date of last renewal", mandatory: false, defaultOn: true, render: (r) => (r.serviceType === "Renewal" && r.approval?.signedOn ? fmtDate(r.approval.signedOn) : "—") },
  { key: "registration_valid_upto", label: "Registration Valid upto", mandatory: false, defaultOn: false, render: () => "—" },
  { key: "residential_address", label: "Residential Address", mandatory: false, defaultOn: false, render: () => "—" },
  { key: "status", label: "Status", mandatory: false, defaultOn: false, value: (r) => STATUS_META[r.status]?.label || r.status, render: (r) => <Badge status={r.status} /> },
];

// Shows only the columns currently switched on — nothing from the wider catalog is listed
// until the user explicitly adds it via the "Add Column" button.
function ColumnChooser({ selected, onToggle }) {
  const [addOpen, setAddOpen] = useState(false);
  const activeCols = COLUMN_CATALOG.filter((c) => c.mandatory || selected.has(c.key));
  const availableCols = COLUMN_CATALOG.filter((c) => !c.mandatory && !selected.has(c.key));

  return (
    <div className="rounded-xl border p-4 mb-5" style={{ borderColor: C.line, background: C.card }}>
      <div className="flex items-center gap-1.5 mb-3">
        <SlidersHorizontal size={14} color={C.seal} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted, fontFamily: F.body }}>Columns</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
        {activeCols.map((c) => (
          <label
            key={c.key}
            className="flex items-center gap-1.5 text-sm select-none"
            style={{ color: c.mandatory ? C.muted : C.ink, fontFamily: F.body, cursor: c.mandatory ? "default" : "pointer" }}
          >
            <input
              type="checkbox"
              checked
              disabled={c.mandatory}
              onChange={() => onToggle(c.key)}
              style={{ accentColor: C.seal }}
            />
            {c.label}
          </label>
        ))}

        {availableCols.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setAddOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 border hover:opacity-80"
              style={{ borderColor: C.seal, color: C.seal, fontFamily: F.body }}
            >
              <Plus size={12} /> Add Column
            </button>
            {addOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAddOpen(false)} />
                <div
                  className="absolute z-20 mt-2 w-56 max-h-64 overflow-y-auto rounded-md border shadow-lg py-1"
                  style={{ borderColor: C.line, background: "#fff" }}
                >
                  {availableCols.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => { onToggle(c.key); setAddOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-black/[0.03]"
                      style={{ color: C.ink, fontFamily: F.body }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================== SEARCH & REPORTS SCREEN ============================== */
function SearchReportsScreen({ apps, onOpenHistory }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [profileApp, setProfileApp] = useState(null);
  const [selectedCols, setSelectedCols] = useState(
    () => new Set(COLUMN_CATALOG.filter((c) => c.mandatory || c.defaultOn).map((c) => c.key))
  );

  function toggleCol(key) {
    setSelectedCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const counts = useMemo(() => ({
    payment: apps.filter((a) => a.status === ST.PENDING_PAYMENT).length,
    scrutiny: apps.filter((a) => a.status === ST.PENDING_SCRUTINY).length,
    approval: apps.filter((a) => a.status === ST.FORWARDED).length,
    approved: apps.filter((a) => [ST.PENDING_DISPATCH, ST.PRINTED_SEALED].includes(a.status)).length,
    dispatched: apps.filter((a) => a.status === ST.DISPATCHED).length,
    closed: apps.filter((a) => a.status === ST.CLOSED).length,
  }), [apps]);

  const results = useMemo(() => {
    return apps.filter((a) => {
      const text = `${a.id} ${a.applicantName} ${a.regNo || ""}`.toLowerCase();
      if (q && !text.includes(q.toLowerCase())) return false;
      if (status === "approved_group" && ![ST.PENDING_DISPATCH, ST.PRINTED_SEALED].includes(a.status)) return false;
      if (status !== "all" && status !== "approved_group" && a.status !== status) return false;
      if (from && new Date(a.submitted) < new Date(from)) return false;
      if (to && new Date(a.submitted) > new Date(to)) return false;
      return true;
    });
  }, [apps, q, status, from, to]);

  const statCards = [
    { key: ST.PENDING_PAYMENT, label: "Pending Payment Confirmation", value: counts.payment, color: C.rust },
    { key: ST.PENDING_SCRUTINY, label: "Pending at Scrutiny Officer", value: counts.scrutiny, color: C.seal },
    { key: ST.FORWARDED, label: "Pending Approval", value: counts.approval, color: C.navy },
    { key: "approved_group", label: "Approved — Pending Certificate Upload", value: counts.approved, color: C.forest },
    { key: ST.CLOSED, label: "Closed — Certificate Issued", value: counts.closed, color: C.forest },
    { key: ST.DISPATCHED, label: "Dispatched", value: counts.dispatched, color: C.forest },
  ];

  // Plain-text column set shared by both exports — mirrors exactly what's ticked in the
  // Column Chooser. Application ID and Status only appear here once the user selects them.
  const exportCols = COLUMN_CATALOG.filter((c) => c.mandatory || selectedCols.has(c.key))
    .map((c) => ({ label: c.label, value: c.value || c.render }));

  function exportExcel() {
    const escapeCsv = (v) => `"${String(v ?? "—").replace(/"/g, '""')}"`;
    const csv = [
      exportCols.map((c) => escapeCsv(c.label)).join(","),
      ...results.map((r) => exportCols.map((c) => escapeCsv(c.value(r))).join(",")),
    ].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MPSVC_Search_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function printPdf() {
    const win = window.open("", "_blank", "width=1024,height=720");
    if (!win) return; // popup blocked
    const head = exportCols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
    const rows = results
      .map((r) => `<tr>${exportCols.map((c) => `<td>${escapeHtml(c.value(r))}</td>`).join("")}</tr>`)
      .join("");
    win.document.write(`<!doctype html><html><head><title>MPSVC Search & Reports</title><style>
      body{font-family:Arial,sans-serif;color:#20242B;padding:24px;}
      h1{font-size:18px;margin:0 0 2px;}
      p{font-size:11px;color:#666;margin:0 0 16px;}
      table{width:100%;border-collapse:collapse;font-size:11px;}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;white-space:nowrap;}
      th{background:#f2f2f2;}
      @media print{ body{padding:0;} }
    </style></head><body>
      <h1>MPSVC &mdash; Search &amp; Reports</h1>
      <p>Generated ${escapeHtml(fmtDateTime(new Date()))} &middot; ${results.length} record(s)</p>
      <table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Office Overview"
        title="Search & Reports"
        subtitle="Look up any application, or scan current office load at a glance."
        right={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={Printer} disabled={results.length === 0} onClick={printPdf}>Print / PDF</Button>
            <Button variant="ghost" size="sm" icon={FileSpreadsheet} disabled={results.length === 0} onClick={exportExcel}>Export Excel</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-7">
        {statCards.map((s) => (
          <button
            key={s.label}
            onClick={() => setStatus(s.key)}
            className="rounded-lg border p-4 text-left hover:shadow-sm"
            style={{ borderColor: C.line, background: C.card }}
          >
            <p className="text-2xl font-semibold" style={{ color: s.color, fontFamily: F.display }}>{s.value}</p>
            <p className="text-xs mt-1 leading-snug" style={{ color: C.muted, fontFamily: F.body }}>{s.label}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border p-4 mb-5" style={{ borderColor: C.line, background: C.card }}>
        <div className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs font-medium block mb-1.5" style={{ color: C.inkSoft, fontFamily: F.body }}>Application ID / Registration No. / Applicant Name</label>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2" style={{ borderColor: C.line }}>
              <SearchIcon size={15} color={C.muted} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full outline-none text-sm bg-transparent" style={{ fontFamily: F.body, color: C.ink }} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: C.inkSoft, fontFamily: F.body }}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm outline-none" style={{ borderColor: C.line, fontFamily: F.body, color: C.ink }}>
              <option value="all">All statuses</option>
              <option value="approved_group">Approved (pending print/dispatch)</option>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: C.inkSoft, fontFamily: F.body }}>Submitted Date Range</label>
            <div className="flex items-center gap-1.5">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-md border px-2 py-2 text-xs outline-none" style={{ borderColor: C.line, fontFamily: F.body, color: C.ink }} />
              <span style={{ color: C.muted }}>–</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-md border px-2 py-2 text-xs outline-none" style={{ borderColor: C.line, fontFamily: F.body, color: C.ink }} />
            </div>
          </div>
        </div>
      </div>

      <ColumnChooser selected={selectedCols} onToggle={toggleCol} />

      <QueueTable
        emptyLabel="No applications match your filters."
        columns={COLUMN_CATALOG.filter((c) => c.mandatory || selectedCols.has(c.key)).map((c) => ({ key: c.key, label: c.label, render: c.render }))}
        rows={results}
        onRowClick={(r) => onOpenHistory(r.id)}
        actions={(r) => (
          <div className="inline-flex items-center gap-2">
            <Button size="sm" variant="ghost" icon={User2Icon} onClick={() => setProfileApp(r)}>Applicant Profile</Button>
            <Button size="sm" variant="ghost" icon={HistoryIcon} onClick={() => onOpenHistory(r.id)}>Audit Trail</Button>
          </div>
        )}
      />

      <Modal
        open={!!profileApp}
        onClose={() => setProfileApp(null)}
        title={profileApp ? `${profileApp.applicantName} — Applicant Profile` : ""}
        width={640}
      >
        {profileApp && (
          <div>
            <ApplicantHistoryPanel apps={apps} app={profileApp} />
            <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.card }}>
              {profileApp.provisionalDetails ? (
                <ProvisionalProfileFields app={profileApp} />
              ) : profileApp.newRegDetails ? (
                <NewRegistrationProfileFields app={profileApp} />
              ) : (
                <>
                  <FieldGroup icon={User2Icon} title="Personal Details">
                    <Field label="Full Name" value={profileApp.applicantName} />
                    <Field label="Date of Birth" value={fmtDate(profileApp.dob)} />
                    <Field label="Father's Name" value={profileApp.fatherName} />
                    <Field label="Gender" value={profileApp.gender} />
                    <Field label="Mobile" value={profileApp.mobile} />
                    <Field label="Email" value={profileApp.email} />
                    <Field label="Address" value={profileApp.address} wide />
                  </FieldGroup>
                  <FieldGroup icon={GraduationCap} title="Qualification & Institution">
                    <Field label="Degree" value={profileApp.degree} />
                    <Field label="Year of Passing" value={profileApp.year} />
                    <Field label="College / Institution" value={profileApp.college} wide />
                  </FieldGroup>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================== ROOT APP ============================== */
export default function MPSVCBackOffice() {
  const [session, setSession] = useState(null);
  const [screen, setScreen] = useState("login");
  const [activeId, setActiveId] = useState(null);
  const [historyReturnScreen, setHistoryReturnScreen] = useState("dashboard");
  const [apps, setApps] = useState(SEED_APPS);
  const [toast, setToast] = useState(null);
  const [certReadyId, setCertReadyId] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  function notify(message, type = "success") { setToast({ message, type }); }

  function updateApp(id, updater) {
    setApps((prev) => prev.map((a) => (a.id === id ? updater(a) : a)));
  }
  function pushLog(app, e) { return { ...app, log: [...app.log, e] }; }

  function handleLogin(role) {
    setSession(role === "maker" ? { role, name: MAKER_NAME, desig: MAKER_DESIG } : { role, name: CHECKER_NAME, desig: CHECKER_DESIG });
    setScreen("dashboard");
  }
  function handleLogout() { setSession(null); setScreen("login"); setActiveId(null); }

  function handleNav(key) { setScreen(key); setActiveId(null); }

  function openReview(id) { setActiveId(id); setScreen("review"); }
  function openApproval(id) { setActiveId(id); setScreen("approval"); }
  function openHistory(id, from) { setActiveId(id); setHistoryReturnScreen(from || screen); setScreen("history"); }

  function confirmPayment(id) {
    updateApp(id, (a) => pushLog(
      { ...a, status: ST.PENDING_SCRUTINY },
      entry(session.name, "maker", `Confirmed offline payment receipt (Challan ${a.challan})`, new Date().toISOString())
    ));
    notify("Payment confirmed. Application moved to Pending at Scrutiny Officer.");
    setScreen("dashboard"); setActiveId(null);
  }

  function declinePayment(id, remarks) {
    updateApp(id, (a) => pushLog(
      { ...a, status: ST.REJECTED },
      entry(session.name, "maker", "Payment declined — application rejected", new Date().toISOString(), remarks)
    ));
    notify("Payment declined. Application rejected.", "error");
    setScreen("dashboard"); setActiveId(null);
  }

  function closeApplicationWithCertificate(id, dataUrl) {
    updateApp(id, (a) => pushLog(
      { ...a, certificatePhoto: dataUrl, status: ST.CLOSED },
      entry(session.name, "maker", "Uploaded certificate photo and closed the application — certificate now visible to the applicant on the citizen portal", new Date().toISOString())
    ));
    notify("Certificate photo uploaded. Application closed.");
    setScreen("dashboard"); setActiveId(null);
  }

  function forwardToApproval(id, { checklist, remarks }) {
    updateApp(id, (a) => pushLog(
      { ...a, status: ST.FORWARDED, returnedByApproval: false, scrutiny: { checklist, remarks } },
      entry(session.name, "maker", "Verification completed and forwarded to Approving Authority", new Date().toISOString(), remarks)
    ));
    notify("Application forwarded to the Approving Authority.");
    setScreen("dashboard"); setActiveId(null);
  }

  function returnToApplicant(id, remarks) {
    updateApp(id, (a) => pushLog(
      { ...a, status: ST.SENT_BACK_APPLICANT },
      entry(session.name, "maker", "Returned to applicant for correction", new Date().toISOString(), remarks)
    ));
    notify("Application returned to the applicant for correction.");
    setScreen("dashboard"); setActiveId(null);
  }

  function approveAndSign(id, remarks) {
    updateApp(id, (a) => {
      const regNo = a.regNo || `MPVC/2026/0${1030 + Math.floor(Math.random() * 900)}`;
      let updated = { ...a, status: ST.PENDING_DISPATCH, regNo, approval: { remarks, signedOn: new Date().toISOString() } };
      updated = pushLog(updated, entry(session.name, "checker", "Approved. Digital certificate generated and published to citizen portal.", new Date().toISOString(), remarks));
      updated = pushLog(updated, entry("System", "system", "Pending Print & Dispatch task created for sealed physical certificate", new Date().toISOString()));
      return updated;
    });
    notify("Application approved. Digital certificate published; Print & Dispatch task created for the sealed physical certificate.");
    // Stay on this application's screen (rather than bouncing back to the dashboard) so
    // the newly generated certificate can be shown immediately — see certReadyId below.
    setCertReadyId(id);
  }

  function sendBackToScrutiny(id, remarks) {
    updateApp(id, (a) => pushLog(
      { ...a, status: ST.PENDING_SCRUTINY, returnedByApproval: true },
      entry(session.name, "checker", "Sent back to Scrutiny Officer", new Date().toISOString(), remarks)
    ));
    notify("Application sent back to the Scrutiny Officer.");
    setScreen("dashboard"); setActiveId(null);
  }

  function rejectApp(id, remarks) {
    updateApp(id, (a) => pushLog(
      { ...a, status: ST.REJECTED },
      entry(session.name, "checker", "Application rejected", new Date().toISOString(), remarks)
    ));
    notify("Application rejected.", "error");
    setScreen("dashboard"); setActiveId(null);
  }

  function markPrinted(id) {
    updateApp(id, (a) => pushLog({ ...a, status: ST.PRINTED_SEALED }, entry(session.name, "checker", "Marked Printed & Sealed", new Date().toISOString())));
    notify("Marked as printed & sealed.");
  }
  function markDispatched(id, tracking) {
    updateApp(id, (a) => pushLog({ ...a, status: ST.DISPATCHED, tracking }, entry(session.name, "checker", `Dispatched via Speed Post (${tracking})`, new Date().toISOString())));
    notify("Dispatched. Citizen portal now shows the Speed Post tracking number.");
  }

  const activeApp = apps.find((a) => a.id === activeId);

  if (!session) return <LoginScreen onLogin={handleLogin} />;

  let content;
  if (screen === "review" && activeApp) {
    content = (
      <ReviewScreen
        app={activeApp}
        apps={apps}
        onBack={() => { setScreen("dashboard"); setActiveId(null); }}
        onForward={forwardToApproval}
        onReturn={returnToApplicant}
        onConfirmPayment={confirmPayment}
        onDeclinePayment={declinePayment}
        onCloseApplication={closeApplicationWithCertificate}
        onViewHistory={() => openHistory(activeApp.id, "review")}
      />
    );
  } else if (screen === "approval" && activeApp) {
    content = (
      <ApprovalScreen
        app={activeApp}
        apps={apps}
        onBack={() => { setScreen("dashboard"); setActiveId(null); }}
        onApprove={approveAndSign}
        onSendBack={sendBackToScrutiny}
        onReject={rejectApp}
        onViewHistory={() => openHistory(activeApp.id, "approval")}
        autoOpenCertificate={certReadyId === activeApp.id}
        onAutoOpened={() => setCertReadyId(null)}
      />
    );
  } else if (screen === "history" && activeApp) {
    content = <HistoryScreen app={activeApp} onBack={() => setScreen(historyReturnScreen)} />;
  } else if (screen === "dispatch") {
    content = <DispatchScreen apps={apps} onMarkPrinted={markPrinted} onMarkDispatched={markDispatched} onOpenHistory={(id) => openHistory(id, "dispatch")} />;
  } else if (screen === "search") {
    content = <SearchReportsScreen apps={apps} onOpenHistory={(id) => openHistory(id, "search")} />;
  } else {
    content = session.role === "maker"
      ? <MakerDashboard apps={apps} onOpenReview={openReview} onNav={handleNav} />
      : <CheckerDashboard apps={apps} onOpenApproval={openApproval} />;
  }

  return (
    <Shell session={session} screen={screen} onNav={handleNav} onLogout={handleLogout}>
      {content}
      <Toast toast={toast} />
    </Shell>
  );
}
