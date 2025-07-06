export function VQuote({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span className="select-none">「</span>
      {children}
      <span className="select-none">」</span>
    </>
  );
}
