/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        terminal: {
          'primary':         '#0099dd',
          'primary-content': '#e8f4ff',
          'secondary':       '#44ffaa',
          'accent':          '#00c4ff',
          'neutral':         '#011020',
          'base-100':        '#02040f',
          'base-200':        '#010915',
          'base-300':        '#000810',
          'base-content':    '#c8e4ff',
          'info':            '#0099dd',
          'success':         '#44ffaa',
          'warning':         '#ffcc00',
          'error':           '#ff4466',
        },
      },
    ],
  },
}

