import { type NNClassifierModel } from "./nn.ts";
import { type KnnClassifierModel } from "./knn.ts";
import { LocalStore } from "./localStore.ts";

export const modelStore = await LocalStore.create<NNClassifierModel | KnnClassifierModel | null>("modelStore", null);