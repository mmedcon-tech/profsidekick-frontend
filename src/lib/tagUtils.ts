/**
 * Utility functions for handling comma-separated tag strings
 */

export function parseTagsString(tagsString: string): string[] {
  if (!tagsString) return [];
  return tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
}

export function addTagToString(tagsString: string, newTag: string): string {
  const currentTags = parseTagsString(tagsString);
  const trimmedTag = newTag.trim().toLowerCase();
  
  if (!trimmedTag || currentTags.includes(trimmedTag)) {
    return tagsString;
  }
  
  return [...currentTags, trimmedTag].join(', ');
}

export function removeTagFromString(tagsString: string, tagToRemove: string): string {
  const currentTags = parseTagsString(tagsString);
  return currentTags.filter(tag => tag !== tagToRemove).join(', ');
}

export function tagsStringIncludes(tagsString: string, searchTerm: string): boolean {
  const tags = parseTagsString(tagsString);
  return tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
} 