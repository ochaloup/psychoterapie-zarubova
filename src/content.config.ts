import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro:schema'

const sluzby = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sluzby' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    summary: z.string(),
    order: z.number(),
    available: z.boolean().default(true),
    icon: z.enum(['leaf', 'heart', 'forest']),
  }),
})

const pribeh = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pribeh' }),
  schema: z.object({
    title: z.string(),
    updated: z.coerce.date().optional(),
  }),
})

const stranky = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stranky' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
})

export const collections = { sluzby, pribeh, stranky }
