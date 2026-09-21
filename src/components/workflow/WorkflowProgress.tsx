import React from 'react';
import type { StudentWorkflowState } from '../../app/workflow/workflowState';

export const WorkflowProgress: React.FC<{ state: StudentWorkflowState; compact?: boolean }> = ({ state, compact = false }) => {
  return (
    <div className="space-y-2.5" aria-label={`Tiến độ ${state.progress}%`}>
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span className="font-medium">{compact ? 'Tiến độ' : 'Tiến trình hồ sơ'}</span>
        <span className="font-bold text-slate-700">{state.progress}%</span>
      </div>
      <div className="v3-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.progress}>
        <div className="v3-progress-fill" style={{ width: `${state.progress}%` }} />
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 pt-2.5">
          {state.steps.map(step => {
            const cls = step.done
              ? 'text-emerald-700'
              : step.active
                ? 'font-bold text-primary-900'
                : 'text-slate-400';
            return (
              <div key={step.id} className={`text-xs font-medium ${cls}`} title={step.label}>
                <span aria-hidden="true">{step.done ? '✓' : step.active ? '●' : '○'}</span> {step.shortLabel}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
