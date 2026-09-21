import React from 'react';
import type { TaskRecommendation } from '../../types';
import { Sparkles, ArrowRight, HelpCircle, CheckCircle } from 'lucide-react';

interface ExplainableNextStepCardProps {
  recommendation: TaskRecommendation;
  onStartAssignment: (assignmentId: string) => void;
}

export const ExplainableNextStepCard: React.FC<ExplainableNextStepCardProps> = ({
  recommendation,
  onStartAssignment
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
      {/* Top Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary-50 text-primary-700 text-xs font-medium border border-primary-200">
          <Sparkles className="w-3.5 h-3.5" />
          Đề xuất nhiệm vụ tiếp theo
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Trọng tâm cải thiện: <strong className="text-slate-800">{recommendation.targetAxisTitle}</strong>
        </span>
      </div>

      {/* Task Title */}
      <div>
        <h3 className="text-base font-bold text-slate-900">
          {recommendation.assignmentTitle}
        </h3>
      </div>

      {/* Explicit Pedagogical Rationale */}
      <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <HelpCircle className="w-3.5 h-3.5 text-primary-600" />
          <span>Cơ sở sư phạm đề xuất:</span>
        </div>
        <p className="text-slate-600 leading-relaxed">
          {recommendation.rationale}
        </p>
      </div>

      {/* Expected Competency Gain */}
      <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-md border border-emerald-200">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>
          <strong>Mục tiêu năng lực:</strong> {recommendation.expectedGain}
        </span>
      </div>

      {/* Action Button */}
      <div className="pt-1 flex items-center justify-end">
        <button
          type="button"
          onClick={() => onStartAssignment(recommendation.nextAssignmentId)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-xs font-medium transition-colors"
        >
          <span>Làm nhiệm vụ này</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
