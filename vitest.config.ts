import { defineConfig } from 'vitest/config'
import path from 'node:path'

// FASE 2.1 — Security test harness.
// Sem plugin do Next aqui de propósito: os testes correm em Node puro (Vitest),
// não precisam do bundler do Next. Só o alias @/ -> src/ é replicado, para os
// testes poderem importar código de produção (ex. helpers de src/lib) tal como
// a app o importa.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Segurança > velocidade: os testes de RLS/segurança podem fazer chamadas
    // de rede reais (ver tests/security/env.ts) — sem paralelismo agressivo,
    // para nunca sobrecarregar/confundir o ambiente-alvo com corridas em paralelo.
    fileParallelism: false,
  },
})
