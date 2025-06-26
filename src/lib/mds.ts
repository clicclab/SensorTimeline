/**
 * Based on https://github.com/benfred/mds.js
 * 
Original license:
Copyright (C) 2013 Ben Frederickson

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { SVD } from 'svd-js'

// Type definitions
export type MDSResult = {
    points: number[][];
    svd: {
        q: number[];
        u: number[][];
        v: number[][];
    };
};

export type MDSParams = {
    padding?: number;
    w?: number;
    h?: number;
    pointRadius?: number;
    reverseX?: boolean;
    reverseY?: boolean;
    xTicks?: number;
    yTicks?: number;
};

// Helper functions for matrix operations
function matrixPow(A: number[][], power: number): number[][] {
    return A.map(row => row.map(x => Math.pow(x, power)));
}
function matrixMul(A: number[][], scalar: number): number[][] {
    return A.map(row => row.map(x => x * scalar));
}
function matrixAdd(...matrices: number[][][]): number[][] {
    const [A, ...rest] = matrices;
    return A.map((row, i) => row.map((val, j) => rest.reduce((acc, m) => acc + m[i][j], val)));
}
function matrixDiv(A: number[][], scalar: number): number[][] {
    return A.map(row => row.map(x => x / scalar));
}
function matrixTranspose(A: number[][]): number[][] {
    return A[0].map((_, j) => A.map(row => row[j]));
}
function vectorSqrt(v: number[]): number[] {
    return v.map(Math.sqrt);
}
function vectorMul(a: number[], b: number[]): number[] {
    return a.map((x, i) => x * b[i]);
}

export function mdsClassic(distances: number[][], dimensions: number = 2): MDSResult {
    if (!distances || distances.length === 0) return { points: [], svd: { q: [], u: [], v: [] } };
    if (distances.length === 1) {
        // Return a single point at the origin, padded to the requested dimensions
        return { points: [Array(dimensions).fill(0)], svd: { q: [], u: [], v: [] } };
    }
    // square distances
    let M = matrixMul(matrixPow(distances, 2), -0.5);

    // double centre the rows/columns
    function mean(A: number[][]): number[] {
        if (!A || A.length === 0) return [];
        const n = A.length;
        const m = A[0].length;
        const sum = Array(m).fill(0);
        for (let i = 0; i < n; ++i) {
            for (let j = 0; j < m; ++j) {
                sum[j] += A[i][j];
            }
        }
        return sum.map(x => x / n);
    }
    const rowMeans = mean(M);
    const colMeans = mean(matrixTranspose(M));
    const totalMean = mean([rowMeans])[0];

    for (let i = 0; i < M.length; ++i) {
        for (let j = 0; j < M[0].length; ++j) {
            M[i][j] += totalMean - rowMeans[i] - colMeans[j];
        }
    }

    // take the SVD of the double centred matrix, and return the points from it
    const ret = SVD(M);
    // Take top dimensions from the SVD result
    return { points: transformPoints(ret, dimensions), svd: ret };
}

export function transformPoints(svd: { q: number[]; u: number[][]; v: number[][]; }, dimensions: number) {
  const points: number[][] = [];
  for (let i = 0; i < svd.u.length; ++i) {
    const point: number[] = [];
    for (let j = 0; j < dimensions; ++j) {
      // Defensive: if svd.u[i][j] or svd.q[j] is undefined, fill with 0
      const uij = svd.u[i][j] ?? 0;
      const qj = svd.q[j] ?? 0;
      point.push(uij * Math.sqrt(Math.max(qj, 0)));
    }
    points.push(point);
  }
  return points;
}
