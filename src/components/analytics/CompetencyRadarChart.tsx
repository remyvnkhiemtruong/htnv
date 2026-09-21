import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import type { RubricAssessmentSubmission } from '../../types';
import { POETIC_AXES } from '../../data/seedData';
import { TrendingUp } from 'lucide-react';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

interface CompetencyAnalyticsProps {
  v1Submission?: RubricAssessmentSubmission;
  v2Submission?: RubricAssessmentSubmission;
  studentName?: string;
}

export const CompetencyRadarChart: React.FC<CompetencyAnalyticsProps> = ({
  v1Submission,
  v2Submission,
  studentName
}) => {
  const labels = POETIC_AXES.map(a => a.shortName);

  const getScoresForSub = (sub?: RubricAssessmentSubmission): number[] => {
    if (!sub || !sub.criterionScores) return [2, 2, 2, 2, 2, 2];
    return [
      sub.criterionScores['crit-plot']?.score || 1,
      sub.criterionScores['crit-char']?.score || 1,
      sub.criterionScores['crit-pov']?.score || 1,
      sub.criterionScores['crit-spacetime']?.score || 1,
      sub.criterionScores['crit-lang']?.score || 1,
      sub.criterionScores['crit-synthesis']?.score || 1,
    ];
  };

  const v1Scores = getScoresForSub(v1Submission);
  const v2Scores = getScoresForSub(v2Submission);

  const radarData = {
    labels,
    datasets: [
      {
        label: 'Phiên bản v1.0 (Sơ thảo)',
        data: v1Scores,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: 'rgba(239, 68, 68, 0.8)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(239, 68, 68, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(239, 68, 68, 1)'
      },
      {
        label: 'Phiên bản v2.0 (Sau phản hồi)',
        data: v2Scores,
        backgroundColor: 'rgba(14, 165, 233, 0.25)',
        borderColor: 'rgba(14, 165, 233, 1)',
        borderWidth: 2.5,
        pointBackgroundColor: 'rgba(14, 165, 233, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(14, 165, 233, 1)'
      }
    ]
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: {
          color: 'rgba(148, 163, 184, 0.2)'
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.2)'
        },
        pointLabels: {
          font: {
            size: 11,
            weight: 600 as any,
            family: 'Inter, sans-serif'
          },
          color: '#1e293b'
        },
        suggestedMin: 0,
        suggestedMax: 4,
        ticks: {
          stepSize: 1,
          backdropColor: 'transparent',
          color: '#64748b',
          font: { size: 10 }
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 16,
          font: { family: 'Inter, sans-serif', size: 12, weight: 600 as any }
        }
      }
    }
  };

  // Evolution Growth calculation
  const totalV1 = v1Scores.reduce((a, b) => a + b, 0);
  const totalV2 = v2Scores.reduce((a, b) => a + b, 0);
  const growthPercent = totalV1 > 0 ? Math.round(((totalV2 - totalV1) / totalV1) * 100) : 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200 mb-1">
            <TrendingUp className="w-3 h-3" />
            Biểu đồ 6 trục thi pháp
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Tăng trưởng Năng lực Đọc hiểu {studentName ? `– ${studentName}` : ''}
          </h3>
          <p className="text-xs text-slate-500">So sánh mức độ thành thạo giữa phiên bản v1.0 và v2.0</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-md px-3 py-1.5 text-right">
          <span className="text-xs font-medium text-emerald-800 block">Tỷ lệ tiến bộ</span>
          <span className="text-lg font-bold text-emerald-700">+{growthPercent}%</span>
        </div>
      </div>

      {/* Main Radar Chart Canvas */}
      <div className="h-80 w-full relative">
        <Radar data={radarData} options={radarOptions} />
      </div>

      {/* Axis Breakdown Details Table */}
      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {POETIC_AXES.map((axis, idx) => {
          const s1 = v1Scores[idx];
          const s2 = v2Scores[idx];
          const diff = s2 - s1;

          return (
            <div key={axis.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-xs font-bold text-slate-800 truncate" title={axis.title}>
                {axis.shortName}
              </div>
              <div className="text-sm font-bold mt-1 text-slate-900">
                {s2}/4.0
              </div>
              <div className={`text-xs font-semibold mt-0.5 ${diff > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {diff > 0 ? `▲ +${diff.toFixed(1)} đ` : 'Chưa đổi'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
