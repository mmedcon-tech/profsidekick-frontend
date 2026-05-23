'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Tag, Folder, AlertCircle } from 'lucide-react';
import { CustomPrompt } from '@/hooks/usePrompts';
import { parseTagsString, addTagToString, removeTagFromString } from '@/lib/tagUtils';

interface PromptCreationModalProps {
  prompt?: CustomPrompt | null;
  onSave: (prompt: Omit<CustomPrompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'userId'>) => void;
  onClose: () => void;
}

const CATEGORIES = [
  'Mathematics',
  'Science', 
  'Language Arts',
  'History',
  'Programming',
  'Business',
  'Art & Design',
  'Music',
  'Other'
];

export default function PromptCreationModal({ prompt, onSave, onClose }: PromptCreationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '', // This will be the user-editable part only
    category: 'Other',
    tags: '', // Comma-separated string
    isPublic: false
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Function to get system instructions (same as AISettings)
  const getSystemInstructions = () => {
    return `You are ProfSidekick, an AI teaching assistant for interactive classroom presentations.

CORE FUNCTIONALITY:
- Navigate slides using nextSlide(), previousSlide(), and goToSlide(slideNumber) functions
- Receive real-time notifications when users manually change slides via [SLIDE CHANGE] messages
- Provide clear explanations and engage with students during presentations
- Stay interruptible and responsive to student questions at any time

TEACHING BEHAVIOR:
- Speak clearly and enthusiastically like a knowledgeable instructor
- Reference specific slide numbers when discussing content
- Pause and listen for student interruptions (questions, requests for clarification)
- Adapt explanations to student comprehension levels
- Encourage student participation and questions

SLIDE NAVIGATION:
- Use slide functions to control presentation flow
- Acknowledge slide changes naturally when notified
- Stay aware of current slide position and total slide count
- Wait for user input before automatically advancing slides

Additional custom instructions will be provided separately.`;
  };

  // Initialize form with existing prompt data if editing
  useEffect(() => {
    if (prompt) {
      // Parse content (JSON format or legacy string format)
      let userContent = "";
      const contentStr = prompt.content || "";
      
      try {
        // Try to parse as JSON first (new format)
        const structuredContent = JSON.parse(contentStr);
        if (structuredContent && typeof structuredContent === 'object') {
          userContent = structuredContent.editable || "";
          console.log("✅ Loaded structured prompt content (JSON format)");
        }
      } catch (err) {
        console.error('Error parsing prompt content:', err);
        // Fallback to legacy string parsing
        console.log("📄 Parsing legacy prompt content format");
        if (contentStr && !contentStr.includes("ProfSidekick")) {
          // If it doesn't look like system instructions, treat as user content
          userContent = contentStr;
        }
      }
      
      setFormData({
        name: prompt.name || '',
        description: prompt.description || '',
        content: userContent,
        category: prompt.category || 'Other',
        tags: prompt.tags || '', // Already a string now
        isPublic: Boolean(prompt.isPublic) // Ensure it's always a boolean
      });
    }
  }, [prompt]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? Boolean((e.target as HTMLInputElement).checked) : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const updatedTags = addTagToString(formData.tags, tagInput.trim());
      setFormData(prev => ({
        ...prev,
        tags: updatedTags
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = removeTagFromString(formData.tags, tagToRemove);
    setFormData(prev => ({
      ...prev,
      tags: updatedTags
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Prompt name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Prompt name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Prompt content is required';
    } else if (formData.content.length < 50) {
      newErrors.content = 'Prompt content must be at least 50 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    
    try {
      // Create structured content as JSON
      const structuredContent = {
        version: "1.0",
        core: getSystemInstructions(),
        editable: formData.content || "",
        timestamp: new Date().toISOString()
      };

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSave({
        ...formData,
        content: JSON.stringify(structuredContent), // Save as JSON string
        isDefault: false
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving prompt:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {prompt ? 'Edit Prompt' : 'Create New Prompt'}
            </h2>
            <p className="text-gray-600">
              {prompt ? 'Update your custom AI prompt' : 'Create a custom AI prompt for your teaching sessions'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Advanced Math Tutor"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <div className="relative">
                  <Folder className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.category ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    {CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.category}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Brief description of what this prompt does..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.description}
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Tags</h3>
            
            <div>
              <label htmlFor="tagInput" className="block text-sm font-medium text-gray-700 mb-2">
                Add Tags (Press Enter to add)
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="tagInput"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="e.g., math, algebra, step-by-step"
                />
              </div>
              
              {formData.tags && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {parseTagsString(formData.tags).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Prompt Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Prompt Content</h3>
            
            {/* User-Editable Instructions */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Custom Teaching Instructions *
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                rows={8}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.content ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Add your custom teaching style, specific behaviors, or domain expertise..."
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.content}
                </p>
              )}
              <p className="mt-2 text-sm text-gray-500">
                Write clear, detailed instructions for how the AI should behave. Include teaching style, 
                tone, and specific behaviors you want the AI to exhibit. This will be combined with ProfSidekick&apos;s core instructions below.
              </p>
            </div>

            {/* System Instructions Preview (Read-only) */}
            <div>
              <label htmlFor="system_preview" className="block text-sm font-medium text-gray-700 mb-2">
                ProfSidekick Core Instructions (Preview)
              </label>
              <textarea 
                id="system_preview" 
                value={getSystemInstructions()}
                readOnly
                rows={6} 
                className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-lg text-gray-600 text-sm" 
              />
              <p className="mt-2 text-sm text-gray-500">
                Core ProfSidekick instructions that will be automatically included with your custom instructions.
              </p>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Settings</h3>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                name="isPublic"
                checked={Boolean(formData.isPublic)}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                Make this prompt public (other users can discover and use it)
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {prompt ? 'Update Prompt' : 'Create Prompt'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 