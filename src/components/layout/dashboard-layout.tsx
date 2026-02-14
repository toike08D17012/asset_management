import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
}

export function DashboardLayout({ children, sidebar }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-r border-border bg-muted/20 p-4 hidden md:block shrink-0">
        <div className="font-bold text-xl mb-8 px-4 py-2">Asset Manager</div>
        {sidebar}
      </aside>
      <main className="flex-1 flex flex-col min-w-0 bg-background/50">
        <div className="md:hidden border-b p-4 flex items-center justify-between bg-card">
           <div className="font-bold">Asset Manager</div>
           {/* Mobile menu trigger could go here */}
        </div>
        <div className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
