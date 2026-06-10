'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Image as ImageIcon, RefreshCw, Edit3, Plus, Trash2, Upload, GripVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';

interface SlideData {
  id: number;
  slideNumber: number;
  title: string;
  content: string;
  imagePath?: string;
  thumbnailPath?: string;
  visionInstructions?: string;
  visionModel?: string;
}

interface SlidesPreviewProps {
  slides: SlideData[];
  sessionId: string;
}

export default function SlidesPreview({ slides, sessionId }: SlidesPreviewProps) {
  const { token } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSlide, setSelectedSlide] = useState<SlideData | null>(null);
  const [slidesPerPage, setSlidesPerPage] = useState(12);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [editingVisionInstructions, setEditingVisionInstructions] = useState('');
  const [allSlides, setAllSlides] = useState<SlideData[]>(slides);
  const [editingContent, setEditingContent] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [isAddingSlide, setIsAddingSlide] = useState(false);
  const [isDeletingSlide, setIsDeletingSlide] = useState(false);
  const [isReplacingImage, setIsReplacingImage] = useState(false);
  const [draggedSlideId, setDraggedSlideId] = useState<number | null>(null);
  const [, setIsReordering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceImageInputRef = useRef<HTMLInputElement>(null);

  // Update slides when props change
  useEffect(() => {
    setAllSlides(slides);
  }, [slides]);

  // Calculate pagination
  const totalPages = Math.ceil(allSlides.length / slidesPerPage);
  const startIndex = (currentPage - 1) * slidesPerPage;
  const endIndex = startIndex + slidesPerPage;
  const currentSlides = allSlides.slice(startIndex, endIndex);

  // Adjust slides per page based on screen size
  useEffect(() => {
    const updateSlidesPerPage = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setSlidesPerPage(6); // Mobile: 2x3 grid
      } else if (width < 1024) {
        setSlidesPerPage(9); // Tablet: 3x3 grid
      } else {
        setSlidesPerPage(12); // Desktop: 4x3 grid
      }
    };

    updateSlidesPerPage();
    window.addEventListener('resize', updateSlidesPerPage);
    return () => window.removeEventListener('resize', updateSlidesPerPage);
  }, []);

  const handleSlideClick = (slide: SlideData) => {
    setSelectedSlide(slide);
    setEditingVisionInstructions(slide.visionInstructions || '');
    setEditingContent(slide.content || '');
    setEditingTitle(slide.title || '');
    setIsEditingContent(false);
  };

  const closeModal = () => {
    setSelectedSlide(null);
    setEditingVisionInstructions('');
    setEditingContent('');
    setEditingTitle('');
    setIsEditingContent(false);
  };

  const handleRegenerateSlide = async (slide: SlideData) => {
    if (!token) {
      console.error('No authentication token available');
      return;
    }

    setIsRegenerating(true);
    try {
      const response = await fetch(
        config.getApiUrl(`/api/sessions/${sessionId}/slides/${slide.id}/vision`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            visionInstructions: editingVisionInstructions,
            visionModel: 'gpt-4o', // Default model for now
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to regenerate slide: ${response.statusText}`);
      }

      const updatedSessionData = await response.json();
      
      // Update the slides with the new data
      setAllSlides(updatedSessionData.slidesDetails);
      
      // Update the selected slide with the new data
      const updatedSlide = updatedSessionData.slidesDetails.find((s: SlideData) => s.id === slide.id);
      if (updatedSlide) {
        setSelectedSlide(updatedSlide);
        setEditingVisionInstructions(updatedSlide.visionInstructions || '');
      }

      console.log('✅ Slide regenerated successfully');
    } catch (error) {
      console.error('❌ Error regenerating slide:', error);
      // You might want to show a toast notification here
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveContent = async (slide: SlideData) => {
    if (!token) {
      console.error('No authentication token available');
      return;
    }

    setIsSavingContent(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(
        `${backendUrl}/api/sessions/${sessionId}/slides/${slide.id}/content`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: editingContent,
            title: editingTitle,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save slide content: ${response.statusText}`);
      }

      const updatedSessionData = await response.json();
      
      // Update the slides with the new data
      setAllSlides(updatedSessionData.slidesDetails || allSlides.map(s => 
        s.id === slide.id 
          ? { ...s, content: editingContent, title: editingTitle }
          : s
      ));
      
      // Update the selected slide with the new data
      const updatedSlide = updatedSessionData.slidesDetails?.find((s: SlideData) => s.id === slide.id) ||
        { ...slide, content: editingContent, title: editingTitle };
      setSelectedSlide(updatedSlide);
      
      // Exit editing mode
      setIsEditingContent(false);

      console.log('✅ Slide content saved successfully');
    } catch (error) {
      console.error('❌ Error saving slide content:', error);
      // You might want to show a toast notification here
    } finally {
      setIsSavingContent(false);
    }
  };

  const handleAddSlide = async (file: File) => {
    if (!token) {
      console.error('No authentication token available');
      return;
    }

    setIsAddingSlide(true);
    try {
      const formData = new FormData();
      formData.append('slide_image', file);
      formData.append('vision_instructions', 'You are an AI assignment analysis system. Analyze the student solution against the correct solution and generate structured guidance for an oral examiner.\n\nInputs:\n[Correct solution-ground truth]\n[Student assignment solution]\n[Course Material-optional]\n\nCompare the student solution against the correct solution step-by-step.\nIdentify:\n- correct and incorrect steps\n- reasoning breaks or gaps in logic of the whole solution\n- missing justifications between steps\n- possible misunderstandings\n\nFor each major step, state the key rule, theorem, property, or concept involved for the student to state.\nFlag likely error sources and concepts the examiner should focus on during questioning.\nSuggested probing areas (non-binding) based on observed mistakes and reasoning patterns.\n\nRules:\n- Stay strictly grounded in the submitted work\n- Do not tutor, explain, or solve the problem\n- Do not assign final grades or outcomes');
      formData.append('vision_model', 'gpt-4o');

      const response = await fetch(
        config.getApiUrl(`/api/sessions/${sessionId}/slides/add`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to add slide: ${response.statusText}`);
      }

      const updatedSessionData = await response.json();
      setAllSlides(updatedSessionData.slidesDetails);
      
      console.log('✅ Slide added successfully');
    } catch (error) {
      console.error('❌ Error adding slide:', error);
    } finally {
      setIsAddingSlide(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteSlide = async (slideId: number) => {
    if (!token) {
      console.error('No authentication token available');
      return;
    }

    if (!confirm('Are you sure you want to delete this slide? This action cannot be undone.')) {
      return;
    }

    setIsDeletingSlide(true);
    try {
      const response = await fetch(
        config.getApiUrl(`/api/sessions/${sessionId}/slides/${slideId}`),
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete slide: ${response.statusText}`);
      }

      const updatedSessionData = await response.json();
      setAllSlides(updatedSessionData.slidesDetails);
      
      // Close modal if we deleted the selected slide
      if (selectedSlide?.id === slideId) {
        closeModal();
      }
      
      console.log('✅ Slide deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting slide:', error);
    } finally {
      setIsDeletingSlide(false);
    }
  };

  const handleReplaceImage = async (slideId: number, file: File) => {
    if (!token) {
      console.error('No authentication token available');
      return;
    }

    setIsReplacingImage(true);
    try {
      const formData = new FormData();
      formData.append('slide_image', file);
      
      // Use existing vision instructions if available
      const slide = allSlides.find(s => s.id === slideId);
      if (slide?.visionInstructions) {
        formData.append('vision_instructions', slide.visionInstructions);
      }
      formData.append('vision_model', slide?.visionModel || 'gpt-4o');

      const response = await fetch(
        config.getApiUrl(`/api/sessions/${sessionId}/slides/${slideId}/replace-image`),
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to replace image: ${response.statusText}`);
      }

      const updatedSessionData = await response.json();
      setAllSlides(updatedSessionData.slidesDetails);
      
      // Update selected slide if it's the one we replaced
      if (selectedSlide?.id === slideId) {
        const updatedSlide = updatedSessionData.slidesDetails.find((s: SlideData) => s.id === slideId);
        if (updatedSlide) {
          setSelectedSlide(updatedSlide);
          setEditingVisionInstructions(updatedSlide.visionInstructions || '');
          setEditingContent(updatedSlide.content || '');
          setEditingTitle(updatedSlide.title || '');
        }
      }
      
      console.log('✅ Image replaced successfully');
    } catch (error) {
      console.error('❌ Error replacing image:', error);
    } finally {
      setIsReplacingImage(false);
      if (replaceImageInputRef.current) {
        replaceImageInputRef.current.value = '';
      }
    }
  };

  const handleReorderSlides = async (newOrder: number[]) => {
    if (!token) {
      console.error('No authentication token available');
      return;
    }

    setIsReordering(true);
    try {
      const response = await fetch(
        config.getApiUrl(`/api/sessions/${sessionId}/slides/reorder`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            slideOrder: newOrder,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to reorder slides: ${response.statusText}`);
      }

      const updatedSessionData = await response.json();
      setAllSlides(updatedSessionData.slidesDetails);
      
      console.log('✅ Slides reordered successfully');
    } catch (error) {
      console.error('❌ Error reordering slides:', error);
      // Revert to original order on error
      setAllSlides([...allSlides]);
    } finally {
      setIsReordering(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, slideId: number) => {
    setDraggedSlideId(slideId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSlideId: number) => {
    e.preventDefault();
    
    if (draggedSlideId === null || draggedSlideId === targetSlideId) {
      setDraggedSlideId(null);
      return;
    }

    // Create new order
    const draggedIndex = allSlides.findIndex(s => s.id === draggedSlideId);
    const targetIndex = allSlides.findIndex(s => s.id === targetSlideId);
    
    const newSlides = [...allSlides];
    const [draggedSlide] = newSlides.splice(draggedIndex, 1);
    newSlides.splice(targetIndex, 0, draggedSlide);
    
    // Update local state optimistically
    setAllSlides(newSlides);
    
    // Send new order to backend
    const newOrder = newSlides.map(s => s.id);
    handleReorderSlides(newOrder);
    
    setDraggedSlideId(null);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getImageUrl = (slide: SlideData) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    // Get the image path (prefer thumbnail, fallback to full image)
    const imagePath = slide.thumbnailPath || slide.imagePath;
    
    if (!imagePath) return null;
    
    // If it's already a full URL (S3 or other cloud storage), use it as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // For relative paths, prepend backend URL
    return `${backendUrl}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
  };

  const generateSlidePreview = (slide: SlideData) => {
    const imageUrl = getImageUrl(slide);
    
    // If we have an image URL, use it; otherwise create a text preview
    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt={`Slide ${slide.slideNumber}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to text preview if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }
    
    // Text-based preview fallback
    return (
      <div className="w-full h-full bg-white dark:bg-gray-800 p-3 flex flex-col justify-center items-center text-center">
        <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1 overflow-hidden" style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {slide.title || `Slide ${slide.slideNumber}`}
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400 overflow-hidden" style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}>
          {slide.content || 'No content preview available'}
        </p>
      </div>
    );
  };

  if (!allSlides || allSlides.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Slides Preview</h3>
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">No slides available for this session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Slides Preview ({allSlides.length} slides)
        </h3>
        <div className="flex items-center space-x-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleAddSlide(file);
              }
            }}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAddingSlide}
            className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAddingSlide ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Slide
              </>
            )}
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <>
          {/* Grid View */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {currentSlides.map((slide) => (
              <div
                key={slide.id}
                draggable
                onDragStart={(e) => handleDragStart(e, slide.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, slide.id)}
                onClick={() => handleSlideClick(slide)}
                className={`relative bg-gray-50 dark:bg-gray-900 rounded-lg border ${
                  draggedSlideId === slide.id
                    ? 'border-[#BA984E] opacity-50'
                    : 'border-gray-200 dark:border-gray-700 hover:border-[#BA984E]/50'
                } hover:shadow-md transition-all duration-200 cursor-move group aspect-[4/3]`}
              >
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                  {generateSlidePreview(slide)}
                  <div className="hidden absolute inset-0 bg-white dark:bg-gray-800 p-3 flex flex-col justify-center items-center text-center">
                    <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1 overflow-hidden" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {slide.title || `Slide ${slide.slideNumber}`}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 overflow-hidden" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {slide.content || 'No content preview available'}
                    </p>
                  </div>
                </div>
                
                <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <GripVertical className="w-3 h-3" />
                  {slide.slideNumber}
                </div>
                
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSlide(slide);
                      setEditingVisionInstructions(slide.visionInstructions || '');
                    }}
                    className="p-1 bg-[#133221] text-white rounded hover:bg-[#1a442d] transition-colors"
                    title="View & Edit"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSlide(slide.id);
                    }}
                    disabled={isDeletingSlide}
                    className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                    title="Delete Slide"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center pointer-events-none">
                  <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* List View */}
          <div className="space-y-3 mb-6">
            {currentSlides.map((slide) => {
              const imageUrl = getImageUrl(slide);
              return (
                <div
                  key={slide.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, slide.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, slide.id)}
                  onClick={() => handleSlideClick(slide)}
                  className={`flex items-center space-x-4 p-4 rounded-lg cursor-move transition-colors ${
                    draggedSlideId === slide.id
                      ? 'bg-[#133221]/10 opacity-50'
                      : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="w-16 h-12 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-hidden">
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={`Slide ${slide.slideNumber}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      Slide {slide.slideNumber}: {slide.title || 'Untitled'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {slide.content || 'No content available'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSlideClick(slide);
                      }}
                      className="p-2 text-[#BA984E] hover:bg-[#133221]/5 rounded-lg transition-colors"
                      title="View & Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlide(slide.id);
                      }}
                      disabled={isDeletingSlide}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete Slide"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {startIndex + 1}-{Math.min(endIndex, allSlides.length)} of {allSlides.length} slides
          </p>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (totalPages <= 7 || page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)) {
                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        page === currentPage
                          ? 'bg-[#133221] text-white'
                          : 'hover:bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 3 || page === currentPage + 3) {
                  return <span key={page} className="px-2 text-gray-400">...</span>;
                }
                return null;
              })}
            </div>
            
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Slide Modal */}
      {selectedSlide && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                Slide {selectedSlide.slideNumber}: {selectedSlide.title || 'Untitled'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteSlide(selectedSlide.id)}
                  disabled={isDeletingSlide}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete Slide"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 max-h-[calc(90vh-8rem)] overflow-y-auto">
              {getImageUrl(selectedSlide) ? (
                <div className="mb-6 relative group">
                  <img 
                    src={getImageUrl(selectedSlide) || ''}
                    alt={`Slide ${selectedSlide.slideNumber}`}
                    className="w-full max-h-96 object-contain rounded-lg border"
                  />
                  <input
                    ref={replaceImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && selectedSlide) {
                        handleReplaceImage(selectedSlide.id, file);
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    onClick={() => replaceImageInputRef.current?.click()}
                    disabled={isReplacingImage}
                    className="absolute top-2 right-2 px-3 py-2 bg-white dark:bg-gray-800 bg-opacity-90 hover:bg-opacity-100 rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isReplacingImage ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Replacing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Replace Image
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="mb-6 h-64 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">No image preview available</p>
                  </div>
                </div>
              )}
              
              {/* Vision Instructions - Editable */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Vision Instructions</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                      Model: {selectedSlide.visionModel || 'gpt-4o'}
                    </span>
                  </div>
                </div>
                <textarea
                  value={editingVisionInstructions}
                  onChange={(e) => setEditingVisionInstructions(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BA984E] focus:border-[#BA984E] resize-none"
                  rows={4}
                  placeholder="Enter vision instructions for analyzing this slide..."
                />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Customize how the AI analyzes this slide image to extract content and title.
                  </p>
                  <button
                    onClick={() => handleRegenerateSlide(selectedSlide)}
                    disabled={isRegenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-[#133221] text-white rounded-lg hover:bg-[#1a442d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isRegenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Regenerate Content
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Generated Content - Editable */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Generated Content</h4>
                  <div className="flex items-center gap-2">
                    {!isEditingContent ? (
                      <button
                        onClick={() => setIsEditingContent(true)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#133221]/10 hover:bg-[#133221]/20 text-[#d4af37] rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setIsEditingContent(false);
                            setEditingContent(selectedSlide.content || '');
                            setEditingTitle(selectedSlide.title || '');
                          }}
                          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveContent(selectedSlide)}
                          disabled={isSavingContent}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        >
                          {isSavingContent ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {isEditingContent ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BA984E] focus:border-[#BA984E]"
                        placeholder="Enter slide title..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Content
                      </label>
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BA984E] focus:border-[#BA984E] resize-none"
                        rows={8}
                        placeholder="Enter slide content..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    {selectedSlide.title && (
                      <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{selectedSlide.title}</h5>
                    )}
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedSlide.content || 'No content available'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 