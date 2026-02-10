/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            animation: {
                'in': 'in 0.2s ease-out',
                'out': 'out 0.2s ease-in',
                'slide-in-from-bottom-2': 'slide-in-from-bottom-2 0.2s ease-out',
                'slide-in-from-right-10': 'slide-in-from-right-10 0.2s ease-out',
            },
            keyframes: {
                in: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'slide-in-from-bottom-2': {
                    '0%': { transform: 'translateY(0.5rem)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'slide-in-from-right-10': {
                    '0%': { transform: 'translateX(2.5rem)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                }
            }
        },
    },
    plugins: [],
}
