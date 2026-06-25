/** Short spoken greeting for marketplace avatar speech preview. */
export function buildAvatarPreviewGreeting(userName: string, avatarName: string): string {
  const first = userName.trim().split(/\s+/)[0] || 'there';
  return `Hi ${first}, I'm ${avatarName}. I'm really looking forward to helping you learn today.`;
}
