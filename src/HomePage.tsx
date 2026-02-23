import { Link } from '@/lib'
import screens from './screens/index.js'

export default function HomePage() {
	return (
		<div className="flex justify-center items-center h-screen text-gray-200 bg-gray-900">
			<div className="flex flex-col gap-4">
				<div className="text-4xl font-bold border-b-2 border-gray-700">
					Project Screens
				</div>
				<div className="flex flex-col gap-2">
					{Object.keys(screens).map(screenName => {
						return (
							<Link
								key={screenName}
								to={`/${screenName}`}
								className="inline text-gray-300 transition-colors hover:text-indigo-400"
							>
								{screenName}
							</Link>
						)
					})}
				</div>
			</div>
		</div>
	)
}
