// ==============================================================================
// DYNAMIC ORGANISATIONS SERVICE
// Manages the list of organisations available in the Public Form dropdown.
// Pre-populated with 20 demo organisations as requested by the client,
// with full dynamic Add, Delete, and Reset capabilities via the Admin Dashboard.
// ==============================================================================

const ORGANISATIONS_STORAGE_KEY = 'national_day_organisations_list';

export const DEFAULT_DEMO_ORGANISATIONS: string[] = Array.from(
  { length: 20 },
  (_, i) => `Organisation ${i + 1}`
);

export function getOrganisations(): string[] {
  if (typeof window === 'undefined') {
    return DEFAULT_DEMO_ORGANISATIONS;
  }

  try {
    const raw = localStorage.getItem(ORGANISATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ORGANISATIONS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_ORGANISATIONS));
      return DEFAULT_DEMO_ORGANISATIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_DEMO_ORGANISATIONS;
  } catch (err) {
    console.warn('Error reading organisations from localStorage:', err);
    return DEFAULT_DEMO_ORGANISATIONS;
  }
}

function saveOrganisations(list: string[]): void {
  try {
    localStorage.setItem(ORGANISATIONS_STORAGE_KEY, JSON.stringify(list));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('organisations-updated', { detail: list }));
    }
  } catch (err) {
    console.error('Error saving organisations to localStorage:', err);
  }
}

export function addOrganisation(name: string): { success: boolean; list: string[]; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, list: getOrganisations(), error: 'Organisation name cannot be empty.' };
  }

  const current = getOrganisations();
  const exists = current.some((org) => org.toLowerCase() === trimmed.toLowerCase());
  if (exists) {
    return { success: false, list: current, error: 'This organisation already exists in the list.' };
  }

  const updated = [trimmed, ...current];
  saveOrganisations(updated);
  return { success: true, list: updated };
}

export function deleteOrganisation(name: string): string[] {
  const current = getOrganisations();
  const updated = current.filter((org) => org !== name);
  saveOrganisations(updated);
  return updated;
}

export function updateOrganisation(
  oldName: string,
  newName: string
): { success: boolean; list: string[]; error?: string } {
  const trimmed = newName.trim();
  if (!trimmed) {
    return { success: false, list: getOrganisations(), error: 'Organisation name cannot be empty.' };
  }

  const current = getOrganisations();
  if (oldName === trimmed) {
    return { success: true, list: current };
  }

  const exists = current.some(
    (org) => org.toLowerCase() === trimmed.toLowerCase() && org.toLowerCase() !== oldName.toLowerCase()
  );
  if (exists) {
    return { success: false, list: current, error: 'An organisation with this name already exists.' };
  }

  const updated = current.map((org) => (org === oldName ? trimmed : org));
  saveOrganisations(updated);
  return { success: true, list: updated };
}

export function resetDemoOrganisations(): string[] {
  saveOrganisations(DEFAULT_DEMO_ORGANISATIONS);
  return DEFAULT_DEMO_ORGANISATIONS;
}

