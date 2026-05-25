import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getServiceInfo() {
    return {
      name: 'b_auto-ops-api',
      branch: 'main2.0',
      purpose:
        'Orchestration API for ops; Python worker runs tp_127_* scripts at repo root; jobs persisted in PostgreSQL.',
      workerStub:
        'See ops-platform/apps/worker — GET /internal/jobs/next (INTERNAL_API_TOKEN).',
      auth: {
        login: 'POST /auth/login',
        me: 'GET /auth/me',
        audit: 'GET /auth/audit (admin)',
      },
      routes: {
        health: 'GET /health',
        jobs: [
          'POST /jobs (operator|admin)',
          'GET /jobs',
          'GET /jobs/:id',
          'SSE GET /jobs/:id/logs/stream (viewer+)',
          'POST /jobs/:id/cancel (operator|admin)',
        ],
        internal: [
          'GET /internal/jobs/next',
          'POST /internal/jobs/:id/logs',
          'POST /internal/jobs/:id/finish',
        ],
      },
    };
  }
}
