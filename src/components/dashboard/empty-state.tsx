import React from "react";

export function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-12 bg-muted/10 border-2 border-dashed border-muted rounded-xl text-center space-y-6">
      <div className="p-6 bg-muted/30 rounded-full">
        <svg
          className="w-12 h-12 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">保有証券データがありません</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          証券口座を登録して、CSVファイルからデータをインポートしてください。
          複数の口座をまとめて管理できます。
        </p>
      </div>
      <button
        onClick={onImport}
        className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
      >
        データを取り込む
      </button>
    </div>
  );
}
