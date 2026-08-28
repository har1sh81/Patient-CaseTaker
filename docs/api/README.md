# API Routes and Integration Documentation

MediKiosk runs local backend routes under the `/api` routing prefix using Next.js Route Handlers.

## Internal APIs

- `GET /api`: Health check and status ping.
- Additional routes will handle transcript submission, document uploads, and external synchronization.

## Third-Party Integrations

Exposed client wrappers support syncing with FHIR and external EMR/EHR adapters via the `lib/integrations` package.
