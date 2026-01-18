// Mobile Component Library
// Re-exports for easy importing

// Layout & Navigation
export { default as MobileBottomNav } from './MobileBottomNav';

// Buttons
export { MobileButton, mobileButtonVariants } from './MobileButton';
export type { MobileButtonProps } from './MobileButton';

// Cards
export {
  MobileCard,
  MobileCardHeader,
  MobileCardTitle,
  MobileCardDescription,
  MobileCardContent,
  MobileCardFooter,
  mobileCardVariants,
} from './MobileCard';
export type { MobileCardProps } from './MobileCard';

// Inputs
export { MobileInput } from './MobileInput';
export type { MobileInputProps } from './MobileInput';

// Feed Cards
export { default as MobileRecommendationCard } from './MobileRecommendationCard';
export { default as MobileCollectionCard } from './MobileCollectionCard';
export { default as MobileFollowCard } from './MobileFollowCard';

// Album Components
export { default as MobileAlbumRecommendations } from './MobileAlbumRecommendations';

// Artist Components
export { default as MobileDiscography } from './MobileDiscography';

// Bottom Sheet
export {
  MobileBottomSheet,
  MobileBottomSheetTrigger,
  MobileBottomSheetClose,
  MobileBottomSheetContent,
  MobileBottomSheetHeader,
  MobileBottomSheetBody,
  MobileBottomSheetFooter,
} from './MobileBottomSheet';

// Collection Sheet
export { default as CollectionSelectionSheet } from './CollectionSelectionSheet';
