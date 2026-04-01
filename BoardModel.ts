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
    public static readonly INITIAL_ROWS = 5;
    
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
    
    constructor() {
        this.grid = this.createEmptyGrid();
        this.blocks = new Map();
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
    
    public initializeNewGame(): void {
        this.grid = this.createEmptyGrid();
        this.blocks.clear();
        this.nextBlockId = 1;
        this.score = 0;
        this.turns = 0;
        this.freezeTurns = 0;
        this.energyProgress = 0;
        this.nextEnergyTarget = BoardModel.INITIAL_ENERGY_TARGET;
        
        for (let row = 0; row < BoardModel.INITIAL_ROWS; row++) {
            this.generateRowBlocks(row);
        }
        
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
    
    private generateRowBlocks(row: number): void {
        let col = 0;
        
        while (col < BoardModel.GRID_COLS) {
            const remainingCols = BoardModel.GRID_COLS - col;
            if (remainingCols <= 0) break;
            
            let width: BlockWidth;
            if (remainingCols >= 5) {
                width = this.generateRandomBlockWidth();
            } else if (remainingCols >= 4) {
                width = Math.random() < 0.5 ? BlockWidth.ONE : 
                        Math.random() < 0.5 ? BlockWidth.TWO :
                        Math.random() < 0.5 ? BlockWidth.THREE : BlockWidth.FOUR;
            } else if (remainingCols >= 3) {
                width = Math.random() < 0.4 ? BlockWidth.ONE : 
                        Math.random() < 0.5 ? BlockWidth.TWO : BlockWidth.THREE;
            } else if (remainingCols >= 2) {
                width = Math.random() < 0.5 ? BlockWidth.ONE : BlockWidth.TWO;
            } else {
                width = BlockWidth.ONE;
            }
            
            // 确保不会超出边界
            if (col + width > BoardModel.GRID_COLS) {
                width = BlockWidth.ONE;
                if (col + width > BoardModel.GRID_COLS) {
                    break;
                }
            }
            
            const block = this.createBlock(width, row, col);
            this.placeBlock(block);
            col += width;
        }
    }
    
    private generateRandomBlockWidth(): BlockWidth {
        const rand = Math.random();
        
        if (this.turns < 20) {
            if (rand < 0.5) return BlockWidth.ONE;
            if (rand < 0.8) return BlockWidth.TWO;
            return BlockWidth.THREE;
        } else if (this.turns < 40) {
            if (rand < 0.35) return BlockWidth.ONE;
            if (rand < 0.6) return BlockWidth.TWO;
            if (rand < 0.8) return BlockWidth.THREE;
            if (rand < 0.95) return BlockWidth.FOUR;
            return BlockWidth.FIVE;
        } else {
            if (rand < 0.2) return BlockWidth.ONE;
            if (rand < 0.4) return BlockWidth.TWO;
            if (rand < 0.6) return BlockWidth.THREE;
            if (rand < 0.85) return BlockWidth.FOUR;
            return BlockWidth.FIVE;
        }
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
        
        for (let i = 0; i < block.width; i++) {
            const checkCol = newCol + i;
            const gridValue = this.grid[block.row][checkCol];
            if (gridValue !== null && gridValue !== block.id) {
                return false;
            }
        }
        
        return true;
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
        let activations = 0;
        while (this.energyProgress >= this.nextEnergyTarget) {
            this.energyProgress -= this.nextEnergyTarget;
            this.nextEnergyTarget += BoardModel.ENERGY_INCREMENT;
            activations++;
        }
        return activations;
    }
    
    public getEnergyProgress(): { current: number; target: number; percentage: number } {
        return {
            current: this.energyProgress,
            target: this.nextEnergyTarget,
            percentage: Math.min(100, (this.energyProgress / this.nextEnergyTarget) * 100)
        };
    }
    
    public activateFreeze(): void {
        this.freezeTurns = 3;
    }
    
    public isFrozen(): boolean {
        return this.freezeTurns > 0;
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
        block.width = BlockWidth.ONE;
        block.score = BoardModel.SCORE_MAP[BlockWidth.ONE];
        this.placeBlock(block);
        
        return true;
    }
    
    public generateNextRow(): (BlockWidth | null)[] {
        this.nextRow = [];
        let col = 0;
        
        while (col < BoardModel.GRID_COLS) {
            const remainingCols = BoardModel.GRID_COLS - col;
            if (remainingCols <= 0) break;
            
            let width: BlockWidth;
            if (remainingCols >= 5) {
                width = this.generateRandomBlockWidth();
            } else if (remainingCols >= 4) {
                width = Math.random() < 0.5 ? BlockWidth.ONE : 
                        Math.random() < 0.5 ? BlockWidth.TWO :
                        Math.random() < 0.5 ? BlockWidth.THREE : BlockWidth.FOUR;
            } else if (remainingCols >= 3) {
                width = Math.random() < 0.4 ? BlockWidth.ONE : 
                        Math.random() < 0.5 ? BlockWidth.TWO : BlockWidth.THREE;
            } else if (remainingCols >= 2) {
                width = Math.random() < 0.5 ? BlockWidth.ONE : BlockWidth.TWO;
            } else {
                width = BlockWidth.ONE;
            }
            
            // 确保不会超出边界
            if (col + width > BoardModel.GRID_COLS) {
                width = BlockWidth.ONE;
                if (col + width > BoardModel.GRID_COLS) {
                    break;
                }
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
