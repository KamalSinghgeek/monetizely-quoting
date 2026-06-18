export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}
