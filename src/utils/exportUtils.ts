import { learningVersionLabel } from './learningLabels';
import type { StudentPortfolio, PortfolioVersion, RubricAssessmentSubmission } from '../types';
import { POETIC_AXES } from '../data/seedData';

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export function exportPortfolioAsHTML(
  portfolio: StudentPortfolio,
  version: PortfolioVersion,
  rubrics: RubricAssessmentSubmission[]
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const axisSections = POETIC_AXES.map(axis => {
    const resp = version.responses[axis.id];
    const analysis = resp?.analysisText
      ? escapeHtml(resp.analysisText)
      : '<i>Chưa có nội dung phân tích</i>';
    return `
      <div style="margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; background-color: #ffffff;">
        <h3 style="color: #0f172a; margin-top: 0; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
          ${escapeHtml(axis.title)}
        </h3>
        <p style="white-space: pre-wrap; font-family: 'Be Vietnam Pro', 'Inter', sans-serif; font-size: 15px; line-height: 1.7; color: #334155;">
          ${analysis}
        </p>
        ${resp?.evidenceQuotes && resp.evidenceQuotes.length > 0 ? `
          <div style="margin-top: 12px; background: #f8fafc; padding: 10px; border-left: 3px solid #3b82f6; border-radius: 4px;">
            <strong style="font-size: 12px; color: #1e40af; text-transform: uppercase;">Dẫn chứng văn bản:</strong>
            <ul style="margin: 6px 0 0 0; padding-left: 20px; font-size: 14px; color: #475569;">
              ${resp.evidenceQuotes.map(q => `<li>"${escapeHtml(q.text)}" <em>(${escapeHtml(q.pageOrParagraph || 'Văn bản')})</em></li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  const rubricSection = rubrics.length > 0 ? `
    <div style="margin-top: 32px; border-top: 2px solid #cbd5e1; padding-top: 16px;">
      <h2 style="font-size: 18px; color: #0f172a;">Minh chứng Đánh giá bảng tiêu chí chấm điểm</h2>
      ${rubrics.map(r => `
        <div style="margin-bottom: 16px; background: #f1f5f9; padding: 12px; border-radius: 6px;">
          <strong>${escapeHtml(r.evaluatorName)}</strong> (${escapeHtml(r.evaluatorRole.toUpperCase())}) - Điểm: <strong>${escapeHtml(r.totalScore)}/${escapeHtml(r.maxScore)}</strong> (${escapeHtml(r.submittedAt.slice(0, 10))})
          <p style="margin: 4px 0 0 0; font-style: italic; color: #475569;">Nhận xét chung: "${escapeHtml(r.overallFeedback)}"</p>
        </div>
      `).join('')}
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Học tốt Ngữ Văn - ${escapeHtml(portfolio.studentName)} - ${escapeHtml(learningVersionLabel(version))}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
          .badge { display: inline-block; padding: 4px 8px; background: #e0f2fe; color: #0369a1; border-radius: 4px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <span class="badge">HỌC TỐT NGỮ VĂN - THEO TRỤC THI PHÁP</span>
          <h1 style="margin: 8px 0 4px 0;">Học sinh: ${escapeHtml(portfolio.studentName)} - Lớp: ${escapeHtml(portfolio.className)}</h1>
          <p style="margin: 0; color: #64748b;">Bài nộp: <strong>${escapeHtml(learningVersionLabel(version))}</strong> | Ngày tạo: ${escapeHtml(version.createdAt.slice(0, 10))} | Chú thích: ${escapeHtml(version.changeSummary)}</p>
        </div>
        ${axisSections}
        ${rubricSection}
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 300);
}

export function downloadJSONPackage(data: any, filename: string): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
