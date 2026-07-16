// MyOS v2 — mock data layer
// No backend. All data is static for demo purposes.

export type Lang = "en" | "ar"
export type Role = "admin" | "publisher" | "subscriber"

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: Role
  currentProgramId: string | null
  avatarUrl?: string
}

export const DEMO_USERS: Record<string, User & { password: string }> = {
  admin: {
    id: "user-admin-1",
    username: "admin",
    email: "admin@myos.ai",
    firstName: "Platform",
    lastName: "Admin",
    role: "admin",
    currentProgramId: null,
    password: "admin",
  },
  publisher: {
    id: "user-pub-1",
    username: "publisher",
    email: "prof@myos.ai",
    firstName: "Dr. Aisha",
    lastName: "Al Mansoori",
    role: "publisher",
    currentProgramId: "prog-uae-gov",
    password: "publisher",
  },
  subscriber: {
    id: "user-sub-1",
    username: "subscriber",
    email: "capt.rashid@example.com",
    firstName: "Rashid",
    lastName: "Al Mansoori",
    role: "subscriber",
    currentProgramId: "prog-uae-gov",
    password: "subscriber",
  },
}

// ─── Programs ─────────────────────────────────────────────────────────────────

export interface ThemeConfig {
  brandName: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  logoUrl?: string
  backgroundUrl?: string
  fontFamily: string
}

export interface Program {
  id: string
  publisherId: string
  name: { en: string; ar: string }
  slug: string
  description: { en: string; ar: string }
  themeConfig: ThemeConfig
  isActive: boolean
  isPublic: boolean
  avatarIds: string[]
  courseIds: string[]
  memberIds: string[]
}

export const programs: Program[] = [
  {
    id: "prog-uae-gov",
    publisherId: "user-pub-1",
    name: { en: "UAE AI Governance Training", ar: "برنامج حوكمة الذكاء الاصطناعي الإماراتي" },
    slug: "uae-ai-governance",
    description: {
      en: "Comprehensive AI governance training for UAE government officials and officers.",
      ar: "تدريب شامل في حوكمة الذكاء الاصطناعي للمسؤولين والضباط الحكوميين الإماراتيين.",
    },
    themeConfig: {
      brandName: "UAE AI Governance Training",
      primaryColor: "#1A3C6B",
      secondaryColor: "#D4AF37",
      accentColor: "#FFFFFF",
      fontFamily: "Noto Sans Arabic, Inter, sans-serif",
    },
    isActive: true,
    isPublic: false,
    avatarIds: ["avatar-salama", "avatar-sultan"],
    courseIds: ["course-ai-gov", "course-leadership", "course-ohs"],
    memberIds: ["user-sub-1"],
  },
  {
    id: "prog-police-academy",
    publisherId: "user-pub-1",
    name: { en: "Police Academy Foundation", ar: "برنامج أكاديمية الشرطة التأسيسي" },
    slug: "police-academy",
    description: {
      en: "Foundation training for new police academy recruits.",
      ar: "التدريب التأسيسي لمجندي أكاديمية الشرطة الجدد.",
    },
    themeConfig: {
      brandName: "Police Academy",
      primaryColor: "#0F2D5E",
      secondaryColor: "#C0392B",
      accentColor: "#FFFFFF",
      fontFamily: "Inter, sans-serif",
    },
    isActive: true,
    isPublic: false,
    avatarIds: ["avatar-sultan"],
    courseIds: ["course-corrections", "course-sar"],
    memberIds: ["user-sub-1"],
  },
]

// ─── Avatar 3D Models ─────────────────────────────────────────────────────────

export type ModelType = "heygen" | "ready_player_me" | "three_js" | "custom"
export type Gender = "male" | "female" | "neutral"

export interface Avatar3DModel {
  id: string
  name: string
  modelType: ModelType
  modelUrl: string
  thumbnailUrl: string
  previewVideoUrl?: string
  supportedLanguages: string[]
  gender: Gender
  isActive: boolean
  createdBy: string
}

export const avatar3DModels: Avatar3DModel[] = [
  {
    id: "model-emirati-female-1",
    name: "Emirati Lady (Professional)",
    modelType: "heygen",
    modelUrl: "heygen_emirati_female_001",
    thumbnailUrl: "/images/avatar-female.png",
    supportedLanguages: ["ar", "en"],
    gender: "female",
    isActive: true,
    createdBy: "user-admin-1",
  },
  {
    id: "model-emirati-male-1",
    name: "Emirati Officer (Formal)",
    modelType: "heygen",
    modelUrl: "heygen_emirati_male_001",
    thumbnailUrl: "/images/avatar-male.png",
    supportedLanguages: ["ar", "en"],
    gender: "male",
    isActive: true,
    createdBy: "user-admin-1",
  },
  {
    id: "model-neutral-1",
    name: "Professional Neutral",
    modelType: "ready_player_me",
    modelUrl: "https://models.readyplayer.me/demo.glb",
    thumbnailUrl: "/images/avatar-female.png",
    supportedLanguages: ["en", "ar", "fr", "es"],
    gender: "neutral",
    isActive: true,
    createdBy: "user-admin-1",
  },
]

// ─── Avatar Templates ─────────────────────────────────────────────────────────

export interface AvatarTemplateRole {
  id: string
  templateId: string
  name: string
  description: string
  heygenAvatarId?: string
  defaultLanguage: string
  suggested3DModelId: string
  isEnabled: boolean
}

export interface AvatarTemplateVersion {
  id: string
  templateId: string
  versionNumber: number
  teachingPrompt: string
  examinationPrompt: string
  status: "draft" | "published" | "archived"
  changeNotes: string
  createdAt: string
}

export interface AvatarTemplate {
  id: string
  name: { en: string; ar: string }
  description: { en: string; ar: string }
  category: string
  isActive: boolean
  isPublished: boolean
  subscriptionCost: number
  currentVersionId: string
  deployedAvatarCount: number
  activeSubscriberCount: number
  baseModel: string
  ttsEngine: string
  maxContextTokens: number
  isPublisherLocked: boolean
  supportsRtl: boolean
  supports3dAvatar: boolean
  capabilities: string[]
  versions: AvatarTemplateVersion[]
  roles: AvatarTemplateRole[]
}

export const avatarTemplates: AvatarTemplate[] = [
  {
    id: "tmpl-gov-trainer",
    name: { en: "Government AI Trainer", ar: "مدرب الذكاء الاصطناعي الحكومي" },
    description: {
      en: "Specialized in AI governance, policy, and public sector digital transformation.",
      ar: "متخصص في حوكمة الذكاء الاصطناعي والسياسات والتحول الرقمي في القطاع الحكومي.",
    },
    category: "Government",
    isActive: true,
    isPublished: true,
    subscriptionCost: 3,
    currentVersionId: "tmpl-gov-v2",
    deployedAvatarCount: 6,
    activeSubscriberCount: 213,
    baseModel: "gpt-4o",
    ttsEngine: "openai-tts-hd",
    maxContextTokens: 128000,
    isPublisherLocked: false,
    supportsRtl: true,
    supports3dAvatar: true,
    capabilities: ["bilingual", "memory", "quiz-generation", "slide-parsing", "voice-response"],
    versions: [
      {
        id: "tmpl-gov-v1",
        templateId: "tmpl-gov-trainer",
        versionNumber: 1,
        teachingPrompt: "You are a professional AI governance trainer for UAE government officials. Present content clearly, reference the UAE AI Strategy 2031, and adapt to the officer's level.",
        examinationPrompt: "You are conducting a formal assessment on AI governance. Ask questions based on the uploaded slides and evaluate responses strictly but fairly.",
        status: "archived",
        changeNotes: "Initial version",
        createdAt: "2025-01-10",
      },
      {
        id: "tmpl-gov-v2",
        templateId: "tmpl-gov-trainer",
        versionNumber: 2,
        teachingPrompt: "You are an expert AI governance trainer for UAE government officials. Deliver content from the uploaded materials, reference the UAE AI Strategy 2031 and PDPL, and personalize delivery based on the learner's background and past session memory.",
        examinationPrompt: "You are conducting a formal assessment on AI governance topics. Draw questions strictly from uploaded course materials. Evaluate each answer and provide constructive feedback.",
        status: "published",
        changeNotes: "Added PDPL references and memory personalization",
        createdAt: "2026-01-15",
      },
    ],
    roles: [
      {
        id: "role-female-gov",
        templateId: "tmpl-gov-trainer",
        name: "Female Professional",
        description: "Emirati female government trainer persona",
        heygenAvatarId: "heygen_emirati_female_001",
        defaultLanguage: "ar",
        suggested3DModelId: "model-emirati-female-1",
        isEnabled: true,
      },
      {
        id: "role-male-gov",
        templateId: "tmpl-gov-trainer",
        name: "Male Instructor",
        description: "Emirati male government instructor persona",
        heygenAvatarId: "heygen_emirati_male_001",
        defaultLanguage: "ar",
        suggested3DModelId: "model-emirati-male-1",
        isEnabled: true,
      },
    ],
  },
  {
    id: "tmpl-law-enforcement",
    name: { en: "Law Enforcement Trainer", ar: "مدرب تطبيق القانون" },
    description: {
      en: "Police and security training specialist with scenario-based examination capabilities.",
      ar: "متخصص في تدريب الشرطة والأمن مع قدرات الاختبار المبني على السيناريوهات.",
    },
    category: "Law Enforcement",
    isActive: true,
    isPublished: true,
    subscriptionCost: 3,
    currentVersionId: "tmpl-law-v1",
    deployedAvatarCount: 3,
    activeSubscriberCount: 89,
    baseModel: "gpt-4o",
    ttsEngine: "openai-tts-hd",
    maxContextTokens: 128000,
    isPublisherLocked: false,
    supportsRtl: true,
    supports3dAvatar: true,
    capabilities: ["bilingual", "scenario-based", "quiz-generation", "slide-parsing"],
    versions: [
      {
        id: "tmpl-law-v1",
        templateId: "tmpl-law-enforcement",
        versionNumber: 1,
        teachingPrompt: "You are a law enforcement trainer. Deliver content from uploaded training materials with precision and authority appropriate for police officers.",
        examinationPrompt: "You are administering a law enforcement examination. Ask scenario-based questions from uploaded materials. Assess procedural knowledge.",
        status: "published",
        changeNotes: "Initial version",
        createdAt: "2025-03-01",
      },
    ],
    roles: [
      {
        id: "role-male-law",
        templateId: "tmpl-law-enforcement",
        name: "Male Officer",
        description: "Senior male officer trainer persona",
        defaultLanguage: "ar",
        suggested3DModelId: "model-emirati-male-1",
        isEnabled: true,
      },
    ],
  },
]

// ─── Avatars (Publisher instantiations) ──────────────────────────────────────

export interface AvatarVariant {
  id: string
  avatarId: string
  name: { en: string; ar: string }
  model3dId: string
  language: string
  openaiVoice: string
  heygenAvatarId?: string
  personaOverride?: string
  isDefault: boolean
  isActive: boolean
}

export interface Avatar {
  id: string
  templateId: string
  publisherId: string
  name: { en: string; ar: string }
  description: { en: string; ar: string }
  isPublished: boolean
  subscriptionCost: number
  templateVersionId: string
  allowSubscriberVariantSwitch: boolean
  variants: AvatarVariant[]
  courseIds: string[]
  subscriberCount: number
}

export const avatars: Avatar[] = [
  {
    id: "avatar-salama",
    templateId: "tmpl-gov-trainer",
    publisherId: "user-pub-1",
    name: { en: "Salama", ar: "سلامة" },
    description: {
      en: "AI governance and digital transformation specialist. Bilingual Arabic/English delivery.",
      ar: "متخصصة في حوكمة الذكاء الاصطناعي والتحول الرقمي. تقديم ثنائي اللغة عربي/إنجليزي.",
    },
    isPublished: true,
    subscriptionCost: 3,
    templateVersionId: "tmpl-gov-v2",
    allowSubscriberVariantSwitch: true,
    variants: [
      {
        id: "var-salama-ar",
        avatarId: "avatar-salama",
        name: { en: "Emirati Lady (Arabic)", ar: "السيدة الإماراتية (عربي)" },
        model3dId: "model-emirati-female-1",
        language: "ar",
        openaiVoice: "shimmer",
        heygenAvatarId: "heygen_emirati_female_001",
        isDefault: true,
        isActive: true,
      },
      {
        id: "var-salama-en",
        avatarId: "avatar-salama",
        name: { en: "Emirati Lady (English)", ar: "السيدة الإماراتية (إنجليزي)" },
        model3dId: "model-emirati-female-1",
        language: "en",
        openaiVoice: "shimmer",
        heygenAvatarId: "heygen_emirati_female_001",
        isDefault: false,
        isActive: true,
      },
    ],
    courseIds: ["course-ai-gov", "course-leadership"],
    subscriberCount: 124,
  },
  {
    id: "avatar-sultan",
    templateId: "tmpl-gov-trainer",
    publisherId: "user-pub-1",
    name: { en: "Sultan", ar: "سلطان" },
    description: {
      en: "Leadership and operations training specialist. Formal, authoritative delivery style.",
      ar: "متخصص في تدريب القيادة والعمليات. أسلوب تقديم رسمي وموثوق.",
    },
    isPublished: true,
    subscriptionCost: 3,
    templateVersionId: "tmpl-gov-v2",
    allowSubscriberVariantSwitch: false,
    variants: [
      {
        id: "var-sultan-ar",
        avatarId: "avatar-sultan",
        name: { en: "Emirati Officer (Arabic)", ar: "الضابط الإماراتي (عربي)" },
        model3dId: "model-emirati-male-1",
        language: "ar",
        openaiVoice: "alloy",
        heygenAvatarId: "heygen_emirati_male_001",
        isDefault: true,
        isActive: true,
      },
    ],
    courseIds: ["course-ohs", "course-corrections", "course-sar"],
    subscriberCount: 89,
  },
]

// ─── Courses ──────────────────────────────────────────────────────────────────

export interface Session {
  id: string
  courseId: string
  title: { en: string; ar: string }
  description: { en: string; ar: string }
  duration: number // minutes
  sessionMode: "teaching" | "examination" | "consultation"
  isActive: boolean
  isPublished: boolean
  slideCount: number
  runCount: number
}

export interface Course {
  id: string
  publisherId: string
  name: { en: string; ar: string }
  code: string
  description: { en: string; ar: string }
  department: { en: string; ar: string }
  isActive: boolean
  avatarIds: string[]
  sessions: Session[]
  // subscriber-side progress
  progress?: number
  status?: "in-progress" | "not-started" | "completed"
}

export const courses: Course[] = [
  {
    id: "course-ai-gov",
    publisherId: "user-pub-1",
    name: { en: "AI Governance & Transformation", ar: "حوكمة الذكاء الاصطناعي والتحول" },
    code: "AIGOV-101",
    description: {
      en: "Responsible AI adoption across government, data privacy, and the UAE AI Strategy 2031.",
      ar: "التبني المسؤول للذكاء الاصطناعي في الحكومة وخصوصية البيانات واستراتيجية الإمارات للذكاء الاصطناعي 2031.",
    },
    department: { en: "AI Literacy", ar: "محو أمية الذكاء الاصطناعي" },
    isActive: true,
    avatarIds: ["avatar-salama"],
    sessions: [
      {
        id: "sess-ai-gov-1",
        courseId: "course-ai-gov",
        title: { en: "Foundations of AI", ar: "أساسيات الذكاء الاصطناعي" },
        description: { en: "Core concepts, history, and UAE AI strategy overview.", ar: "المفاهيم الأساسية والتاريخ ونظرة عامة على استراتيجية الذكاء الاصطناعي الإماراتية." },
        duration: 30,
        sessionMode: "teaching",
        isActive: true,
        isPublished: true,
        slideCount: 12,
        runCount: 89,
      },
      {
        id: "sess-ai-gov-2",
        courseId: "course-ai-gov",
        title: { en: "Data Privacy & PDPL", ar: "خصوصية البيانات وقانون حماية البيانات" },
        description: { en: "UAE Personal Data Protection Law and its government implications.", ar: "قانون حماية البيانات الشخصية الإماراتي وآثاره الحكومية." },
        duration: 40,
        sessionMode: "teaching",
        isActive: true,
        isPublished: true,
        slideCount: 18,
        runCount: 74,
      },
      {
        id: "sess-ai-gov-3",
        courseId: "course-ai-gov",
        title: { en: "AI Ethics Assessment", ar: "تقييم أخلاقيات الذكاء الاصطناعي" },
        description: { en: "Formal examination on AI ethics and accountability frameworks.", ar: "اختبار رسمي في أخلاقيات الذكاء الاصطناعي وأطر المساءلة." },
        duration: 45,
        sessionMode: "examination",
        isActive: true,
        isPublished: true,
        slideCount: 8,
        runCount: 52,
      },
    ],
    progress: 35,
    status: "in-progress",
  },
  {
    id: "course-leadership",
    publisherId: "user-pub-1",
    name: { en: "Basic Level Leadership", ar: "القيادة الأساسية" },
    code: "LEAD-201",
    description: {
      en: "Scientific research, internal security operations and leadership skills for promotion-eligible officers.",
      ar: "البحث العلمي وعمليات الأمن الداخلي ومهارات القيادة للضباط المؤهلين للترقية.",
    },
    department: { en: "Rehabilitation & Promotion", ar: "التأهيل والترقية" },
    isActive: true,
    avatarIds: ["avatar-salama"],
    sessions: [
      {
        id: "sess-lead-1",
        courseId: "course-leadership",
        title: { en: "Scientific Research Methodology", ar: "منهجية البحث العلمي" },
        description: { en: "Research design, data collection, and analysis for officers.", ar: "تصميم البحث وجمع البيانات وتحليلها للضباط." },
        duration: 45,
        sessionMode: "teaching",
        isActive: true,
        isPublished: true,
        slideCount: 15,
        runCount: 112,
      },
      {
        id: "sess-lead-2",
        courseId: "course-leadership",
        title: { en: "Crime Scene Management", ar: "إدارة مسرح الجريمة" },
        description: { en: "Procedures, documentation, and chain of custody protocols.", ar: "الإجراءات والتوثيق وبروتوكولات سلسلة الحفاظ على الأدلة." },
        duration: 55,
        sessionMode: "teaching",
        isActive: true,
        isPublished: true,
        slideCount: 22,
        runCount: 98,
      },
      {
        id: "sess-lead-3",
        courseId: "course-leadership",
        title: { en: "Leadership Assessment", ar: "تقييم القيادة" },
        description: { en: "Formal examination on leadership competencies.", ar: "اختبار رسمي في كفاءات القيادة." },
        duration: 60,
        sessionMode: "examination",
        isActive: true,
        isPublished: true,
        slideCount: 10,
        runCount: 67,
      },
    ],
    progress: 60,
    status: "in-progress",
  },
  {
    id: "course-ohs",
    publisherId: "user-pub-1",
    name: { en: "Occupational Health & Safety", ar: "الصحة والسلامة المهنية" },
    code: "OHS-101",
    description: {
      en: "Fundamental principles of occupational safety, planning and international standards.",
      ar: "المبادئ الأساسية للسلامة المهنية والتخطيط والمعايير الدولية.",
    },
    department: { en: "Occupational Health & Safety", ar: "الصحة والسلامة المهنية" },
    isActive: true,
    avatarIds: ["avatar-sultan"],
    sessions: [
      {
        id: "sess-ohs-1",
        courseId: "course-ohs",
        title: { en: "Concepts of Safety & Security", ar: "مفاهيم السلامة والأمن" },
        description: { en: "Definitions, principles, and regulatory framework.", ar: "التعريفات والمبادئ والإطار التنظيمي." },
        duration: 30,
        sessionMode: "teaching",
        isActive: true,
        isPublished: true,
        slideCount: 10,
        runCount: 143,
      },
      {
        id: "sess-ohs-2",
        courseId: "course-ohs",
        title: { en: "Standards & Procedures Assessment", ar: "تقييم المعايير والإجراءات" },
        description: { en: "Examination on OHS standards and emergency procedures.", ar: "اختبار في معايير الصحة والسلامة المهنية وإجراءات الطوارئ." },
        duration: 40,
        sessionMode: "examination",
        isActive: true,
        isPublished: true,
        slideCount: 8,
        runCount: 130,
      },
    ],
    progress: 100,
    status: "completed",
  },
  {
    id: "course-corrections",
    publisherId: "user-pub-1",
    name: { en: "Dealing with Prisoners & Detainees", ar: "التعامل مع النزلاء والمحتجزين" },
    code: "CORR-101",
    description: {
      en: "Concepts of security and safety, handling detainees, and safety standards inside correctional facilities.",
      ar: "مفاهيم الأمن والسلامة والتعامل مع المحتجزين ومعايير السلامة داخل المنشآت الإصلاحية.",
    },
    department: { en: "Correctional Establishments", ar: "المنشآت العقابية والإصلاحية" },
    isActive: true,
    avatarIds: ["avatar-sultan"],
    sessions: [
      {
        id: "sess-corr-1",
        courseId: "course-corrections",
        title: { en: "Security & Safety Concepts", ar: "مفاهيم الأمن والسلامة" },
        description: { en: "Foundational security concepts for correctional officers.", ar: "مفاهيم الأمن الأساسية لضباط الإصلاحيات." },
        duration: 30,
        sessionMode: "teaching",
        isActive: true,
        isPublished: true,
        slideCount: 10,
        runCount: 55,
      },
    ],
    progress: 0,
    status: "not-started",
  },
  {
    id: "course-sar",
    publisherId: "user-pub-1",
    name: { en: "Basic Search & Rescue", ar: "البحث والإنقاذ الأساسي" },
    code: "SAR-101",
    description: {
      en: "VTOL craft safety, flight navigator duties, hoist rescue operations and air rescue practice.",
      ar: "سلامة الطائرات العمودية وواجبات الملاح الجوي وعمليات الإنقاذ بالرافعة.",
    },
    department: { en: "Air Wing", ar: "جناح الطيران" },
    isActive: true,
    avatarIds: ["avatar-sultan"],
    sessions: [
      {
        id: "sess-sar-1",
        courseId: "course-sar",
        title: { en: "VTOL Craft & Safety", ar: "الطائرات العمودية والسلامة" },
        description: { en: "Safety protocols for vertical take-off and landing craft.", ar: "بروتوكولات السلامة للطائرات العمودية." },
        duration: 50,
        sessionMode: "teaching",
        isActive: true,
        isPublished: true,
        slideCount: 16,
        runCount: 28,
      },
    ],
    progress: 0,
    status: "not-started",
  },
]

// ─── Session Run History ─────────────���────────────────────────────────────────

export interface SessionRun {
  id: string
  sessionId: string
  subscriberId: string
  avatarVariantId: string
  variantName: string
  status: "active" | "completed" | "failed"
  startTime: string
  endTime?: string
  aiSummary?: string
  durationMinutes?: number
}

export const sessionRuns: SessionRun[] = [
  {
    id: "run-1",
    sessionId: "sess-ai-gov-1",
    subscriberId: "user-sub-1",
    avatarVariantId: "var-salama-ar",
    variantName: "Emirati Lady (Arabic)",
    status: "completed",
    startTime: "2026-06-01T09:00:00",
    endTime: "2026-06-01T09:32:00",
    durationMinutes: 32,
    aiSummary: "The learner demonstrated good understanding of foundational AI concepts. Showed strong grasp of the UAE AI Strategy 2031 milestones. Needed clarification on the difference between narrow AI and general AI.",
  },
  {
    id: "run-2",
    sessionId: "sess-lead-1",
    subscriberId: "user-sub-1",
    avatarVariantId: "var-salama-ar",
    variantName: "Emirati Lady (Arabic)",
    status: "completed",
    startTime: "2026-06-03T10:00:00",
    endTime: "2026-06-03T10:48:00",
    durationMinutes: 48,
    aiSummary: "Excellent engagement with scientific research methodology. Learner asked insightful questions about qualitative vs. quantitative approaches. Some difficulty with statistical significance concepts.",
  },
]

// ─── Analytics ────────────────────────────────────────────────────────────────

export const departmentStats = [
  { name: { en: "Operations", ar: "العمليات" }, completion: 82, employees: 124 },
  { name: { en: "Air Wing", ar: "جناح الطيران" }, completion: 67, employees: 38 },
  { name: { en: "Corrections", ar: "المنشآت الإصلاحية" }, completion: 74, employees: 95 },
  { name: { en: "Naturalization", ar: "الجنسية والإقامة" }, completion: 91, employees: 60 },
  { name: { en: "Civil Defense", ar: "الدفاع المدني" }, completion: 58, employees: 72 },
]

export const monthlyCompletion = [
  { month: "Jan", value: 42 },
  { month: "Feb", value: 51 },
  { month: "Mar", value: 60 },
  { month: "Apr", value: 58 },
  { month: "May", value: 73 },
  { month: "Jun", value: 81 },
]

export const atRisk = [
  { name: { en: "Lt. Saif Al Dhaheri", ar: "الملازم سيف الظاهري" }, course: { en: "AI Governance", ar: "حوكمة الذكاء الاصطناعي" }, progress: 12 },
  { name: { en: "Sgt. Hamad Al Nuaimi", ar: "الرقيب حمد النعيمي" }, course: { en: "OHS Basic", ar: "السلامة المهنية" }, progress: 8 },
  { name: { en: "Cpl. Yousef Al Shamsi", ar: "العريف يوسف الشامسي" }, course: { en: "English Intermediate", ar: "الإنجليزية المتوسطة" }, progress: 19 },
]

export const platformStats = {
  totalPublishers: 12,
  totalSubscribers: 389,
  totalAvatars: 24,
  totalSessions: 1842,
  creditsConsumed: 28450,
  avgSessionDuration: 34,
}

// ─── Mock User Roster ─────────────────────────────────────────────────────────

export interface UserRecord {
  id: string
  username: string
  name: { en: string; ar: string }
  role: "admin" | "publisher" | "subscriber"
  status: "active" | "inactive"
  joinedAt: string
}

export const mockUsers: UserRecord[] = [
  { id: "u1", username: "admin", name: { en: "System Admin", ar: "مسؤول النظام" }, role: "admin", status: "active", joinedAt: "2025-01-01" },
  { id: "u2", username: "publisher", name: { en: "Content Publisher", ar: "ناشر المحتوى" }, role: "publisher", status: "active", joinedAt: "2025-02-10" },
  { id: "u3", username: "subscriber", name: { en: "Ahmed Al Mansoori", ar: "أحمد المنصوري" }, role: "subscriber", status: "active", joinedAt: "2025-03-05" },
  { id: "u4", username: "sara.publisher", name: { en: "Sara Al Zaabi", ar: "سارة الزعابي" }, role: "publisher", status: "active", joinedAt: "2025-04-12" },
  { id: "u5", username: "khalid.sub", name: { en: "Khalid Al Rashidi", ar: "خالد الراشدي" }, role: "subscriber", status: "active", joinedAt: "2025-04-20" },
  { id: "u6", username: "fatima.sub", name: { en: "Fatima Al Blooshi", ar: "فاطمة البلوشي" }, role: "subscriber", status: "active", joinedAt: "2025-05-01" },
  { id: "u7", username: "omar.pub", name: { en: "Omar Al Hammadi", ar: "عمر الحمادي" }, role: "publisher", status: "inactive", joinedAt: "2025-05-14" },
  { id: "u8", username: "noura.sub", name: { en: "Noura Al Ketbi", ar: "نورة الكعبي" }, role: "subscriber", status: "active", joinedAt: "2025-06-01" },
  { id: "u9", username: "saif.sub", name: { en: "Saif Al Dhaheri", ar: "سيف الظاهري" }, role: "subscriber", status: "inactive", joinedAt: "2025-06-03" },
  { id: "u10", username: "hind.admin", name: { en: "Hind Al Muhairi", ar: "هند المهيري" }, role: "admin", status: "active", joinedAt: "2025-01-15" },
]
