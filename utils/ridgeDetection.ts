export function cudaRidgeDetection(data: number[][], thres: number): { count: number[][], thresholdExceeded: boolean } {
    const rows = data.length;
    const cols = data[0].length;
    const count: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  
    // Parallelized loop simulation using a simple for loop
    for (let i = 1; i < rows - 1; i++) {
      for (let j = 1; j < cols - 1; j++) {
        if (
          i > 0 &&
          j > 0 &&
          i < rows - 1 &&
          j < cols - 1 &&
          data[i][j] > thres &&
          !isNaN(data[i][j])
        ) {
          let stepI = i;
          let stepJ = j;
          for (let k = 0; k < 1000; k++) {
            if (
              stepI === 0 ||
              stepJ === 0 ||
              stepI === rows - 1 ||
              stepJ === cols - 1
            ) {
              break;
            }
  
            let index = 4;
            let vmax = -Infinity;
  
            // 3x3周辺の最大値を計算
            for (let ii = 0; ii < 3; ii++) {
              for (let jj = 0; jj < 3; jj++) {
                const value = data[stepI + ii - 1][stepJ + jj - 1];
                if (value > vmax) {
                  vmax = value;
                  index = jj + 3 * ii;
                }
              }
            }
  
            if (index === 4 || vmax === data[stepI][stepJ] || isNaN(vmax)) {
              break;
            }
  
            const row = Math.floor(index / 3);
            const col = index % 3;
  
            // 隣接するセルにカウントを加算
            count[stepI - 1 + row][stepJ - 1 + col] += 1;
  
            // 次のセルへ移動
            stepI = stepI - 1 + row;
            stepJ = stepJ - 1 + col;
          }
        }
      }
    }
  
    // weather_array_normalizedの処理
    const weatherNormalized = data.reduce((sum, row) => sum + row.reduce((acc, value) => acc + value, 0), 0) / (rows * cols);
  
    // 平均値が特定の閾値を超えるかどうかの判定
    const thresholdExceeded = weatherNormalized > 0.5;
  
    return { count, thresholdExceeded };
  }
  