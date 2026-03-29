export function MaterialIcon({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}
