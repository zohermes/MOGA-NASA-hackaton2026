/** Paleta "sala de control": azul-tinta profundo; verde/ámbar/rojo reservados SOLO para estados. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#070B13', panel: 'rgb(18 27 42 / <alpha-value>)', raised: 'rgba(255,255,255,0.05)', line: 'rgba(255,255,255,0.09)',
        text: '#E6EBF2', dim: '#8E9BB3',
        ok: '#4CC9A0', warn: '#F2B544', crit: '#FF5A5F', info: '#6AA8FF',
      },
      fontFamily: { sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
