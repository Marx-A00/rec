import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';

interface SimilarityRatingDialProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const SimilarityRatingDial = memo(function SimilarityRatingDial({
  value,
  onChange,
  disabled = false,
}: SimilarityRatingDialProps) {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);

  // Memoize expensive calculations
  const rotation = useMemo(() => ((value - 5) / 5) * 135, [value]);

  const knobStyle = useMemo(
    () => ({
      background:
        'conic-gradient(from 0deg, #71717a, #a1a1aa, #d4d4d8, #a1a1aa, #71717a)',
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
    }),
    [rotation]
  );

  const ledPositions = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const ledAngle = (i * 135) / 5 - 90;
        const ledScore = i + 5;
        const ledX = 50 + 35 * Math.cos((ledAngle * Math.PI) / 180);
        const ledY = 50 + 35 * Math.sin((ledAngle * Math.PI) / 180);
        return { ledScore, ledX, ledY, isActive: ledScore <= value };
      }),
    [value]
  );

  const statusText = useMemo(() => {
    if (value <= 6) return { text: 'DECENT', color: 'text-yellow-400' };
    if (value <= 8) return { text: 'GREAT', color: 'text-green-400' };
    return { text: 'PERFECT', color: 'text-emerald-400' };
  }, [value]);

  const scoreColor = useMemo(() => {
    if (value <= 6) return 'text-yellow-400';
    if (value <= 8) return 'text-green-400';
    return 'text-emerald-400';
  }, [value]);

  const updateValueFromMouse = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!knobRef.current) return;

      const rect = knobRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      let degrees = (angle * 180) / Math.PI + 90; // Convert to 0-360 with 0 at top

      // Normalize to 0-360
      if (degrees < 0) degrees += 360;

      // Map angle to our range (0-135 degrees = scores 5-10)
      // If below 0 degrees (dragging above 12 o'clock), stay at score 5
      // If above 135 degrees, stay at score 10
      let clampedDegrees;
      if (degrees > 180) {
        // If we're in the left half (past 6 o'clock), clamp to 0 (score 5)
        clampedDegrees = 0;
      } else if (degrees > 135) {
        // If we're past the southeast position, clamp to 135 (score 10)
        clampedDegrees = 135;
      } else {
        clampedDegrees = Math.max(0, Math.min(135, degrees));
      }

      const newValue = Math.round((clampedDegrees / 135) * 5) + 5;

      if (newValue >= 5 && newValue <= 10) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      setIsDragging(true);
      updateValueFromMouse(e);
      e.preventDefault();
    },
    [disabled, updateValueFromMouse]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      updateValueFromMouse(e);
    },
    [updateValueFromMouse]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging && !disabled) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, disabled, handleMouseMove, handleMouseUp]);

  return (
    <div className='flex flex-col items-center space-y-2'>
      {/* Dial Label */}
      <div className='text-center'>
        <div className='text-sm font-bold text-zinc-300 mb-1'>SCORE</div>
        <div className={`text-xl font-bold ${scoreColor}`}>{value}/10</div>
      </div>

      {/* Main Dial Container */}
      <div className='relative'>
        {/* Outer Ring with LED Indicators */}
        <div className='relative w-20 h-20 rounded-full bg-zinc-700 border-2 border-zinc-600'>
          {/* LED Ring */}
          {ledPositions.map((led, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 rounded-full ${
                led.isActive
                  ? led.ledScore <= 6
                    ? 'bg-yellow-500'
                    : led.ledScore <= 8
                      ? 'bg-green-500'
                      : 'bg-emerald-400'
                  : 'bg-zinc-800'
              }`}
              style={{
                left: `${led.ledX}%`,
                top: `${led.ledY}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}

          {/* Inner Knob */}
          <div
            ref={knobRef}
            className={`absolute top-1/2 left-1/2 w-12 h-12 rounded-full cursor-pointer ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
            }`}
            style={knobStyle}
            onMouseDown={handleMouseDown}
          >
            {/* Knob Indicator Line */}
            <div
              className='absolute w-0.5 h-4 bg-white rounded-full'
              style={{
                top: '4px',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            />

            {/* Center Dot */}
            <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-900 rounded-full' />
          </div>
        </div>
      </div>

      {/* Status Text */}
      <div className='text-center'>
        <div className={`text-xs font-medium ${statusText.color}`}>
          {statusText.text}
        </div>
      </div>
    </div>
  );
});

export default SimilarityRatingDial;
