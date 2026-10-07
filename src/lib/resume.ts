export type Analysis = {
  source: "local" | "ai"
  score: number
  skills: string[]
  checks: {
    label: string
    passed: boolean
    suggestion: string
  }[]
  summary: string
}

export const skillKeywords = [
  "Figma",
  "User research",
  "Prototyping",
  "UI design",
  "UX design",
  "Design systems",
  "React",
  "JavaScript",
  "TypeScript",
  "Python",
  "SQL",
  "HTML",
  "CSS",
  "Git",
  "Data analysis",
  "Excel",
  "Tableau",
  "Power BI",
  "Machine learning",
  "Communication",
  "Project management",
  "Agile",
  "Marketing",
  "SEO",
  "Leadership",
  "Customer service",
  "Sales",
  "Accounting",
  "Nursing",
  "Java",
  "AWS",
  "Node.js",
]

export async function extractResume(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase()
  if (extension === "txt") return file.text()
  if (extension === "pdf") {
    const pdfjs = await import("pdfjs-dist")
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() })
    const document = await loadingTask.promise
    try {
      const pages: string[] = []
      for (let page = 1; page <= document.numPages; page++) {
        const content = await (await document.getPage(page)).getTextContent()
        pages.push(
          content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" "),
        )
      }
      return pages.join("\n")
    } finally {
      await loadingTask.destroy()
    }
  }
  if (extension === "docx") {
    const mammoth = await import("mammoth")
    return (
      await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    ).value
  }
  throw new Error("Please choose a PDF, DOCX, or TXT resume.")
}

export function analyzeResume(text: string): Analysis {
  const lower = text.toLowerCase()
  const aliases: Record<string, string[]> = {
    "User research": ["user research", "ux research"],
    "UI design": ["ui design", "user interface"],
    "UX design": ["ux design", "user experience", "product design"],
    "Design systems": ["design system"],
    Communication: ["communication", "collaboration", "collaborated"],
    "Data analysis": ["data analysis", "data analytics"],
  }
  const skills = skillKeywords.filter((skill) =>
    (aliases[skill] ?? [skill.toLowerCase()]).some((word) =>
      new RegExp(
        `(^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`,
        "i",
      ).test(lower),
    ),
  )
  const checks = [
    {
      label: "Contact information",
      passed: /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text),
      suggestion:
        "Include a professional email address so recruiters can reach you.",
    },
    {
      label: "Relevant skills",
      passed: skills.length >= 4,
      suggestion:
        "Add a clear skills section with tools and abilities relevant to your target role.",
    },
    {
      label: "Work experience",
      passed: /experience|employment|work history/i.test(text),
      suggestion:
        "Add a dedicated work experience section with job titles and dates.",
    },
    {
      label: "Measurable achievements",
      passed:
        /\d+\s*(%|percent|users|customers|projects|million)|\$\s*\d/i.test(
          text,
        ),
      suggestion:
        "Quantify your impact. For example: “Improved conversion by 25%.”",
    },
    {
      label: "Education",
      passed:
        /education|university|college|bachelor|master|degree|certification/i.test(
          text,
        ),
      suggestion:
        "Include your education or relevant professional certifications.",
    },
    {
      label: "Action-oriented language",
      passed:
        /led|built|developed|created|improved|delivered|managed|launched|designed/i.test(
          text,
        ),
      suggestion:
        "Start experience bullets with action verbs such as built, led, or improved.",
    },
  ]
  const score = Math.min(
    100,
    Math.round(
      (checks.filter((check) => check.passed).length / checks.length) * 85 +
        Math.min(skills.length, 10) * 1.5,
    ),
  )
  return {
    source: "local",
    score,
    skills,
    checks,
    summary: skills.length
      ? `Your resume highlights ${skills.slice(0, 3).join(", ")}${
          skills.length > 3 ? ` and ${skills.length - 3} other skills` : ""
        }. ${
          checks.filter((c) => !c.passed).length
            ? "A few focused improvements could help your experience stand out."
            : "You have a strong foundation. Tailor your achievements to each role for an even better match."
        }`
      : "We couldn't identify common skills yet. Add a specific skills section and describe your tools, responsibilities, and achievements.",
  }
}

export const jobs = [
  {
    id: 1,
    title: "Product Designer",
    company: "Linear",
    mark: "linear",
    location: "San Francisco, CA",
    mode: "Remote",
    salary: "$120k – $160k",
    color: "purple",
    skills: [
      "Figma",
      "UI design",
      "UX design",
      "Prototyping",
      "Design systems",
    ],
    description:
      "Shape intuitive experiences for modern software teams. Own product design from early discovery to polished interaction details, working closely with engineering and product.",
  },
  {
    id: 2,
    title: "UX / UI Designer",
    company: "Notion",
    mark: "N",
    location: "New York, NY",
    mode: "Hybrid",
    salary: "$110k – $145k",
    color: "peach",
    skills: [
      "Figma",
      "User research",
      "UI design",
      "UX design",
      "Communication",
    ],
    description:
      "Help people turn their ideas into beautiful, useful workspaces. Conduct research, explore new concepts, and build thoughtful interfaces for a collaborative product.",
  },
  {
    id: 3,
    title: "Frontend Developer",
    company: "Vercel",
    mark: "triangle",
    location: "United States",
    mode: "Remote",
    salary: "$130k – $175k",
    color: "mint",
    skills: ["React", "JavaScript", "TypeScript", "HTML", "CSS"],
    description:
      "Build fast, accessible web experiences with a team that cares about developer experience. Collaborate on React interfaces and reusable frontend architecture.",
  },
  {
    id: 4,
    title: "Data Analyst",
    company: "Spotify",
    mark: "S",
    location: "New York, NY",
    mode: "Hybrid",
    salary: "$95k – $135k",
    color: "mint",
    skills: ["SQL", "Python", "Data analysis", "Tableau", "Communication"],
    description:
      "Transform data into clear insights. Develop dashboards, investigate product performance, and communicate actionable recommendations to cross-functional teams.",
  },
  {
    id: 5,
    title: "Marketing Specialist",
    company: "Canva",
    mark: "C",
    location: "Austin, TX",
    mode: "Remote",
    salary: "$80k – $110k",
    color: "purple",
    skills: [
      "Marketing",
      "SEO",
      "Communication",
      "Data analysis",
      "Project management",
    ],
    description:
      "Create campaigns that connect with a global creative community. Use storytelling, search strategy, and performance insights to grow meaningful engagement.",
  },
  {
    id: 6,
    title: "Project Manager",
    company: "Asana",
    mark: "asana",
    location: "San Francisco, CA",
    mode: "Hybrid",
    salary: "$105k – $140k",
    color: "peach",
    skills: [
      "Project management",
      "Agile",
      "Leadership",
      "Communication",
      "Excel",
    ],
    description:
      "Help multidisciplinary teams do their best work. Coordinate delivery, clarify priorities, manage stakeholders, and continuously improve team workflows.",
  },
]
export type Job = typeof jobs[number]
export function matchScore(job: Job, skills: string[]) {
  return Math.round(
    (job.skills.filter((skill) => skills.includes(skill)).length /
      job.skills.length) *
      100,
  )
}
