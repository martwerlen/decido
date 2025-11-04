import { Avatar } from '@mui/material';

interface UserAvatarProps {
  user: {
    name?: string | null;
    image?: string | null;
  };
  size?: 'small' | 'medium' | 'large';
}

/**
 * Génère les initiales à partir du nom
 */
function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Génère une couleur déterministe basée sur le nom
 */
function getColorFromName(name?: string | null): string {
  if (!name) return '#4a7c59'; // couleur primary par défaut

  // Calculer un hash simple du nom
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Palette de couleurs harmonieuses (extraites du design system)
  const colors = [
    '#4a7c59', // primary (vert nature)
    '#d4896b', // secondary (orange terre)
    '#cb6e5e', // accent (rouge doux)
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
  ];

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Composant Avatar réutilisable avec support des images et initiales
 */
export default function UserAvatar({ user, size = 'small' }: UserAvatarProps) {
  const sizeMap = {
    small: 32,
    medium: 40,
    large: 48,
  };

  const fontSizeMap = {
    small: '0.875rem',
    medium: '1rem',
    large: '1.25rem',
  };

  const dimensions = sizeMap[size];
  const fontSize = fontSizeMap[size];
  const initials = getInitials(user?.name);
  const bgColor = getColorFromName(user?.name);

  return (
    <Avatar
      src={user?.image || undefined}
      sx={{
        width: dimensions,
        height: dimensions,
        fontSize: fontSize,
        bgcolor: user?.image ? 'transparent' : bgColor,
        color: 'white',
        fontWeight: 500,
      }}
    >
      {!user?.image && initials}
    </Avatar>
  );
}
