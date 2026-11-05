import * as XLSX from 'xlsx';
import { Submission, Language } from '../types';
import { translations } from '../i18n/translations';

export function exportToCSV(submissions: Submission[], lang: Language): void {
  const t = translations[lang];

  const headers = [
    t.submissionId,
    t.submittedAt,
    t.colName,
    t.colOrganisation,
    t.colEmail,
    t.colJobTitle,
    t.colJoin,
    t.colGuest,
    t.colLanguage,
  ];

  const rows = submissions.map((sub) => [
    sub.id,
    new Date(sub.created_at).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US'),
    `"${sub.name.replace(/"/g, '""')}"`,
    `"${(sub.organisation || '').replace(/"/g, '""')}"`,
    `"${(sub.email || '').replace(/"/g, '""')}"`,
    `"${sub.job_title.replace(/"/g, '""')}"`,
    `"${sub.join.join(', ')}"`,
    sub.has_guest ? (sub.guest_count || 0) : 0,
    sub.locale.toUpperCase(),
  ]);

  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');

  // Add UTF-8 BOM so Excel opens Cyrillic/Russian characters correctly without garbling
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `National_Day_Responses_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(submissions: Submission[], lang: Language): void {
  const t = translations[lang];

  const formattedData = submissions.map((sub) => ({
    [t.submissionId]: sub.id,
    [t.submittedAt]: new Date(sub.created_at).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US'),
    [t.colName]: sub.name,
    [t.colOrganisation]: sub.organisation || '-',
    [t.colEmail]: sub.email || '-',
    [t.colJobTitle]: sub.job_title,
    [t.colJoin]: sub.join.join(', '),
    [t.colGuest]: sub.has_guest ? (sub.guest_count || 0) : 0,
    [t.colLanguage]: sub.locale.toUpperCase(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 38 }, // ID
    { wch: 22 }, // Date
    { wch: 24 }, // Name
    { wch: 30 }, // Organisation
    { wch: 28 }, // Email
    { wch: 35 }, // Job Title
    { wch: 14 }, // Join
    { wch: 12 }, // Guests
    { wch: 12 }, // Language
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `National_Day_Submissions_${dateStr}.xlsx`);
}

