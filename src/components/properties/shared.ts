export function toggleSection(activeSection: string, section: string): string {
  return activeSection === section ? '' : section;
}
