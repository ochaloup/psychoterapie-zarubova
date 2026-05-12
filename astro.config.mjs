// @ts-check
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://ochaloup.github.io',
  base: '/psychoterapie-zarubova',
  trailingSlash: 'ignore',
  build: {
    assets: 'assets',
  },
})
