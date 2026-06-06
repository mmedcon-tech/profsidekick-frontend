"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Download, ExternalLink, 
  Book, FileText, Video, Link, Package, BookOpen,
  AlertTriangle, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';
import { CourseMaterial, CourseMaterialCreate, MaterialType, CourseMaterialsResponse } from '@/types/materials';

interface CourseMaterialsProps {
  courseId: string;
}

interface MaterialForm extends CourseMaterialCreate {
  file?: File;
}

const MATERIAL_TYPE_OPTIONS = [
  { value: MaterialType.BOOK, label: 'Book', icon: Book },
  { value: MaterialType.ARTICLE, label: 'Article', icon: FileText },
  { value: MaterialType.VIDEO, label: 'Video', icon: Video },
  { value: MaterialType.DOCUMENT, label: 'Document', icon: FileText },
  { value: MaterialType.LINK, label: 'Link', icon: Link },
  { value: MaterialType.OTHER, label: 'Other', icon: Package }
];

export default function CourseMaterials({ courseId }: CourseMaterialsProps) {
  const { token } = useAuth();
  
  // State
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<CourseMaterial | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [materialForm, setMaterialForm] = useState<MaterialForm>({
    title: '',
    description: '',
    material_type: MaterialType.DOCUMENT,
    url: '',
    author: '',
    publication_year: undefined,
    publisher: '',
    isbn: '',
    doi: '',
    is_required: true,
    is_active: true
  });

  // Fetch materials
  const fetchMaterials = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(config.getApiUrl(`/api/course-materials/courses/${courseId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch materials');
      }

      const data: CourseMaterialsResponse = await response.json();
      setMaterials(data.materials);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching materials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [courseId, token]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setUploading(true);
      setError(null);

      if (materialForm.file) {
        // Upload file with material creation
        const formData = new FormData();
        formData.append('file', materialForm.file);
        formData.append('title', materialForm.title);
        formData.append('material_type', materialForm.material_type);
        if (materialForm.description) formData.append('description', materialForm.description);
        if (materialForm.author) formData.append('author', materialForm.author);
        if (materialForm.publication_year) formData.append('publication_year', materialForm.publication_year.toString());
        if (materialForm.publisher) formData.append('publisher', materialForm.publisher);
        if (materialForm.isbn) formData.append('isbn', materialForm.isbn);
        if (materialForm.doi) formData.append('doi', materialForm.doi);
        formData.append('is_required', materialForm.is_required.toString());

        const response = await fetch(config.getApiUrl(`/api/course-materials/courses/${courseId}/upload`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to create material with file');
        }
      } else if (editingMaterial) {
        // Update existing material
        const response = await fetch(config.getApiUrl(`/api/materials/${editingMaterial.id}`), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(materialForm),
        });

        if (!response.ok) {
          throw new Error('Failed to update material');
        }
      } else {
        // Create new material without file
        const response = await fetch(config.getApiUrl(`/api/course-materials/courses/${courseId}`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...materialForm, course_id: courseId }),
        });

        if (!response.ok) {
          throw new Error('Failed to create material');
        }
      }

      // Reset form and refresh materials
      resetForm();
      await fetchMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error saving material:', err);
    } finally {
      setUploading(false);
    }
  };

  // Delete material
  const handleDelete = async (materialId: string) => {
    if (!token || !confirm('Are you sure you want to delete this material?')) return;

    try {
      const response = await fetch(config.getApiUrl(`/api/course-materials/${materialId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete material');
      }

      await fetchMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error deleting material:', err);
    }
  };

  // Reset form
  const resetForm = () => {
    setMaterialForm({
      title: '',
      description: '',
      material_type: MaterialType.DOCUMENT,
      url: '',
      author: '',
      publication_year: undefined,
      publisher: '',
      isbn: '',
      doi: '',
      is_required: true,
      is_active: true
    });
    setShowForm(false);
    setEditingMaterial(null);
  };

  // Start editing
  const startEdit = (material: CourseMaterial) => {
    setEditingMaterial(material);
    setMaterialForm({
      title: material.title,
      description: material.description || '',
      material_type: material.material_type,
      url: material.url || '',
      author: material.author || '',
      publication_year: material.publication_year,
      publisher: material.publisher || '',
      isbn: material.isbn || '',
      doi: material.doi || '',
      is_required: material.is_required,
      is_active: material.is_active
    });
    setShowForm(true);
  };

  // Get icon for material type
  const getTypeIcon = (type: MaterialType) => {
    const typeOption = MATERIAL_TYPE_OPTIONS.find(option => option.value === type);
    const Icon = typeOption?.icon || Package;
    return <Icon className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Course Materials</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage books, articles, videos, and other learning resources</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={uploading}
          aria-busy={uploading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add Material
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {editingMaterial ? 'Edit Material' : 'Add New Material'}
            </h4>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={materialForm.title}
                  onChange={(e) => setMaterialForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Material Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type *
                </label>
                <select
                  value={materialForm.material_type}
                  onChange={(e) => setMaterialForm(prev => ({ ...prev, material_type: e.target.value as MaterialType }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {MATERIAL_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Required */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_required"
                  checked={materialForm.is_required}
                  onChange={(e) => setMaterialForm(prev => ({ ...prev, is_required: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_required" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Required material
                </label>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={materialForm.description}
                  onChange={(e) => setMaterialForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* URL (for links) */}
              {materialForm.material_type === MaterialType.LINK && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL *
                  </label>
                  <input
                    type="url"
                    value={materialForm.url}
                    onChange={(e) => setMaterialForm(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              )}

              {/* File Upload (for documents, videos) */}
              {!editingMaterial && [MaterialType.DOCUMENT, MaterialType.VIDEO].includes(materialForm.material_type) && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    File
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setMaterialForm(prev => ({ ...prev, file: e.target.files?.[0] }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    accept={materialForm.material_type === MaterialType.VIDEO ? "video/*" : ".pdf,.doc,.docx,.txt"}
                  />
                </div>
              )}

              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Author
                </label>
                <input
                  type="text"
                  value={materialForm.author}
                  onChange={(e) => setMaterialForm(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Publication Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Publication Year
                </label>
                <input
                  type="number"
                  min="1800"
                  max="2030"
                  value={materialForm.publication_year || ''}
                  onChange={(e) => setMaterialForm(prev => ({ ...prev, publication_year: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Publisher (for books) */}
              {materialForm.material_type === MaterialType.BOOK && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Publisher
                    </label>
                    <input
                      type="text"
                      value={materialForm.publisher}
                      onChange={(e) => setMaterialForm(prev => ({ ...prev, publisher: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ISBN
                    </label>
                    <input
                      type="text"
                      value={materialForm.isbn}
                      onChange={(e) => setMaterialForm(prev => ({ ...prev, isbn: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              {/* DOI (for articles) */}
              {materialForm.material_type === MaterialType.ARTICLE && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    DOI
                  </label>
                  <input
                    type="text"
                    value={materialForm.doi}
                    onChange={(e) => setMaterialForm(prev => ({ ...prev, doi: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10.1000/example"
                  />
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                aria-busy={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {editingMaterial ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {editingMaterial ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingMaterial ? 'Update Material' : 'Add Material'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Materials List */}
      <div className="space-y-4">
        {materials.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No materials added yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first material
            </button>
          </div>
        ) : (
          materials.map((material) => (
            <div key={material.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    {getTypeIcon(material.material_type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">{material.title}</h4>
                      {material.is_required && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Required
                        </span>
                      )}
                      {!material.is_active && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    {material.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-2">{material.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="capitalize">{material.material_type}</span>
                      {material.author && <span>by {material.author}</span>}
                      {material.publication_year && <span>({material.publication_year})</span>}
                      {material.file_name && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {material.file_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {material.url && (
                    <a
                      href={material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                      title="Open link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  
                  {material.file_path && (
                    <a
                      href={material.file_path.startsWith('http') ? material.file_path : config.getApiUrl(material.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  
                  <button
                    onClick={() => startEdit(material)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                    title="Edit material"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(material.id)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Delete material"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
