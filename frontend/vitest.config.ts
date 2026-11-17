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
      // .env.local에 API 주소가 있어도 테스트의 기본 저장소는 빈 저장소다.
      // 게시 공고 스냅샷이 필요한 테스트는 스냅샷을 직접 읽는다 (REVISION_05)
      env: { VITE_API_BASE_URL: '', VITE_PUBLISHED_SNAPSHOT: 'off', VITE_COMMUNITY_SAMPLES: 'off' },
    },
  }),
)
