import * as XLSX from 'xlsx';
import { Submission, Language } from '../types';
import { translations } from '../i18n/translations';

export function exportToCSV(submissions: Submission[], lang: Language): void {
  const t = translations[lang];

  // Determine the maximum number of accompanying guests dynamically across all submissions
  const maxGuests = Math.max(
    0,
    ...submissions.map((sub) => (sub.guests && Array.isArray(sub.guests) ? sub.guests.length : 0))
  );

  // Base CSV headers
  const headers = [
    t.submissionId,
    t.submittedAt,
    t.colName,
    t.colOrganisation,
    t.colEmail,
    t.colJobTitle,
    t.colJoin,
    t.colGuest,
  ];

  // Dynamic guest columns: Guest 1 Name, Guest 1 Organisation, Guest 1 Job Title, etc.
  for (let i = 1; i <= maxGuests; i++) {
    headers.push(
      `Guest ${i} Name`,
      `Guest ${i} Organisation`,
      `Guest ${i} Job Title`
    );
  }

  headers.push(t.colLanguage);

  const rows = submissions.map((sub) => {
    const isAttending = sub.join.includes('YES');
    const guestCount = isAttending ? Number(sub.guest_count) || 0 : 0;

    const row: (string | number)[] = [
      sub.id,
      new Date(sub.created_at).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US'),
      `"${sub.name.replace(/"/g, '""')}"`,
      `"${(sub.organisation || '').replace(/"/g, '""')}"`,
      `"${(sub.email || '').replace(/"/g, '""')}"`,
      `"${sub.job_title.replace(/"/g, '""')}"`,
      `"${sub.join.join(', ')}"`,
      guestCount,
    ];

    // Append dynamic accompanying guest columns
    for (let i = 0; i < maxGuests; i++) {
      const g = sub.guests && sub.guests[i];
      if (g) {
        row.push(
          `"${(g.name || '').replace(/"/g, '""')}"`,
          `"${(g.organisation || '').replace(/"/g, '""')}"`,
          `"${(g.job_title || '').replace(/"/g, '""')}"`
        );
      } else {
        row.push('""', '""', '""');
      }
    }

    row.push(sub.locale.toUpperCase());
    return row;
  });

  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');

  // Add UTF-8 BOM so Excel opens Cyrillic/Russian/Arabic characters without garbling
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

  // Determine maximum number of accompanying guests across all records
  const maxGuests = Math.max(
    0,
    ...submissions.map((sub) => (sub.guests && Array.isArray(sub.guests) ? sub.guests.length : 0))
  );

  const formattedData = submissions.map((sub) => {
    const isAttending = sub.join.includes('YES');
    const guestCount = isAttending ? Number(sub.guest_count) || 0 : 0;

    const row: Record<string, string | number> = {
      [t.submissionId]: sub.id,
      [t.submittedAt]: new Date(sub.created_at).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US'),
      [t.colName]: sub.name,
      [t.colOrganisation]: sub.organisation || '-',
      [t.colEmail]: sub.email || '-',
      [t.colJobTitle]: sub.job_title,
      [t.colJoin]: sub.join.join(', '),
      [t.colGuest]: guestCount,
    };

    // Add structured accompanying guest columns
    for (let i = 1; i <= maxGuests; i++) {
      const g = sub.guests && sub.guests[i - 1];
      row[`Guest ${i} Name`] = g?.name || '-';
      row[`Guest ${i} Organisation`] = g?.organisation || '-';
      row[`Guest ${i} Job Title`] = g?.job_title || '-';
    }

    row[t.colLanguage] = sub.locale.toUpperCase();
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Set column widths dynamically
  const colWidths: { wch: number }[] = [
    { wch: 38 }, // ID
    { wch: 22 }, // Date
    { wch: 24 }, // Name
    { wch: 30 }, // Organisation
    { wch: 28 }, // Email
    { wch: 35 }, // Job Title
    { wch: 14 }, // Join
    { wch: 12 }, // Guests
  ];

  for (let i = 1; i <= maxGuests; i++) {
    colWidths.push(
      { wch: 24 }, // Guest Name
      { wch: 28 }, // Guest Organisation
      { wch: 28 }  // Guest Job Title
    );
  }

  colWidths.push({ wch: 12 }); // Language
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `National_Day_Submissions_${dateStr}.xlsx`);
}
