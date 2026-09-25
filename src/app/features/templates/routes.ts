import { Routes } from '@angular/router';

export const TEMPLATE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import(
        './pages/template-list/template-list.page'
      ).then(
        module =>
          module.TemplateListPage
      )
  },
  {
    path: 'new',
    loadComponent: () =>
      import(
        './pages/template-editor/template-editor.page'
      ).then(
        module =>
          module.TemplateEditorPage
      )
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import(
        './pages/template-editor/template-editor.page'
      ).then(
        module =>
          module.TemplateEditorPage
      )
  }
];