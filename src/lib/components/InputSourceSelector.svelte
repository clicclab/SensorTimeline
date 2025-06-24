<script lang="ts">
	type Props = {
		inputSource: 'webrtc' | 'microbit';
		onChange: (val: 'webrtc' | 'microbit') => void;
	};
	let { inputSource, onChange }: Props = $props();
</script>

<div class="mb-8 p-6 bg-gray-50 rounded-xl">
	<h2 class="text-lg font-semibold text-gray-900 mb-4">Select Input Source</h2>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<label class="relative">
			<input
				type="radio"
				checked={inputSource === 'webrtc'}
				onchange={() => onChange('webrtc')}
				class="peer sr-only"
			/>
			<div class="p-4 border-2 border-gray-200 rounded-lg cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:border-gray-300 transition-all">
				<div class="flex items-center space-x-3">
					<div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
						<span class="text-white text-sm">📱</span>
					</div>
					<div>
						<h3 class="font-medium text-gray-900">Mobile Device</h3>
						<p class="text-sm text-gray-600">Connect via WebRTC</p>
					</div>
				</div>
			</div>
		</label>
		<label class="relative">
			<input
				type="radio"
				checked={inputSource === 'microbit'}
				onchange={() => onChange('microbit')}
				class="peer sr-only"
			/>
			<div class="p-4 border-2 border-gray-200 rounded-lg cursor-pointer peer-checked:border-purple-500 peer-checked:bg-purple-50 hover:border-gray-300 transition-all">
				<div class="flex items-center space-x-3">
					<div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
						<span class="text-white text-sm font-bold">μ</span>
					</div>
					<div>
						<h3 class="font-medium text-gray-900">micro:bit</h3>
						<p class="text-sm text-gray-600">Connect via Bluetooth</p>
					</div>
				</div>
			</div>
		</label>
	</div>
</div>
