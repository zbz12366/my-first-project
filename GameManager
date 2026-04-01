import { _decorator, Component, Node, Prefab, instantiate, UITransform, Vec3, Sprite, SpriteFrame, Color, Label, tween, UIOpacity, EventTouch, Vec2, ProgressBar, Graphics } from 'cc';
import { BoardModel, BlockData, BlockWidth } from './BoardModel';

const { ccclass, property } = _decorator;

const BLOCK_SKINS: Record<BlockWidth, string> = {
    [BlockWidth.ONE]: 'block_1x1_hamster',
    [BlockWidth.TWO]: 'block_2x1_cat',
    [BlockWidth.THREE]: 'block_3x1_dog',
    [BlockWidth.FOUR]: 'block_4x1_fox',
    [BlockWidth.FIVE]: 'block_5x1_crocodile'
};

const GRID_CENTER_X = 360;
const GRID_CENTER_Y = 480;
const GRID_WIDTH = 670;
const GRID_HEIGHT = 817;
const GRID_COLS = 9;
const GRID_ROWS = 11;
const CELL_WIDTH = GRID_WIDTH / GRID_COLS;
const CELL_HEIGHT = GRID_HEIGHT / GRID_ROWS;
const PREVIEW_WIDTH = 657;
const PREVIEW_HEIGHT = 40;
const BLOCK_GAP = 0;
const ANIMATION_DURATION = 0.3;
const SCORE_DISPLAY_DURATION = 1.0;

@ccclass('GameManager')
export class GameManager extends Component {
    @property(Node)
    private homePage: Node | null = null;

    @property(Node)
    private gamePage: Node | null = null;

    @property(Node)
    private homeBg: Node | null = null;

    @property(Node)
    private gridBg: Node | null = null;

    @property(Node)
    private blocksLayer: Node | null = null;

    @property(Node)
    private topUIBar: Node | null = null;

    @property(Node)
    private progressBar: Node | null = null;

    @property(Node)
    private energyBar: Node | null = null;

    @property(Node)
    private previewBlocksLayer: Node | null = null;

    @property(Prefab)
    private blockPrefab: Prefab | null = null;

    @property(SpriteFrame)
    private hamsterSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    private catSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    private dogSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    private foxSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    private crocodileSprite: SpriteFrame | null = null;

    @property(Node)
    private startButton: Node | null = null;

    @property(Node)
    private continueButton: Node | null = null;

    @property(Node)
    private freezeButton: Node | null = null;

    @property(Node)
    private shrinkButton: Node | null = null;

    @property(Label)
    private scoreLabel: Label | null = null;

    @property(Label)
    private turnsLabel: Label | null = null;

    @property(ProgressBar)
    private energyProgressBar: ProgressBar | null = null;

    private boardModel: BoardModel;
    private blockNodes: Map<number, Node>;
    private ghostBlock: Node | null = null;
    private guideBoxes: Node[] = [];
    private selectedBlockId: number | null = null;
    private selectedBlockStartCol: number = 0;
    private isDragging: boolean = false;
    private dragStartPos: Vec2 = new Vec2();
    private currentDragCol: number = 0;
    private spriteFrames: Map<string, SpriteFrame> = new Map();
    private isProcessing: boolean = false;
    private shrinkModeActive: boolean = false;

    constructor() {
        super();
        this.boardModel = new BoardModel();
        this.blockNodes = new Map();
    }

    protected onLoad(): void {
        this.initSpriteFrames();
        this.setupGridBg();
        this.setupTopUI();
        this.setupEventListeners();
        this.showHomePage();
    }

    private setupTopUI(): void {
        console.log('=== Setting up Top UI ===');
        console.log('TopUIBar:', this.topUIBar ? 'Found' : 'NULL');
        console.log('ScoreLabel:', this.scoreLabel ? 'Found' : 'NULL');
        console.log('TurnsLabel:', this.turnsLabel ? 'Found' : 'NULL');
        console.log('ProgressBar:', this.progressBar ? 'Found' : 'NULL');
        console.log('EnergyBar:', this.energyBar ? 'Found' : 'NULL');
        console.log('FreezeButton:', this.freezeButton ? 'Found' : 'NULL');
        console.log('ShrinkButton:', this.shrinkButton ? 'Found' : 'NULL');
        
        if (this.topUIBar) {
            this.topUIBar.active = true;
            console.log('TopUIBar activated, position:', this.topUIBar.position);
        }
        
        if (this.scoreLabel) {
            this.scoreLabel.node.active = true;
            console.log('ScoreLabel activated');
        }
        
        if (this.turnsLabel) {
            this.turnsLabel.node.active = true;
            console.log('TurnsLabel activated');
        }
        
        if (this.progressBar) {
            this.progressBar.active = true;
            console.log('ProgressBar activated');
        }
        
        if (this.energyBar) {
            this.energyBar.active = true;
            console.log('EnergyBar activated');
        }
        
        if (this.freezeButton) {
            this.freezeButton.active = true;
            const sprite = this.freezeButton.getComponent(Sprite);
            if (sprite) {
                sprite.color = new Color(150, 150, 150, 255);
            }
            console.log('FreezeButton activated');
        }
        
        if (this.shrinkButton) {
            this.shrinkButton.active = true;
            const sprite = this.shrinkButton.getComponent(Sprite);
            if (sprite) {
                sprite.color = new Color(150, 150, 150, 255);
            }
            console.log('ShrinkButton activated');
        }
    }

    private setupGridBg(): void {
        if (this.blocksLayer) {
            const uit = this.blocksLayer.getComponent(UITransform);
            if (uit) {
                uit.setAnchorPoint(0.5, 0.5);
                uit.setContentSize(GRID_WIDTH, GRID_HEIGHT);
            }
            this.blocksLayer.setPosition(new Vec3(GRID_CENTER_X, GRID_CENTER_Y, 0));
            
            console.log('=== BlocksLayer Setup ===');
            console.log('Position:', this.blocksLayer.position);
            console.log('Size:', uit?.contentSize);
        }
        
        if (this.previewBlocksLayer) {
            let uit = this.previewBlocksLayer.getComponent(UITransform);
            if (!uit) {
                uit = this.previewBlocksLayer.addComponent(UITransform);
            }
            uit.setAnchorPoint(0.5, 0.5);
            uit.setContentSize(PREVIEW_WIDTH, PREVIEW_HEIGHT);
            
            this.previewBlocksLayer.setPosition(new Vec3(0, 0, 0));
            
            const bgSprite = this.previewBlocksLayer.getComponent(Sprite);
            if (bgSprite) {
                this.previewBlocksLayer.removeComponent(Sprite);
            }
            
            let graphics = this.previewBlocksLayer.getComponent(Graphics);
            if (graphics) {
                this.previewBlocksLayer.removeComponent(Graphics);
            }
            graphics = this.previewBlocksLayer.addComponent(Graphics);
            graphics.fillColor = new Color(100, 100, 100, 255);
            graphics.rect(-PREVIEW_WIDTH / 2, -PREVIEW_HEIGHT / 2, PREVIEW_WIDTH, PREVIEW_HEIGHT);
            graphics.fill();
            
            this.previewBlocksLayer.active = true;
            
            console.log('=== PreviewBlocksLayer Setup ===');
            console.log('Position:', this.previewBlocksLayer.position);
            console.log('Size:', uit.contentSize);
            console.log('Active:', this.previewBlocksLayer.active);
            console.log('Parent:', this.previewBlocksLayer.parent?.name);
        }
    }

    private initSpriteFrames(): void {
        if (this.hamsterSprite) {
            this.spriteFrames.set('block_1x1_hamster', this.hamsterSprite);
        }
        if (this.catSprite) {
            this.spriteFrames.set('block_2x1_cat', this.catSprite);
        }
        if (this.dogSprite) {
            this.spriteFrames.set('block_3x1_dog', this.dogSprite);
        }
        if (this.foxSprite) {
            this.spriteFrames.set('block_4x1_fox', this.foxSprite);
        }
        if (this.crocodileSprite) {
            this.spriteFrames.set('block_5x1_crocodile', this.crocodileSprite);
        }
        
        console.log(`Sprite frames loaded: ${this.spriteFrames.size}`);
    }

    private setupEventListeners(): void {
        if (this.startButton) {
            this.startButton.on(Node.EventType.TOUCH_END, this.onStartNewGame, this);
        }

        if (this.continueButton) {
            this.continueButton.on(Node.EventType.TOUCH_END, this.onContinueGame, this);
        }

        if (this.freezeButton) {
            this.freezeButton.on(Node.EventType.TOUCH_END, this.onFreezeButtonClick, this);
        }

        if (this.shrinkButton) {
            this.shrinkButton.on(Node.EventType.TOUCH_END, this.onShrinkButtonClick, this);
        }

        if (this.blocksLayer) {
            this.blocksLayer.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.blocksLayer.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
            this.blocksLayer.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.blocksLayer.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        }
    }

    private showHomePage(): void {
        if (this.homePage) {
            this.homePage.active = true;
        }
        if (this.gamePage) {
            this.gamePage.active = false;
        }

        if (this.continueButton) {
            this.continueButton.active = this.boardModel.hasSaveData();
        }
    }

    private showGamePage(): void {
        if (this.homePage) {
            this.homePage.active = false;
        }
        if (this.gamePage) {
            this.gamePage.active = true;
        }
        
        if (this.topUIBar) {
            this.topUIBar.active = true;
        }
        
        if (this.scoreLabel) {
            this.scoreLabel.node.active = true;
        }
        
        if (this.turnsLabel) {
            this.turnsLabel.node.active = true;
        }
        
        if (this.progressBar) {
            this.progressBar.active = true;
        }
        
        if (this.energyBar) {
            this.energyBar.active = true;
        }
        
        if (this.freezeButton) {
            this.freezeButton.active = true;
        }
        
        if (this.shrinkButton) {
            this.shrinkButton.active = true;
        }
    }

    private onStartNewGame(): void {
        this.boardModel.clearSave();
        this.boardModel.initializeNewGame();
        this.showGamePage();
        this.scheduleOnce(() => {
            this.renderBoard();
            this.renderPreviewRow();
            this.updateUI();
        }, 0.1);
    }

    private onContinueGame(): void {
        if (this.boardModel.loadGame()) {
            this.showGamePage();
            this.scheduleOnce(() => {
                this.renderBoard();
                this.renderPreviewRow();
                this.updateUI();
            }, 0.1);
        } else {
            this.onStartNewGame();
        }
    }

    private renderBoard(): void {
        this.clearAllBlocks();
        
        const blocks = this.boardModel.getAllBlocks();
        blocks.forEach(block => {
            this.createBlockNode(block);
        });
    }

    private clearAllBlocks(): void {
        this.blockNodes.forEach(node => {
            node.destroy();
        });
        this.blockNodes.clear();
    }

    private createBlockNode(block: BlockData): Node {
        if (!this.blockPrefab) {
            console.error('Block prefab is not set');
            const fallbackNode = new Node('FallbackBlock');
            return fallbackNode;
        }
        const blockNode = instantiate(this.blockPrefab);

        const blockWidth = block.width * CELL_WIDTH;
        const blockHeight = CELL_HEIGHT;
        const uit = blockNode.getComponent(UITransform);
        if (uit) {
            uit.setContentSize(blockWidth, blockHeight);
        }

        const skinName = BLOCK_SKINS[block.width];
        const spriteFrame = this.spriteFrames.get(skinName);
        const sprite = blockNode.getComponent(Sprite);
        if (sprite) {
            if (spriteFrame) {
                sprite.spriteFrame = spriteFrame;
                sprite.color = Color.WHITE;
            } else {
                sprite.color = new Color(200, 200, 200, 255);
            }
        }

        const pos = this.gridToWorldPosition(block.row, block.col, block.width);
        blockNode.setPosition(pos);
        
        console.log(`=== Created Block ${block.id} ===`);
        console.log(`Grid: row ${block.row}, col ${block.col}, width ${block.width}`);
        console.log(`World position:`, pos);
        console.log(`Local position:`, blockNode.position);

        if (this.blocksLayer) {
            this.blocksLayer.addChild(blockNode);
        }

        blockNode.name = `Block_${block.id}`;
        this.blockNodes.set(block.id, blockNode);

        return blockNode;
    }

    private updateBlockSprites(): void {
        for (const [blockId, blockNode] of this.blockNodes) {
            const block = this.boardModel.getAllBlocks().find(b => b.id === blockId);
            if (!block) continue;

            const skinName = BLOCK_SKINS[block.width];
            const spriteFrame = this.spriteFrames.get(skinName);
            const sprite = blockNode.getComponent(Sprite);

            if (sprite && spriteFrame) {
                sprite.spriteFrame = spriteFrame;
                sprite.color = Color.WHITE;
            }
        }
    }

    private gridToWorldPosition(row: number, col: number, width: BlockWidth): Vec3 {
        const blockWidth = width * CELL_WIDTH;
        
        // 修改：row 0 在底部（y 值最小）， row 10 在顶部（y 值最大）
        // row 0: y = -GRID_HEIGHT / 2 + CELL_HEIGHT / 2 (底部)
        // row 10: y = GRID_HEIGHT / 2 - CELL_HEIGHT / 2 (顶部)
        const x = -GRID_WIDTH / 2 + col * CELL_WIDTH + blockWidth / 2;
        const y = -GRID_HEIGHT / 2 + row * CELL_HEIGHT + CELL_HEIGHT / 2;
        
        return new Vec3(x, y, 0);
    }

    private worldToGridPosition(worldPos: Vec3): { row: number; col: number } {
        let localPos = worldPos;
        
        if (this.blocksLayer) {
            const worldPosVec3 = new Vec3(worldPos.x, worldPos.y, 0);
            localPos = new Vec3();
            this.blocksLayer.inverseTransformPoint(localPos, worldPosVec3);
        }
        
        const col = Math.floor((localPos.x + GRID_WIDTH / 2) / CELL_WIDTH);
        const row = Math.floor((localPos.y + GRID_HEIGHT / 2) / CELL_HEIGHT);
        
        console.log('worldToGridPosition:', { worldPos, localPos, row, col });
        
        return { row, col };
    }

    private onTouchStart(event: EventTouch): void {
        if (this.isProcessing) return;

        // 使用 getLocation 获取屏幕坐标
        const location = event.getLocation();
        const screenPos = new Vec3(location.x, location.y, 0);

        if (this.shrinkModeActive) {
            this.handleShrinkMode(screenPos);
            return;
        }

        console.log('=== Touch Start ===');
        console.log('Screen Position:', location);
        console.log('Block nodes count:', this.blockNodes.size);

        for (const [blockId, blockNode] of this.blockNodes) {
            const uit = blockNode.getComponent(UITransform);
            if (!uit) continue;

            const boundingBox = uit.getBoundingBoxToWorld();
            
            if (boundingBox.contains(new Vec2(screenPos.x, screenPos.y))) {
                console.log(`Block ${blockId} touched!`);
                this.selectedBlockId = blockId;
                
                let blockData: BlockData | null = null;
                for (const b of this.boardModel.getAllBlocks()) {
                    if (b.id === blockId) {
                        blockData = b;
                        break;
                    }
                }
                
                if (!blockData) return;
                
                this.selectedBlockStartCol = blockData.col;

                this.isDragging = true;
                this.dragStartPos.set(location.x, location.y);
                
                this.currentDragCol = blockData.col;
                
                this.createGhostBlock(blockId);
                this.createGuideBoxes(blockId);
                
                event.propagationStopped = true;
                return;
            }
        }
        
        console.log('No block touched');
    }

    private onTouchMove(event: EventTouch): void {
        if (!this.isDragging || this.selectedBlockId === null || this.isProcessing) return;

        const location = event.getLocation();
        const screenPos = new Vec3(location.x, location.y, 0);
        const gridPos = this.worldToGridPosition(screenPos);

        const blockNode = this.blockNodes.get(this.selectedBlockId);
        if (!blockNode) return;

        let blockData: BlockData | null = null;
        for (const b of this.boardModel.getAllBlocks()) {
            if (b.id === this.selectedBlockId) {
                blockData = b;
                break;
            }
        }
        if (!blockData) return;

        let newCol = gridPos.col - Math.floor(blockData.width / 2);
        newCol = Math.max(0, Math.min(newCol, BoardModel.GRID_COLS - blockData.width));

        console.log('=== Touch Move ===');
        console.log('Grid position:', gridPos);
        console.log('New column:', newCol);
        console.log('Current column:', this.currentDragCol);
        console.log('Can move:', this.boardModel.canMoveBlock(this.selectedBlockId, newCol));

        if (newCol !== this.currentDragCol) {
            if (this.boardModel.canMoveBlock(this.selectedBlockId, newCol)) {
                this.currentDragCol = newCol;
                
                const pos = this.gridToWorldPosition(blockData.row, newCol, blockData.width);
                blockNode.setPosition(pos);
                
                this.updateGuideBoxes(newCol);
            }
        }
    }

    private onTouchEnd(event: EventTouch): void {
        if (!this.isDragging || this.selectedBlockId === null || this.isProcessing) {
            this.cleanupDragState();
            return;
        }

        let currentBlock: BlockData | null = null;
        for (const b of this.boardModel.getAllBlocks()) {
            if (b.id === this.selectedBlockId) {
                currentBlock = b;
                break;
            }
        }

        if (currentBlock && this.currentDragCol !== this.selectedBlockStartCol) {
            this.isProcessing = true;
            
            if (this.boardModel.moveBlock(this.selectedBlockId, this.currentDragCol)) {
                this.processAfterMove();
            } else {
                this.isProcessing = false;
                this.cleanupDragState();
            }
        } else {
            this.cleanupDragState();
        }
    }

    private async processAfterMove(): Promise<void> {
        this.cleanupDragState();

        await this.applyGravityWithAnimation();

        const completeRows = this.boardModel.checkCompleteRows();
        if (completeRows.length > 0) {
            await this.removeCompleteRowsWithAnimation(completeRows);
            await this.applyGravityWithAnimation();
        }

        if (!this.boardModel.isFrozen()) {
            const pushSuccess = this.boardModel.pushNewRow();
            if (!pushSuccess || this.boardModel.isGameOver()) {
                this.handleGameOver();
                return;
            }
        } else {
            this.boardModel.decrementFreeze();
        }

        this.renderPreviewRow();
        this.updateUI();
        this.boardModel.saveGame();

        this.isProcessing = false;
    }

    private async applyGravityWithAnimation(): Promise<void> {
        return new Promise<void>((resolve) => {
            const movedBlocks = this.boardModel.applyGravity();
            
            if (movedBlocks.length === 0) {
                resolve();
                return;
            }

            let completed = 0;
            movedBlocks.forEach(move => {
                const blockNode = this.blockNodes.get(move.blockId);
                const block = this.boardModel.getBlockById(move.blockId);
                
                if (blockNode && block) {
                    const targetPos = this.gridToWorldPosition(move.newRow, block.col, block.width);
                    tween(blockNode)
                        .to(ANIMATION_DURATION, { position: targetPos })
                        .call(() => {
                            completed++;
                            if (completed >= movedBlocks.length) {
                                resolve();
                            }
                        })
                        .start();
                } else {
                    completed++;
                    if (completed >= movedBlocks.length) {
                        resolve();
                    }
                }
            });
        });
    }

    private async removeCompleteRowsWithAnimation(completeRows: number[]): Promise<void> {
        return new Promise<void>((resolve) => {
            const removedBlocks = this.boardModel.removeCompleteRows(completeRows);
            
            if (removedBlocks.length === 0) {
                resolve();
                return;
            }

            let totalScore = 0;
            removedBlocks.forEach(block => {
                totalScore += block.score;
                this.showScorePopup(block);
            });

            this.boardModel.addScore(totalScore);

            const activations = this.boardModel.checkEnergyActivation();
            if (activations > 0) {
                this.showEnergyActivationEffect();
            }

            let completed = 0;
            removedBlocks.forEach(block => {
                const blockNode = this.blockNodes.get(block.id);
                if (blockNode) {
                    tween(blockNode)
                        .to(ANIMATION_DURATION, { scale: new Vec3(0, 0, 0) })
                        .call(() => {
                            blockNode.destroy();
                            this.blockNodes.delete(block.id);
                            completed++;
                            if (completed >= removedBlocks.length) {
                                resolve();
                            }
                        })
                        .start();
                } else {
                    completed++;
                    if (completed >= removedBlocks.length) {
                        resolve();
                    }
                }
            });
        });
    }

    private showScorePopup(block: BlockData): void {
        const blockNode = this.blockNodes.get(block.id);
        if (!blockNode || !this.blocksLayer) return;

        const scoreNode = new Node('ScorePopup');
        const label = scoreNode.addComponent(Label);
        label.string = `+${block.score}`;
        label.fontSize = 24;
        label.color = new Color(255, 215, 0);

        scoreNode.setPosition(blockNode.position);
        this.blocksLayer.addChild(scoreNode);

        tween(scoreNode)
            .by(SCORE_DISPLAY_DURATION, { position: new Vec3(0, 50, 0) })
            .call(() => {
                scoreNode.destroy();
            })
            .start();

        const opacity = scoreNode.addComponent(UIOpacity);
        tween(opacity)
            .to(SCORE_DISPLAY_DURATION * 0.5, { opacity: 255 })
            .to(SCORE_DISPLAY_DURATION * 0.5, { opacity: 0 })
            .start();
    }

    private showEnergyActivationEffect(): void {
        if (this.freezeButton) {
            tween(this.freezeButton)
                .to(0.2, { scale: new Vec3(1.2, 1.2, 1) })
                .to(0.2, { scale: new Vec3(1, 1, 1) })
                .start();
        }

        if (this.shrinkButton) {
            tween(this.shrinkButton)
                .to(0.2, { scale: new Vec3(1.2, 1.2, 1) })
                .to(0.2, { scale: new Vec3(1, 1, 1) })
                .start();
        }
    }

    private createGhostBlock(blockId: number): void {
        this.removeGhostBlock();

        let blockData: BlockData | null = null;
        for (const b of this.boardModel.getAllBlocks()) {
            if (b.id === blockId) {
                blockData = b;
                break;
            }
        }
        if (!blockData || !this.blocksLayer) return;

        this.ghostBlock = new Node('GhostBlock');
        const uit = this.ghostBlock.addComponent(UITransform);
        const ghostWidth = blockData.width * CELL_WIDTH;
        const ghostHeight = CELL_HEIGHT;
        uit.setContentSize(ghostWidth, ghostHeight);

        const sprite = this.ghostBlock.addComponent(Sprite);
        sprite.color = new Color(255, 255, 255, 100);

        const pos = this.gridToWorldPosition(blockData.row, blockData.col, blockData.width);
        this.ghostBlock.setPosition(pos);
        this.blocksLayer.addChild(this.ghostBlock);
    }

    private removeGhostBlock(): void {
        if (this.ghostBlock) {
            this.ghostBlock.destroy();
            this.ghostBlock = null;
        }
    }

    private createGuideBoxes(blockId: number): void {
        this.removeGuideBoxes();

        let blockData: BlockData | null = null;
        for (const b of this.boardModel.getAllBlocks()) {
            if (b.id === blockId) {
                blockData = b;
                break;
            }
        }
        if (!blockData || !this.blocksLayer) return;

        const leftCol = blockData.col - blockData.width;
        if (leftCol >= 0) {
            const leftBox = this.createGuideBox(blockData.row, leftCol, blockData.width);
            this.guideBoxes.push(leftBox);
        }

        const rightCol = blockData.col + blockData.width;
        if (rightCol + blockData.width <= BoardModel.GRID_COLS) {
            const rightBox = this.createGuideBox(blockData.row, rightCol, blockData.width);
            this.guideBoxes.push(rightBox);
        }
    }

    private createGuideBox(row: number, col: number, width: BlockWidth): Node {
        const guideBox = new Node('GuideBox');
        const uit = guideBox.addComponent(UITransform);
        const boxWidth = width * CELL_WIDTH;
        const boxHeight = GRID_HEIGHT;
        uit.setContentSize(boxWidth, boxHeight);

        const sprite = guideBox.addComponent(Sprite);
        sprite.color = new Color(100, 200, 255, 80);

        // 对齐框从画板底部到顶部，y坐标为0（相对于blocksLayer中心）
        const x = -GRID_WIDTH / 2 + col * CELL_WIDTH + boxWidth / 2;
        guideBox.setPosition(new Vec3(x, 0, 0));

        if (this.blocksLayer) {
            this.blocksLayer.addChild(guideBox);
        }

        return guideBox;
    }

    private updateGuideBoxes(newCol: number): void {
        this.removeGuideBoxes();

        if (this.selectedBlockId === null) return;

        let blockData: BlockData | null = null;
        for (const b of this.boardModel.getAllBlocks()) {
            if (b.id === this.selectedBlockId) {
                blockData = b;
                break;
            }
        }
        if (!blockData || !this.blocksLayer) return;

        const leftCol = newCol - blockData.width;
        if (leftCol >= 0 && this.boardModel.canMoveBlock(this.selectedBlockId, leftCol)) {
            const leftBox = this.createGuideBox(blockData.row, leftCol, blockData.width);
            this.guideBoxes.push(leftBox);
        }

        const rightCol = newCol + blockData.width;
        if (rightCol + blockData.width <= BoardModel.GRID_COLS && this.boardModel.canMoveBlock(this.selectedBlockId, rightCol)) {
            const rightBox = this.createGuideBox(blockData.row, rightCol, blockData.width);
            this.guideBoxes.push(rightBox);
        }
    }

    private removeGuideBoxes(): void {
        this.guideBoxes.forEach(box => box.destroy());
        this.guideBoxes = [];
    }

    private cleanupDragState(): void {
        this.isDragging = false;
        this.selectedBlockId = null;
        this.removeGhostBlock();
        this.removeGuideBoxes();
    }

    private renderPreviewRow(): void {
        console.log('=== renderPreviewRow called ===');
        console.log('previewBlocksLayer:', this.previewBlocksLayer ? 'exists' : 'NULL');
        
        if (!this.previewBlocksLayer) return;
        
        console.log('PreviewBlocksLayer position:', this.previewBlocksLayer.position);
        console.log('PreviewBlocksLayer active:', this.previewBlocksLayer.active);
        
        const uit = this.previewBlocksLayer.getComponent(UITransform);
        console.log('PreviewBlocksLayer size:', uit?.contentSize);
        
        this.previewBlocksLayer.removeAllChildren();
        
        const nextRow = this.boardModel.getNextRow();
        console.log('Next row blocks:', nextRow);
        
        if (nextRow.length === 0) {
            console.log('WARNING: nextRow is empty!');
            return;
        }
        
        // 使用预览区域的实际宽度计算单元格宽度
        const previewCellWidth = PREVIEW_WIDTH / GRID_COLS;
        const previewBlockHeight = 37;
        
        let col = 0;
        
        nextRow.forEach((item, index) => {
            if (item === null) {
                col++;
                return;
            }
            
            const width = item;
            console.log(`Creating preview block ${index}: width=${width}, col=${col}`);
            
            const previewNode = new Node('PreviewBlock');
            const previewUit = previewNode.addComponent(UITransform);
            const previewBlockWidth = width * previewCellWidth;
            previewUit.setContentSize(previewBlockWidth, previewBlockHeight);
            
            const graphics = previewNode.addComponent(Graphics);
            graphics.fillColor = new Color(180, 180, 180, 255);
            graphics.rect(-previewBlockWidth / 2, -previewBlockHeight / 2, previewBlockWidth, previewBlockHeight);
            graphics.fill();
            
            // 计算相对于 previewBlocksLayer 的本地坐标
            const leftEdge = -PREVIEW_WIDTH / 2;
            const x = leftEdge + col * previewCellWidth + previewBlockWidth / 2;
            previewNode.setPosition(new Vec3(x, 0, 0));
            
            console.log(`Preview block ${index}: position=(${x}, 0), size=(${previewBlockWidth}, ${previewBlockHeight})`);
            
            this.previewBlocksLayer.addChild(previewNode);
            col += width;
        });
        
        console.log(`Total preview blocks created: ${nextRow.length}`);
    }

    private updateUI(): void {
        if (this.scoreLabel) {
            this.scoreLabel.string = `Score: ${this.boardModel.getScore()}`;
        }

        if (this.turnsLabel) {
            this.turnsLabel.string = `Turns: ${this.boardModel.getTurns()}`;
        }

        const energy = this.boardModel.getEnergyProgress();
        
        if (this.energyBar && this.progressBar) {
            const progressUit = this.progressBar.getComponent(UITransform);
            const energyUit = this.energyBar.getComponent(UITransform);
            
            if (progressUit && energyUit) {
                const maxWidth = progressUit.width;
                const currentWidth = maxWidth * (energy.percentage / 100);
                energyUit.setContentSize(currentWidth, energyUit.height);
            }
        }

        const energyReady = energy.percentage >= 100;
        
        if (this.freezeButton) {
            this.freezeButton.active = true;
            const sprite = this.freezeButton.getComponent(Sprite);
            if (sprite) {
                sprite.color = energyReady ? Color.WHITE : new Color(150, 150, 150, 255);
            }
        }

        if (this.shrinkButton) {
            this.shrinkButton.active = true;
            const sprite = this.shrinkButton.getComponent(Sprite);
            if (sprite) {
                sprite.color = energyReady ? Color.WHITE : new Color(150, 150, 150, 255);
            }
        }
    }

    private onFreezeButtonClick(): void {
        if (this.boardModel.isFrozen()) return;
        
        const energy = this.boardModel.getEnergyProgress();
        if (energy.percentage < 100) return;

        this.boardModel.activateFreeze();
        this.updateUI();
        
        if (this.freezeButton) {
            const label = this.freezeButton.getComponentInChildren(Label);
            if (label) {
                label.string = `Freeze: ${this.boardModel.isFrozen() ? 3 : 0}`;
            }
        }
    }

    private onShrinkButtonClick(): void {
        const energy = this.boardModel.getEnergyProgress();
        if (energy.percentage < 100) return;

        this.shrinkModeActive = true;
        
        if (this.shrinkButton) {
            const label = this.shrinkButton.getComponentInChildren(Label);
            if (label) {
                label.string = 'Select 5-width block';
            }
        }
    }

    private handleShrinkMode(worldPos: Vec3): void {
        for (const [blockId, blockNode] of this.blockNodes) {
            const uit = blockNode.getComponent(UITransform);
            if (!uit) continue;

            const boundingBox = uit.getBoundingBoxToWorld();
            if (boundingBox.contains(new Vec2(worldPos.x, worldPos.y))) {
                let blockData: BlockData | null = null;
                for (const b of this.boardModel.getAllBlocks()) {
                    if (b.id === blockId) {
                        blockData = b;
                        break;
                    }
                }

                if (blockData && blockData.width === BlockWidth.FIVE) {
                    this.boardModel.shrinkBlock(blockId);
                    this.renderBoard();
                    this.updateUI();
                    
                    this.shrinkModeActive = false;
                    if (this.shrinkButton) {
                        const label = this.shrinkButton.getComponentInChildren(Label);
                        if (label) {
                            label.string = 'Shrink';
                        }
                    }
                }
                return;
            }
        }
    }

    private handleGameOver(): void {
        this.boardModel.clearSave();
        
        if (this.scoreLabel) {
            this.scoreLabel.string = `Game Over! Final Score: ${this.boardModel.getScore()}`;
        }

        setTimeout(() => {
            this.showHomePage();
        }, 2000);
    }

    protected onDestroy(): void {
        if (this.startButton) {
            this.startButton.off(Node.EventType.TOUCH_END, this.onStartNewGame, this);
        }

        if (this.continueButton) {
            this.continueButton.off(Node.EventType.TOUCH_END, this.onContinueGame, this);
        }

        if (this.freezeButton) {
            this.freezeButton.off(Node.EventType.TOUCH_END, this.onFreezeButtonClick, this);
        }

        if (this.shrinkButton) {
            this.shrinkButton.off(Node.EventType.TOUCH_END, this.onShrinkButtonClick, this);
        }

        if (this.blocksLayer) {
            this.blocksLayer.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.blocksLayer.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
            this.blocksLayer.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.blocksLayer.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        }
    }
}
