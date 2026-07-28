import type { ReactNode } from 'react';

type HrPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function HrPageShell({ title, description, children, actions }: HrPageShellProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              UI Preview
            </span>
          </div>
          <p className="text-gray-500 mt-1">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
