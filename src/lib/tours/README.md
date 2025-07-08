# NextStep Tour System Documentation

This folder contains the tour system for the music platform, powered by NextStep.js.

## How It Works

The tour system uses [NextStep.js](https://nextstepjs.com/) to create interactive onboarding tours for users.

### Files:
- `musicPlatformTours.ts` - Contains all tour configurations
- `README.md` - This documentation file

## Usage

### 1. Adding the Tour Provider

The tour system is already integrated in `src/components/MusicPlatformTourProvider.tsx` and added to the app layout.

### 2. Starting a Tour

Use the `useNextStep` hook to start tours:

```typescript
import { useNextStep } from 'nextstepjs';

function MyComponent() {
  const { startNextStep } = useNextStep();

  const handleStartTour = () => {
    startNextStep('welcome-onboarding');
  };

  return (
    <button onClick={handleStartTour}>
      Start Welcome Tour
    </button>
  );
}
```

### 3. Available Tours

Current tours in the system:
- **`welcome-onboarding`** - Complete first-time user walkthrough
  - **`navigation-basics`** - Essential navigation and search
  - **`collection-building`** - How to manage music collections

## Adding New Tours

To add a new tour, edit `musicPlatformTours.ts`:

```typescript
export const myNewTour = {
  tour: 'my-new-tour',
  steps: [
    {
      icon: '🎵',
      title: 'My Step Title',
      content: 'Explanation of this step...',
      selector: '#my-element-id',
      position: 'bottom' as const,
      side: 'bottom' as const,
      showControls: true,
      showSkip: true,
    },
    // ... more steps
  ],
};

// Add to the exports array
export const musicPlatformTours = [
  welcomeOnboardingTour,
  navigationBasicsTour,
  collectionBuildingTour,
  myNewTour, // Add here
];
```

### Step Configuration

Each step needs:
- `icon`: Emoji or icon to display
- `title`: Step title
- `content`: Description text
- `selector`: CSS selector for element to highlight
- `position`: Where to position the tour popup
- `side`: Which side of the element to show on
- `showControls`: Enable Next/Previous buttons
- `showSkip`: Enable Skip button

### Element Targeting

Make sure your target elements have unique IDs:

```tsx
<input id="search-bar" placeholder="Search..." />
<button id="collections-btn">My Collections</button>
```

## Keyboard Navigation

Tours support keyboard navigation:
- **Enter/Space**: Next step
- **Escape**: Close tour
- **Tab**: Navigate through tour controls

## Testing

Use the `TourTestComponent` to test tours during development. It provides buttons to start each tour.

## Notes

- Tours are lightweight and use the existing NextStep.js library
- Keep tour steps focused and concise
- Test tours on different screen sizes
- Make sure target elements exist before starting tours 

