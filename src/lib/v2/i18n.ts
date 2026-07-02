import type { Lang } from "./data"

const translations: Record<string, { en: string; ar: string }> = {
  // Auth
  signIn: { en: "Sign In", ar: "تسجيل الدخول" },
  signOut: { en: "Sign Out", ar: "تسجيل الخروج" },
  username: { en: "Username", ar: "اسم المستخدم" },
  password: { en: "Password", ar: "كلمة المرور" },
  signInToContinue: { en: "Sign in to your MyOS account", ar: "سجّل الدخول إلى حساب MyOS" },
  demoHint: { en: "Use: admin / publisher / subscriber with matching password", ar: "استخدم: admin / publisher / subscriber مع كلمة المرور المطابقة" },
  welcomeBack: { en: "Welcome back", ar: "مرحبًا بعودتك" },

  // Navigation — general
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  courses: { en: "Courses", ar: "الدورات" },
  myCourses: { en: "My Courses", ar: "دوراتي" },
  analytics: { en: "Analytics", ar: "التحليلات" },
  profile: { en: "Profile", ar: "الملف الشخصي" },
  billing: { en: "Billing & Credits", ar: "الفواتير والرصيد" },
  marketplace: { en: "Marketplace", ar: "السوق" },
  back: { en: "Back", ar: "رجوع" },
  settings: { en: "Settings", ar: "الإعدادات" },

  // Navigation — publisher
  myAvatars: { en: "My Avatars", ar: "مساعداتي" },
  programs: { en: "Programs", ar: "البرامج" },
  avatars: { en: "Avatars", ar: "المساعدون" },
  newAvatar: { en: "New Avatar", ar: "مساعد جديد" },
  newProgram: { en: "New Program", ar: "برنامج جديد" },
  variants: { en: "Variants", ar: "النسخ" },
  accessCodes: { en: "Access Codes", ar: "رموز الوصول" },
  subscribers: { en: "Subscribers", ar: "المشتركون" },

  // Navigation — admin
  templates: { en: "Avatar Templates", ar: "قوالب المساعدين" },
  models: { en: "3D Model Catalog", ar: "كتالوج النماذج ثلاثية الأبعاد" },
  users: { en: "User Management", ar: "إدارة المستخدمين" },
  newTemplate: { en: "New Template", ar: "قالب جديد" },
  addModel: { en: "Add Model", ar: "إضافة نموذج" },

  // Program switcher
  backToMyOS: { en: "Back to MyOS", ar: "العودة إلى MyOS" },
  switchProgram: { en: "Switch Program", ar: "تغيير البرنامج" },
  noProgram: { en: "MyOS Marketplace", ar: "سوق MyOS" },

  // Courses
  session: { en: "Session", ar: "جلسة" },
  sessions: { en: "Sessions", ar: "الجلسات" },
  startSession: { en: "Start Session", ar: "بدء الجلسة" },
  resumeSession: { en: "Resume", ar: "استئناف" },
  teaching: { en: "Teaching", ar: "تعليم" },
  examination: { en: "Examination", ar: "اختبار" },
  completed: { en: "Completed", ar: "مكتمل" },
  inProgress: { en: "In Progress", ar: "قيد التقدم" },
  notStarted: { en: "Not Started", ar: "لم يبدأ" },
  progress: { en: "Progress", ar: "التقدم" },
  duration: { en: "Duration", ar: "المدة" },
  slides: { en: "Slides", ar: "الشرائح" },
  runs: { en: "Runs", ar: "مرات التشغيل" },
  department: { en: "Department", ar: "الإدارة" },
  code: { en: "Code", ar: "الرمز" },
  deliveredBy: { en: "Delivered by", ar: "يُقدَّم بواسطة" },

  // Stats
  overallProgress: { en: "Overall Progress", ar: "التقدم الإجمالي" },
  coursesEnrolled: { en: "Courses Enrolled", ar: "الدورات المسجلة" },
  hoursThisMonth: { en: "Hours This Month", ar: "ساعات هذا الشهر" },
  certificatesEarned: { en: "Certificates", ar: "الشهادات" },
  totalEmployees: { en: "Total Employees", ar: "إجمالي الموظفين" },
  avgCompletion: { en: "Avg. Completion", ar: "متوسط الإنجاز" },
  activeCourses: { en: "Active Courses", ar: "الدورات النشطة" },
  employeesAtRisk: { en: "At Risk", ar: "في خطر" },
  totalSubscribers: { en: "Total Subscribers", ar: "إجمالي المشتركين" },
  activeAvatars: { en: "Active Avatars", ar: "المساعدون النشطون" },
  totalSessions: { en: "Total Sessions", ar: "إجمالي الجلسات" },
  creditsConsumed: { en: "Credits Used", ar: "الرصيد المستهلك" },

  // Charts
  departmentPerformance: { en: "Department Performance", ar: "أداء الإدارات" },
  monthlyCompletions: { en: "Monthly Completions", ar: "الإنجازات الشهرية" },
  completionRate: { en: "Completion Rate", ar: "معدل الإكمال" },
  aiRecommendations: { en: "AI Recommendations", ar: "توصيات الذكاء الاصطناعي" },

  // Session runtime
  micOn: { en: "Mic On", ar: "الميكروفون مفعّل" },
  micOff: { en: "Mic Off", ar: "الميكروفون معطّل" },
  soundOn: { en: "Sound On", ar: "الصوت مفعّل" },
  soundOff: { en: "Sound Off", ar: "الصوت معطّل" },
  endSession: { en: "End Session", ar: "إنهاء الجلسة" },
  connecting: { en: "Connecting...", ar: "جارٍ الاتصال..." },
  connected: { en: "Connected", ar: "متصل" },
  transcript: { en: "Transcript", ar: "النص" },
  switchVariant: { en: "Switch Avatar", ar: "تغيير المساعد" },
  liveSession: { en: "Live Session", ar: "جلسة مباشرة" },
  sessionSummary: { en: "Session Summary", ar: "ملخص الجلسة" },

  // Avatar / Publisher
  template: { en: "Template", ar: "القالب" },
  category: { en: "Category", ar: "الفئة" },
  version: { en: "Version", ar: "الإصدار" },
  published: { en: "Published", ar: "منشور" },
  draft: { en: "Draft", ar: "مسودة" },
  archived: { en: "Archived", ar: "مؤرشف" },
  active: { en: "Active", ar: "نشط" },
  inactive: { en: "Inactive", ar: "غير نشط" },
  language: { en: "Language", ar: "اللغة" },
  voice: { en: "Voice", ar: "الصوت" },
  default: { en: "Default", ar: "افتراضي" },
  model: { en: "Model", ar: "النموذج" },
  gender: { en: "Gender", ar: "الجنس" },
  male: { en: "Male", ar: "ذكر" },
  female: { en: "Female", ar: "أنثى" },
  neutral: { en: "Neutral", ar: "محايد" },

  // Admin
  platformStats: { en: "Platform Statistics", ar: "إحصاءات المنصة" },
  totalPublishers: { en: "Publishers", ar: "الناشرون" },
  versionHistory: { en: "Version History", ar: "سجل الإصدارات" },
  teachingPrompt: { en: "Teaching Prompt", ar: "موجّه التدريس" },
  examinationPrompt: { en: "Examination Prompt", ar: "موجّه الاختبار" },
  roles: { en: "Roles", ar: "الأدوار" },
  newVersion: { en: "New Version", ar: "إصدار جديد" },

  // General UI
  save: { en: "Save", ar: "حفظ" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  edit: { en: "Edit", ar: "تعديل" },
  delete: { en: "Delete", ar: "حذف" },
  view: { en: "View", ar: "عرض" },
  manage: { en: "Manage", ar: "إدارة" },
  create: { en: "Create", ar: "إنشاء" },
  publish: { en: "Publish", ar: "نشر" },
  search: { en: "Search", ar: "بحث" },
  filter: { en: "Filter", ar: "تصفية" },
  all: { en: "All", ar: "الكل" },
  loading: { en: "Loading...", ar: "جارٍ التحميل..." },
  ministry: { en: "MyOS - AI Training Platform", ar: "MyOS - منصة التدريب الذكية" },
  continueLearning: { en: "Continue Learning", ar: "متابعة التعلم" },
  viewAll: { en: "View All", ar: "عرض الكل" },
  myOS: { en: "MyOS", ar: "MyOS" },
  subscriber: { en: "Subscriber", ar: "مشترك" },
  publisher: { en: "Publisher", ar: "ناشر" },
  admin: { en: "Admin", ar: "مسؤول" },
  roleLabel: { en: "Role", ar: "الدور" },
  sessionHistory: { en: "Session History", ar: "سجل الجلسات" },
  aiSummary: { en: "AI Summary", ar: "ملخص الذكاء الاصطناعي" },
  minutesShort: { en: "min", ar: "دقيقة" },
  subscriberCount: { en: "Subscribers", ar: "المشتركون" },
}

export function tr(key: string, lang: Lang): string {
  return translations[key]?.[lang] ?? key
}
