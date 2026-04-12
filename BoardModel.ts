import { sys } from 'cc';

export enum BlockWidth {
    ONE = 1,
    TWO = 2,
    THREE = 3,
    FOUR = 4,
    FIVE = 5
}

export interface BlockData {
    id: number;
    width: BlockWidth;
    row: number;
    col: number;
    score: number;
}

export interface GameState {
    blocks: BlockData[];
    score: number;
    turns: number;
    freezeTurns: number;
    energyProgress: number;
    nextEnergyTarget: number;
    nextRow: (BlockWidth | null)[];
}

export class BoardModel {
    public static readonly GRID_COLS = 9;
    public static readonly GRID_ROWS = 11;
    public static readonly INITIAL_ROWS = 1;
    
    private static readonly SCORE_MAP: Record<BlockWidth, number> = {
        [BlockWidth.ONE]: 10,
        [BlockWidth.TWO]: 30,
        [BlockWidth.THREE]: 60,
        [BlockWidth.FOUR]: 100,
        [BlockWidth.FIVE]: 150
    };
    
    private static readonly INITIAL_ENERGY_TARGET = 2000;
    private static readonly ENERGY_INCREMENT = 1000;
    
    private grid: (number | null)[][];
    private blocks: Map<number, BlockData>;
    private nextBlockId: number = 1;
    private score: number = 0;
    private turns: number = 0;
    private freezeTurns: number = 0;
    private energyProgress: number = 0;
    private nextEnergyTarget: number = BoardModel.INITIAL_ENERGY_TARGET;
    private nextRow: (BlockWidth | null)[] = [];
    private longBlockProbability: number = 0.05;
    private crocodileEnabled: boolean = false;
    
    constructor() {
        this.grid = this.createEmptyGrid();
        this.blocks = new Map();
    }
    
    public setDifficultyParams(longBlockProbability: number, crocodileEnabled: boolean): void {
        this.longBlockProbability = longBlockProbability;
        this.crocodileEnabled = crocodileEnabled;
    }

    public getBoardDensity(): number {
        let filledCells = 0;
        const totalCells = BoardModel.GRID_COLS * BoardModel.GRID_ROWS;
        for (let row = 0; row < BoardModel.GRID_ROWS; row++) {
            for (let col = 0; col < BoardModel.GRID_COLS; col++) {
                if (this.grid[row][col] !== null) {
                    filledCells++;
                }
            }
        }
        return filledCells / totalCells;
    }

    public generateEncounterRow(crocodileCount: number): (BlockWidth | null)[] {
        const encounterRow: (BlockWidth | null)[] = [];
        const crocodilePositions: number[] = [];

        for (let i = 0; i < crocodileCount; i++) {
            let pos: number;
            let attempts = 0;
            do {
                pos = Math.floor(Math.random() * (BoardModel.GRID_COLS - BlockWidth.FIVE + 1));
                attempts++;
            } while (
                crocodilePositions.some(p => Math.abs(p - pos) < BlockWidth.FIVE) &&
                attempts < 50
            );
            crocodilePositions.push(pos);
        }

        crocodilePositions.sort((a, b) => a - b);

        let col = 0;
        let crocIdx = 0;

        while (col < BoardModel.GRID_COLS && crocIdx < crocodilePositions.length) {
            const nextCrocCol = crocodilePositions[crocIdx];

            while (col < nextCrocCol && col < BoardModel.GRID_COLS) {
                encounterRow.push(null);
                col++;
            }

            if (col + BlockWidth.FIVE <= BoardModel.GRID_COLS) {
                encounterRow.push(BlockWidth.FIVE);
                col += BlockWidth.FIVE;
            } else {
                encounterRow.push(null);
                col++;
            }
            crocIdx++;
        }

        while (col < BoardModel.GRID_COLS) {
            encounterRow.push(null);
            col++;
        }

        return encounterRow;
    }
    
    private createEmptyGrid(): (number | null)[][] {
        const grid: (number | null)[][] = [];
        for (let row = 0; row < BoardModel.GRID_ROWS; row++) {
            grid[row] = [];
            for (let col = 0; col < BoardModel.GRID_COLS; col++) {
                grid[row][col] = null;
            }
        }
        return grid;
    }
    
    public rebuildGrid(): void {
        this.grid = this.createEmptyGrid();
        
        for (const block of this.blocks.values()) {
            for (let i = 0; i < block.width; i++) {
                if (block.col + i < BoardModel.GRID_COLS) {
                    this.grid[block.row][block.col + i] = block.id;
                }
            }
        }
        
        console.log('=== rebuildGrid called ===');
        console.log('Total blocks:', this.blocks.size);
    }
    
    public initializeNewGame(): void {
        this.grid = this.createEmptyGrid();
        this.blocks.clear();
        this.nextBlockId = 1;
        this.score = 0;
        this.turns = 0;
        this.freezeTurns = 0;
        this.energyProgress = 0;
        this.nextEnergyTarget = BoardModel.INITIAL_ENERGY_TARGET;
        
        // 先生成所有初始滑块（放在较高的位置）
        for (let row = 0; row < BoardModel.INITIAL_ROWS; row++) {
            this.generateRowBlocks(row);
        }
        
        // 应用重力，让滑块自然下落堆叠
        this.applyGravity();
        this.rebuildGrid();
        
        this.generateNextRow();
    }
    
    public loadGame(): boolean {
        const savedData = sys.localStorage.getItem('slide_puzzle_save');
        if (!savedData) {
            return false;
        }
        
        try {
            const state: GameState = JSON.parse(savedData);
            this.grid = this.createEmptyGrid();
            this.blocks.clear();
            this.nextBlockId = 1;
            
            state.blocks.forEach(block => {
                this.blocks.set(block.id, { ...block });
                for (let i = 0; i < block.width; i++) {
                    if (block.col + i < BoardModel.GRID_COLS) {
                        this.grid[block.row][block.col + i] = block.id;
                    }
                }
                if (block.id >= this.nextBlockId) {
                    this.nextBlockId = block.id + 1;
                }
            });
            
            this.score = state.score;
            this.turns = state.turns;
            this.freezeTurns = state.freezeTurns;
            this.energyProgress = state.energyProgress;
            this.nextEnergyTarget = state.nextEnergyTarget;
            this.nextRow = state.nextRow;
            
            return true;
        } catch (e) {
            console.error('Failed to load game:', e);
            return false;
        }
    }
    
    public saveGame(): void {
        const state: GameState = {
            blocks: Array.from(this.blocks.values()),
            score: this.score,
            turns: this.turns,
            freezeTurns: this.freezeTurns,
            energyProgress: this.energyProgress,
            nextEnergyTarget: this.nextEnergyTarget,
            nextRow: this.nextRow
        };
        sys.localStorage.setItem('slide_puzzle_save', JSON.stringify(state));
    }
    
    public clearSave(): void {
        sys.localStorage.removeItem('slide_puzzle_save');
    }
    
    public hasSaveData(): boolean {
        return sys.localStorage.getItem('slide_puzzle_save') !== null;
    }
    
    public saveHighScore(score: number): void {
        const currentHighScore = this.getHighScore();
        if (score > currentHighScore) {
            sys.localStorage.setItem('slide_puzzle_high_score', score.toString());
        }
    }
    
    public getHighScore(): number {
        const highScoreStr = sys.localStorage.getItem('slide_puzzle_high_score');
        return highScoreStr ? parseInt(highScoreStr, 10) : 0;
    }
    
    public clearHighScore(): void {
        sys.localStorage.removeItem('slide_puzzle_high_score');
    }
    
    private generateRowBlocks(row: number): void {
        // 首先随机选择1-3个空隙位置
        const gapCount = Math.floor(Math.random() * 3) + 1; // 1-3个空隙
        const gapPositions: Set<number> = new Set();
        
        while (gapPositions.size < gapCount) {
            const pos = Math.floor(Math.random() * BoardModel.GRID_COLS);
            gapPositions.add(pos);
        }
        
        let col = 0;
        
        while (col < BoardModel.GRID_COLS) {
            // 如果当前位置是空隙，跳过
            if (gapPositions.has(col)) {
                col++;
                continue;
            }
            
            const remainingCols = BoardModel.GRID_COLS - col;
            
            // 计算到下一个空隙的距离
            let nextGap = BoardModel.GRID_COLS;
            for (const gap of gapPositions) {
                if (gap > col && gap < nextGap) {
                    nextGap = gap;
                }
            }
            const maxAllowedWidth = nextGap - col;
            
            if (remainingCols <= 0 || maxAllowedWidth <= 0) {
                col++;
                continue;
            }
            
            let width: BlockWidth;
            const effectiveMax = Math.min(remainingCols, maxAllowedWidth);
            
            if (effectiveMax >= 5) {
                width = this.generateRandomBlockWidth();
                if (width > effectiveMax) {
                    width = effectiveMax as BlockWidth;
                }
            } else if (effectiveMax >= 4) {
                width = (Math.floor(Math.random() * 4) + 1) as BlockWidth;
            } else if (effectiveMax >= 3) {
                width = (Math.floor(Math.random() * 3) + 1) as BlockWidth;
            } else if (effectiveMax >= 2) {
                width = Math.random() < 0.5 ? BlockWidth.ONE : BlockWidth.TWO;
            } else {
                width = BlockWidth.ONE;
            }
            
            if (col + width > BoardModel.GRID_COLS) {
                col++;
                continue;
            }
            
            const block = this.createBlock(width, row, col);
            this.placeBlock(block);
            col += width;
        }
    }
    
    private generateRandomBlockWidth(): BlockWidth {
        const rand = Math.random();
        const longProb = this.longBlockProbability;

        const oneBlockProb = Math.max(0.02, 0.50 - longProb * 0.80);
        const twoBlockProb = Math.max(0.10, 0.35 - longProb * 0.15);
        const threeBlockProb = Math.max(0.05, 0.15 - longProb * 0.10);

        const totalShortProb = oneBlockProb + twoBlockProb + threeBlockProb;
        const adjustedLongProb = Math.min(longProb, 1 - totalShortProb);

        if (rand < oneBlockProb) return BlockWidth.ONE;
        if (rand < oneBlockProb + twoBlockProb) return BlockWidth.TWO;
        if (rand < oneBlockProb + twoBlockProb + threeBlockProb) return BlockWidth.THREE;

        const fourProb = adjustedLongProb * (this.crocodileEnabled ? 0.50 : 1.0);
        if (rand < totalShortProb + fourProb) return BlockWidth.FOUR;

        if (this.crocodileEnabled) return BlockWidth.FIVE;
        return BlockWidth.FOUR;
    }
    
    private createBlock(width: BlockWidth, row: number, col: number): BlockData {
        return {
            id: this.nextBlockId++,
            width,
            row,
            col,
            score: BoardModel.SCORE_MAP[width]
        };
    }
    
    private placeBlock(block: BlockData): void {
        // 检查目标位置是否已有滑块
        for (let i = 0; i < block.width; i++) {
            if (block.col + i < BoardModel.GRID_COLS) {
                if (this.grid[block.row][block.col + i] !== null) {
                    console.error(`PlaceBlock error: position (${block.row}, ${block.col + i}) already occupied by block ${this.grid[block.row][block.col + i]}`);
                    return;
                }
            }
        }
        
        this.blocks.set(block.id, block);
        for (let i = 0; i < block.width; i++) {
            if (block.col + i < BoardModel.GRID_COLS) {
                this.grid[block.row][block.col + i] = block.id;
            }
        }
    }
    
    private removeBlock(blockId: number): void {
        const block = this.blocks.get(blockId);
        if (!block) return;
        
        for (let i = 0; i < block.width; i++) {
            if (block.col + i < BoardModel.GRID_COLS) {
                this.grid[block.row][block.col + i] = null;
            }
        }
        this.blocks.delete(blockId);
    }
    
    public canMoveBlock(blockId: number, newCol: number): boolean {
        const block = this.blocks.get(blockId);
        if (!block) return false;
        
        if (newCol < 0 || newCol + block.width > BoardModel.GRID_COLS) {
            return false;
        }
        
        const currentCol = block.col;
        
        if (newCol === currentCol) {
            return true;
        }
        
        const step = newCol > currentCol ? 1 : -1;
        
        for (let col = currentCol + step; step > 0 ? col <= newCol : col >= newCol; col += step) {
            for (let i = 0; i < block.width; i++) {
                const checkCol = col + i;
                if (checkCol < 0 || checkCol >= BoardModel.GRID_COLS) continue;
                
                const gridValue = this.grid[block.row][checkCol];
                if (gridValue !== null && gridValue !== block.id) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    public findMaxMovablePosition(blockId: number, targetCol: number): number {
        const block = this.blocks.get(blockId);
        if (!block) return block ? block.col : 0;
        
        const currentCol = block.col;
        
        if (targetCol === currentCol) {
            return currentCol;
        }
        
        const step = targetCol > currentCol ? 1 : -1;
        let lastValidCol = currentCol;
        
        for (let col = currentCol + step; step > 0 ? col <= targetCol : col >= targetCol; col += step) {
            let canMoveToCol = true;
            
            for (let i = 0; i < block.width; i++) {
                const checkCol = col + i;
                if (checkCol < 0 || checkCol >= BoardModel.GRID_COLS) {
                    canMoveToCol = false;
                    break;
                }
                
                const gridValue = this.grid[block.row][checkCol];
                if (gridValue !== null && gridValue !== block.id) {
                    canMoveToCol = false;
                    break;
                }
            }
            
            if (canMoveToCol) {
                lastValidCol = col;
            } else {
                break;
            }
        }
        
        return lastValidCol;
    }
    
    public moveBlock(blockId: number, newCol: number): boolean {
        if (!this.canMoveBlock(blockId, newCol)) {
            return false;
        }
        
        const block = this.blocks.get(blockId);
        if (!block) return false;
        
        for (let i = 0; i < block.width; i++) {
            if (block.col + i < BoardModel.GRID_COLS) {
                this.grid[block.row][block.col + i] = null;
            }
        }
        
        block.col = newCol;
        
        for (let i = 0; i < block.width; i++) {
            if (block.col + i < BoardModel.GRID_COLS) {
                this.grid[block.row][block.col + i] = block.id;
            }
        }
        
        return true;
    }
    
    public applyGravity(): { blockId: number; oldRow: number; newRow: number }[] {
        console.log('=== Applying Gravity (v2.0 - row 0 is bottom) ===');
        
        const movedBlocks: { blockId: number; oldRow: number; newRow: number }[] = [];
        let hasChanges = true;
        
        console.log('Grid before gravity:');
        console.log(this.getGridDebug());
        
        while (hasChanges) {
            hasChanges = false;
            
            const blocksArray = Array.from(this.blocks.values());
            // 从顶部开始处理（row 值大的先处理），这样顶部的滑块先掉落
            blocksArray.sort((a, b) => b.row - a.row);
            
            for (const block of blocksArray) {
                const oldRow = block.row;
                const newRow = this.findLowestPosition(block);
                
                console.log(`Block ${block.id} at row ${oldRow}, width ${block.width}, lowest position: ${newRow}`);
                
                if (newRow !== oldRow) {
                    this.removeBlock(block.id);
                    block.row = newRow;
                    this.placeBlock(block);
                    movedBlocks.push({ blockId: block.id, oldRow, newRow });
                    hasChanges = true;
                    console.log(`Block ${block.id} moved from row ${oldRow} to row ${newRow}`);
                }
            }
        }
        
        console.log('Grid after gravity:');
        console.log(this.getGridDebug());
        
        return movedBlocks;
    }
    
    private findLowestPosition(block: BlockData): number {
        let targetRow = block.row;
        
        console.log(`  findLowestPosition: block ${block.id}, current row ${block.row}, width ${block.width}`);
        
        // 向下查找（row 值减小，因为 row 0 是底部）
        for (let row = block.row - 1; row >= 0; row--) {
            let canPlace = true;
            
            console.log(`    Checking row ${row}:`);
            
            for (let i = 0; i < block.width; i++) {
                const checkCol = block.col + i;
                if (checkCol >= BoardModel.GRID_COLS) {
                    canPlace = false;
                    console.log(`      col ${checkCol} out of bounds`);
                    break;
                }
                
                const gridValue = this.grid[row][checkCol];
                console.log(`      col ${checkCol}: gridValue=${gridValue}, blockId=${block.id}`);
                if (gridValue !== null && gridValue !== block.id) {
                    canPlace = false;
                    console.log(`      blocked by block ${gridValue}`);
                    break;
                }
            }
            
            if (canPlace) {
                targetRow = row;
                console.log(`    Can place at row ${row}, targetRow updated to ${targetRow}`);
            } else {
                console.log(`    Cannot place at row ${row}, stopping`);
                break;
            }
        }
        
        console.log(`  Final targetRow: ${targetRow}`);
        return targetRow;
    }
    
    public checkCompleteRows(): number[] {
        const completeRows: number[] = [];
        
        for (let row = 0; row < BoardModel.GRID_ROWS; row++) {
            let isComplete = true;
            
            for (let col = 0; col < BoardModel.GRID_COLS; col++) {
                if (this.grid[row][col] === null) {
                    isComplete = false;
                    break;
                }
            }
            
            if (isComplete) {
                completeRows.push(row);
            }
        }
        
        return completeRows;
    }
    
    public removeCompleteRows(completeRows: number[]): BlockData[] {
        const removedBlocks: BlockData[] = [];
        const blocksToRemove: Set<number> = new Set();
        
        for (const row of completeRows) {
            for (let col = 0; col < BoardModel.GRID_COLS; col++) {
                const blockId = this.grid[row][col];
                if (blockId !== null && !blocksToRemove.has(blockId)) {
                    blocksToRemove.add(blockId);
                    const block = this.blocks.get(blockId);
                    if (block) {
                        removedBlocks.push({ ...block });
                    }
                }
            }
        }
        
        blocksToRemove.forEach(blockId => {
            this.removeBlock(blockId);
        });
        
        return removedBlocks;
    }
    
    public addScore(blockScore: number): void {
        this.score += blockScore;
        this.energyProgress += blockScore;
    }
    
    public checkEnergyActivation(): number {
        return this.energyProgress >= this.nextEnergyTarget ? 1 : 0;
    }
    
    public useEnergy(): boolean {
        if (this.energyProgress >= this.nextEnergyTarget) {
            this.energyProgress -= this.nextEnergyTarget;
            this.nextEnergyTarget += BoardModel.ENERGY_INCREMENT;
            return true;
        }
        return false;
    }
    
    public getEnergyProgress(): { current: number; target: number; percentage: number } {
        return {
            current: this.energyProgress,
            target: this.nextEnergyTarget,
            percentage: Math.min(100, (this.energyProgress / this.nextEnergyTarget) * 100)
        };
    }
    
    public addEnergyProgress(amount: number): void {
        this.energyProgress += amount;
    }
    
    public activateFreeze(): void {
        this.freezeTurns = 3;
    }
    
    public isFrozen(): boolean {
        return this.freezeTurns > 0;
    }
    
    public getFreezeTurns(): number {
        return this.freezeTurns;
    }
    
    public decrementFreeze(): void {
        if (this.freezeTurns > 0) {
            this.freezeTurns--;
        }
    }
    
    public shrinkBlock(blockId: number): boolean {
        const block = this.blocks.get(blockId);
        if (!block || block.width !== BlockWidth.FIVE) {
            return false;
        }
        
        this.removeBlock(block.id);
        
        const originalCenterCol = block.col + Math.floor(block.width / 2);
        block.width = BlockWidth.ONE;
        block.col = originalCenterCol;
        block.score = BoardModel.SCORE_MAP[BlockWidth.ONE];
        this.placeBlock(block);
        
        return true;
    }
    
    public clearBottomRow(): boolean {
        const bottomRow = 0;
        const blockIdsToRemove: Set<number> = new Set();
        
        for (let col = 0; col < BoardModel.GRID_COLS; col++) {
            const blockId = this.grid[bottomRow][col];
            if (blockId !== null) {
                blockIdsToRemove.add(blockId);
            }
        }
        
        if (blockIdsToRemove.size === 0) {
            return false;
        }
        
        blockIdsToRemove.forEach(id => {
            this.removeBlock(id);
        });
        
        return true;
    }
    
    public generateNextRow(): (BlockWidth | null)[] {
        this.nextRow = [];
        
        // 首先随机选择1-3个空隙位置
        const gapCount = Math.floor(Math.random() * 3) + 1; // 1-3个空隙
        const gapPositions: Set<number> = new Set();
        
        while (gapPositions.size < gapCount) {
            const pos = Math.floor(Math.random() * BoardModel.GRID_COLS);
            gapPositions.add(pos);
        }
        
        let col = 0;
        
        while (col < BoardModel.GRID_COLS) {
            // 如果当前位置是空隙，添加null并跳过
            if (gapPositions.has(col)) {
                this.nextRow.push(null);
                col++;
                continue;
            }
            
            const remainingCols = BoardModel.GRID_COLS - col;
            
            // 计算到下一个空隙的距离
            let nextGap = BoardModel.GRID_COLS;
            for (const gap of gapPositions) {
                if (gap > col && gap < nextGap) {
                    nextGap = gap;
                }
            }
            const maxAllowedWidth = nextGap - col;
            
            if (remainingCols <= 0 || maxAllowedWidth <= 0) {
                this.nextRow.push(null);
                col++;
                continue;
            }
            
            let width: BlockWidth;
            const effectiveMax = Math.min(remainingCols, maxAllowedWidth);
            
            if (effectiveMax >= 5) {
                width = this.generateRandomBlockWidth();
                if (width > effectiveMax) {
                    width = effectiveMax as BlockWidth;
                }
            } else if (effectiveMax >= 4) {
                width = (Math.floor(Math.random() * 4) + 1) as BlockWidth;
            } else if (effectiveMax >= 3) {
                width = (Math.floor(Math.random() * 3) + 1) as BlockWidth;
            } else if (effectiveMax >= 2) {
                width = Math.random() < 0.5 ? BlockWidth.ONE : BlockWidth.TWO;
            } else {
                width = BlockWidth.ONE;
            }
            
            // 确保不会超出边界
            if (col + width > BoardModel.GRID_COLS) {
                this.nextRow.push(null);
                col++;
                continue;
            }
            
            this.nextRow.push(width);
            col += width;
        }
        
        return this.nextRow;
    }
    
    public pushNewRow(): boolean {
        for (let col = 0; col < BoardModel.GRID_COLS; col++) {
            if (this.grid[BoardModel.GRID_ROWS - 1][col] !== null) {
                return false;
            }
        }
        
        const blocksToMove: BlockData[] = [];
        for (const block of this.blocks.values()) {
            blocksToMove.push(block);
        }
        
        blocksToMove.sort((a, b) => b.row - a.row);
        
        for (const block of blocksToMove) {
            this.removeBlock(block.id);
            block.row++;
            this.placeBlock(block);
        }
        
        let col = 0;
        
        for (const item of this.nextRow) {
            if (item === null) {
                col++;
                continue;
            }
            
            const width = item;
            if (col + width > BoardModel.GRID_COLS) {
                break;
            }
            
            const block = this.createBlock(width, 0, col);
            this.placeBlock(block);
            col += width;
        }
        
        this.generateNextRow();
        this.turns++;
        
        return true;
    }
    
    public getBlockAt(row: number, col: number): BlockData | null {
        if (row < 0 || row >= BoardModel.GRID_ROWS || col < 0 || col >= BoardModel.GRID_COLS) {
            return null;
        }
        
        const blockId = this.grid[row][col];
        if (blockId === null) {
            return null;
        }
        
        return this.blocks.get(blockId) || null;
    }
    
    public getAllBlocks(): BlockData[] {
        return Array.from(this.blocks.values());
    }
    
    public getBlockById(blockId: number): BlockData | null {
        return this.blocks.get(blockId) || null;
    }
    
    public getScore(): number {
        return this.score;
    }
    
    public getTurns(): number {
        return this.turns;
    }
    
    public getNextRow(): (BlockWidth | null)[] {
        return this.nextRow;
    }

    public setNextRow(row: (BlockWidth | null)[]): void {
        this.nextRow = [...row];
    }
    
    public isGameOver(): boolean {
        // 检查顶部是否有滑块（row 10 是顶部）
        for (let col = 0; col < BoardModel.GRID_COLS; col++) {
            if (this.grid[BoardModel.GRID_ROWS - 1][col] !== null) {
                return true;
            }
        }
        return false;
    }
    
    public getGridDebug(): string {
        let result = '';
        for (let row = 0; row < BoardModel.GRID_ROWS; row++) {
            for (let col = 0; col < BoardModel.GRID_COLS; col++) {
                const blockId = this.grid[row][col];
                if (blockId === null) {
                    result += '. ';
                } else {
                    const block = this.blocks.get(blockId);
                    if (block) {
                        result += block.width + ' ';
                    } else {
                        result += '? ';
                    }
                }
            }
            result += '\n';
        }
        return result;
    }
}
