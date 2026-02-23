import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	optimizeDeps: {
		include: ['react-is', 'recharts']
	},
	build: {
		sourcemap: false,
		rollupOptions: {
			onLog(level, log, handler) {
				if (
					log.message.includes(
						`Error when using sourcemap for reporting an error: Can't resolve original location of error.`
					)
				) {
					return
				}
				handler(level, log)
			}
		}
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src')
		}
	}
})
