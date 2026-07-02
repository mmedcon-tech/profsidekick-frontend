'use client';

import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, Copy, Check, Star, Tag, Clock, User } from 'lucide-react';
import PromptCreationModal from './PromptCreationModal';
import { usePrompts, CustomPrompt } from '@/hooks/usePrompts';
import { parseTagsString, tagsStringIncludes } from '@/lib/tagUtils';

interface PromptLibraryProps {
  currentInstructions: string;
  onSelectPrompt: (content: string) => void;
  onClose: () => void;
}



export default function PromptLibrary({ currentInstructions, onSelectPrompt, onClose }: PromptLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Use the backend hook for prompts
  const { 
    prompts: userPrompts, 
    defaultPrompts, 
    loading, 
    error, 
    createPrompt, 
    updatePrompt, 
    deletePrompt,
    refetch 
  } = usePrompts({
    search: searchTerm,
    category: selectedCategory !== 'All' ? selectedCategory : undefined,
    includePublic: true
  });

  const allPrompts = [...defaultPrompts, ...userPrompts];
  const categories = ['All', ...Array.from(new Set(allPrompts.map(p => p.category)))];

  const filteredPrompts = allPrompts.filter(prompt => {
    const matchesSearch = searchTerm === '' || 
      prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tagsStringIncludes(prompt.tags, searchTerm);
    const matchesCategory = selectedCategory === 'All' || prompt.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopyPrompt = async (prompt: CustomPrompt) => {
    try {
      // Extract only the editable part for copying
      let editableContent = "";
      const contentStr = prompt.content || "";
      
      try {
        // Try to parse as JSON first (new format)
        const structuredContent = JSON.parse(contentStr);
        if (structuredContent && typeof structuredContent === 'object') {
          editableContent = structuredContent.editable || "";
        } else {
          editableContent = contentStr;
        }
      } catch (err) {
        console.error('Failed to copy prompt:', err);
        // Fallback to legacy string content
        if (contentStr && !contentStr.includes("ProfSidekick")) {
          editableContent = contentStr;
        }
      }
      
      await navigator.clipboard.writeText(editableContent);
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  const handleSelectPrompt = (prompt: CustomPrompt) => {
    // Extract only the editable part from the prompt content
    let editableContent = "";
    const contentStr = prompt.content || "";
    
    try {
      // Try to parse as JSON first (new format)
      const structuredContent = JSON.parse(contentStr);
      if (structuredContent && typeof structuredContent === 'object') {
        editableContent = structuredContent.editable || "";
        console.log("✅ Extracted editable content from structured prompt");
      } else {
        editableContent = contentStr;
      }
    } catch (err) {
      console.error('Failed to select prompt:', err);
      // Fallback to legacy string parsing
      console.log("📄 Using legacy prompt content as editable content");
      if (contentStr && !contentStr.includes("ProfSidekick")) {
        // If it doesn't look like system instructions, treat as user content
        editableContent = contentStr;
      }
      // If it contains ProfSidekick, it's likely system instructions - use empty string
    }
    
    onSelectPrompt(editableContent);
    onClose();
  };

  const handleDeletePrompt = async (promptId: string) => {
    try {
      await deletePrompt(promptId);
    } catch (error) {
      console.error('Failed to delete prompt:', error);
    }
  };

  const handleSavePrompt = async (promptData: Omit<CustomPrompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'userId'>) => {
    try {
      if (editingPrompt) {
        // Update existing prompt
        await updatePrompt(editingPrompt.id, promptData);
      } else {
        // Create new prompt
        await createPrompt(promptData);
      }
    } catch (error) {
      console.error('Failed to save prompt:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Prompt Library</h2>
            <p className="text-gray-600 dark:text-gray-400">Choose from default prompts or your custom saved prompts</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:bg-gray-800 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search prompts by name, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Prompt
            </button>
          </div>

          {/* Current Instructions */}
          {currentInstructions && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg">
              <h3 className="font-semibold text-emerald-950 dark:text-emerald-100 mb-2">Current Instructions</h3>
              <p className="text-emerald-900 dark:text-emerald-200 text-sm">{currentInstructions.substring(0, 200)}...</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 dark:border-emerald-500"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading prompts...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">Error loading prompts: {error}</p>
              <button 
                onClick={refetch}
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Prompts Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-emerald-300 dark:border-emerald-600 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{prompt.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{prompt.description}</p>
                  </div>
                  {prompt.isDefault && (
                    <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 ml-2" />
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {parseTagsString(prompt.tags).slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                  {parseTagsString(prompt.tags).length > 3 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">+{parseTagsString(prompt.tags).length - 3} more</span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {prompt.usageCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(prompt.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-full text-xs">
                    {prompt.category}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelectPrompt(prompt)}
                    className="flex-1 px-3 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors text-sm"
                  >
                    Use This Prompt
                  </button>
                  <button
                    onClick={() => handleCopyPrompt(prompt)}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors"
                  >
                    {copiedId === prompt.id ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                  {!prompt.isDefault && (
                    <>
                      <button
                        onClick={() => setEditingPrompt(prompt)}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors"
                      >
                        <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(prompt.id)}
                        className="p-2 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            </div>
          )}

          {!loading && !error && filteredPrompts.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">No prompts found matching your criteria</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
              >
                Create Your First Custom Prompt
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPrompt) && (
        <PromptCreationModal
          prompt={editingPrompt}
          onSave={handleSavePrompt}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPrompt(null);
          }}
        />
      )}
    </div>
  );
} 