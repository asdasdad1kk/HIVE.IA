import {
  Routes
} from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',

    loadComponent: () =>
      import(
        './features/dashboard/dashboard.page'
      ).then(
        module =>
          module.DashboardPage
      )
  },

  {
    path: 'templates',

    loadComponent: () =>
      import(
        './features/templates/pages/template-list/template-list.page'
      ).then(
        module =>
          module.TemplateListPage
      )
  },

  {
    path: 'templates/new',

    loadComponent: () =>
      import(
        './features/templates/pages/template-editor/template-editor.page'
      ).then(
        module =>
          module.TemplateEditorPage
      )
  },

  {
    path: 'templates/:id/edit',

    loadComponent: () =>
      import(
        './features/templates/pages/template-editor/template-editor.page'
      ).then(
        module =>
          module.TemplateEditorPage
      )
  },

  {
    path: 'run/:id',

    loadComponent: () =>
      import(
        './features/run/pages/checklist-runner.page'
      ).then(
        module =>
          module.ChecklistRunnerPage
      )
  },

  {
    path: 'history',

    loadComponent: () =>
      import(
        './features/history/submission-history.page'
      ).then(
        module =>
          module.SubmissionHistoryPage
      )
  },
{
  path: 'draft/:id',
  loadComponent: () =>
    import(
      './features/run/pages/checklist-runner.page'
    )
      .then(m => m.ChecklistRunnerPage)
},
  {
    path: '**',
    redirectTo: ''
  }
];