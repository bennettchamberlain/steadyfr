import {DocumentTextIcon} from '@sanity/icons'
import {format, parseISO} from 'date-fns'
import {defineField, defineType} from 'sanity'
import type {Post} from '../../../sanity.types'

/**
 * Post schema.  Define and edit the fields for the 'post' content type.
 * Learn more: https://www.sanity.io/docs/schema-types
 */

export const post = defineType({
  name: 'post',
  title: 'Post',
  icon: DocumentTextIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'A slug is required for the post to show up in the preview',
      options: {
        source: 'title',
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'blockContent',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      description:
        'Which section of the Services hub this article belongs to (powers the Services page filter and nav dropdown).',
      type: 'string',
      options: {
        list: [
          {title: 'Railings & Infill', value: 'railings-infill'},
          {title: 'Craft & Process', value: 'craft-process'},
          {title: 'Code & Compliance', value: 'code-compliance'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'featured',
      title: 'Featured guide',
      description:
        'Flagship this article. It appears as a highlighted entry at the top of the Services nav dropdown. If more than one is featured, the most recent is shown.',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'keyTakeaways',
      title: 'Key Takeaways / TL;DR',
      description:
        'Optional. Shown as a highlighted callout box near the top of the article, for readers who skim. A short intro line plus a few bullet points works well.',
      type: 'blockContentTextOnly',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
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
          description: 'Important for SEO and accessibility.',
          validation: (rule) => {
            // Custom validation to ensure alt text is provided if the image is present. https://www.sanity.io/docs/validation
            return rule.custom((alt, context) => {
              const document = context.document as Post
              if (document?.coverImage?.asset?._ref && !alt) {
                return 'Required'
              }
              return true
            })
          },
        },
      ],
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{type: 'person'}],
    }),
    defineField({
      name: 'worksCited',
      title: 'Works Cited',
      description:
        'Optional. Shown in a "Works Cited" section at the very bottom of the article, after the call-to-action. One source per line.',
      type: 'blockContentTextOnly',
    }),
  ],
  // List preview configuration. https://www.sanity.io/docs/previews-list-views
  preview: {
    select: {
      title: 'title',
      authorFirstName: 'author.firstName',
      authorLastName: 'author.lastName',
      date: 'date',
      media: 'coverImage',
    },
    prepare({title, media, authorFirstName, authorLastName, date}) {
      const subtitles = [
        authorFirstName && authorLastName && `by ${authorFirstName} ${authorLastName}`,
        date && `on ${format(parseISO(date), 'LLL d, yyyy')}`,
      ].filter(Boolean)

      return {title, media, subtitle: subtitles.join(' ')}
    },
  },
})
