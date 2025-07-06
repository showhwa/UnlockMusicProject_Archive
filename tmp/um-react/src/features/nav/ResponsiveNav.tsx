export interface ResponsiveNavProps {
  navigationClassName?: string;
  navigation?: React.ReactNode;

  className?: string;

  contentClassName?: string;
  children?: React.ReactNode;
}

export function ResponsiveNav({
  className = '',
  navigationClassName = '',
  contentClassName = '',
  children,
  navigation,
}: ResponsiveNavProps) {
  return (
    <div
      className={`@container/nav grow grid grid-cols-1 grid-rows-[auto_1fr] md:grid-rows-1 md:grid-cols-[10rem_1fr] ${className}`}
    >
      {/* Sidebar */}
      <aside className={`bg-base-100 md:p-4 md:block ${navigationClassName}`}>{navigation}</aside>

      {/* Main content */}
      <div className={`p-4 grow ${contentClassName}`}>{children}</div>
    </div>
  );
}
