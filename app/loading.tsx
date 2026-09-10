export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface flex items-center justify-center">
      <div className="text-center animate-pulse">
        <div className="w-10 h-10 mx-auto mb-4 rounded-full bg-muted" />
        <div className="h-4 w-32 mx-auto bg-muted rounded" />
      </div>
    </div>
  );
}
