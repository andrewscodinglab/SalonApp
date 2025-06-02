import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C4A962',
          light: '#D6C08F',
          dark: '#B39855',
        },
        background: {
          DEFAULT: '#FFFFFF',
          card: '#FFFFFF',
          dark: '#1A1A1A',
        },
        text: {
          DEFAULT: '#000000',
          secondary: '#666666',
          light: '#999999',
        },
        status: {
          pending: '#FFA500',
          confirmed: '#4CAF50',
          cancelled: '#F44336',
        },
        input: {
          border: '#E5E5E5',
          placeholder: '#A3A3A3',
        }
      },
      borderRadius: {
        'card': '16px',
        'button': '4px',
        'input': '4px',
      },
      boxShadow: {
        'card': '0px 4px 20px rgba(0, 0, 0, 0.08)',
        'button': '0px 2px 4px rgba(0, 0, 0, 0.1)',
        'input': '0px 1px 3px rgba(0, 0, 0, 0.1)',
      },
      spacing: {
        'card-padding': '24px',
        'section-spacing': '32px',
        'form-spacing': '16px',
      },
      fontSize: {
        'heading-1': ['32px', { lineHeight: '40px', fontWeight: '600' }],
        'heading-2': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '24px' }],
        'caption': ['14px', { lineHeight: '20px' }],
        'form-label': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'form-input': ['16px', { lineHeight: '24px' }],
        'page-title': ['32px', { lineHeight: '40px', fontWeight: '700' }],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}

export default config 