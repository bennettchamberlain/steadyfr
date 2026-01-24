import {ImageIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Gallery Project schema for showcasing railing projects
 */

export const galleryProject = defineType({
  name: 'galleryProject',
  title: 'Gallery Project',
  icon: ImageIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'projectName',
      title: 'Project Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'location',
      title: 'Location',
      description: 'City or neighborhood (e.g., "San Francisco" or "Marina District")',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'categories',
      title: 'Category Tags',
      description: 'Select all that apply (e.g., stair railing, deck rail, guardrail, gate)',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        list: [
          {title: 'Traditional Handrail', value: 'traditional-handrail'},
          {title: 'Guardrail with Balusters', value: 'guardrail-balusters'},
          {title: 'Vertical Picket', value: 'vertical-picket'},
          {title: 'Cable Rail', value: 'cable-rail'},
          {title: 'Ornate Balusters', value: 'ornate-balusters'},
          {title: 'Custom', value: 'custom'},
          {title: 'Stair Railing', value: 'stair-railing'},
          {title: 'Deck Rail', value: 'deck-rail'},
          {title: 'Gate', value: 'gate'},
        ],
      },
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'photoGallery',
      title: 'Photo Gallery',
      description: 'Upload multiple images showing different angles of the project',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
            aiAssist: {
              imageDescriptionField: 'alt',
            },
          },
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alternative text',
              description: 'Important for SEO and accessibility (optional).',
            },
          ],
        },
      ],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'description',
      title: 'Short Description',
      description: 'Optional brief description of the project',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      description: 'Show on home page preview gallery',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      description: 'Lower numbers appear first (optional)',
      type: 'number',
      initialValue: 0,
    }),
  ],
  preview: {
    select: {
      title: 'projectName',
      location: 'location',
      media: 'photoGallery.0',
      categories: 'categories',
    },
    prepare({title, location, media, categories}) {
      const categoryList = categories?.join(', ') || 'No categories'
      return {
        title: title || 'Untitled Project',
        subtitle: `${location || 'No location'} • ${categoryList}`,
        media,
      }
    },
  },
  orderings: [
    {
      title: 'Display Order',
      name: 'orderAsc',
      by: [{field: 'order', direction: 'asc'}],
    },
    {
      title: 'Project Name',
      name: 'nameAsc',
      by: [{field: 'projectName', direction: 'asc'}],
    },
  ],
})
