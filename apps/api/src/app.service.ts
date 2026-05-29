import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getServiceInfo() {
    return {
      name: 'operation-platform-api',
      auth: {
        login: 'POST /auth/login',
        me: 'GET /auth/me',
        audit: 'GET /auth/audit (admin)',
      },
      routes: {
        merchants: 'GET|POST /paytm-merchants',
        botTasks: 'GET|POST /bot-tasks — operator/admin',
        launcher: 'POST /bot-tasks/claim — launcher EXE (x-launcher-key)',
        events: 'GET /events — SSE stream (operator/admin)',
        opsLaunchers: 'GET|POST /ops-launchers',
      },
    };
  }
}
