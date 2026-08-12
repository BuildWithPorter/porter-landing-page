import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import {
  handleFinancialHealthAuditProxy,
  type FinancialHealthAuditProxyConfig,
} from './server/financialHealthAuditProxy'

function financialHealthAuditDevProxy(config: FinancialHealthAuditProxyConfig) {
  return {
    name: 'financial-health-audit-dev-proxy',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: IncomingMessage, res: ServerResponse) => void) => void } }) {
      server.middlewares.use('/api/financial-health-audit', async (req, res) => {
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(Buffer.from(chunk))
        const headers = Object.fromEntries(
          Object.entries(req.headers).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(', ') : value ?? '',
          ]),
        )
        const request = new Request('http://localhost/api/financial-health-audit', {
          method: req.method,
          headers,
          body: chunks.length ? Buffer.concat(chunks) : undefined,
        })
        const response = await handleFinancialHealthAuditProxy(request, config)
        res.statusCode = response.status
        response.headers.forEach((value, key) => res.setHeader(key, value))
        res.end(Buffer.from(await response.arrayBuffer()))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['PORTER_'])
  return {
    plugins: [
      react(),
      financialHealthAuditDevProxy({
        apiBase: env.PORTER_API_URL,
        proxyKey: env.PORTER_PUBLIC_AUDIT_KEY,
      }),
    ],
  }
})
