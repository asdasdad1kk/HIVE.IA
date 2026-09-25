import {
  Component,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import {
  ArrowRight,
  ClipboardCheck,
  Files,
  History,
  LayoutDashboard,
  LucideAngularModule,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Trash2
} from 'lucide-angular';

interface NavigationItem {
  path: string;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}
interface DraftItem {
  id: number;
  templateId: number;
  templateName: string;
  updatedAt: string;
}
import { Auth } from '../../core/services/auth';
import { ChecklistRepository } from '../../core/checklist.repository';
import { DraftsStateService } from '../../core/services/drafts';
import { Dialog } from '@angular/cdk/dialog';
import { ChecklistTemplateInput } from '../../core/models';
import { TemplateImportDialogComponent } from '../../features/templates/components/template-import-dialog/template-import-dialog';
import { UiDialogService } from '../../shared/dialog/ui-dialog.service';
@Component({
  selector: 'app-sidebar',

  imports: [
    RouterLink,
    RouterLinkActive,
    LucideAngularModule
  ],

  templateUrl:
    './sidebar1.html'
})
export class AppSidebarComponent {
  readonly collapsed =
    signal(false);
  readonly Plus=Plus
  readonly ArrowRight=ArrowRight
  readonly ClipboardCheck=ClipboardCheck
  readonly collapseIcon =
    PanelLeftClose;
  readonly Trash2=Trash2
  readonly expandIcon =
    PanelLeftOpen;

  readonly logoIcon =
    ClipboardCheck;

  readonly applicationLogo = './assets/G.png';

  readonly settingsIcon =
    Settings;
private readonly auth =
  inject(Auth);

private readonly repository =
  inject(ChecklistRepository);

readonly drafts =
  signal<DraftItem[]>([]);
  readonly navigation:
    NavigationItem[] = [
      {
        path: '/',
        label: 'Dashboard',
        description: 'Resumen operativo',
        icon: LayoutDashboard,
        exact: true
      },
      {
        path: '/templates',
        label: 'Plantillas',
        description: 'Diseño de formularios',
        icon: Files
      },
      {
        path: '/history',
        label: 'Historial',
        description: 'Capturas realizadas',
        icon: History
      }
    ];

private readonly draftsState = inject(DraftsStateService);

constructor() {
  effect(() => {
    const username = this.auth.user()?.username;
    if (username) {
      void this.loadDrafts();
    }
  });

  this.draftsState.refresh$.subscribe(() => {
    void this.loadDrafts();
  });
}

public async refreshDrafts(): Promise<void> {
  await this.loadDrafts();
}
async deleteDraft(
  draftId: number,
  event: Event
): Promise<void> {

  event.preventDefault();
  event.stopPropagation();

  const confirmed = await this.uiDialog.confirm({
    tone: 'danger',
    title: 'Eliminar borrador',
    message: '¿Eliminar este borrador?',
    detail:
      'Se descartará el avance guardado de este checklist. Esta acción no se puede deshacer.',
    confirmText: 'Eliminar borrador',
    cancelText: 'Cancelar'
  });

  if (!confirmed) {
    return;
  }

  await this.repository.deleteSubmission(draftId);

this.drafts.update(current =>
  current.filter(
    draft => draft.id !== draftId
  )
);

this.draftsState.refresh();

  await this.loadDrafts();
}
private async loadDrafts(): Promise<void> {

  const username =
    this.auth.user()?.username;

  if (!username) {
    return;
  }

  const submissions =
    await this.repository
      .listSubmissions();

 const drafts = submissions
  .filter(
    submission =>
      submission.status === 'DRAFT' &&
      submission.submittedBy === username
  )
  .map(submission => ({
    id: submission.id,
    templateId: submission.templateId,

    templateName:
      submission.templateName ??
      'Plantilla sin nombre',

    updatedAt:
      submission.updatedAt
  }));

  this.drafts.set(drafts);
}
readonly draftCount =
  computed(
    () =>
      this.drafts().length
  );
  toggleCollapsed(): void {
    this.collapsed.update(
      value => !value
    );
  }

private readonly dialog = inject(Dialog);
private readonly uiDialog = inject(UiDialogService);
private readonly router = inject(Router);
openQuickCreate(): void {
  const dialogRef = this.dialog.open(
    TemplateImportDialogComponent,
    {
      disableClose: true,
      panelClass: 'checklist-import-dialog',
      backdropClass: 'checklist-dialog-backdrop'
    }
  );

  dialogRef.closed.subscribe(async result => {
    if (!result) {
      return;
    }

    const template =
      await this.repository.createTemplate(result as ChecklistTemplateInput);

    await this.router.navigate([
      '/run',
      template.id
    ]);
  });
}
}