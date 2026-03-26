import { _decorator, Component, Node, Vec3, view, Widget, UITransform, Graphics, Color, Label, instantiate, Button, Sprite, director, Director } from 'cc';

const { ccclass, property } = _decorator;

const GRID_COLS = 9;
const GRID_ROWS = 11;
const HEADER_HEIGHT = 180;
const PREVIEW_HEIGHT = 30;
const MAX_WIDTH = 640;
const OFFSET = 30;
const PRIMARY_COLOR = new Color(74, 108, 247, 255);
const TEXT_GRAY_COLOR = new Color(128, 128, 128, 255);
const GRID_BG_COLOR = new Color(240, 240, 240, 255);

@ccclass('UIAutoSetup')
export class UIAutoSetup extends Component {
    @property({ type: Node })
    gamePage: Node = null;
    @property({ type: Node })
    topUIRoot: Node = null;
    @property({ type: Node })
    gameGridRoot: Node = null;
    @property({ type: Node })
    bottomUIRoot: Node = null;
    @property({ type: Node })
    homePage: Node = null;
    @property({ type: Node })
    blockPrefab: Node = null;

    private gridContainerWidth = 0;
    private gridContainerHeight = 0;
    private cellWidth = 0;

    onLoad() {
        console.log('UIAutoSetup onLoad');
        this.ensureNodesActive();
        this.setupWidgetLayout();
    }

    start() {
        console.log('UIAutoSetup start');
        this.scheduleOnce(() => {
            this.calculateGridSize();
            this.buildUI();
            this.configureGameManager();
            console.log('UIAutoSetup init done');
        }, 0);
    }

    private ensureNodesActive() {
        if (this.node) this.node.active = true;
        if (this.homePage) {
            this.homePage.active = true;
            this.homePage.setSiblingIndex(999);
        }
        if (this.gamePage) this.gamePage.active = false;
        if (this.topUIRoot) this.topUIRoot.active = true;
        if (this.gameGridRoot) this.gameGridRoot.active = true;
        if (this.bottomUIRoot) this.bottomUIRoot.active = true;
    }

    private setupWidgetLayout() {
        if (this.topUIRoot) {
            let widget = this.topUIRoot.getComponent(Widget);
            if (!widget) widget = this.topUIRoot.addComponent(Widget);
            widget.enabled = true;
            widget.isAlignTop = true;
            widget.top = OFFSET;
            widget.isAlignHorizontalCenter = true;
            widget.horizontalCenter = 0;
            widget.isAlignLeft = false;
            widget.isAlignRight = false;
            widget.isAlignBottom = false;
            widget.isAlignVerticalCenter = false;
            const uit = this.topUIRoot.getComponent(UITransform);
            if (uit) uit.setContentSize(MAX_WIDTH, HEADER_HEIGHT);
        }

        if (this.bottomUIRoot) {
            let widget = this.bottomUIRoot.getComponent(Widget);
            if (!widget) widget = this.bottomUIRoot.addComponent(Widget);
            widget.enabled = true;
            widget.isAlignBottom = true;
            widget.bottom = -OFFSET;
            widget.isAlignHorizontalCenter = true;
            widget.horizontalCenter = 0;
            widget.isAlignLeft = false;
            widget.isAlignRight = false;
            widget.isAlignTop = false;
            widget.isAlignVerticalCenter = false;
            const uit = this.bottomUIRoot.getComponent(UITransform);
            if (uit) uit.setContentSize(MAX_WIDTH, PREVIEW_HEIGHT);
        }

        if (this.gameGridRoot) {
            let widget = this.gameGridRoot.getComponent(Widget);
            if (!widget) widget = this.gameGridRoot.addComponent(Widget);
            widget.enabled = true;
            widget.isAlignTop = true;
            widget.top = HEADER_HEIGHT + OFFSET;
            widget.isAlignBottom = true;
            widget.bottom = PREVIEW_HEIGHT - OFFSET;
            widget.isAlignHorizontalCenter = true;
            widget.horizontalCenter = 0;
            widget.isAlignLeft = false;
            widget.isAlignRight = false;
            widget.isAlignVerticalCenter = false;
        }
    }

    private calculateGridSize() {
        const visibleSize = view.getVisibleSize();
        const screenHeight = visibleSize.height;
        const availableHeight = screenHeight - HEADER_HEIGHT - PREVIEW_HEIGHT - 40;
        this.gridContainerWidth = Math.min(MAX_WIDTH, availableHeight * 9 / 11);
        this.gridContainerHeight = this.gridContainerWidth * 11 / 9;
        this.cellWidth = this.gridContainerWidth / GRID_COLS;
        
        if (this.gameGridRoot) {
            const uit = this.gameGridRoot.getComponent(UITransform);
            if (uit) uit.setContentSize(this.gridContainerWidth, this.gridContainerHeight);
        }
        
        console.log('Grid size:', this.gridContainerWidth, 'x', this.gridContainerHeight, 'cellWidth:', this.cellWidth);
    }

    private buildUI() {
        if (this.homePage) this.buildHomePage(this.homePage);
        if (this.topUIRoot) this.buildTopUI(this.topUIRoot);
        if (this.gameGridRoot) this.buildGameBoard(this.gameGridRoot);
        if (this.bottomUIRoot) this.buildBottomUI(this.bottomUIRoot);
    }

    private buildHomePage(container: Node) {
        container.removeAllChildren();
        const visibleSize = view.getVisibleSize();
        const width = visibleSize.width;
        const height = visibleSize.height;

        const bg = this.createGraphicsNode('Bg', container, width, height, new Color(74, 108, 247, 255), 0);

        const titleNode = this.createLabel('Block Puzzle', container, 'Title');
        titleNode.setPosition(0, 100, 0);
        const titleLabel = titleNode.getComponent(Label);
        titleLabel.fontSize = 64;
        titleLabel.color = Color.WHITE;
        titleLabel.isBold = true;

        const subtitleNode = this.createLabel('Slide blocks to clear', container, 'Subtitle');
        subtitleNode.setPosition(0, 30, 0);
        const subtitleLabel = subtitleNode.getComponent(Label);
        subtitleLabel.fontSize = 24;
        subtitleLabel.color = new Color(255, 255, 255, 200);

        const btnWidth = 240;
        const btnHeight = 80;
        const btnNode = this.createGraphicsNode('StartBtn', container, btnWidth, btnHeight, Color.WHITE, 40);
        btnNode.setPosition(0, -80, 0);

        const btnText = this.createLabel('Start Game', btnNode, 'BtnText');
        btnText.setPosition(0, 0, 0);
        const btnLabel = btnText.getComponent(Label);
        btnLabel.fontSize = 32;
        btnLabel.color = PRIMARY_COLOR;
        btnLabel.isBold = true;

        const continueBtnNode = this.createGraphicsNode('ContinueBtn', container, btnWidth, btnHeight, new Color(255, 255, 255, 0), 40);
        continueBtnNode.setPosition(0, -180, 0);

        const continueBorder = this.createGraphicsNode('Border', continueBtnNode, btnWidth - 4, btnHeight - 4, new Color(255, 255, 255, 0), 38);
        const borderGraphics = continueBorder.getComponent(Graphics);
        borderGraphics.strokeColor = Color.WHITE;
        borderGraphics.lineWidth = 2;
        borderGraphics.roundRect(-(btnWidth-4)/2, -(btnHeight-4)/2, btnWidth-4, btnHeight-4, 38);
        borderGraphics.stroke();

        const continueText = this.createLabel('Continue', continueBtnNode, 'ContinueText');
        continueText.setPosition(0, 0, 0);
        const continueLabel = continueText.getComponent(Label);
        continueLabel.fontSize = 32;
        continueLabel.color = Color.WHITE;
        continueLabel.isBold = true;
    }

    private buildTopUI(container: Node) {
        container.removeAllChildren();
        const width = MAX_WIDTH;
        const height = HEADER_HEIGHT;

        const bg = this.createGraphicsNode('Bg', container, width, height, Color.WHITE, 0);

        const titleLabel = this.createLabel('本局积分', container, 'TitleLabel');
        titleLabel.setPosition(0, 75, 0);
        titleLabel.getComponent(Label).fontSize = 16;
        titleLabel.getComponent(Label).color = TEXT_GRAY_COLOR;

        const scoreLabel = this.createLabel('0', container, 'ScoreValue');
        scoreLabel.setPosition(0, 45, 0);
        const label = scoreLabel.getComponent(Label);
        label.fontSize = 48;
        label.color = PRIMARY_COLOR;
        label.isBold = true;

        const progressY = -15;
        const propLabel = this.createLabel('道具', container, 'PropLabel');
        propLabel.setPosition(-width/2 + 50, progressY, 0);
        propLabel.getComponent(Label).fontSize = 16;
        propLabel.getComponent(Label).color = new Color(51, 51, 51, 255);

        const progressWidth = width * 0.75;
        const progressHeight = 28;
        const progressBg = this.createGraphicsNode('ProgressBg', container, progressWidth, progressHeight, new Color(230, 230, 230, 255), 14);
        progressBg.setPosition(20, progressY, 0);

        const progressFill = this.createGraphicsNode('ProgressFill', progressBg, 0, progressHeight - 4, PRIMARY_COLOR, 12);
        progressFill.setPosition(-progressWidth/2, 0, 0);

        const progressText = this.createLabel('0/2000', progressBg, 'ProgressText');
        progressText.setPosition(0, 0, 0);
        progressText.getComponent(Label).fontSize = 14;
        progressText.getComponent(Label).color = PRIMARY_COLOR;
        progressText.getComponent(Label).isBold = true;

        const btnY = -75;
        const btnWidth = (width - 60) / 2;
        const btnHeight = 50;

        const freezeBtn = this.createGraphicsNode('FreezeBtn', container, btnWidth, btnHeight, new Color(245, 245, 245, 255), 12);
        freezeBtn.setPosition(-btnWidth/2 - 10, btnY, 0);
        
        const freezeIcon = this.createLabel('❄', freezeBtn, 'FreezeIcon');
        freezeIcon.setPosition(0, 5, 0);
        freezeIcon.getComponent(Label).fontSize = 20;
        freezeIcon.getComponent(Label).color = new Color(100, 100, 100, 255);
        
        const freezeText = this.createLabel('冻结3轮', freezeBtn, 'FreezeText');
        freezeText.setPosition(0, -15, 0);
        freezeText.getComponent(Label).fontSize = 11;
        freezeText.getComponent(Label).color = TEXT_GRAY_COLOR;

        const shrinkBtn = this.createGraphicsNode('ShrinkBtn', container, btnWidth, btnHeight, new Color(245, 245, 245, 255), 12);
        shrinkBtn.setPosition(btnWidth/2 + 10, btnY, 0);
        
        const shrinkIcon = this.createLabel('◎', shrinkBtn, 'ShrinkIcon');
        shrinkIcon.setPosition(0, 5, 0);
        shrinkIcon.getComponent(Label).fontSize = 20;
        shrinkIcon.getComponent(Label).color = new Color(100, 100, 100, 255);
        
        const shrinkText = this.createLabel('5格缩减至1格', shrinkBtn, 'ShrinkText');
        shrinkText.setPosition(0, -15, 0);
        shrinkText.getComponent(Label).fontSize = 11;
        shrinkText.getComponent(Label).color = TEXT_GRAY_COLOR;
    }

    private buildGameBoard(container: Node) {
        container.removeAllChildren();
        const width = this.gridContainerWidth;
        const height = this.gridContainerHeight;

        const bg = this.createGraphicsNode('GridBg', container, width, height, GRID_BG_COLOR, 0);

        const gridLines = this.createNode('GridLines', container);
        const graphics = gridLines.addComponent(Graphics);
        graphics.strokeColor = Color.WHITE;
        graphics.lineWidth = 2;

        const cellW = width / GRID_COLS;
        const cellH = height / GRID_ROWS;

        for (let i = 0; i <= GRID_COLS; i++) {
            const x = -width / 2 + i * cellW;
            graphics.moveTo(x, -height / 2);
            graphics.lineTo(x, height / 2);
        }
        for (let i = 0; i <= GRID_ROWS; i++) {
            const y = -height / 2 + i * cellH;
            graphics.moveTo(-width / 2, y);
            graphics.lineTo(width / 2, y);
        }
        graphics.stroke();

        const blocksLayer = this.createNode('BlocksLayer', container);
        const blUIT = blocksLayer.addComponent(UITransform);
        blUIT.setContentSize(width, height);
        blUIT.setAnchorPoint(0, 0);
        blocksLayer.setPosition(-width / 2, -height / 2, 0);
    }

    private buildBottomUI(container: Node) {
        container.removeAllChildren();
        const width = MAX_WIDTH;
        const height = PREVIEW_HEIGHT;

        const bg = this.createGraphicsNode('Bg', container, width, height, new Color(250, 250, 250, 255), 0);

        const previewLayer = this.createNode('PreviewBlocksLayer', container);
        const plUIT = previewLayer.addComponent(UITransform);
        plUIT.setContentSize(this.gridContainerWidth, height);
        plUIT.setAnchorPoint(0, 0.5);
        previewLayer.setPosition(-this.gridContainerWidth / 2, 0, 0);
    }

    private createNode(name: string, parent: Node): Node {
        const node = new Node(name);
        node.parent = parent;
        return node;
    }

    private createGraphicsNode(name: string, parent: Node, width: number, height: number, color: Color, radius: number): Node {
        const node = this.createNode(name, parent);
        const uit = node.addComponent(UITransform);
        uit.setContentSize(width, height);
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = color;
        if (radius > 0) {
            graphics.roundRect(-width/2, -height/2, width, height, radius);
        } else {
            graphics.rect(-width/2, -height/2, width, height);
        }
        graphics.fill();
        return node;
    }

    private createLabel(text: string, parent: Node, name: string = 'Label'): Node {
        const node = this.createNode(name, parent);
        const label = node.addComponent(Label);
        label.string = text;
        node.addComponent(UITransform);
        return node;
    }

    private configureGameManager() {
        const gameManager = this.node.getComponent('GameManager') as any;
        if (gameManager) {
            gameManager.cellWidth = this.cellWidth;
            gameManager.gap = 0;
            gameManager.gridContainerWidth = this.gridContainerWidth;
            gameManager.gridContainerHeight = this.gridContainerHeight;
            gameManager.topUIRoot = this.topUIRoot;
            gameManager.gameGridRoot = this.gameGridRoot;
            gameManager.bottomUIRoot = this.bottomUIRoot;
            gameManager.gamePage = this.gamePage;
            gameManager.homePage = this.homePage;
            gameManager.blockPrefab = this.blockPrefab;
        }
    }
}
