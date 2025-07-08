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

// Utility to flatten a segment's data for input to the NN
export function flattenSegment(segment: number[][], maxLen: number): number[] {
  // Pad or truncate to maxLen, flatten [x,y,z] per timestep
  const flat: number[] = [];
  for (let i = 0; i < maxLen; ++i) {
    const v = segment[i] || [0, 0, 0];
    flat.push(v[0], v[1], v[2]);
  }
  return flat;
}

// Create a new NN model
export function createNNClassifierModel(
  outputLabels: string[],
): NNClassifierModel {
  return {
    outputLabels,
    weights: null, // Will be set after training
  };
}

// Placeholder: forward pass (single sample)
export function nnPredict(
  model: NNClassifierModel,
  input: number[],
  inputFeatures: number = 3 // n: number of features per timestep
): string {
    if (!model.weights) {
        throw new Error("Model weights not initialized");
    }

    // Convert input to tensor3d: [1, 100, n]
    const timesteps = 100;
    const input3dArr = Array.from({length: timesteps}, (_, i) => {
      const step: number[] = [];
      for (let j = 0; j < inputFeatures; ++j) {
        step.push(input[i*inputFeatures + j] || 0);
      }
      return step;
    });
    const input3d = tf.tensor3d([input3dArr]);

    // Forward pass through the model
    const outputTensor = model.weights.predict(input3d) as tf.Tensor;

    // Get the predicted label index
    const outputArray = outputTensor.arraySync() as number[][];
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

    // Prepare training data as 3D tensor: [numSamples, 100, inputs]
    const xs = tf.tensor3d(
      segments.map(seg => {
        const arr = [];
        for (let i = 0; i < 100; ++i) {
          const v = seg.data[i] || Array(inputs).fill(0);
          if (v.length < inputs) {
            v.push(...Array(inputs - v.length).fill(0));
          }
          arr.push(v.slice(0, inputs));
        }
        return arr;
      })
    );

    // One-hot encode labels using uniqueLabels
    const ys = tf.tensor2d(
      segments.map(seg => {
        const arr = Array(uniqueLabels.length).fill(0);
        arr[labelToIndex[seg.label]] = 1;
        return arr;
      })
    );

    // Create a simple sequential model
    const model = tf.sequential();
    model.add(tf.layers.lstm({
      units: hiddenUnits,
      inputShape: [100, inputs],
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
