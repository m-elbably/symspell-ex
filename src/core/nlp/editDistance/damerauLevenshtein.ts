/**
 * This is the fastest implementation of Damerau-Levenshtein for JavaScript,
 * an optimization of David Hamp-Gonsalves' port.
 * Based on implementation from https://github.com/microsoft/damlev
 */
import {EditDistance} from "../../index";

export class DamerauLevenshteinDistance implements EditDistance {
    name = 'DamerauLevenshtein';
    // Cache the codes and score arrays to significantly speed up damlev calls:
    // there's no need to re-allocate them.
    sourceCodes = new Array(32);
    targetCodes = new Array(32);
    score = new Array(33 * 33);

    /**
     * growArray will return an array that's at least as large as the provided
     * size. It may or may not return the same array that was passed in.
     * @param  {Array} arr
     * @param  {Number} size
     * @return {Array}
     */
    growArray(arr: number[], size: number) {
        if (size <= arr.length) {
            return arr;
        }

        let target = arr.length;
        while (target < size) {
            target *= 2;
        }

        return new Array(target);
    }

    /**
     * Returns the edit distance between the source and target strings.
     * @param  {String} source
     * @param  {String} target
     * @return {Number}
     */
    calculateDistance(source: string, target: string): number {
        // If one of the strings is blank, returns the length of the other (the
        // cost of the n insertions)
        if (!source) {
            return target.length;
        } else if (!target) {
            return source.length;
        }

        const sourceLength = source.length;
        const targetLength = target.length;
        let i: number;

        // Initialize a char code cache array
        this.sourceCodes = this.growArray(this.sourceCodes, sourceLength);
        this.targetCodes = this.growArray(this.targetCodes, targetLength);
        for (i = 0; i < sourceLength; i++) {
            this.sourceCodes[i] = source.charCodeAt(i);
        }
        for (i = 0; i < targetLength; i++) {
            this.targetCodes[i] = target.charCodeAt(i);
        }

        // Initialize the scoring matrix
        const INF = sourceLength + targetLength;
        const rowSize = sourceLength + 1;
        this.score = this.growArray(this.score, (sourceLength + 1) * (targetLength + 1));
        this.score[0] = INF;

        for (i = 0; i <= sourceLength; i++) {
            this.score[(i + 1) * rowSize] = INF;
            this.score[(i + 1) * rowSize + 1] = i;
        }

        for (i = 0; i <= targetLength; i++) {
            this.score[i] = INF;
            this.score[1 * rowSize + i + 1] = i;
        }

        // Run the damlev algorithm
        let chars: { [key: string]: number } = {};
        let j: number, DB: number, i1: number, j1: number, j2: number,
            newScore: number;
        for (i = 1; i <= sourceLength; i += 1) {
            DB = 0;
            for (j = 1; j <= targetLength; j += 1) {
                i1 = chars[this.targetCodes[j - 1]] || 0;
                j1 = DB;

                if (this.sourceCodes[i - 1] == this.targetCodes[j - 1]) {
                    newScore = this.score[i * rowSize + j];
                    DB = j;
                } else {
                    newScore = Math.min(this.score[i * rowSize + j], Math.min(this.score[(i + 1) * rowSize + j],
                        this.score[i * rowSize + j + 1])) + 1;
                }

                this.score[(i + 1) * rowSize + j + 1] = Math.min(newScore,
                    this.score[i1 * rowSize + j1] + (i - i1) + (j - j1 - 1));
            }
            chars[this.sourceCodes[i - 1]] = i;
        }
        return this.score[(sourceLength + 1) * rowSize + targetLength + 1];
    }
}
