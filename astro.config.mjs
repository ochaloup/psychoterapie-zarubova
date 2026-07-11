// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://psychoterapie-zarubova.cz',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: {
    assets: 'assets',
  },
})
