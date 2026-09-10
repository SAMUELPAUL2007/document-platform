export default function ToolPageLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8">
          <div className="h-10 w-64 mx-auto rounded-lg skeleton mb-3" />
          <div className="h-5 w-96 mx-auto rounded skeleton" />
        </div>
        <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full skeleton mb-4" />
          <div className="h-5 w-48 mx-auto rounded skeleton mb-2" />
          <div className="h-4 w-64 mx-auto rounded skeleton" />
        </div>
        <div className="mt-8 p-6 rounded-2xl bg-white border border-border">
          <div className="h-4 w-32 rounded skeleton mb-4" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded skeleton" />
            <div className="h-4 w-3/4 rounded skeleton" />
            <div className="h-4 w-5/6 rounded skeleton" />
          </div>
        </div>
      </div>
    </div>
  );
}
