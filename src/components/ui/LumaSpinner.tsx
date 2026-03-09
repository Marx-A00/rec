/**
 * Luma-style loading spinner.
 * Two rounded shapes animate around corners in opposite phase.
 *
 * Credit: https://21st.dev/community/components/theritikk/luma-spin
 */
export function LumaSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`relative aspect-square w-[65px] ${className}`}>
      <span className='absolute animate-luma-spin rounded-[50px] shadow-[inset_0_0_0_3px] shadow-zinc-100' />
      <span className='absolute animate-luma-spin rounded-[50px] shadow-[inset_0_0_0_3px] shadow-zinc-100 [animation-delay:-1.25s]' />
    </div>
  );
}
