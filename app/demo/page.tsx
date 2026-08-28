export default function DemoPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-900 text-white">
      <main className="max-w-2xl text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-pink-500">MediKiosk Demo Sandbox</h1>
        <p className="text-lg text-slate-300">
          A pre-configured sandbox to demonstrate voice intake, clinical summarization, and mock integrations.
        </p>
      </main>
    </div>
  );
}
