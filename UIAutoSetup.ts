// UIAutoSetup.ts - 场景树结构搭建（编辑器节点引用模式）
import { _decorator, Component, Node, Label, Button, UITransform, Color, Vec3, Size, Prefab, find, Camera, Graphics, Widget, Canvas, view } from 'cc';
const { ccclass, property } = _decorator;

const GRID_COLS = 9;
const GRID_ROWS = 11;
const GAP = 4;

const BG_COLOR = new Color(235, 238, 242, 255);
const CARD_BG_COLOR = new Color(255, 255, 255, 255);
const PRIMARY_COLOR = new Color(74, 108, 247, 255);
const TEXT_GRAY_COLOR = new Color(156, 163, 175, 255);
const TEXT_DARK_COLOR = new Color(107, 114, 128, 255);

@ccclass('UIAutoSetup')
export class UIAutoSetup extends Component {
    @property({ type: Prefab })
    blockPrefab: Prefab = null;
    
    @property({ type: Node, tooltip: '顶部UI容器 - 编辑器中创建，挂载Widget' })
    topUIRoot: Node = null;
    
    @property({ type: Node, tooltip: '游戏网格容器 - 编辑器中创建，挂载Widget' })
    gameGridRoot: Node = null;
    
    @property({ type: Node, tooltip: '底部UI容器 - 编辑器中创建，挂载Widget' })
    bottomUIRoot: Node = null;
    
    private canvas: Node = null;
    private canvasComp: Canvas = null;
    private visibleSize: Size = null;
    private cellWidth: number = 0;
    private gridContainerWidth: number = 0;
    private gridContainerHeight: number = 0;
    
    onLoad() {
        this.canvas = this.node;
        this.visibleSize = view.getVisibleSize();
        
        this.canvasComp = this.canvas.getComponent(Canvas);
        if (!this.canvasComp) {
            this.canvasComp = this.canvas.addComponent(Canvas);
        }
        this.canvasComp.fitWidth = true;
        
        console.log('=== 可视区域尺寸 ===');
        console.log('visibleSize:', this.visibleSize.width, 'x', this.visibleSize.height);
        
        this.gridContainerWidth = this.visibleSize.width * 0.96;
        this.cellWidth = (this.gridContainerWidth - GAP * (GRID_COLS - 1)) / GRID_COLS;
        this.gridContainerHeight = (this.cellWidth + GAP) * GRID_ROWS - GAP;
        
        console.log('=== 网格计算 ===');
        console.log('gridContainerWidth:', this.gridContainerWidth);
        console.log('cellWidth:', this.cellWidth);
        console.log('gridContainerHeight:', this.gridContainerHeight);
        
        this.setupCameraBackground();
        this.clearDynamicNodes();
    }
    
    start() {
        this.createSceneTree();
    }
    
    private setupCameraBackground(): void {
        const cameraNode = find('Main Camera');
        if (cameraNode) {
            const camera = cameraNode.getComponent(Camera);
            if (camera) {
                camera.clearColor = BG_COLOR;
            }
        }
    }
    
    private clearDynamicNodes(): void {
        const childrenToRemove: Node[] = [];
        this.canvas.children.forEach(child => {
            if (!child.name.includes('Camera') &&
                child !== this.topUIRoot &&
                child !== this.gameGridRoot &&
                child !== this.bottomUIRoot) {
                childrenToRemove.push(child);
            }
        });
        childrenToRemove.forEach(child => child.destroy());
    }
    
    createSceneTree() {
        console.log('=== createSceneTree 开始 ===');
        console.log('topUIRoot:', this.topUIRoot?.name);
        console.log('gameGridRoot:', this.gameGridRoot?.name);
        console.log('bottomUIRoot:', this.bottomUIRoot?.name);
        
        this.createBackground();
        
        const homePage = this.createNode('HomePage', this.canvas);
        this.createHomePage(homePage);
        
        const gamePage = this.createNode('GamePage', this.canvas);
        gamePage.active = false;
        
        if (this.topUIRoot) {
            console.log('添加 TopUI_Root 到 GamePage');
            gamePage.addChild(this.topUIRoot);
            // 设置容器大小以匹配卡片
            const topUIT = this.topUIRoot.getComponent(UITransform);
            if (topUIT) {
                topUIT.setContentSize(new Size(this.visibleSize.width, 220));
            }
        } else {
            console.warn('TopUI_Root 未在编辑器中设置！请在 Canvas 下创建 TopUI_Root 节点并拖拽到 UIAutoSetup 组件');
        }
        
        if (this.gameGridRoot) {
            console.log('添加 GameGrid_Root 到 GamePage');
            gamePage.addChild(this.gameGridRoot);
            // 设置容器大小以匹配网格
            const gridUIT = this.gameGridRoot.getComponent(UITransform);
            if (gridUIT) {
                gridUIT.setContentSize(new Size(this.gridContainerWidth, this.gridContainerHeight));
            }
            this.buildGameGrid(this.gameGridRoot);
        } else {
            console.warn('GameGrid_Root 未在编辑器中设置！请在 Canvas 下创建 GameGrid_Root 节点并拖拽到 UIAutoSetup 组件');
        }
        
        if (this.bottomUIRoot) {
            console.log('添加 BottomUI_Root 到 GamePage');
            gamePage.addChild(this.bottomUIRoot);
            // 设置容器大小以匹配预览区
            const bottomUIT = this.bottomUIRoot.getComponent(UITransform);
            if (bottomUIT) {
                bottomUIT.setContentSize(new Size(this.gridContainerWidth, this.cellWidth + 40));
            }
        } else {
            console.warn('BottomUI_Root 未在编辑器中设置！请在 Canvas 下创建 BottomUI_Root 节点并拖拽到 UIAutoSetup 组件');
        }
        
        const gameOverPanel = this.createNode('GameOverPanel', this.canvas);
        gameOverPanel.active = false;
        this.createGameOverPanel(gameOverPanel);
        
        this.configureGameManager(homePage, gamePage, gameOverPanel);
        console.log('=== createSceneTree 完成 ===');
    }
    
    private createBackground(): void {
        const bg = this.createNode('Background', this.canvas);
        bg.setSiblingIndex(0);
        
        const uit = bg.addComponent(UITransform);
        uit.setContentSize(this.visibleSize);
        
        const widget = bg.addComponent(Widget);
        widget.isAlignTop = true;
        widget.isAlignBottom = true;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.top = 0;
        widget.bottom = 0;
        widget.left = 0;
        widget.right = 0;
        widget.alignMode = Widget.AlignMode.ALWAYS;
        
        const graphics = bg.addComponent(Graphics);
        graphics.fillColor = BG_COLOR;
        graphics.rect(-this.visibleSize.width / 2, -this.visibleSize.height / 2, this.visibleSize.width, this.visibleSize.height);
        graphics.fill();
        
        widget.updateAlignment();
    }
    
    createHomePage(parent: Node) {
        const titleContainer = this.createNode('TitleContainer', parent);
        titleContainer.position = new Vec3(0, this.visibleSize.height * 0.15, 0);
        
        const titleLabel = this.createLabel('滑块消消乐', titleContainer, 'TitleLabel');
        titleLabel.getComponent(Label).fontSize = 42;
        titleLabel.getComponent(Label).color = PRIMARY_COLOR;
        
        const subtitle = this.createLabel('Block Puzzle Game', titleContainer, 'Subtitle');
        subtitle.position = new Vec3(0, -40, 0);
        subtitle.getComponent(Label).fontSize = 16;
        subtitle.getComponent(Label).color = TEXT_GRAY_COLOR;
        
        const hasSave = this.checkHasSave();
        
        if (hasSave) {
            const continueBtn = this.createJellyButton('继续游戏', parent, 'ContinueButton', true);
            continueBtn.position = new Vec3(0, this.visibleSize.height * -0.1, 0);
            this.setupButtonClick(continueBtn, 'onContinueGame');
            
            const restartBtn = this.createJellyButton('重新开始', parent, 'StartButton', false);
            restartBtn.position = new Vec3(0, this.visibleSize.height * -0.1 - 65, 0);
            this.setupButtonClick(restartBtn, 'onStartNewGame');
        } else {
            const startBtn = this.createJellyButton('开始游戏', parent, 'StartButton', true);
            startBtn.position = new Vec3(0, this.visibleSize.height * -0.1, 0);
            this.setupButtonClick(startBtn, 'onStartNewGame');
        }
    }
    
    private checkHasSave(): boolean {
        try {
            const saved = localStorage.getItem('blockPuzzleState');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.blocks && parsed.blocks.length > 0 && !parsed.gameOver;
            }
        } catch (e) {
            console.error('Error checking save:', e);
        }
        return false;
    }
    
    public buildTopUI(container: Node): void {
        console.log('=== buildTopUI 开始 ===');
        console.log('container:', container?.name, 'active:', container?.active);
        console.log('visibleSize:', this.visibleSize?.width, 'x', this.visibleSize?.height);
        
        container.removeAllChildren();
        
        const topCardHeight = 220;
        
        // 获取容器的 UITransform 以确定锚点
        const containerUIT = container.getComponent(UITransform);
        const anchorY = containerUIT ? containerUIT.anchorY : 0.5;
        
        // 根据锚点调整绘制位置
        // 如果锚点是 1（顶部），原点在顶部，卡片应该向下绘制（y从0开始）
        // 如果锚点是 0.5（中心），原点在中心，卡片应该向下绘制（y从-height/2开始）
        const drawY = anchorY >= 0.9 ? 0 : -topCardHeight / 2;
        
        const topBg = this.createNode('TopBg', container);
        const topBgUIT = topBg.addComponent(UITransform);
        topBgUIT.setContentSize(new Size(this.visibleSize.width - 24, topCardHeight));
        const topBgGraphics = topBg.addComponent(Graphics);
        topBgGraphics.fillColor = CARD_BG_COLOR;
        topBgGraphics.roundRect(-(this.visibleSize.width - 24) / 2, drawY, this.visibleSize.width - 24, topCardHeight, 16);
        topBgGraphics.fill();
        
        const scoreCard = this.createNode('ScoreCard', container);
        scoreCard.position = new Vec3(0, topCardHeight / 2 - 50, 0);
        const scoreCardUIT = scoreCard.addComponent(UITransform);
        scoreCardUIT.setContentSize(new Size(this.visibleSize.width - 48, 85));
        const scoreCardGraphics = scoreCard.addComponent(Graphics);
        scoreCardGraphics.fillColor = CARD_BG_COLOR;
        scoreCardGraphics.roundRect(-(this.visibleSize.width - 48) / 2, -42.5, this.visibleSize.width - 48, 85, 12);
        scoreCardGraphics.fill();
        
        const backBtn = this.createNode('BackButton', scoreCard);
        backBtn.position = new Vec3(-(this.visibleSize.width - 48) / 2 + 28, 0, 0);
        const backBtnUIT = backBtn.addComponent(UITransform);
        backBtnUIT.setContentSize(new Size(44, 44));
        const backBtnGraphics = backBtn.addComponent(Graphics);
        backBtnGraphics.fillColor = new Color(240, 243, 246);
        backBtnGraphics.roundRect(-22, -22, 44, 44, 12);
        backBtnGraphics.fill();
        backBtn.addComponent(Button);
        this.setupButtonClick(backBtn, 'showHomePage');
        
        const backLabel = this.createLabel('←', backBtn);
        backLabel.getComponent(Label).fontSize = 22;
        backLabel.getComponent(Label).color = TEXT_DARK_COLOR;
        
        const scoreSection = this.createNode('ScoreSection', scoreCard);
        const scoreTitle = this.createLabel('本局积分', scoreSection, 'ScoreTitle');
        scoreTitle.position = new Vec3(0, 18, 0);
        scoreTitle.getComponent(Label).fontSize = 12;
        scoreTitle.getComponent(Label).color = TEXT_GRAY_COLOR;
        
        const scoreValue = this.createLabel('0', scoreSection, 'ScoreValue');
        scoreValue.position = new Vec3(0, -12, 0);
        scoreValue.getComponent(Label).fontSize = 44;
        scoreValue.getComponent(Label).color = PRIMARY_COLOR;
        
        const bestSection = this.createNode('BestSection', scoreCard);
        bestSection.position = new Vec3((this.visibleSize.width - 48) / 2 - 55, 0, 0);
        const bestTitle = this.createLabel('最高分', bestSection, 'BestTitle');
        bestTitle.position = new Vec3(0, 14, 0);
        bestTitle.getComponent(Label).fontSize = 11;
        bestTitle.getComponent(Label).color = TEXT_GRAY_COLOR;
        
        const bestValue = this.createLabel('0', bestSection, 'BestValue');
        bestValue.position = new Vec3(0, -10, 0);
        bestValue.getComponent(Label).fontSize = 22;
        bestValue.getComponent(Label).color = TEXT_DARK_COLOR;
        
        const propCard = this.createNode('PropCard', container);
        propCard.position = new Vec3(0, -topCardHeight / 2 + 70, 0);
        const propCardUIT = propCard.addComponent(UITransform);
        propCardUIT.setContentSize(new Size(this.visibleSize.width - 48, 120));
        const propCardGraphics = propCard.addComponent(Graphics);
        propCardGraphics.fillColor = CARD_BG_COLOR;
        propCardGraphics.roundRect(-(this.visibleSize.width - 48) / 2, -60, this.visibleSize.width - 48, 120, 12);
        propCardGraphics.fill();
        
        const propLabel = this.createLabel('道具', propCard, 'PropLabel');
        propLabel.position = new Vec3(-(this.visibleSize.width - 48) / 2 + 40, 42, 0);
        propLabel.getComponent(Label).fontSize = 14;
        propLabel.getComponent(Label).color = TEXT_DARK_COLOR;
        
        const progressContainer = this.createNode('ProgressContainer', propCard);
        progressContainer.position = new Vec3(0, 42, 0);
        
        const progressBg = this.createNode('ProgressBg', progressContainer);
        const progressBgUIT = progressBg.addComponent(UITransform);
        progressBgUIT.setContentSize(new Size(160, 12));
        const progressBgGraphics = progressBg.addComponent(Graphics);
        progressBgGraphics.fillColor = new Color(229, 231, 235);
        progressBgGraphics.roundRect(-80, -6, 160, 12, 6);
        progressBgGraphics.fill();
        
        const progressFill = this.createNode('ProgressFill', progressBg);
        progressFill.position = new Vec3(-80, 0, 0);
        const progressFillUIT = progressFill.addComponent(UITransform);
        progressFillUIT.setContentSize(new Size(1, 12));
        progressFillUIT.anchorX = 0;
        const progressFillGraphics = progressFill.addComponent(Graphics);
        progressFillGraphics.fillColor = new Color(255, 152, 0);
        progressFillGraphics.roundRect(0, -6, 1, 12, 6);
        progressFillGraphics.fill();
        
        const progressText = this.createLabel('0/2000', progressContainer, 'ProgressText');
        progressText.position = new Vec3(110, 0, 0);
        progressText.getComponent(Label).fontSize = 12;
        progressText.getComponent(Label).color = TEXT_GRAY_COLOR;
        
        const freezeBtn = this.createPropButton(propCard, 'FreezeButton', '❄️', '冻结', '3轮');
        freezeBtn.position = new Vec3(-85, -18, 0);
        this.setupButtonClick(freezeBtn, 'onUseFreezeProp');
        
        const shrinkBtn = this.createPropButton(propCard, 'ShrinkButton', '⬇️', '缩减', '5格→1格');
        shrinkBtn.position = new Vec3(85, -18, 0);
        this.setupButtonClick(shrinkBtn, 'onUseShrinkProp');
        
        console.log('=== TopUI_Root 构建完成 ===');
        console.log('TopUI_Root 子节点数:', container.children.length);
    }
    
    private buildGameGrid(container: Node): void {
        container.removeAllChildren();
        
        const gridBg = this.createNode('GridBg', container);
        const gridBgUIT = gridBg.addComponent(UITransform);
        gridBgUIT.setContentSize(new Size(this.gridContainerWidth, this.gridContainerHeight));
        const gridBgGraphics = gridBg.addComponent(Graphics);
        gridBgGraphics.fillColor = CARD_BG_COLOR;
        gridBgGraphics.roundRect(-this.gridContainerWidth / 2, -this.gridContainerHeight / 2, this.gridContainerWidth, this.gridContainerHeight, 12);
        gridBgGraphics.fill();
        
        const gridLinesNode = this.createNode('GridLines', container);
        const gridGraphics = gridLinesNode.addComponent(Graphics);
        gridGraphics.strokeColor = new Color(229, 231, 235);
        gridGraphics.lineWidth = 1;
        
        const gridStartX = -this.gridContainerWidth / 2;
        const gridStartY = this.gridContainerHeight / 2;
        
        for (let i = 0; i <= GRID_COLS; i++) {
            const x = gridStartX + i * (this.cellWidth + GAP);
            gridGraphics.moveTo(x, gridStartY);
            gridGraphics.lineTo(x, gridStartY - this.gridContainerHeight);
        }
        for (let i = 0; i <= GRID_ROWS; i++) {
            const y = gridStartY - i * (this.cellWidth + GAP);
            gridGraphics.moveTo(gridStartX, y);
            gridGraphics.lineTo(gridStartX + this.gridContainerWidth, y);
        }
        gridGraphics.stroke();
        
        const blocksLayer = this.createNode('BlocksLayer', container);
        const blocksLayerUIT = blocksLayer.addComponent(UITransform);
        blocksLayerUIT.setContentSize(new Size(this.gridContainerWidth, this.gridContainerHeight));
        blocksLayerUIT.anchorX = 0;
        blocksLayerUIT.anchorY = 0;
        blocksLayer.position = new Vec3(-this.gridContainerWidth / 2, -this.gridContainerHeight / 2, 0);
        
        console.log('=== GameGrid_Root 构建完成 ===');
        console.log('BlocksLayer 锚点: (0, 0)');
        console.log('BlocksLayer 位置:', blocksLayer.position);
        console.log('BlocksLayer 尺寸:', this.gridContainerWidth, 'x', this.gridContainerHeight);
    }
    
    public buildBottomUI(container: Node): void {
        container.removeAllChildren();
        
        const previewHeight = this.cellWidth + 40;
        
        // 获取容器的 UITransform 以确定锚点
        const containerUIT = container.getComponent(UITransform);
        const anchorY = containerUIT ? containerUIT.anchorY : 0.5;
        
        // 根据锚点调整绘制位置
        // 如果锚点是 0（底部），原点在底部，卡片应该向上绘制（y从-height开始）
        // 如果锚点是 0.5（中心），原点在中心，卡片应该向上绘制（y从-height/2开始）
        const drawY = anchorY <= 0.1 ? -previewHeight : -previewHeight / 2;
        
        const bottomBg = this.createNode('BottomBg', container);
        const bottomBgUIT = bottomBg.addComponent(UITransform);
        bottomBgUIT.setContentSize(new Size(this.gridContainerWidth, previewHeight));
        const bottomBgGraphics = bottomBg.addComponent(Graphics);
        bottomBgGraphics.fillColor = CARD_BG_COLOR;
        bottomBgGraphics.roundRect(-this.gridContainerWidth / 2, drawY, this.gridContainerWidth, previewHeight, 12);
        bottomBgGraphics.fill();
        
        const previewLabel = this.createLabel('下一行', container, 'PreviewLabel');
        previewLabel.position = new Vec3(-this.gridContainerWidth / 2 + 45, previewHeight / 2 - 18, 0);
        previewLabel.getComponent(Label).fontSize = 12;
        previewLabel.getComponent(Label).color = TEXT_GRAY_COLOR;
        
        const turnLabel = this.createLabel('回合: 0', container, 'TurnLabel');
        turnLabel.position = new Vec3(this.gridContainerWidth / 2 - 45, previewHeight / 2 - 18, 0);
        turnLabel.getComponent(Label).fontSize = 12;
        turnLabel.getComponent(Label).color = TEXT_GRAY_COLOR;
        
        const previewBlocksLayer = this.createNode('PreviewBlocksLayer', container);
        const previewBlocksLayerUIT = previewBlocksLayer.addComponent(UITransform);
        previewBlocksLayerUIT.setContentSize(new Size(this.gridContainerWidth, this.cellWidth));
        previewBlocksLayerUIT.anchorX = 0;
        previewBlocksLayerUIT.anchorY = 0;
        previewBlocksLayer.position = new Vec3(-this.gridContainerWidth / 2, -previewHeight / 2 + 8, 0);
        
        console.log('=== BottomUI_Root 构建完成 ===');
        console.log('PreviewBlocksLayer 锚点: (0, 0)');
        console.log('PreviewBlocksLayer 位置:', previewBlocksLayer.position);
    }
    
    createGameOverPanel(parent: Node) {
        const overlay = this.createNode('Overlay', parent);
        
        const overlayUIT = overlay.addComponent(UITransform);
        overlayUIT.setContentSize(this.visibleSize);
        
        const overlayWidget = overlay.addComponent(Widget);
        overlayWidget.isAlignTop = true;
        overlayWidget.isAlignBottom = true;
        overlayWidget.isAlignLeft = true;
        overlayWidget.isAlignRight = true;
        overlayWidget.top = 0;
        overlayWidget.bottom = 0;
        overlayWidget.left = 0;
        overlayWidget.right = 0;
        
        const overlayGraphics = overlay.addComponent(Graphics);
        overlayGraphics.fillColor = new Color(0, 0, 0, 180);
        overlayGraphics.rect(-this.visibleSize.width / 2, -this.visibleSize.height / 2, this.visibleSize.width, this.visibleSize.height);
        overlayGraphics.fill();
        
        overlayWidget.updateAlignment();
        
        const panel = this.createWhiteCard('Panel', parent, new Size(300, 260), 16);
        
        const title = this.createLabel('游戏结束', panel, 'Title');
        title.position = new Vec3(0, 85, 0);
        title.getComponent(Label).fontSize = 28;
        title.getComponent(Label).color = PRIMARY_COLOR;
        
        const finalLabel = this.createLabel('最终得分', panel, 'FinalLabel');
        finalLabel.position = new Vec3(0, 40, 0);
        finalLabel.getComponent(Label).fontSize = 14;
        finalLabel.getComponent(Label).color = TEXT_GRAY_COLOR;
        
        const finalScore = this.createLabel('0', panel, 'FinalScore');
        finalScore.getComponent(Label).fontSize = 52;
        finalScore.getComponent(Label).color = PRIMARY_COLOR;
        
        const restartBtn = this.createJellyButton('重新开始', panel, 'RestartButton', true);
        restartBtn.position = new Vec3(0, -80, 0);
        this.setupButtonClick(restartBtn, 'onRestartGame');
    }
    
    private createWhiteCard(name: string, parent: Node, size: Size, radius: number = 12): Node {
        const card = this.createNode(name, parent);
        const uit = card.addComponent(UITransform);
        uit.setContentSize(size);
        const graphics = card.addComponent(Graphics);
        graphics.fillColor = CARD_BG_COLOR;
        graphics.roundRect(-size.width / 2, -size.height / 2, size.width, size.height, radius);
        graphics.fill();
        return card;
    }
    
    private createJellyButton(text: string, parent: Node, name: string, isPrimary: boolean): Node {
        const btn = this.createNode(name, parent);
        const uit = btn.addComponent(UITransform);
        uit.setContentSize(new Size(220, 56));
        const graphics = btn.addComponent(Graphics);
        graphics.fillColor = isPrimary ? PRIMARY_COLOR : CARD_BG_COLOR;
        graphics.roundRect(-110, -28, 220, 56, 16);
        graphics.fill();
        btn.addComponent(Button);
        
        const label = this.createLabel(text, btn);
        label.getComponent(Label).fontSize = 18;
        label.getComponent(Label).color = isPrimary ? new Color(255, 255, 255) : PRIMARY_COLOR;
        return btn;
    }
    
    private createPropButton(parent: Node, name: string, icon: string, title: string, subtitle: string): Node {
        const btn = this.createNode(name, parent);
        const uit = btn.addComponent(UITransform);
        uit.setContentSize(new Size(120, 52));
        const graphics = btn.addComponent(Graphics);
        graphics.fillColor = CARD_BG_COLOR;
        graphics.roundRect(-60, -26, 120, 52, 12);
        graphics.fill();
        btn.addComponent(Button);
        
        const iconLabel = this.createLabel(icon, btn);
        iconLabel.position = new Vec3(-32, 0, 0);
        iconLabel.getComponent(Label).fontSize = 20;
        
        const titleLabel = this.createLabel(title, btn, 'Title');
        titleLabel.position = new Vec3(18, 10, 0);
        titleLabel.getComponent(Label).fontSize = 14;
        titleLabel.getComponent(Label).color = PRIMARY_COLOR;
        
        const subLabel = this.createLabel(subtitle, btn, 'Subtitle');
        subLabel.position = new Vec3(18, -10, 0);
        subLabel.getComponent(Label).fontSize = 10;
        subLabel.getComponent(Label).color = TEXT_GRAY_COLOR;
        
        return btn;
    }
    
    private createNode(name: string, parent: Node): Node {
        const node = new Node(name);
        parent.addChild(node);
        return node;
    }
    
    private createLabel(text: string, parent: Node, name: string = 'Label'): Node {
        const node = this.createNode(name, parent);
        const label = node.addComponent(Label);
        label.string = text;
        node.addComponent(UITransform);
        return node;
    }
    
    private setupButtonClick(buttonNode: Node, methodName: string): void {
        buttonNode.on(Node.EventType.TOUCH_END, () => {
            const gameManager = this.canvas.getComponent('GameManager') as any;
            if (gameManager && typeof gameManager[methodName] === 'function') {
                gameManager[methodName]();
            }
        }, this);
    }
    
    private configureGameManager(homePage: Node, gamePage: Node, gameOverPanel: Node): void {
        const gameManager = this.canvas.getComponent('GameManager') as any;
        if (gameManager) {
            gameManager.homePage = homePage;
            gameManager.gamePage = gamePage;
            gameManager.gameOverPanel = gameOverPanel;
            gameManager.blockPrefab = this.blockPrefab;
            gameManager.cellWidth = this.cellWidth;
            gameManager.gap = GAP;
            gameManager.topUIRoot = this.topUIRoot;
            gameManager.gameGridRoot = this.gameGridRoot;
            gameManager.bottomUIRoot = this.bottomUIRoot;
            console.log('=== UIAutoSetup: 场景树搭建完成 ===');
            console.log('cellWidth:', this.cellWidth);
            console.log('gap:', GAP);
            if (typeof gameManager.initUI === 'function') {
                gameManager.initUI();
            }
        } else {
            console.error('UIAutoSetup: GameManager 组件未找到！');
        }
    }
}
