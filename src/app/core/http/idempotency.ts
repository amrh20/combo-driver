import { HttpHeaders } from '@angular/common/http';

/** A fresh key per tap. Retries of the same body must reuse it; a new body needs a new key. */
export function idempotencyHeaders(key = crypto.randomUUID()): HttpHeaders {
  return new HttpHeaders({
    'Idempotency-Key': key,
  });
}
