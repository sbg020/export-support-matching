import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      // .env.local에 데이터 소스가 있어도 테스트의 기본 저장소는 빈 저장소다 (REVISION_02 §3.7)
      env: { VITE_DATA_SOURCE: '', VITE_API_BASE_URL: '' },
    },
  }),
)
