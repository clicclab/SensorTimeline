<script lang="ts">
import type { ModelType } from "$lib/types";

type Props = {
    onChange: (val: ModelType | null) => void;
};
let { onChange }: Props = $props();
let modelType: ModelType | null = $state(null);

$effect(() => {
    modelType;
    onChange(modelType);
});

</script>

<div class="mb-8 p-6 bg-gray-50 rounded-xl">
    <h2 class="text-lg font-semibold text-gray-900 mb-4">Choose Model Type</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="relative h-full">
            <input
                type="radio"
                checked={modelType === 'neural'}
                onchange={() => modelType = 'neural'}
                class="peer sr-only"
                name="modelType"
            />
            <div class="h-full flex flex-col justify-between p-4 border-2 border-gray-200 rounded-lg cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:border-gray-300 transition-all">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <span class="text-white text-sm font-bold">NN</span>
                    </div>
                    <div>
                        <h3 class="font-medium text-gray-900">Neural Network</h3>
                        <p class="text-sm text-gray-600">Flexible, can learn more complex patterns</p>
                    </div>
                </div>
            </div>
        </label>
        <label class="relative h-full">
            <input
                type="radio"
                checked={modelType === 'knn'}
                onchange={() => modelType = 'knn'}
                class="peer sr-only"
                name="modelType"
            />
            <div class="h-full flex flex-col justify-between p-4 border-2 border-gray-200 rounded-lg cursor-pointer peer-checked:border-purple-500 peer-checked:bg-purple-50 hover:border-gray-300 transition-all">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <span class="text-white text-sm font-bold">kNN</span>
                    </div>
                    <div>
                        <h3 class="font-medium text-gray-900">k-Nearest Neighbors</h3>
                        <p class="text-sm text-gray-600">Simple, fast, interpretable</p>
                    </div>
                </div>
            </div>
        </label>
    </div>
</div>
