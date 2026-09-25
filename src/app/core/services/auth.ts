import {
  Injectable,
  computed,
  signal
} from '@angular/core';
import { UserCredentials } from '../models';


@Injectable({
  providedIn: 'root'
})
export class Auth {
  readonly user =
    signal<UserCredentials | null>(null);

  readonly loading = signal(true);

  readonly isAdmin = computed(
    () => this.user()?.role === 'admin'
  );

  readonly isAuthenticated = computed(
    () => !!this.user()
  );

  constructor() {
    void this.loadCredentials();
  }

  async refresh(): Promise<void> {
    await this.loadCredentials();
  }

  private async loadCredentials(): Promise<void> {
    const system =
      window.checklistApi?.system;

    if (!system) {
      this.loading.set(false);
      return;
    }

    try {
      const credentials =
        await system.getCredentials();

      console.log(
        '[AUTH]',
        credentials
      );

      this.user.set(credentials);
    } catch (error) {
      console.error(
        'No fue posible obtener las credenciales:',
        error
      );

      this.user.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}