// BlockData 类型定义
export type BlockData = {
    id: string;
    x: number;
    y: number;
    w: number;
    colorType: 1 | 2 | 3 | 4 | 5;
};

// 游戏状态
export type GameStateData = {
    blocks: BlockData[];
    nextRow: BlockData[];
    score: number;
    turn: number;
    propEnergy: number;
    propTarget: number;
    freezeTurns: number;
    gameOver: boolean;
};

// 常量
export const BOARD_WIDTH = 9;
export const BOARD_HEIGHT = 11;

// 分数配置
export const BLOCK_SCORES: Record<number, number> = {
    1: 10,
    2: 30,
    3: 60,
    4: 100,
    5: 150,
};

// 颜色配置 (RGB) - 根据方块宽度
export const BLOCK_COLORS: Record<number, { r: number; g: number; b: number }> = {
    1: { r: 128, g: 243, b: 255 },  // 青色 #80F3FF
    2: { r: 193, g: 176, b: 255 },  // 紫色 #C1B0FF
    3: { r: 255, g: 235, b: 59 },   // 黄色 #FFEB3B
    4: { r: 255, g: 167, b: 38 },   // 橙色 #FFA726
    5: { r: 92, g: 107, b: 192 },   // 靛蓝色 #5C6BC0
};

const INITIAL_PROP_TARGET = 2000;

// 生成唯一ID
export function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

// 根据回合数生成一行方块
export function generateRow(turn: number): BlockData[] {
    let availableSpaces = BOARD_WIDTH;
    const blocks: BlockData[] = [];
    
    // 保证每行至少有1-2个空格，不会立即消除
    const maxFill = BOARD_WIDTH - Math.floor(Math.random() * 2 + 1);
    
    let currentFill = 0;
    let currentX = 0;

    while (currentFill < maxFill && currentX < BOARD_WIDTH) {
        // 计算当前位置能生成的最大长度
        const maxLen = Math.min(5, maxFill - currentFill, BOARD_WIDTH - currentX);
        if (maxLen <= 0) break;

        // 根据难度权重池
        let pool: number[] = [];
        if (turn < 10) pool = [1, 1, 1, 2, 2, 3];
        else if (turn < 30) pool = [1, 2, 2, 3, 3, 4];
        else if (turn < 60) pool = [2, 3, 3, 4, 4, 5];
        else pool = [3, 4, 4, 5, 5];

        pool = pool.filter(l => l <= maxLen);
        if (pool.length === 0) pool = [1];
        
        const len = pool[Math.floor(Math.random() * pool.length)];

        // 随机跳过空格创造间隙
        if (Math.random() > 0.6 && currentX + len < BOARD_WIDTH) {
            currentX++;
        }

        if (currentX + len <= BOARD_WIDTH) {
            blocks.push({
                id: generateId(),
                x: currentX,
                y: BOARD_HEIGHT - 1,
                w: len,
                colorType: len as 1 | 2 | 3 | 4 | 5,
            });
            currentFill += len;
            currentX += len;
        } else {
            break;
        }
    }

    return blocks;
}

// 游戏引擎类
export class GameEngine {
    private state: GameStateData;
    private stateListeners: ((state: GameStateData) => void)[] = [];
    
    constructor() {
        // 从 localStorage 读取存档
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('blockPuzzleState') : null;
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (!parsed.gameOver) {
                    this.state = parsed;
                    return;
                }
            } catch (e) {
                console.error('Error parsing save', e);
            }
        }
        
        this.state = {
            blocks: [],
            nextRow: [],
            score: 0,
            turn: 0,
            propEnergy: 0,
            propTarget: INITIAL_PROP_TARGET,
            freezeTurns: 0,
            gameOver: false,
        };
    }
    
    // 获取状态
    getState(): GameStateData {
        return this.state;
    }
    
    // 订阅状态变化
    subscribe(listener: (state: GameStateData) => void): () => void {
        this.stateListeners.push(listener);
        return () => {
            const index = this.stateListeners.indexOf(listener);
            if (index > -1) {
                this.stateListeners.splice(index, 1);
            }
        };
    }
    
    // 通知状态变化
    private notifyState(): void {
        this.stateListeners.forEach(listener => listener(this.state));
        this.saveState();
    }
    
    // 更新状态
    private setState(newState: Partial<GameStateData>): void {
        this.state = { ...this.state, ...newState };
        this.notifyState();
    }
    
    // 保存状态
    saveState(): void {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('blockPuzzleState', JSON.stringify(this.state));
        }
    }
    
    // 清除存档
    clearState(): void {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('blockPuzzleState');
        }
    }
    
    // 初始化游戏
    initialize(): void {
        const firstRow = generateRow(0).map(b => ({ ...b, y: BOARD_HEIGHT - 1 }));
        const nextRow = generateRow(1);
        
        this.state = {
            blocks: firstRow,
            nextRow: nextRow,
            score: 0,
            turn: 0,
            propEnergy: 0,
            propTarget: INITIAL_PROP_TARGET,
            freezeTurns: 0,
            gameOver: false,
        };
        
        // 注意：不在这里调用 notifyState，让调用者决定何时通知
    }
    
    // 重启游戏
    restartGame(): void {
        this.initialize();
        this.notifyState(); // 重启时需要通知
    }
    
    // 应用重力
    applyGravity(blocks: BlockData[]): { newBlocks: BlockData[], moved: boolean } {
        let moved = false;
        let newBlocks = [...blocks].sort((a, b) => b.y - a.y); // 从下往上排序

        for (let i = 0; i < newBlocks.length; i++) {
            let b = newBlocks[i];
            let fallY = b.y;
            let canFall = true;

            while (canFall && fallY < BOARD_HEIGHT - 1) {
                // 检查下方是否有方块阻挡
                const overlaps = newBlocks.some(other => 
                    other.id !== b.id && 
                    other.y === fallY + 1 && 
                    !(b.x + b.w <= other.x || b.x >= other.x + other.w)
                );

                if (!overlaps) {
                    fallY++;
                    moved = true;
                } else {
                    canFall = false;
                }
            }
            newBlocks[i] = { ...b, y: fallY };
        }
        return { newBlocks, moved };
    }
    
    // 检查消除
    checkClears(blocks: BlockData[]): { y: number, score: number }[] {
        const rowCounts = new Array(BOARD_HEIGHT).fill(0);
        const rowBlocks: Record<number, BlockData[]> = {};

        blocks.forEach(b => {
            rowCounts[b.y] += b.w;
            if (!rowBlocks[b.y]) rowBlocks[b.y] = [];
            rowBlocks[b.y].push(b);
        });

        const clears: { y: number, score: number }[] = [];
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            if (rowCounts[y] === BOARD_WIDTH) {
                // 计算该行分数
                const score = rowBlocks[y].reduce((sum, block) => 
                    sum + (BLOCK_SCORES[block.colorType] || 0), 0);
                clears.push({ y, score });
            }
        }
        return clears;
    }
    
    // 移动方块
    moveBlock(id: string, newX: number): boolean {
        if (this.state.gameOver) return false;
        
        const block = this.state.blocks.find(b => b.id === id);
        if (!block || block.x === newX) return false; // 没有移动

        const updatedBlocks = this.state.blocks.map(b => 
            b.id === id ? { ...b, x: newX } : b
        );
        
        // 更新状态
        this.setState({ blocks: updatedBlocks });
        
        return true;
    }
    
    // 处理物理（掉落和消除）
    async processPhysics(isTurnAdvance: boolean, onClearingRows?: (rows: { y: number, score: number }[]) => void): Promise<void> {
        let currentBlocks = [...this.state.blocks];
        let combo = 1;
        let totalScoreToAdd = 0;

        // 1. 初始重力掉落
        let { newBlocks, moved } = this.applyGravity(currentBlocks);
        if (moved) {
            currentBlocks = newBlocks;
            this.setState({ blocks: currentBlocks });
            await this.sleep(300);
        }

        // 2. 消除循环
        while (true) {
            const clears = this.checkClears(currentBlocks);
            if (clears.length === 0) break;

            // 通知消除行（用于显示分数）
            if (onClearingRows) {
                onClearingRows(clears);
            }

            await this.sleep(1000); // 等待1秒显示分数

            const clearY = clears.map(c => c.y);
            let stepScore = 0;
            clears.forEach(c => { stepScore += c.score; });
            totalScoreToAdd += stepScore * combo;

            // 移除被消除的方块
            currentBlocks = currentBlocks.filter(b => clearY.indexOf(b.y) < 0);
            
            // 清除消除行通知
            if (onClearingRows) {
                onClearingRows([]);
            }
            
            this.setState({ blocks: currentBlocks });
            
            // 应用重力
            const gravResult = this.applyGravity(currentBlocks);
            currentBlocks = gravResult.newBlocks;
            this.setState({ blocks: currentBlocks });
            
            if (gravResult.moved) {
                await this.sleep(300);
            }
            combo++;
        }

        // 添加分数
        if (totalScoreToAdd > 0) {
            this.setState({
                score: this.state.score + totalScoreToAdd,
                propEnergy: this.state.propEnergy + totalScoreToAdd
            });
        }

        // 3. 回合推进
        if (isTurnAdvance) {
            if (this.state.freezeTurns > 0) {
                this.setState({ freezeTurns: this.state.freezeTurns - 1 });
            } else {
                // 所有方块上移一行
                let nextBlocks = currentBlocks.map(b => ({ ...b, y: b.y - 1 }));
                
                // 游戏结束检查
                if (nextBlocks.some(b => b.y < 0)) {
                    this.setState({ gameOver: true });
                    return;
                }

                // 添加新行
                const newRowBlocks = this.state.nextRow.map(b => ({ ...b, y: BOARD_HEIGHT - 1 }));
                nextBlocks = [...nextBlocks, ...newRowBlocks];
                
                this.setState({
                    blocks: nextBlocks,
                    nextRow: generateRow(this.state.turn + 1),
                    turn: this.state.turn + 1
                });
                
                await this.sleep(300);

                // 推入后再次应用物理
                let postGrav = this.applyGravity(nextBlocks);
                nextBlocks = postGrav.newBlocks;
                this.setState({ blocks: nextBlocks });
                
                if (postGrav.moved) await this.sleep(300);

                // 再次检查消除
                while (true) {
                    const clears = this.checkClears(nextBlocks);
                    if (clears.length === 0) break;
                    
                    if (onClearingRows) {
                        onClearingRows(clears);
                    }
                    await this.sleep(1000);
                    
                    const clearY = clears.map(c => c.y);
                    let stepScore = 0;
                    clears.forEach(c => { stepScore += c.score; });
                    
                    this.setState({
                        score: this.state.score + stepScore,
                        propEnergy: this.state.propEnergy + stepScore
                    });

                    nextBlocks = nextBlocks.filter(b => clearY.indexOf(b.y) < 0);
                    if (onClearingRows) {
                        onClearingRows([]);
                    }
                    this.setState({ blocks: nextBlocks });
                    
                    postGrav = this.applyGravity(nextBlocks);
                    nextBlocks = postGrav.newBlocks;
                    this.setState({ blocks: nextBlocks });
                    if (postGrav.moved) await this.sleep(300);
                }
            }
        }
    }
    
    // 使用冻结道具
    applyFreezeProp(): boolean {
        if (this.state.propEnergy >= this.state.propTarget) {
            this.setState({
                freezeTurns: this.state.freezeTurns + 3,
                propEnergy: this.state.propEnergy - this.state.propTarget,
                propTarget: this.state.propTarget + 1000
            });
            return true;
        }
        return false;
    }
    
    // 使用缩减道具
    applyShrinkProp(blockId: string): boolean {
        if (this.state.propEnergy >= this.state.propTarget) {
            const block = this.state.blocks.find(b => b.id === blockId);
            if (block && block.w === 5) {
                this.setState({
                    propEnergy: this.state.propEnergy - this.state.propTarget,
                    propTarget: this.state.propTarget + 1000,
                    blocks: this.state.blocks.map(b => 
                        b.id === blockId ? { ...b, w: 1, colorType: 1 } : b
                    )
                });
                return true;
            }
        }
        return false;
    }
    
    // 辅助函数：睡眠
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 检查是否有存档
    hasSave(): boolean {
        return this.state.blocks.length > 0 && !this.state.gameOver;
    }
    
    // 检查道具是否可用
    canUseProp(): boolean {
        return this.state.propEnergy >= this.state.propTarget;
    }
    
    // 获取道具进度百分比
    getPropProgress(): number {
        return Math.min(100, (this.state.propEnergy / this.state.propTarget) * 100);
    }
    
    // 检查是否危险（方块接近顶部）
    isDanger(): boolean {
        return this.state.blocks.some(b => b.y <= 2);
    }
}
