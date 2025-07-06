export function HiWord({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <mark className={`bg-orange-100 rounded-md px-2 mx-1 ${className}`}>{children}</mark>;
}
