// vite.config.js
import { defineConfig } from "file:///C:/Users/ALOK%20ABHINANDAN/OneDrive/Desktop/Tapasya_app/Client/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/ALOK%20ABHINANDAN/OneDrive/Desktop/Tapasya_app/Client/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import { VitePWA } from "file:///C:/Users/ALOK%20ABHINANDAN/OneDrive/Desktop/Tapasya_app/Client/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\ALOK ABHINANDAN\\OneDrive\\Desktop\\Tapasya_app\\Client";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      // use our own sw.js, inject asset manifest
      srcDir: "public",
      filename: "sw.js",
      injectRegister: false,
      // we register manually in main.jsx
      manifest: false,
      // we have our own public/manifest.json
      injectManifest: {
        injectionPoint: void 0
        // we don't use workbox precaching — just cache-first in fetch handler
      },
      devOptions: {
        enabled: false
        // SW disabled in dev to avoid confusion
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    },
    dedupe: ["react", "react-dom"]
  },
  server: {
    port: 5173
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBTE9LIEFCSElOQU5EQU5cXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxUYXBhc3lhX2FwcFxcXFxDbGllbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEFMT0sgQUJISU5BTkRBTlxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXFRhcGFzeWFfYXBwXFxcXENsaWVudFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvQUxPSyUyMEFCSElOQU5EQU4vT25lRHJpdmUvRGVza3RvcC9UYXBhc3lhX2FwcC9DbGllbnQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnXG5cbi8vIFZpdGVQV0EgXHUyMDE0IGluamVjdE1hbmlmZXN0IG1vZGU6XG4vLyAgIC0gT3VyIGN1c3RvbSBwdWJsaWMvc3cuanMgaXMgdXNlZCBhcyB0aGUgU1cgc291cmNlXG4vLyAgIC0gVml0ZSBpbmplY3RzIHRoZSBwcmUtY2FjaGUgbWFuaWZlc3QgKHdpdGggaGFzaGVkIGFzc2V0IG5hbWVzKSBhdCBidWlsZCB0aW1lXG4vLyAgIC0gU1cgZmlsZSBpcyBjb3BpZWQgdG8gZGlzdC8gd2l0aCB0aGUgbWFuaWZlc3QgaW5qZWN0ZWQsIHNvIGhhc2hlZCBKUy9DU1MgYXJlIGNhY2hlZFxuLy8gICAtIEZpcnN0IGxvYWQgbXVzdCBiZSBvbmxpbmU7IHN1YnNlcXVlbnQgbG9hZHMgd29yayBvZmZsaW5lXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIFZpdGVQV0Eoe1xuICAgICAgc3RyYXRlZ2llczogJ2luamVjdE1hbmlmZXN0JywgICAvLyB1c2Ugb3VyIG93biBzdy5qcywgaW5qZWN0IGFzc2V0IG1hbmlmZXN0XG4gICAgICBzcmNEaXI6ICdwdWJsaWMnLFxuICAgICAgZmlsZW5hbWU6ICdzdy5qcycsXG4gICAgICBpbmplY3RSZWdpc3RlcjogZmFsc2UsICAgICAgICAgIC8vIHdlIHJlZ2lzdGVyIG1hbnVhbGx5IGluIG1haW4uanN4XG4gICAgICBtYW5pZmVzdDogZmFsc2UsICAgICAgICAgICAgICAgIC8vIHdlIGhhdmUgb3VyIG93biBwdWJsaWMvbWFuaWZlc3QuanNvblxuICAgICAgaW5qZWN0TWFuaWZlc3Q6IHtcbiAgICAgICAgaW5qZWN0aW9uUG9pbnQ6IHVuZGVmaW5lZCwgICAgLy8gd2UgZG9uJ3QgdXNlIHdvcmtib3ggcHJlY2FjaGluZyBcdTIwMTQganVzdCBjYWNoZS1maXJzdCBpbiBmZXRjaCBoYW5kbGVyXG4gICAgICB9LFxuICAgICAgZGV2T3B0aW9uczoge1xuICAgICAgICBlbmFibGVkOiBmYWxzZSwgICAgICAgICAgICAgICAvLyBTVyBkaXNhYmxlZCBpbiBkZXYgdG8gYXZvaWQgY29uZnVzaW9uXG4gICAgICB9LFxuICAgIH0pLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgfSxcbiAgICBkZWR1cGU6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gIH0sXG59KSJdLAogICJtYXBwaW5ncyI6ICI7QUFBc1gsU0FBUyxvQkFBb0I7QUFDblosT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLGVBQWU7QUFIeEIsSUFBTSxtQ0FBbUM7QUFXekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sWUFBWTtBQUFBO0FBQUEsTUFDWixRQUFRO0FBQUEsTUFDUixVQUFVO0FBQUEsTUFDVixnQkFBZ0I7QUFBQTtBQUFBLE1BQ2hCLFVBQVU7QUFBQTtBQUFBLE1BQ1YsZ0JBQWdCO0FBQUEsUUFDZCxnQkFBZ0I7QUFBQTtBQUFBLE1BQ2xCO0FBQUEsTUFDQSxZQUFZO0FBQUEsUUFDVixTQUFTO0FBQUE7QUFBQSxNQUNYO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsSUFDQSxRQUFRLENBQUMsU0FBUyxXQUFXO0FBQUEsRUFDL0I7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
