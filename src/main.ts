import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

const storedTheme = localStorage.getItem('theme');

const root = document.documentElement;

root.classList.add(
  `theme-${storedTheme === 'slate' ? 'slate' : 'zinc'}`
);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));