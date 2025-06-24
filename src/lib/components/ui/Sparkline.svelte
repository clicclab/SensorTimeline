<script lang="ts">
	type DataPoint = { x: number; y: number; z: number };
	type Props = {
		data: DataPoint[];
		width?: number;
		height?: number;
		strokeWidth?: number;
	};
	let { data, width = 80, height = 24, strokeWidth = 2 }: Props = $props();

	// Compute min/max for scaling all axes together
	const [min, max] = $derived.by(() => {
		if (!data || data.length === 0) return [0, 1];
		const all = data.flatMap(d => [d.x, d.y, d.z]);
		const min = Math.min(...all);
		const max = Math.max(...all);
		return [min, max === min ? min + 1 : max];
	});

	function getPoints(axis: 'x' | 'y' | 'z') {
		if (!data || data.length === 0) return '0,0';
		let pointsArr = data;
		if (data.length === 1) {
			// Duplicate the single point so SVG draws a line
			pointsArr = [data[0], data[0]];
		}
		return pointsArr
			.map((d, i) => {
				const xVal = (i / (pointsArr.length - 1)) * width;
				const yVal = (max === min)
					? height / 2
					: height - ((d[axis] - min) / (max - min)) * height;
				return `${xVal},${yVal}`;
			})
			.join(' ');
	}
</script>

<svg {width} {height} viewBox={`0 0 ${width} ${height}`} fill="none" class="block">
	<polyline
		points={getPoints('x')}
		stroke="#3b82f6"
		stroke-width={strokeWidth}
		fill="none"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<polyline
		points={getPoints('y')}
		stroke="#22c55e"
		stroke-width={strokeWidth}
		fill="none"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<polyline
		points={getPoints('z')}
		stroke="#a855f7"
		stroke-width={strokeWidth}
		fill="none"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>
