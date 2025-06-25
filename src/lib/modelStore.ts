import { writable } from 'svelte/store';
import { type NNClassifierModel } from "./nn.ts";
import { type KnnClassifierModel } from "./knn.ts";

export const modelStore = writable<NNClassifierModel | KnnClassifierModel | null>(null);
