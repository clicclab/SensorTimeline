import * as tf from '@tensorflow/tfjs';

export type NNClassifierModel = {
  outputLabels: string[];
  weights: tf.Sequential | null;
};

export type NNTrainOptions = {
  epochs: number;
  learningRate: number;
  hiddenUnits: number;
};

export type NNTrainResult = {
  model: NNClassifierModel;
  loss: number[];
};

// Create a new NN model
export function createNNClassifierModel(
  outputLabels: string[],
): NNClassifierModel {
  return {
    outputLabels,
    weights: null, // Will be set after training
  };
}

// Forward pass (single sample)
export function nnPredict(
  model: NNClassifierModel,
  input: number[][], // 2D array: [timesteps, features]
  inputFeatures: number = 3 // n: number of features per timestep
): string {
    if (!model.weights) {
        throw new Error("Model weights not initialized");
    }

    // Downsample to 50 timesteps using interleaved sampling (take every other timestep)
    const timesteps = 50;
    const input3dArr: number[][] = [];
    for (let i = 0; i < timesteps; ++i) {
      let idx = i * 2; // Take every other timestep (0, 2, 4, ...)
      if (idx >= input.length) idx = input.length - 1; // Use last sample if not enough data
      let v = input[idx] || Array(inputFeatures).fill(0);
      if (v.length < inputFeatures) v = v.concat(Array(inputFeatures - v.length).fill(0));
      input3dArr.push(v.slice(0, inputFeatures));
    }
    const input3d = tf.tensor3d([input3dArr]);

    // Forward pass through the model
    const outputTensor = model.weights.predict(input3d) as tf.Tensor;

    // Get the predicted label index
    const outputArray = outputTensor.arraySync() as number[][];
    input3d.dispose();
    outputTensor.dispose();
    
    const predictedIndex = outputArray[0].indexOf(Math.max(...outputArray[0]));

    // Return the corresponding label
    return model.outputLabels[predictedIndex];
}

// Placeholder: training (returns random weights, no real training)
export async function trainNNClassifier(
  segments: Array<{ label: string; data: number[][] }>,
  options: NNTrainOptions,
  inputs: number = 3, // Number of input features (e.g., 3 for x, y, z)
): Promise<NNTrainResult> {
    console.log("Training NN Classifier with options:", options);
    const { epochs, learningRate, hiddenUnits } = options;

    // Get unique labels and mapping
    const uniqueLabels = Array.from(new Set(segments.map(s => s.label)));
    const labelToIndex = Object.fromEntries(uniqueLabels.map((l, i) => [l, i]));

    // Downsample to 50 timesteps and augment: split each 100-step segment into two 50-step samples
    const augmentedSamples: number[][][] = [];
    const augmentedLabels: string[] = [];
    for (const seg of segments) {
      // Interleaved sample 1: odd indices (1,3,5,...,99)
      const arr1: number[][] = [];
      for (let i = 0; i < 50; ++i) {
        let idx = 1 + i * 2;
        if (idx >= seg.data.length) idx = seg.data.length - 1;
        let v = seg.data[idx] || Array(inputs).fill(0);
        if (v.length < inputs) v = v.concat(Array(inputs - v.length).fill(0));
        arr1.push(v.slice(0, inputs));
      }
      augmentedSamples.push(arr1);
      augmentedLabels.push(seg.label);
      // Interleaved sample 2: even indices (0,2,4,...,98)
      const arr2: number[][] = [];
      for (let i = 0; i < 50; ++i) {
        let idx = i * 2;
        if (idx >= seg.data.length) idx = seg.data.length - 1;
        let v = seg.data[idx] || Array(inputs).fill(0);
        if (v.length < inputs) v = v.concat(Array(inputs - v.length).fill(0));
        arr2.push(v.slice(0, inputs));
      }
      augmentedSamples.push(arr2);
      augmentedLabels.push(seg.label);
    }

    // Prepare training data as 3D tensor: [numSamples, 50, inputs]
    const xs = tf.tensor3d(augmentedSamples);
    // One-hot encode labels using uniqueLabels
    const ys = tf.tensor2d(
      augmentedLabels.map(label => {
        const arr = Array(uniqueLabels.length).fill(0);
        arr[labelToIndex[label]] = 1;
        return arr;
      })
    );

    // Create a simple sequential model
    const model = tf.sequential();
    model.add(tf.layers.lstm({
      units: hiddenUnits,
      inputShape: [50, inputs],
      returnSequences: false
    }));
    model.add(tf.layers.dense({
      units: hiddenUnits,
      activation: 'relu'
    }));
    model.add(tf.layers.dense({
      units: uniqueLabels.length,
      activation: 'softmax'
    }));

    model.compile({
      optimizer: tf.train.adam(learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    const batchSize = Math.min(16, segments.length);
    const history = await model.fit(xs, ys, {
      epochs,
      batchSize,
      shuffle: true,
      verbose: 1
    });

    xs.dispose();
    ys.dispose();

    return {
      model: {
        outputLabels: uniqueLabels,
        weights: model
      },
      loss: history.history.loss as number[]
    };
}
