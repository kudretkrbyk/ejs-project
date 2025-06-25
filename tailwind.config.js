/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs", "./views/*.ejs"],
  theme: {
    extend: {
      colors: {
        "brand-dark": "#05080b", // Ana mavi
        "brand-dark-100": "#10131c",
        "brand-red": "#510202", // Vurgu Kırmızısı
        "brand-teal": "#14B8A6", // Mavimsi Yeşil (Canlı bir ton seçtim)
        "brand-light-gray": "#F3F4F6", // Açık Gri Zemin
        "brand-medium-gray": "#E5E7EB", // Orta Gri
      },
    },
  },
  plugins: [],
};
