/**
 * Avatar utility functions
 * Generates clean, professional avatar URLs using initials
 */

// Color palette for avatars - professional, accessible colors
const AVATAR_COLORS = [
  '3B82F6', // Blue
  'EC4899', // Pink
  '8B5CF6', // Purple
  '10B981', // Green
  'F59E0B', // Amber
  'EF4444', // Red
  '06B6D4', // Cyan
  '6366F1', // Indigo
];

/**
 * Generate a consistent color based on a string (name or email)
 * Same input always produces the same color
 */
const getColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

/**
 * Generate avatar URL with initials
 * Uses ui-avatars.com for clean, professional initials-based avatars
 *
 * @param name - Person's name
 * @param gender - Optional gender for color selection
 * @returns Avatar URL
 */
export const generateAvatarUrl = (name: string, gender?: 'male' | 'female' | 'other'): string => {
  const encodedName = encodeURIComponent(name);

  // Choose color based on gender if provided, otherwise use name-based color
  let backgroundColor: string;
  if (gender === 'male') {
    backgroundColor = '3B82F6'; // Blue
  } else if (gender === 'female') {
    backgroundColor = 'EC4899'; // Pink
  } else {
    backgroundColor = getColorFromString(name);
  }

  return `https://ui-avatars.com/api/?name=${encodedName}&background=${backgroundColor}&color=fff&size=128&bold=true&format=svg`;
};

/**
 * Generate avatar URL from email (for user accounts)
 * Uses email to ensure consistency
 */
export const generateAvatarFromEmail = (email: string): string => {
  // Extract name from email or use first part
  const namePart = email.split('@')[0].replace(/[._-]/g, ' ');
  const backgroundColor = getColorFromString(email);
  const encodedName = encodeURIComponent(namePart);

  return `https://ui-avatars.com/api/?name=${encodedName}&background=${backgroundColor}&color=fff&size=128&bold=true&format=svg`;
};
