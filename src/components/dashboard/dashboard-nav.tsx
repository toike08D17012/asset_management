import type { ReactNode } from "react";

export type DashboardTab = "overview" | "accounts" | "import";

interface DashboardNavProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

export function DashboardNav({ activeTab, onTabChange }: DashboardNavProps) {
  const items: { id: DashboardTab; label: string; icon: ReactNode }[] = [
    { 
      id: "overview", 
      label: "ダッシュボード", 
      icon: (
        <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ) 
    },
    { 
      id: "accounts", 
      label: "口座管理", 
      icon: (
        <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ) 
    },
    { 
      id: "import", 
      label: "データ取込", 
      icon: (
        <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ) 
    },
  ];

  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
            activeTab === item.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
}
