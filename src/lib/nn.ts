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
  input: number[]
): string {
    if (!model.weights) {
        throw new Error("Model weights not initialized");
    }

    // Convert input to tensor3d: [1, 100, 3]
    const input3d = tf.tensor3d([Array.from({length: 100}, (_, i) => [input[i*3] || 0, input[i*3+1] || 0, input[i*3+2] || 0])]);

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
  options: NNTrainOptions
): Promise<NNTrainResult> {
    console.log("Training NN Classifier with options:", options);
    const { epochs, learningRate, hiddenUnits } = options;
    // Create a simple sequential model
    const model = tf.sequential();

    // Add layers to the model
    model.add(tf.layers.simpleRNN({
        units: hiddenUnits,
        returnSequences: false,
        inputShape: [100, 3], // Assuming each segment has 100 timesteps with 3 features (x, y, z)
    }));
    model.add(tf.layers.dense({
        units: segments.length, // Output layer size matches number of labels
        activation: 'softmax' // Multi-class classification
    }));

    // Compile the model
    model.compile({
        optimizer: tf.train.adam(learningRate),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });

    // Prepare training data as 3D tensor: [numSamples, 100, 3]
    const xs = tf.tensor3d(
      segments.map(seg => {
        // Pad/truncate to 100 timesteps, each with 3 features
        const arr = [];
        for (let i = 0; i < 100; ++i) {
          const v = seg.data[i] || [0, 0, 0];
          arr.push([v[0], v[1], v[2]]);
        }
        return arr;
      })
    );
    
    const ys = tf.tensor2d(segments.map(seg => {
        const labelIndex = segments.findIndex(s => s.label === seg.label);
        return Array.from({ length: segments.length }, (_, i) => (i === labelIndex ? 1 : 0));
    }));

    // Train the model
    const history = await model.fit(xs, ys, {
        epochs,
        batchSize: 32,
        shuffle: true,
        verbose: 1
    });

    return {
        model: {
        outputLabels: segments.map(seg => seg.label),
        weights: model
        },
        loss: history.history.loss as number[]
    };
}
