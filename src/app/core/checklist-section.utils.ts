import {
  ChecklistActionPlanSection,
  ChecklistField,
  ChecklistMatrixRow,
  ChecklistSection
} from './models';

export function isMatrixSection(
  section: ChecklistSection
): section is Extract<
  ChecklistSection,
  { view: 'matrix' }
> {
  return section.view === 'matrix';
}

export function isActionPlanSection(
  section: ChecklistSection
): section is ChecklistActionPlanSection {
  return section.view === 'action-plan';
}

export function isFormSection(
  section: ChecklistSection
): section is Extract<
  ChecklistSection,
  { view?: 'form' }
> {
  return (
    section.view === undefined ||
    section.view === 'form'
  );
}

export function sectionFields(
  section: ChecklistSection
): ChecklistField[] {
  return isFormSection(section)
    ? section.fields
    : [];
}

export function sectionRows(
  section: ChecklistSection
): ChecklistMatrixRow[] {
  return isMatrixSection(section)
    ? section.rows
    : [];
}

export function sectionItemCount(
  section: ChecklistSection
): number {
  if (isMatrixSection(section)) {
    return section.rows.length;
  }

  if (isActionPlanSection(section)) {
    return section.initialRows ?? 1;
  }

  return section.fields.length;
}
