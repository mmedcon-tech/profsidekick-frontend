/**
 * Typed API client for the Avatar Platform.
 * All calls inject the auth token from localStorage automatically.
 * Throws an ApiError (with .status) on non-2xx responses.
 */

import { config } from './config';
import type {
  AvatarConfigurationCreate,
  AvatarConfigurationResponse,
  AvatarConfigurationUpdate,
  AvatarCreate,
  AvatarListResponse,
  AvatarPublicListResponse,
  AvatarPublicResponse,
  AvatarResponse,
  AvatarTemplateCreate,
  AvatarTemplateDetailResponse,
  AvatarTemplateResponse,
  AvatarTemplateRoleCreate,
  AvatarTemplateRoleResponse,
  AvatarTemplateRoleUpdate,
  AvatarTemplateSummary,
  AvatarTemplateUpdate,
  AvatarTemplateVersionCreate,
  AvatarTemplateVersionResponse,
  AvatarUpdate,
  KnowledgeDocumentResponse,
  ReferenceSolutionResponse,
  RoleReorderRequest,
  RubricCreate,
  RubricResponse,
  TemplateCourseRow,
  TemplateDashboardStats,
  TemplatePublisherRow,
  TemplateSessionRunRow,
  UserRecord,
} from '@/types/avatar';

// ─── error type ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ─── core fetch wrapper ──────────────────────────────────────────────────────

async function req<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
  isForm = false,
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(config.getApiUrl(endpoint), {
    method,
    headers,
    body: isForm
      ? (body as FormData)
      : body !== undefined
      ? JSON.stringify(body)
      : undefined,
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      json.message || json.detail || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return json as T;
}

// ─── Avatar Templates — Admin (CRUD) ────────────────────────────────────────

export const templateApi = {
  list: () =>
    req<AvatarTemplateResponse[]>('/api/admin/avatar-templates'),
  get: (id: string) =>
    req<AvatarTemplateDetailResponse>(`/api/admin/avatar-templates/${id}`),
  create: (data: AvatarTemplateCreate) =>
    req<AvatarTemplateResponse>('/api/admin/avatar-templates', 'POST', data),
  update: (id: string, data: AvatarTemplateUpdate) =>
    req<AvatarTemplateResponse>(`/api/admin/avatar-templates/${id}`, 'PUT', data),
  archive: (id: string) =>
    req<AvatarTemplateResponse>(`/api/admin/avatar-templates/${id}`, 'DELETE'),
  delete: (id: string) =>
    req<void>(`/api/admin/avatar-templates/${id}`, 'DELETE'),
  deleteWithInstances: (id: string) =>
    req<void>(`/api/admin/avatar-templates/${id}?cascade=true`, 'DELETE'),

  // ── Version management ───────────────────────────────────────────
  saveDraft: (id: string, data: AvatarTemplateVersionCreate) =>
    req<AvatarTemplateVersionResponse>(
      `/api/admin/avatar-templates/${id}/versions`,
      'POST',
      data,
    ),
  publishVersion: (templateId: string, versionId: string) =>
    req<AvatarTemplateVersionResponse>(
      `/api/admin/avatar-templates/${templateId}/versions/${versionId}/publish`,
      'PATCH',
    ),
  listVersions: (id: string) =>
    req<AvatarTemplateVersionResponse[]>(
      `/api/admin/avatar-templates/${id}/versions`,
    ),

  // ── Publisher: read enabled roles for a template ─────────────────
  getRolesForPublisher: (templateId: string) =>
    req<AvatarTemplateRoleResponse[]>(
      `/api/publisher/avatar-templates/${templateId}/roles`,
    ),

  // ── Role management ──────────────────────────────────────────────
  createRole: (templateId: string, data: AvatarTemplateRoleCreate) =>
    req<AvatarTemplateRoleResponse>(
      `/api/admin/avatar-templates/${templateId}/roles`,
      'POST',
      data,
    ),
  updateRole: (templateId: string, roleId: string, data: AvatarTemplateRoleUpdate) =>
    req<AvatarTemplateRoleResponse>(
      `/api/admin/avatar-templates/${templateId}/roles/${roleId}`,
      'PUT',
      data,
    ),
  deleteRole: (templateId: string, roleId: string) =>
    req<void>(
      `/api/admin/avatar-templates/${templateId}/roles/${roleId}`,
      'DELETE',
    ),
  reorderRoles: (templateId: string, data: RoleReorderRequest) =>
    req<AvatarTemplateRoleResponse[]>(
      `/api/admin/avatar-templates/${templateId}/roles/reorder`,
      'PATCH',
      data,
    ),

  // ── Image management ─────────────────────────────────────────────
  uploadImage: (templateId: string, formData: FormData) =>
    req<{ id: string; avatar_image_url: string | null }>(
      `/api/admin/avatar-templates/${templateId}/image`,
      'POST',
      formData,
      true,
    ),
  deleteImage: (templateId: string) =>
    req<{ id: string; avatar_image_url: null }>(
      `/api/admin/avatar-templates/${templateId}/image`,
      'DELETE',
    ),

  // ── Dashboard stats ──────────────────────────────────────────────
  getStats: (templateId: string) =>
    req<TemplateDashboardStats>(`/api/admin/avatar-templates/${templateId}/stats`),
  getPublishers: (templateId: string) =>
    req<TemplatePublisherRow[]>(`/api/admin/avatar-templates/${templateId}/publishers`),
  getCourses: (templateId: string) =>
    req<TemplateCourseRow[]>(`/api/admin/avatar-templates/${templateId}/courses`),
  getSessions: (templateId: string) =>
    req<TemplateSessionRunRow[]>(`/api/admin/avatar-templates/${templateId}/sessions`),
};

// ─── Avatar Templates — Publisher (no prompts) ───────────────────────────────

export const publisherTemplateApi = {
  list: () =>
    req<AvatarTemplateSummary[]>('/api/publisher/avatar-templates'),
};

// ─── Avatars — Publisher ─────────────────────────────────────────────────────

export interface AccessCodeRecord {
  id: string
  code: string
  max_users: number
  users_count: number
  credits_per_user: string
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface AccessCodeCreate {
  max_users: number
  credits_per_user?: string
  expires_at?: string | null
}

export interface AccessCodeUpdate {
  max_users?: number
  is_active?: boolean
}

export interface LinkedCourseLink {
  id: string
  avatar_id: string
  course_id: string
  sort_order: number
  added_at: string
}

export const avatarApi = {
  list: (programId?: string) =>
    req<AvatarListResponse>(
      programId ? `/api/publisher/avatars?program_id=${programId}` : '/api/publisher/avatars'
    ),
  get: (id: string) => req<AvatarResponse>(`/api/publisher/avatars/${id}`),
  create: (data: AvatarCreate & { program_id?: string }) =>
    req<AvatarResponse>('/api/publisher/avatars', 'POST', data),
  update: (id: string, data: AvatarUpdate) =>
    req<AvatarResponse>(`/api/publisher/avatars/${id}`, 'PUT', data),
  publish: (id: string) =>
    req<AvatarResponse>(`/api/publisher/avatars/${id}/publish`, 'PATCH'),
  delete: (id: string) =>
    req<void>(`/api/publisher/avatars/${id}`, 'DELETE'),

  // Access codes
  listCodes: (avatarId: string) =>
    req<{ codes: AccessCodeRecord[]; total: number }>(
      `/api/publisher/avatars/${avatarId}/access-codes`
    ),
  createCode: (avatarId: string, data: AccessCodeCreate) =>
    req<AccessCodeRecord>(`/api/publisher/avatars/${avatarId}/access-codes`, 'POST', data),
  updateCode: (avatarId: string, codeId: string, data: AccessCodeUpdate) =>
    req<AccessCodeRecord>(`/api/publisher/avatars/${avatarId}/access-codes/${codeId}`, 'PATCH', data),
  deactivateCode: (avatarId: string, codeId: string) =>
    req<void>(`/api/publisher/avatars/${avatarId}/access-codes/${codeId}`, 'DELETE'),

  // Avatar–course links (avatar_courses join table)
  listLinkedCourses: (avatarId: string) =>
    req<{ courses: LinkedCourseLink[]; total: number }>(
      `/api/publisher/avatars/${avatarId}/courses`
    ),
  linkCourse: (avatarId: string, courseUuid: string) =>
    req<LinkedCourseLink>(`/api/publisher/avatars/${avatarId}/courses`, 'POST', { course_id: courseUuid }),
  unlinkCourse: (avatarId: string, courseUuid: string) =>
    req<void>(`/api/publisher/avatars/${avatarId}/courses/${courseUuid}`, 'DELETE'),
};

// ─── Avatar Configuration — Publisher ───────────────────────────────────────

export const configApi = {
  get: (avatarId: string) =>
    req<AvatarConfigurationResponse>(
      `/api/publisher/avatars/${avatarId}/configuration`,
    ),
  create: (avatarId: string, data: AvatarConfigurationCreate) =>
    req<AvatarConfigurationResponse>(
      `/api/publisher/avatars/${avatarId}/configuration`,
      'POST',
      data,
    ),
  update: (avatarId: string, data: AvatarConfigurationUpdate) =>
    req<AvatarConfigurationResponse>(
      `/api/publisher/avatars/${avatarId}/configuration`,
      'PUT',
      data,
    ),
  upsert: async (avatarId: string, data: AvatarConfigurationCreate) => {
    try {
      return await configApi.update(avatarId, data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        return configApi.create(avatarId, data);
      }
      throw e;
    }
  },
};

// ─── Rubrics ─────────────────────────────────────────────────────────────────

export const rubricApi = {
  add: (avatarId: string, data: RubricCreate) =>
    req<RubricResponse>(
      `/api/publisher/avatars/${avatarId}/configuration/rubrics`,
      'POST',
      data,
    ),
  delete: (avatarId: string, rubricId: string) =>
    req<void>(
      `/api/publisher/avatars/${avatarId}/configuration/rubrics/${rubricId}`,
      'DELETE',
    ),
};

// ─── Knowledge Documents ─────────────────────────────────────────────────────

export const knowledgeApi = {
  add: (avatarId: string, formData: FormData) =>
    req<KnowledgeDocumentResponse>(
      `/api/publisher/avatars/${avatarId}/configuration/knowledge-documents`,
      'POST',
      formData,
      true,
    ),
  delete: (avatarId: string, docId: string) =>
    req<void>(
      `/api/publisher/avatars/${avatarId}/configuration/knowledge-documents/${docId}`,
      'DELETE',
    ),
};

// ─── Reference Solutions ─────────────────────────────────────────────────────

export const referenceApi = {
  add: (avatarId: string, formData: FormData) =>
    req<ReferenceSolutionResponse>(
      `/api/publisher/avatars/${avatarId}/configuration/reference-solutions`,
      'POST',
      formData,
      true,
    ),
  delete: (avatarId: string, solutionId: string) =>
    req<void>(
      `/api/publisher/avatars/${avatarId}/configuration/reference-solutions/${solutionId}`,
      'DELETE',
    ),
};

// ─── Marketplace — Subscriber ────────────────────────────────────────────────

export const marketplaceApi = {
  list: () => req<AvatarPublicListResponse>('/api/avatars'),
  get: (id: string) => req<AvatarPublicResponse>(`/api/avatars/${id}`),
};

// ─── Subscriptions — Subscriber ─────────────────────────────────────────────

export interface CodeRedeemResult {
  success: boolean
  message: string
  avatar_id: string
  subscription_created: boolean
  credits_granted: number
  courses_enrolled: string[]
  programs_enrolled: string[]
}

export const subscriptionApi = {
  subscribe: (avatarId: string) =>
    req<any>(`/api/subscriber/avatars/${avatarId}/subscribe`, 'POST'),
  unsubscribe: (avatarId: string) =>
    req<void>(`/api/subscriber/avatars/${avatarId}/subscribe`, 'DELETE'),
  checkStatus: (avatarId: string) =>
    req<{ subscribed: boolean; subscription: any }>(
      `/api/subscriber/avatars/${avatarId}/subscription-status`,
    ),
  list: () => req<{ subscriptions: any[]; total: number }>('/api/subscriber/avatars'),
  redeemCode: (code: string) =>
    req<CodeRedeemResult>('/api/avatar-access-codes/redeem', 'POST', { code }),
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminAvatarApi = {
  list: () => req<AvatarListResponse>('/api/admin/avatars'),
  get: (id: string) => req<AvatarResponse>(`/api/admin/avatars/${id}`),
  delete: (id: string) => req<void>(`/api/admin/avatars/${id}`, 'DELETE'),
};

export const adminUserApi = {
  list: (role?: string) =>
    req<UserRecord[]>(`/api/users/admin/users${role ? `?role=${role}` : ''}`),
  delete: (userId: string) =>
    req<void>(`/api/users/admin/users/${userId}`, 'DELETE'),
};
