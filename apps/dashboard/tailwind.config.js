/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                header: ['Montserrat', 'sans-serif'],
                body: ['Inter', 'sans-serif'],
            },
            borderRadius: {
                'liquid': '28px',
                'pill': '50px',
            },
            colors: {
                'electric-blurple': '#5E60CE',
                'deep-purple': '#3c096c',
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
                'fade-in': 'fadeIn 0.4s ease-out forwards',
                'liquid-pulse': 'liquidPulse 3s infinite alternate',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0', transform: 'scale(0.98)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                liquidPulse: {
                    '0%': { boxShadow: '0 0 0 0 rgba(94, 96, 206, 0.4)' },
                    '100%': { boxShadow: '0 0 20px 0 rgba(94, 96, 206, 0)' },
                }
            },
        },
    },
    plugins: [],
}
