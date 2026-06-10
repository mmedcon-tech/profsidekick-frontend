"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, CheckCircle, Circle, ExternalLink, Download, 
  FileText, AlertTriangle, X, Edit2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';
import { 
  CourseMaterial, SessionMaterial, SessionMaterialCreate, 
  SessionMaterialsResponse, CourseMaterialsResponse, MaterialType 
} from '@/types/materials';

interface SessionMaterialsProps {
  sessionId: string;
  courseId: string;
}

interface MaterialSelectionModal {
  isOpen: boolean;
  availableMaterials: CourseMaterial[];
  selectedMaterials: Set<string>;
}

export default function SessionMaterials({ sessionId, courseId }: SessionMaterialsProps) {
  const { token } = useAuth();
  
  // State
  const [sessionMaterials, setSessionMaterials] = useState<SessionMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Modal state
  const [materialModal, setMaterialModal] = useState<MaterialSelectionModal>({
    isOpen: false,
    availableMaterials: [],
    selectedMaterials: new Set()
  });

  // Edit state
  const [editingInstructions, setEditingInstructions] = useState<string | null>(null);
  const [instructionsText, setInstructionsText] = useState('');

  // Fetch session materials
  const fetchSessionMaterials = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(config.getApiUrl(`/api/course-materials/sessions/${sessionId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch session materials');
      }

      const data: SessionMaterialsResponse = await response.json();
      setSessionMaterials(data.session_materials);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching session materials:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available course materials for selection
  const fetchAvailableMaterials = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(config.getApiUrl(`/api/course-materials/courses/${courseId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch course materials');
      }

      const data: CourseMaterialsResponse = await response.json();
      
      // Filter out materials already linked to this session
      const sessionMaterialIds = new Set(sessionMaterials.map(sm => sm.course_material_id));
      const availableMaterials = data.materials.filter(material => 
        !sessionMaterialIds.has(material.id) && material.is_active
      );

      setMaterialModal(prev => ({
        ...prev,
        isOpen: true,
        availableMaterials,
        selectedMaterials: new Set()
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching available materials:', err);
    }
  };

  useEffect(() => {
    fetchSessionMaterials();
  }, [sessionId, token]);

  // Toggle material selection in modal
  const toggleMaterialSelection = (materialId: string) => {
    setMaterialModal(prev => {
      const newSelected = new Set(prev.selectedMaterials);
      if (newSelected.has(materialId)) {
        newSelected.delete(materialId);
      } else {
        newSelected.add(materialId);
      }
      return { ...prev, selectedMaterials: newSelected };
    });
  };

  // Add selected materials to session
  const addMaterialsToSession = async () => {
    if (!token || materialModal.selectedMaterials.size === 0) return;

    try {
      setSaving(true);
      setError(null);

      // Add each selected material to the session
      const promises = Array.from(materialModal.selectedMaterials).map(materialId => {
        const requestData: SessionMaterialCreate = {
          course_material_id: materialId,
          is_included: true
        };

        return fetch(config.getApiUrl(`/api/course-materials/sessions/${sessionId}`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
      });

      await Promise.all(promises);
      
      // Close modal and refresh
      setMaterialModal(prev => ({ ...prev, isOpen: false, selectedMaterials: new Set() }));
      await fetchSessionMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error adding materials to session:', err);
    } finally {
      setSaving(false);
    }
  };

  // Toggle material inclusion
  const toggleMaterialInclusion = async (sessionMaterialId: string, currentStatus: boolean) => {
    if (!token) return;

    try {
      const response = await fetch(config.getApiUrl(`/api/course-materials/session-links/${sessionMaterialId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_included: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update material inclusion');
      }

      await fetchSessionMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error updating material inclusion:', err);
    }
  };

  // Update usage instructions
  const updateInstructions = async (sessionMaterialId: string, instructions: string) => {
    if (!token) return;

    try {
      const response = await fetch(config.getApiUrl(`/api/course-materials/session-links/${sessionMaterialId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usage_instructions: instructions }),
      });

      if (!response.ok) {
        throw new Error('Failed to update instructions');
      }

      setEditingInstructions(null);
      setInstructionsText('');
      await fetchSessionMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error updating instructions:', err);
    }
  };

  // Remove material from session
  const removeMaterialFromSession = async (sessionMaterialId: string) => {
    if (!token || !confirm('Remove this material from the session?')) return;

    try {
      const response = await fetch(config.getApiUrl(`/api/course-materials/session-links/${sessionMaterialId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove material from session');
      }

      await fetchSessionMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error removing material from session:', err);
    }
  };

  // Start editing instructions
  const startEditInstructions = (sessionMaterial: SessionMaterial) => {
    setEditingInstructions(sessionMaterial.id);
    setInstructionsText(sessionMaterial.usage_instructions || '');
  };

  // Get material type icon
  const getTypeIcon = (type: MaterialType) => {
    switch (type) {
      case MaterialType.BOOK:
        return '📚';
      case MaterialType.ARTICLE:
        return '📄';
      case MaterialType.VIDEO:
        return '🎥';
      case MaterialType.DOCUMENT:
        return '📋';
      case MaterialType.LINK:
        return '🔗';
      default:
        return '📦';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 dark:border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Session Materials</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Select which course materials to include in this session</p>
        </div>
        <button
          onClick={fetchAvailableMaterials}
          className="flex items-center gap-2 bg-emerald-600 dark:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:ring-offset-2"
        >
          <Plus className="w-4 h-4" />
          Add Materials
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Session Materials List */}
      <div className="space-y-4">
        {sessionMaterials.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No materials selected for this session</p>
            <button
              onClick={fetchAvailableMaterials}
              className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:text-emerald-300 font-medium"
            >
              Add materials from your course
            </button>
          </div>
        ) : (
          sessionMaterials.map((sessionMaterial) => {
            const material = sessionMaterial.course_material;
            const isIncluded = sessionMaterial.is_included;
            
            return (
              <div 
                key={sessionMaterial.id} 
                className={`border rounded-lg p-4 transition-all ${
                  isIncluded 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Inclusion toggle */}
                    <button
                      onClick={() => toggleMaterialInclusion(sessionMaterial.id, isIncluded)}
                      className={`mt-1 p-1 rounded-full transition-colors ${
                        isIncluded 
                          ? 'text-green-600 hover:text-green-700' 
                          : 'text-gray-400 hover:text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {isIncluded ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getTypeIcon(material.material_type)}</span>
                        <h4 className={`text-lg font-medium ${isIncluded ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                          {material.title}
                        </h4>
                        {material.is_required && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Required
                          </span>
                        )}
                        {isIncluded && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Included
                          </span>
                        )}
                      </div>
                      
                      {material.description && (
                        <p className={`mb-2 ${isIncluded ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400'}`}>
                          {material.description}
                        </p>
                      )}
                      
                      <div className={`flex items-center gap-4 text-sm ${isIncluded ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400'}`}>
                        <span className="capitalize">{material.material_type}</span>
                        {material.author && <span>by {material.author}</span>}
                        {material.publication_year && <span>({material.publication_year})</span>}
                      </div>

                      {/* Usage Instructions */}
                      {isIncluded && (
                        <div className="mt-3">
                          {editingInstructions === sessionMaterial.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={instructionsText}
                                onChange={(e) => setInstructionsText(e.target.value)}
                                placeholder="Add usage instructions for this session..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500 text-sm"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateInstructions(sessionMaterial.id, instructionsText)}
                                  className="px-3 py-1 bg-emerald-600 dark:bg-emerald-700 text-white text-sm rounded hover:bg-emerald-700 dark:hover:bg-emerald-600"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingInstructions(null)}
                                  className="px-3 py-1 bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usage Instructions</h5>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {sessionMaterial.usage_instructions || 'No specific instructions provided.'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => startEditInstructions(sessionMaterial)}
                                  className="ml-2 p-1 text-gray-500 dark:text-gray-400 hover:text-emerald-700 dark:text-emerald-400 rounded"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {material.url && (
                      <a
                        href={material.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:bg-emerald-900/20"
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
                      onClick={() => removeMaterialFromSession(sessionMaterial.id)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Remove from session"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Material Selection Modal */}
      {materialModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Materials to Session</h3>
                <button
                  onClick={() => setMaterialModal(prev => ({ ...prev, isOpen: false }))}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {materialModal.availableMaterials.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No available materials. All course materials are already added to this session.
                </p>
              ) : (
                <div className="space-y-3">
                  {materialModal.availableMaterials.map((material) => (
                    <div
                      key={material.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        materialModal.selectedMaterials.has(material.id)
                          ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => toggleMaterialSelection(material.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {materialModal.selectedMaterials.has(material.id) ? (
                            <CheckCircle className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{getTypeIcon(material.material_type)}</span>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{material.title}</h4>
                            {material.is_required && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Required
                              </span>
                            )}
                          </div>
                          
                          {material.description && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{material.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="capitalize">{material.material_type}</span>
                            {material.author && <span>by {material.author}</span>}
                            {material.publication_year && <span>({material.publication_year})</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
              <button
                onClick={() => setMaterialModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={addMaterialsToSession}
                disabled={materialModal.selectedMaterials.size === 0 || saving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Selected ({materialModal.selectedMaterials.size})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
