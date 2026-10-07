import { useEffect, useRef, useState } from "react"
import { analyzeWithAI } from "./lib/ai"
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CloudUpload,
  FileText,
  LayoutDashboard,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react"
import {
  analyzeResume,
  extractResume,
  jobs,
  matchScore,
  type Analysis,
  type Job,
} from "./lib/resume"

type Page = "Overview" | "Resume analyzer" | "Job matches" | "Saved jobs"
const navItems = [
  { label: "Overview" as Page, icon: LayoutDashboard },
  { label: "Resume analyzer" as Page, icon: FileText },
  { label: "Job matches" as Page, icon: BriefcaseBusiness },
  { label: "Saved jobs" as Page, icon: Bookmark },
]

function CompanyLogo({ job }: { job: Job }) {
  return (
    <div className={`company-logo ${job.company.toLowerCase()}`}>
      {job.mark === "linear" ? (
        <span className="linear-mark" />
      ) : job.mark === "triangle" ? (
        <span className="triangle-mark" />
      ) : job.mark === "asana" ? (
        <span className="asana-mark">
          ●<br />● ●
        </span>
      ) : (
        job.mark
      )}
    </div>
  )
}

function ScoreRing({
  score,
  small = false,
}: {
  score: number
  small?: boolean
}) {
  return (
    <div className={`score-ring ${small ? "small" : ""}`}>
      <svg
        viewBox="0 0 120 120"
        aria-label={`Resume score ${score} out of 100`}
      >
        <circle cx="60" cy="60" r="51" className="ring-track" />
        <circle
          cx="60"
          cy="60"
          r="51"
          className="ring-value"
          strokeDasharray={`${(score / 100) * 320.44} 320.44`}
        />
      </svg>
      <div>
        <strong>{score}</strong>
        <span>out of 100</span>
      </div>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>("Overview")
  const [mobileMenu, setMobileMenu] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [keyDraft, setKeyDraft] = useState("")
  const [aiConsent, setAiConsent] = useState(false)
  const [filename, setFilename] = useState("")
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState<number[]>(() => {
    try {
      const value = JSON.parse(localStorage.getItem("careerLens-saved") || "[]")
      return Array.isArray(value)
        ? value.filter((id) => typeof id === "number")
        : []
    } catch {
      return []
    }
  })
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("All jobs")
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [modal, setModal] =
    useState<"help" | "notifications" | "report" | "ai" | null>(null)
  const [toast, setToast] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const modalOpen = !!selectedJob || !!modal

  useEffect(() => {
    localStorage.setItem("careerLens-saved", JSON.stringify(saved))
  }, [saved])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(""), 3000)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if (modalOpen) dialogRef.current?.showModal()
    else dialogRef.current?.close()
  }, [modalOpen])

  const navigate = (next: Page) => {
    setPage(next)
    setMobileMenu(false)
    setQuery("")
    setFilter("All jobs")
  }
  const toggleSave = (id: number) => {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
    setToast(
      saved.includes(id)
        ? "Job removed from your saved list"
        : "Job saved for later",
    )
  }
  async function upload(file?: File) {
    if (!file || busy) return
    setError("")
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) {
      setError("Please upload a PDF, DOCX, or TXT file.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("This file is too large. Please upload a resume under 10 MB.")
      return
    }
    setBusy(true)
    try {
      const text = await extractResume(file)
      if (text.trim().length < 80)
        throw new Error(
          "We couldn't find enough text. For scanned PDFs, export a text-based PDF or upload a DOCX/TXT file.",
        )
      setAnalysis(
        apiKey ? await analyzeWithAI(text, apiKey) : analyzeResume(text),
      )
      setFilename(file.name)
      setToast("Your resume analysis is ready")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't read this file. Please try another resume.",
      )
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  const rankedJobs = [...jobs].sort((a, b) =>
    analysis
      ? matchScore(b, analysis.skills) - matchScore(a, analysis.skills)
      : 0,
  )
  const visibleJobs = rankedJobs.filter(
    (job) =>
      (page !== "Saved jobs" || saved.includes(job.id)) &&
      (filter === "All jobs" || job.mode === filter) &&
      `${job.title} ${job.company} ${job.skills.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  const closeModal = () => {
    setSelectedJob(null)
    setModal(null)
  }
  const downloadReport = () => {
    if (!analysis) return
    const content = `careerLens Resume Report\n${filename}\n\n${
      analysis.source === "ai"
        ? "AI-powered analysis (OpenAI)"
        : "Local preview analysis"
    } — not a hiring prediction.\nResume score: ${analysis.score}/100\n\n${analysis.summary}\n\nSkills: ${analysis.skills.join(", ")}\n\n${analysis.checks.map((c) => `${c.passed ? "PASS" : "IMPROVE"}: ${c.label}${c.passed ? "" : `\n${c.suggestion}`}`).join("\n\n")}`
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "careerLens-resume-report.txt"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "is-open" : ""}`}>
        <a
          href="#"
          className="brand"
          onClick={(event) => {
            event.preventDefault()
            navigate("Overview")
          }}
        >
          <span className="brand-symbol">
            <span />
            <span />
            <span />
          </span>
          career<span className="brand-lens">Lens</span>
          <span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${page === label ? "active" : ""}`}
              onClick={() => navigate(label)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === "Job matches" && (
                <span className="nav-count">{jobs.length}</span>
              )}
              {label === "Saved jobs" && saved.length > 0 && (
                <span className="nav-count">{saved.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="little-help">
            <span className="help-spark">
              <Sparkles size={23} />
            </span>
            <h3>
              A little clarity.
              <br />A big next step.
            </h3>
            <p>
              Your potential is more than
              <br />a page. Let’s uncover it.
            </p>
            <button onClick={() => fileInput.current?.click()}>
              Analyze my resume <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="help-link" onClick={() => setModal("help")}>
            <CircleHelp size={18} /> Help & getting started{" "}
            <ArrowUpRight size={15} />
          </button>
          <div className="profile">
            <span className="avatar">Y</span>
            <div>
              <strong>Your workspace</strong>
              <span>Personal account</span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle icon-button"
              aria-label="Open navigation"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button ai-toggle"
              aria-label="AI settings"
              onClick={() => setModal("ai")}
            >
              <Sparkles size={18} />
            </button>
            <span className="ai-status">
              <span /> Your career copilot
            </span>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => setModal("notifications")}
            >
              <Bell size={19} />
              <span />
            </button>
            <button
              className="top-avatar"
              aria-label="About your workspace"
              onClick={() => setModal("help")}
            >
              Y
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> A LITTLE CLARITY, A LOT OF POSSIBILITY
              </div>
              <h1>
                {page === "Overview"
                  ? "Your next chapter starts here."
                  : page === "Resume analyzer"
                    ? "Make your experience stand out."
                    : page === "Job matches"
                      ? "Find your kind of opportunity."
                      : "Good things, kept for later."}
              </h1>
              <p>
                {page === "Overview"
                  ? "Discover your strengths. Find your fit. Move forward with confidence."
                  : page === "Resume analyzer"
                    ? "Turn your resume into a clearer picture of your potential."
                    : page === "Job matches"
                      ? "Explore roles that connect your skills with your next big step."
                      : "Your shortlist of possibilities, all in one place."}
              </p>
            </div>
            <button className="powered-badge" onClick={() => setModal("ai")}>
              <Sparkles size={14} />{" "}
              {apiKey ? "AI enabled · Settings" : "Connect your AI"}{" "}
              <ArrowUpRight size={12} />
            </button>
          </div>
          {page === "Overview" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-label">
                    <Sparkles size={14} /> BUILT AROUND YOU
                  </span>
                  <h2>
                    Big ambitions.
                    <br />
                    Better possibilities.
                  </h2>
                  <p>
                    Your experience has a story to tell. Get resume
                    <br className="desktop-break" /> insights and find
                    opportunities that feel like you.
                  </p>
                  <button
                    className="dark-button"
                    onClick={() => fileInput.current?.click()}
                  >
                    Let’s find your next move <ArrowUpRight size={17} />
                  </button>
                  <div className="hero-note">
                    <ShieldCheck size={13} /> You control your data. Always.
                  </div>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <span className="art-star star-one">✦</span>
                  <span className="art-star star-two">✦</span>
                  <div className="floating-tag potential">
                    <span className="tag-icon">
                      <TrendingUp size={16} />
                    </span>
                    So much potential.
                  </div>
                  <div className="resume-illustration">
                    <div className="paper-top">
                      <div className="paper-avatar">
                        <span />
                      </div>
                      <div>
                        <div className="paper-line name-line" />
                        <div className="paper-line short-line" />
                      </div>
                      <span className="paper-spark">
                        <Sparkles size={21} />
                      </span>
                    </div>
                    <div className="paper-rule" />
                    <div className="paper-line heading-line" />
                    <div className="paper-line" />
                    <div className="paper-line medium-line" />
                    <div className="paper-line" />
                    <div className="paper-line heading-line second-heading" />
                    <div className="paper-line" />
                    <div className="paper-line medium-line" />
                    <div className="paper-chips">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span className="paper-check">
                      <Check size={25} strokeWidth={3} />
                    </span>
                  </div>
                  <div className="floating-tag match">
                    <span className="match-dot" />
                    <span>Made for your next move</span>
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              </section>
              <section className="metrics" aria-label="Your career overview">
                <div className="metric">
                  <span className="metric-icon lilac">
                    <FileText size={21} />
                  </span>
                  <div>
                    <span className="metric-label">Your resume score</span>
                    <div className="metric-value">
                      {analysis ? analysis.score : "—"}
                      <small>/ 100</small>
                    </div>
                  </div>
                  <span className={`metric-foot ${analysis ? "good" : ""}`}>
                    {analysis ? "Analysis ready" : "Let’s discover it"}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-icon yellow">
                    <BriefcaseBusiness size={21} />
                  </span>
                  <div>
                    <span className="metric-label">
                      Opportunities to explore
                    </span>
                    <div className="metric-value">
                      {jobs.length}
                      <small>curated roles</small>
                    </div>
                  </div>
                  <span className="metric-foot good">
                    <ArrowUpRight size={13} /> Find your fit
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-icon mint">
                    <Zap size={21} />
                  </span>
                  <div>
                    <span className="metric-label">Your standout skills</span>
                    <div className="metric-value">
                      {analysis ? analysis.skills.length : "—"}
                      <small>skills identified</small>
                    </div>
                  </div>
                  <span className="metric-foot">
                    {analysis ? "From your resume" : "Uniquely yours"}
                  </span>
                </div>
              </section>
            </>
          )}
          {(page === "Overview" || page === "Resume analyzer") && (
            <section className="analysis-grid">
              <div className="panel upload-panel">
                <div className="section-heading">
                  <div className="heading-with-icon">
                    <span className="section-icon">
                      <FileText size={17} />
                    </span>
                    <h2>
                      {analysis
                        ? "Your resume, in focus"
                        : "Start with your story"}
                    </h2>
                  </div>
                  <span className="step-pill">
                    {analysis ? "ANALYSIS READY" : "STEP 01"}
                  </span>
                </div>
                <p className="section-description">
                  {analysis
                    ? `${filename} · Ready for your next step`
                    : "Upload your resume. We’ll connect the dots."}
                </p>
                <div
                  className={`dropzone ${dragging ? "dragging" : ""} ${
                    busy ? "analyzing" : ""
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault()
                    setDragging(false)
                    void upload(event.dataTransfer.files[0])
                  }}
                >
                  <div className="upload-icon">
                    {busy ? (
                      <Sparkles size={28} className="spin" />
                    ) : analysis ? (
                      <CheckCheck size={28} />
                    ) : (
                      <CloudUpload size={28} />
                    )}
                  </div>
                  <h3>
                    {busy
                      ? "Connecting the dots…"
                      : dragging
                        ? "Drop your next chapter here"
                        : analysis
                          ? "Your resume is ready to shine"
                          : "Drop your resume right here"}
                  </h3>
                  <p>
                    {busy ? (
                      "Reading your experience and finding your strengths"
                    ) : analysis ? (
                      "Upload a new version whenever you’re ready"
                    ) : (
                      <>
                        or{" "}
                        <button
                          className="inline-link"
                          disabled={busy}
                          onClick={() => fileInput.current?.click()}
                        >
                          browse files
                        </button>{" "}
                        to get started
                      </>
                    )}
                  </p>
                  <span className="file-formats">
                    PDF, DOCX or TXT <span>•</span> Up to 10 MB
                  </span>
                  {analysis && !busy && (
                    <button
                      className="secondary-button replace-button"
                      onClick={() => fileInput.current?.click()}
                    >
                      Upload another resume <CloudUpload size={14} />
                    </button>
                  )}
                </div>
                {error && (
                  <p className="error-message" role="alert">
                    {error}
                  </p>
                )}
                <div className="privacy-note">
                  <ShieldCheck size={14} />
                  <span>
                    {apiKey
                      ? "AI enabled: extracted resume text is sent to OpenAI for analysis."
                      : "Only you can see your resume. Processed privately in your browser."}
                  </span>
                </div>
              </div>
              <div className="panel insight-panel">
                <div className="section-heading">
                  <div className="heading-with-icon">
                    <span className="section-icon spark-icon">
                      <Sparkles size={17} />
                    </span>
                    <h2>A clearer picture</h2>
                  </div>
                  <span className="preview-pill">
                    {analysis
                      ? analysis.source === "ai"
                        ? "AI ANALYSIS"
                        : "LOCAL ANALYSIS"
                      : "SNEAK PEEK"}
                  </span>
                </div>
                <div className="score-content">
                  <ScoreRing score={analysis?.score ?? 82} />
                  <div>
                    <span className="score-kicker">RESUME STRENGTH</span>
                    <h3>
                      {analysis
                        ? analysis.score >= 75
                          ? "Looking good!"
                          : "Room to grow."
                        : "Your potential, decoded."}
                    </h3>
                    <p>
                      {analysis
                        ? `${analysis.checks.filter((c) => c.passed).length} of 6 resume checks passed.`
                        : "A little insight goes a long way.\nSee what’s working—and what’s next."}
                    </p>
                    <span className="strength-badge">
                      {analysis
                        ? analysis.score >= 75
                          ? "Strong foundation"
                          : "Let’s make it stronger"
                        : "Example analysis"}
                      <TrendingUp size={12} />
                    </span>
                  </div>
                </div>
                <div className="insight-divider" />
                <div className="insight-checks">
                  {(analysis
                    ? analysis.checks
                        .slice(0, 2)
                        .map((c) => ({ label: c.label, passed: c.passed }))
                    : [
                        {
                          label: "Discover your standout skills",
                          passed: true,
                        },
                        { label: "Get actionable resume tips", passed: true },
                      ]
                  ).map((item) => (
                    <div key={item.label}>
                      <span
                        className={`check-circle ${
                          !item.passed ? "needs-work" : ""
                        }`}
                      >
                        {item.passed ? (
                          <Check size={12} />
                        ) : (
                          <TrendingUp size={12} />
                        )}
                      </span>
                      {item.label}
                    </div>
                  ))}
                </div>
                <button
                  className="text-button insight-link"
                  onClick={() =>
                    analysis ? setModal("report") : fileInput.current?.click()
                  }
                >
                  {analysis
                    ? "Explore your full analysis"
                    : "Unlock your resume insights"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </section>
          )}
          {page === "Resume analyzer" && analysis && (
            <section className="panel full-analysis">
              <div className="section-heading">
                <h2>Your strengths & next steps</h2>
                <button className="secondary-button" onClick={downloadReport}>
                  <ArrowDownToLine size={15} /> Download report
                </button>
              </div>
              <p>{analysis.summary}</p>
              <div className="skill-tags">
                {analysis.skills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
              <div className="checklist-grid">
                {analysis.checks.map((check) => (
                  <div className="checklist-item" key={check.label}>
                    <span
                      className={`check-circle ${
                        !check.passed ? "needs-work" : ""
                      }`}
                    >
                      {check.passed ? (
                        <Check size={14} />
                      ) : (
                        <TrendingUp size={14} />
                      )}
                    </span>
                    <div>
                      <strong>{check.label}</strong>
                      <p>
                        {check.passed
                          ? "Found in your resume. You’re on the right track."
                          : check.suggestion}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="local-disclaimer">
                {analysis.source === "ai"
                  ? "AI-generated feedback may contain mistakes. Review suggestions before editing your resume."
                  : "Local preview uses keyword and structure checks, not an AI model."}{" "}
                Scores are guidance, not hiring predictions.
              </p>
            </section>
          )}
          {page !== "Resume analyzer" && (
            <section className="jobs-section">
              <div className="jobs-heading">
                <div>
                  <div className="title-with-badge">
                    <h2>
                      {page === "Saved jobs"
                        ? "Your saved opportunities"
                        : "A good fit looks like this"}
                    </h2>
                    {page !== "Saved jobs" && (
                      <span className="for-you-badge">
                        <Sparkles size={11} /> FOR YOU
                      </span>
                    )}
                  </div>
                  <p>
                    {analysis
                      ? "Ranked by the skills in your resume. Your next move could be right here."
                      : "A few possibilities to get you inspired. Upload a resume for your skill matches."}
                  </p>
                </div>
                {page === "Overview" && (
                  <button
                    className="text-button"
                    onClick={() => navigate("Job matches")}
                  >
                    Explore all jobs <ArrowRight size={15} />
                  </button>
                )}
              </div>
              <div className="jobs-toolbar">
                <div className="filter-tabs">
                  {["All jobs", "Remote", "Hybrid"].map((label) => (
                    <button
                      className={filter === label ? "selected" : ""}
                      key={label}
                      onClick={() => setFilter(label)}
                    >
                      {label}
                      {label === "All jobs" && (
                        <span>
                          {page === "Saved jobs" ? saved.length : jobs.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="jobs-controls">
                  <label className="job-search">
                    <Search size={15} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Find a role or skill…"
                      aria-label="Search jobs"
                    />
                  </label>
                  <span className="sort-label">
                    {analysis ? "Best match" : "Recommended"}
                    <ChevronDown size={13} />
                  </span>
                </div>
              </div>
              <div className="job-grid">
                {visibleJobs
                  .slice(0, page === "Overview" ? 3 : undefined)
                  .map((job) => (
                    <article className={`job-card ${job.color}`} key={job.id}>
                      <div className="job-card-top">
                        <CompanyLogo job={job} />
                        <span className="job-match">
                          {analysis ? (
                            <>
                              <Target size={12} />{" "}
                              {matchScore(job, analysis.skills)}% skill match
                            </>
                          ) : (
                            <>
                              <Sparkles size={12} /> Curated for you
                            </>
                          )}
                        </span>
                        <button
                          className={`save-button ${
                            saved.includes(job.id) ? "saved" : ""
                          }`}
                          aria-label={`${
                            saved.includes(job.id) ? "Unsave" : "Save"
                          } ${job.title} at ${job.company}`}
                          aria-pressed={saved.includes(job.id)}
                          onClick={() => toggleSave(job.id)}
                        >
                          <Bookmark
                            size={17}
                            fill={
                              saved.includes(job.id) ? "currentColor" : "none"
                            }
                          />
                        </button>
                      </div>
                      <h3>{job.title}</h3>
                      <div className="company-name">
                        {job.company}
                        <span className="verified">
                          <Check size={8} strokeWidth={3} />
                        </span>
                      </div>
                      <div className="job-location">
                        <MapPin size={13} />
                        {job.location}
                        <span>•</span>
                        {job.mode}
                      </div>
                      <div className="job-tags">
                        {job.skills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className={
                              analysis?.skills.includes(skill)
                                ? "matched-skill"
                                : ""
                            }
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                      <div className="job-card-footer">
                        <div>
                          <strong>{job.salary}</strong>
                          <span> / year</span>
                        </div>
                        <button onClick={() => setSelectedJob(job)}>
                          View role <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
              {visibleJobs.length === 0 && (
                <div className="empty-state">
                  <Bookmark size={29} />
                  <h3>
                    {page === "Saved jobs" && !saved.length
                      ? "Your next move deserves a shortlist."
                      : "No roles found just yet."}
                  </h3>
                  <p>
                    {page === "Saved jobs" && !saved.length
                      ? "Tap the bookmark on any job to save it here."
                      : "Try a different keyword or choose All jobs."}
                  </p>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      if (page === "Saved jobs" && !saved.length)
                        navigate("Job matches")
                      else {
                        setQuery("")
                        setFilter("All jobs")
                      }
                    }}
                  >
                    {page === "Saved jobs" && !saved.length
                      ? "Explore job matches"
                      : "Clear filters"}
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </section>
          )}
          <footer className="page-footer">
            <span>
              <span className="footer-spark">✦</span> A clearer view of what’s
              next.
            </span>
            <span>Made for your potential, not just your resume.</span>
          </footer>
        </main>
      </div>
      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        tabIndex={-1}
        accept=".pdf,.docx,.txt"
        onChange={(event) => void upload(event.target.files?.[0])}
        aria-label="Upload your resume"
      />
      {toast && (
        <div className="toast" role="status">
          <span className="check-circle">
            <Check size={13} />
          </span>
          {toast}
        </div>
      )}
      <dialog
        ref={dialogRef}
        className="dialog"
        onCancel={closeModal}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeModal()
        }}
      >
        <div className="dialog-inner">
          <button
            className="dialog-close icon-button"
            aria-label="Close dialog"
            onClick={closeModal}
          >
            <X size={21} />
          </button>
          {selectedJob && (
            <>
              <div className="dialog-job-heading">
                <CompanyLogo job={selectedJob} />
                <span className="preview-pill">CURATED SAMPLE ROLE</span>
              </div>
              <h2>{selectedJob.title}</h2>
              <p className="dialog-subtitle">
                {selectedJob.company} · {selectedJob.location} ·{" "}
                {selectedJob.mode}
              </p>
              <div className="dialog-salary">
                {selectedJob.salary} <span>/ year · illustrative range</span>
              </div>
              <h3>A little about the role</h3>
              <p>{selectedJob.description}</p>
              <h3>What you’d bring</h3>
              <div className="skill-tags">
                {selectedJob.skills.map((skill) => (
                  <span
                    key={skill}
                    className={
                      analysis?.skills.includes(skill) ? "matched-skill" : ""
                    }
                  >
                    {skill}
                    {analysis?.skills.includes(skill) && <Check size={12} />}
                  </span>
                ))}
              </div>
              {analysis && (
                <p className="match-explanation">
                  Your resume includes{" "}
                  {
                    selectedJob.skills.filter((s) =>
                      analysis.skills.includes(s),
                    ).length
                  }{" "}
                  of this role’s {selectedJob.skills.length} listed skills.
                  Skill overlap is only one part of job fit.
                </p>
              )}
              <div className="dialog-actions">
                <a
                  className="dark-button"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(`${selectedJob.title} ${selectedJob.company}`)}`}
                >
                  Find live openings <ArrowUpRight size={16} />
                </a>
                <button
                  className="secondary-button"
                  onClick={() => toggleSave(selectedJob.id)}
                >
                  <Bookmark size={15} />
                  {saved.includes(selectedJob.id) ? "Saved" : "Save role"}
                </button>
              </div>
              <p className="local-disclaimer">
                Sample opportunities, not verified vacancies. Check current
                openings and compensation on the employer’s careers page.
              </p>
            </>
          )}
          {modal === "help" && (
            <>
              <span className="modal-icon">
                <Sparkles size={25} />
              </span>
              <h2>A clearer view of your next step.</h2>
              <p>
                careerLens helps you understand your resume and explore roles
                that match your skills.
              </p>
              <div className="help-steps">
                <div>
                  <span>01</span>
                  <div>
                    <h3>Tell your story</h3>
                    <p>
                      Upload a text-based PDF, DOCX, or TXT resume up to 10 MB.
                    </p>
                  </div>
                </div>
                <div>
                  <span>02</span>
                  <div>
                    <h3>Discover your strengths</h3>
                    <p>
                      Get a resume checklist, identified skills, and actionable
                      improvements.
                    </p>
                  </div>
                </div>
                <div>
                  <span>03</span>
                  <div>
                    <h3>Explore your possibilities</h3>
                    <p>
                      Find skill-matched sample roles, save favorites, and
                      search live openings.
                    </p>
                  </div>
                </div>
              </div>
              <div className="help-privacy">
                <ShieldCheck size={20} />
                <p>
                  Local preview runs in your browser without uploading your
                  resume. For real AI feedback, connect your own OpenAI API key
                  in AI settings. AI mode sends extracted resume text to OpenAI
                  with your consent. Your key stays in memory for this session;
                  saved job IDs stay on this device.
                </p>
              </div>
              <button
                className="dark-button"
                onClick={() => {
                  closeModal()
                  fileInput.current?.click()
                }}
              >
                Let’s get started <ArrowRight size={16} />
              </button>
            </>
          )}
          {modal === "notifications" && (
            <>
              <span className="modal-icon">
                <Bell size={24} />
              </span>
              <h2>You’re all caught up.</h2>
              <p>
                {analysis
                  ? "Your latest resume analysis is ready. Explore your strengths and discover your skill matches."
                  : "Your next chapter is waiting. Upload a resume to get your first analysis and personalized skill matches."}
              </p>
              <button
                className="dark-button"
                onClick={() => {
                  closeModal()
                  if (analysis) navigate("Resume analyzer")
                  else fileInput.current?.click()
                }}
              >
                {analysis ? "View my analysis" : "Upload my resume"}
                <ArrowRight size={16} />
              </button>
            </>
          )}
          {modal === "report" && analysis && (
            <>
              <span className="modal-icon">
                <Sparkles size={25} />
              </span>
              <h2>Your experience, decoded.</h2>
              <p className="dialog-subtitle">{filename}</p>
              <div className="report-summary">
                <ScoreRing score={analysis.score} small />
                <p>{analysis.summary}</p>
              </div>
              <h3>Your standout skills</h3>
              <div className="skill-tags">
                {analysis.skills.length ? (
                  analysis.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))
                ) : (
                  <p>
                    No common skills identified. Try adding a skills section.
                  </p>
                )}
              </div>
              <h3>A few steps forward</h3>
              <div className="report-checks">
                {analysis.checks.map((check) => (
                  <div key={check.label}>
                    <span
                      className={`check-circle ${
                        !check.passed ? "needs-work" : ""
                      }`}
                    >
                      {check.passed ? (
                        <Check size={13} />
                      ) : (
                        <TrendingUp size={13} />
                      )}
                    </span>
                    <div>
                      <strong>{check.label}</strong>
                      {!check.passed && <p>{check.suggestion}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <button className="dark-button" onClick={downloadReport}>
                <ArrowDownToLine size={16} /> Download my report
              </button>
              <p className="local-disclaimer">
                {analysis.source === "ai"
                  ? "AI-powered feedback from OpenAI. Review recommendations for accuracy."
                  : "Local keyword and structure analysis. This preview does not use an AI model."}{" "}
                Scores are not hiring predictions.
              </p>
            </>
          )}
          {modal === "ai" && (
            <>
              <span className="modal-icon">
                <Sparkles size={25} />
              </span>
              <h2>A little extra intelligence.</h2>
              <p>
                Connect your own OpenAI API key to unlock AI-powered resume
                feedback. Without a key, careerLens uses private, on-device
                keyword analysis.
              </p>
              {apiKey ? (
                <div className="ai-connected">
                  <div className="ai-connected-heading">
                    <CheckCheck size={21} />
                    <strong>AI is enabled</strong>
                    <span>GPT-4o mini</span>
                  </div>
                  <p>
                    Your next upload will be analyzed by OpenAI. The key is held
                    in memory only and is cleared when you reload or disconnect.
                  </p>
                  <button
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => {
                      setApiKey("")
                      setKeyDraft("")
                      setAiConsent(false)
                      setToast("AI disconnected. Local analysis is active.")
                      closeModal()
                    }}
                  >
                    Disconnect AI
                  </button>
                </div>
              ) : (
                <form
                  className="ai-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!keyDraft.trim() || !aiConsent) return
                    setApiKey(keyDraft.trim())
                    setKeyDraft("")
                    setToast("AI enabled. Upload a resume to get AI feedback.")
                    closeModal()
                  }}
                >
                  <label htmlFor="ai-key">Your OpenAI API key</label>
                  <input
                    id="ai-key"
                    type="password"
                    autoComplete="off"
                    placeholder="sk-…"
                    value={keyDraft}
                    onChange={(event) => setKeyDraft(event.target.value)}
                    required
                  />
                  <p className="ai-key-note">
                    Use a limited-budget key from your own account. API usage is
                    billed by OpenAI. The key is never saved or sent to
                    careerLens servers.
                  </p>
                  <label className="ai-consent">
                    <input
                      type="checkbox"
                      checked={aiConsent}
                      onChange={(event) => setAiConsent(event.target.checked)}
                      required
                    />
                    <span>
                      I agree to send my extracted resume text directly to
                      OpenAI for analysis. I understand it may contain personal
                      information and is subject to OpenAI’s data policies.
                    </span>
                  </label>
                  <button
                    className="dark-button"
                    disabled={!keyDraft.trim() || !aiConsent || busy}
                    type="submit"
                  >
                    <Sparkles size={15} /> Enable AI analysis
                  </button>
                </form>
              )}
              <p className="local-disclaimer">
                The connection is verified on your next upload. No resume is
                sent until you upload one with AI enabled. Reload this page to
                return to local mode.
              </p>
            </>
          )}
        </div>
      </dialog>
    </div>
  )
}
