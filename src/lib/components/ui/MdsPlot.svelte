<script lang="ts">
	type Props = {
		points: number[][][];
		labels?: string[];
		colors?: Record<string, string>;
		distance: (a: number[][], b: number[][]) => number;
		width?: number;
		height?: number;
		padding?: number;
		overlay?: ((x: number, y: number) => string | undefined);
	};
	let { points, labels = [], colors = {}, distance, width = 400, height = 320, padding = 32, overlay }: Props = $props();

	import { mdsClassic } from "$lib/mds";

	const mdsPoints = $derived((): number[][] => {
		if (!points || points.length < 2) return [];
		const n = points.length;
		const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
		for (let i = 0; i < n; ++i) {
			for (let j = i + 1; j < n; ++j) {
				const d = distance(points[i], points[j]);
				dist[i][j] = dist[j][i] = d;
			}
		}
		return mdsClassic(dist, 2);
	});

	const scaledPoints = $derived((): number[][] => {
		const pts = typeof mdsPoints === 'function' ? mdsPoints() : mdsPoints;
		if (!pts || pts.length === 0) return [];
		const xs = pts.map((p: number[]) => p[0]);
		const ys = pts.map((p: number[]) => p[1]);
		const minX = Math.min(...xs), maxX = Math.max(...xs);
		const minY = Math.min(...ys), maxY = Math.max(...ys);
		return pts.map(([x, y]: number[]) => [
			padding + ((x - minX) / (maxX - minX || 1)) * (width - 2 * padding),
			height - (padding + ((y - minY) / (maxY - minY || 1)) * (height - 2 * padding))
		]);
	});

	// Helper to always get array for #each
	function getScaledPoints(): number[][] {
		return Array.isArray(scaledPoints) ? scaledPoints : (typeof scaledPoints === 'function' ? scaledPoints() : []);
	}
</script>

<div class="flex flex-col items-center">
	{#if !points || points.length < 2}
		<div class="text-gray-400 text-sm py-8">Not enough points to plot.</div>
	{:else}
		<svg {width} {height} class="bg-gray-50 rounded border border-gray-200">
			{#if overlay}
				{#each Array.from({length: Math.ceil(1/0.06)+1}, (_, ix) => ix * 0.06) as x}
					{#each Array.from({length: Math.ceil(1/0.06)+1}, (_, iy) => iy * 0.06) as y}
						{#if !isNaN(x) && !isNaN(y)}
							{@const label = overlay(x, y)}
							{label}
							<rect
								x={padding + x * (width - 2 * padding) - 6}
								y={height - (padding + y * (height - 2 * padding)) - 6}
								width="12"
								height="12"
								fill={label ? (colors[label] || '#888') : '#888'}
								fill-opacity={label ? '0.12' : '0.06'}
								stroke="none"
							/>
						{/if}
					{/each}
				{/each}
			{/if}
			{#each getScaledPoints() as [x, y], i}
				<circle
					cx={x}
					cy={y}
					r="10"
					fill={colors[labels[i]] || '#888'}
					fill-opacity="0.7"
					stroke="#222"
					stroke-width="1.5"
				/>
			{/each}
			{#each getScaledPoints() as [x, y], i}
				{#if labels[i]}
					<text
						x={x}
						y={y - 14}
						text-anchor="middle"
						class="text-xs font-semibold"
						fill="#222"
					>
						{labels[i]}
					</text>
				{/if}
			{/each}
		</svg>
	{/if}
</div>
