<script lang="ts">
import type { Vector3 } from '$lib/types';

export type Props = {
    landmarks: Vector3[];
    width?: number;
    height?: number;
    color?: string;
    pointRadius?: number;
    strokeWidth?: number;
};

let {
    landmarks,
    width = 80,
    height = 80,
    color = '#3b82f6',
    pointRadius = 2,
    strokeWidth = 2
}: Props = $props();

// MediaPipe connections (pairs of indices)
const connections: [number, number][] = [
    // Torso
    [11, 12], [11, 23], [12, 24], [23, 24],
    // Arms
    [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
    [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
    [18, 20],
    // Legs
    [23, 25], [25, 27], [27, 29], [29, 31],
    [24, 26], [26, 28], [28, 30], [30, 32],
    // Feet
    [27, 31], [28, 32]
];

// Compute bounds for normalization
function getBounds(landmarks: Vector3[]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const lm of landmarks) {
        if (lm.x < minX) minX = lm.x;
        if (lm.y < minY) minY = lm.y;
        if (lm.x > maxX) maxX = lm.x;
        if (lm.y > maxY) maxY = lm.y;
    }
    return { minX, minY, maxX, maxY };
}

// Map world/normalized points to SVG coordinates
function toSvgCoords(lm: Vector3, bounds: { minX: number, minY: number, maxX: number, maxY: number }) {
    const { minX, minY, maxX, maxY } = bounds;
    const x = ((lm.x - minX) / (maxX - minX || 1)) * width;
    const y = ((lm.y - minY) / (maxY - minY || 1)) * height;
    return { x, y };
}
</script>

{#if landmarks && landmarks.length >= 33}
    {@const bounds = getBounds(landmarks)}
    <svg {width} {height} viewBox={`0 0 ${width} ${height}`}>
        {#key landmarks}
            <!-- Draw connections -->
            {#each connections as [a, b]}
                {#if landmarks[a] && landmarks[b]}
                    {@const p1 = toSvgCoords(landmarks[a], bounds)}
                    {@const p2 = toSvgCoords(landmarks[b], bounds)}
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} stroke-width={strokeWidth} stroke-linecap="round" />
                {/if}
            {/each}
            <!-- Draw points -->
            {#each landmarks as lm, i}
                {@const p = toSvgCoords(lm, bounds)}
                <circle cx={p.x} cy={p.y} r={pointRadius} fill={color} />
            {/each}
        {/key}
    </svg>
{:else}
    <svg {width} {height} viewBox={`0 0 ${width} ${height}`}>
        <!-- Empty skeleton when no landmarks -->
    </svg>
{/if}
