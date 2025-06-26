import { type NNClassifierModel } from "./nn.ts";
import { type KnnClassifierModel } from "./knn.ts";
import { LocalStore } from "./localStore.ts";

export let modelStore: LocalStore<NNClassifierModel | KnnClassifierModel | null>;

export async function initModelStore() {
    if (modelStore) {
        return; // Already initialized
    }
    
    // Create the model store with initial value null
    modelStore = await LocalStore.create<NNClassifierModel | KnnClassifierModel | null>("modelStore", null);
}

initModelStore();