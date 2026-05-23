export enum MaterialType {
  BOOK = "book",
  ARTICLE = "article", 
  VIDEO = "video",
  DOCUMENT = "document",
  LINK = "link",
  OTHER = "other"
}

export interface CourseMaterial {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  material_type: MaterialType;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  url?: string;
  author?: string;
  publication_year?: number;
  publisher?: string;
  isbn?: string;
  doi?: string;
  additional_info?: Record<string, any>;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseMaterialCreate {
  title: string;
  description?: string;
  material_type: MaterialType;
  url?: string;
  author?: string;
  publication_year?: number;
  publisher?: string;
  isbn?: string;
  doi?: string;
  additional_info?: Record<string, any>;
  is_required: boolean;
  is_active: boolean;
}

export interface CourseMaterialsResponse {
  materials: CourseMaterial[];
  total: number;
}

export interface SessionMaterial {
  id: string;
  session_id: string;
  course_material_id: string;
  course_material: CourseMaterial;
  is_included: boolean;
  usage_instructions?: string;
  created_at: string;
  updated_at: string;
}

export interface SessionMaterialCreate {
  course_material_id: string;
  is_included: boolean;
  usage_instructions?: string;
}

export interface SessionMaterialsResponse {
  session_materials: SessionMaterial[];
  total: number;
}

export interface FileUploadResponse {
  success: boolean;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  message?: string;
}
