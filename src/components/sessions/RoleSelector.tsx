"use client";

/**
 * RoleSelector — displays a list of avatar template roles and lets the user
 * pick one per session.  The selection is NOT permanent: the same user can
 * choose a different role every time they start a session.
 *
 * Usage:
 *   <RoleSelector
 *     templateId={avatar.template_id}
 *     selected={selectedRole}
 *     onSelect={setSelectedRole}
 *   />
 *
 * The parent passes the selected role to the chat API as:
 *   preferences: { selected_role: { name, prompt_context } }
 */

import React, { useEffect, useState } from 'react';
import { templateApi, ApiError } from '@/lib/avatarApi';
import type { AvatarTemplateRoleResponse } from '@/types/avatar';
import { Users, Check, ChevronDown, ChevronUp } from 'lucide-react';

export interface SelectedRole {
  id: string;
  name: string;
  prompt_context: string | null;
}

interface Props {
  templateId: string;
  selected: SelectedRole | null;
  onSelect: (role: SelectedRole | null) => void;
  className?: string;
}

export default function RoleSelector({ templateId, selected, onSelect, className = '' }: Props) {
  const [roles, setRoles]       = useState<AvatarTemplateRoleResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [open, setOpen]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!templateId) { setLoading(false); return; }
    templateApi.getRolesForPublisher(templateId)
      .then(setRoles)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load roles'))
      .finally(() => setLoading(false));
  }, [templateId]);

  if (loading || roles.length === 0) return null;
  if (error) return null;  // silently skip if roles unavailable

  const handleSelect = (role: AvatarTemplateRoleResponse) => {
    onSelect({ id: role.id, name: role.name, prompt_context: role.prompt_context });
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-900 transition-colors min-w-[160px] justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Users size={14} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <span className={`truncate ${selected ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-400'}`}>
            {selected ? selected.name : 'Choose role…'}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xs leading-none px-1"
              title="Clear role">
              ×
            </button>
          )}
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden w-full min-w-[200px] max-w-xs">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 px-2">
              Role is per-session — you can change it next time.
            </p>
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            {roles.map((role) => {
              const isSelected = selected?.id === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => handleSelect(role)}
                  className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-gray-50 dark:bg-gray-900 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check size={10} className="text-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium leading-tight ${isSelected ? 'text-blue-700' : 'text-gray-900 dark:text-gray-100'}`}>
                      {role.name}
                    </p>
                    {role.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{role.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Click-outside to close */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
