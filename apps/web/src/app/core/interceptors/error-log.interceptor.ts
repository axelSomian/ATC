import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { reportHttpError } from '../observability';

/** Trace les requêtes HTTP en échec (réseau ou 5xx) vers Sentry. */
export const errorLogInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      reportHttpError({ status: err.status, url: req.url.split('?')[0], method: req.method });
      return throwError(() => err);
    }),
  );
