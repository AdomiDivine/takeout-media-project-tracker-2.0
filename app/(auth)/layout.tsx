export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand">TM Work OS</h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">Takeout Media</p>
        </div>
        {children}
      </div>
    </div>
  );
}
