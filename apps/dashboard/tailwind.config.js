/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Montserrat', 'sans-serif'],
                body: ['Inter', 'sans-serif'], // Keep for backward compat
                header: ['Montserrat', 'sans-serif'], // Keep for backward compat
            },
            colors: {
                'electric-blurple': '#5E60CE', // Keep for backward compat
                lumen: {
                    bg: '#050510',
                    glass: 'rgba(20, 20, 30, 0.4)',
                    border: 'rgba(255, 255, 255, 0.1)',
                    accent: '#5E60CE',
                    accentHover: '#6930C3',
                    textMain: 'rgba(255, 255, 255, 0.95)',
                    textMuted: 'rgba(255, 255, 255, 0.6)',
                    success: '#4ADE80',
                    error: '#F87171',
                    warning: '#FBBF24'
                }
            },
            borderRadius: {
                'liquid': '24px', // Updated to 24px per Reference
            },
            backgroundImage: {
                'mesh-gradient': 'radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%)',
                'glass-sheen': 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.01) 100%)'
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
                'fade-in': 'fadeIn 0.4s ease-out forwards',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            },
        },
    },
    plugins: [],
}
