/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./public/**/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3765bc',
        accent: '#1f4191',
        danger: '#dc3545',
        success: '#267746',
      }
    },
  },
  plugins: [],
}