import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorLogInterceptor } from './core/interceptors/error-log.interceptor';
import { observabilityProviders } from './core/observability';
import { AuthService } from './core/services/auth.service';
import { ReferenceService } from './core/services/reference.service';

function initApp(authService: AuthService, referenceService: ReferenceService) {
  return () => {
    referenceService.load();
    authService.tryRestoreSession();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorLogInterceptor])),
    ...observabilityProviders(),
    {
      provide: APP_INITIALIZER,
      useFactory: initApp,
      deps: [AuthService, ReferenceService],
      multi: true,
    },
  ],
};
