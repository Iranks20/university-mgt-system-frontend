import type { ReactNode } from 'react';

type ClinicalPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function ClinicalPageShell({ title, description, children }: ClinicalPageShellProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500">{description}</p>
      </div>
      {children}
    </div>
  );
}
