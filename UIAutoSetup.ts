// UIAutoSetup.ts - 现代移动端休闲游戏布局
import { _decorator, Component, Node, Label, Button, UITransform, Color, Vec3, Size, Prefab, find, Camera, Graphics, Widget, view } from 'cc';
const { ccclass, property } = _decorator;

// 网格配置
const GRID_COLS = 9;
const GRID_ROWS = 11;
const BLOCK_GAP = 2; // 滑块间隙 2px

// 布局尺寸
const HEADER_HEIGHT = 180;      // 顶部状态栏高度 180px（更紧凑）
const PREVIEW_HEIGHT = 80;      // 底部预览区高度 80px（更紧凑）
const HORIZONTAL_MARGIN = 12;   // 左右边距减小到 12px
const MAX_WIDTH = 640;          // 最大宽度增加到 640px（更宽）

// 颜色配置
const BG_COLOR = new Color(248, 249, 250, 255);           // #F8F9FA 浅灰背景
const CARD_BG_COLOR = new Color(255, 255, 255, 255);      // 白色卡片
const PRIMARY_COLOR = new Color(74, 108, 247, 255);       // 主色调蓝色
const TEXT_GRAY_COLOR = new Color(156, 163, 175, 255);    // 灰色文字
const TEXT_DARK_COLOR = new Color(107, 114, 128, 255);    // 深灰文字
const GRID_LINE_COLOR = new Color(229, 231, 235, 255);    // 网格线颜色

@ccclass('UIAutoSetup')
export class UIAutoSetup extends Component {
    @property({ type: Prefab })
    blockPrefab: Prefab = null;
    
    @property({ type: Node, tooltip: 'GamePage容器' })
    gamePage: Node = null;
    
    @property({ type: Node, tooltip: '顶部UI容器' })
    topUIRoot: Node = null;
    
    @property({ type: Node, tooltip: '游戏网格容器' })
    gameGridRoot: Node = null;
    
    @property({ type: Node, tooltip: '底部UI容器' })
    bottomUIRoot: Node = null;
    
    @property({ type: Node, tooltip: '首页' })
    homePage: Node = null;
    
    @property({ type: Node, tooltip: '游戏结束面板' })
    gameOverPanel: Node = null;
    
    private canvas: Node = null;
    private cellWidth: number = 0;
    private gridContainerWidth: number = 0;
    private gridContainerHeight: number = 0;
    
    onLoad() {
        this.canvas = this.node;
        this.setupCameraBackground();
        console.log('=== UIAutoSetup onLoad ===');
        
        // 检查并修复 Canvas 节点配置（解决微信小游戏 Error 3817）
        this.fixCanvasNode();
    }
    
    private fixCanvasNode(): void {
        // Canvas 节点不应该有 Widget 组件，这会导致微信小游戏 Error 3817
        const widget = this.node.getComponent(Widget);
        if (widget) {
            console.warn('Canvas 节点有 Widget 组件，可能导致微信小游戏错误，建议手动移除');
        }
        console.log('Canvas 节点检查完成');
    }
    
    start() {
        console.log('=== UIAutoSetup start ===');
        
        // 检查节点引用
        if (!this.gamePage) {
            console.error('GamePage 未设置！请在编辑器中拖拽节点到属性面板。');
            return;
        }
        if (!this.gameGridRoot) {
            console.error('GameGrid_Root 未设置！请在编辑器中拖拽节点到属性面板。');
            return;
        }
        
        // 强制激活所有关键节点
        this.ensureNodesActive();
        
        // 延迟一帧后计算尺寸并构建UI
        this.scheduleOnce(() => {
            try {
                // 先计算容器位置和尺寸（在ensureNodesActive中已经计算过，但这里再确保一次）
                this.calculateContainerPositions();
                // 然后构建UI
                this.buildUI();
                // 构建首页UI
                this.buildHomePage();
                this.configureGameManager();
                console.log('=== UIAutoSetup 初始化完成 ===');
            } catch (error) {
                console.error('UIAutoSetup 初始化失败:', error);
            }
        }, 0.1);
    }
    
    private ensureNodesActive(): void {
        console.log('=== 检查并激活节点 ===');
        
        // 激活 Canvas
        if (this.canvas && !this.canvas.active) {
            this.canvas.active = true;
            console.log('Canvas 已激活');
        }
        
        // 激活 GamePage 并设置位置
        if (this.gamePage) {
            if (!this.gamePage.active) {
                this.gamePage.active = true;
                console.log('GamePage 已激活');
            }
            // 确保 GamePage 在屏幕中心
            this.gamePage.setPosition(0, 0, 0);
            console.log('GamePage 位置重置为 (0,0,0)');
            
            // 确保 GamePage 的子节点也激活
            this.activateAllChildren(this.gamePage);
        }
        
        // 激活各个 UI 容器并修复 Widget
        [this.topUIRoot, this.gameGridRoot, this.bottomUIRoot].forEach(node => {
            if (node) {
                if (!node.active) {
                    node.active = true;
                    console.log(node.name, '已激活');
                }
                // 禁用 Widget，使用代码控制位置
                const widget = node.getComponent(Widget);
                if (widget) {
                    widget.enabled = false;
                    console.log(`${node.name} Widget 已禁用，将使用代码控制位置`);
                }
            }
        });
        
        // 手动计算三个容器的位置
        this.calculateContainerPositions();
        
        // 检查 UITransform
        this.checkUITransform(this.gamePage, 'GamePage');
        this.checkUITransform(this.topUIRoot, 'TopUIRoot');
        this.checkUITransform(this.gameGridRoot, 'GameGridRoot');
        this.checkUITransform(this.bottomUIRoot, 'BottomUIRoot');
    }
    
    private activateAllChildren(parent: Node): void {
        parent.children.forEach(child => {
            if (!child.active) {
                child.active = true;
            }
            this.activateAllChildren(child);
        });
    }
    
    private calculateContainerPositions(): void {
        const visibleSize = view.getVisibleSize();
        const screenHeight = visibleSize.height;
        const screenWidth = visibleSize.width;
        
        console.log('=== 计算容器位置 ===');
        console.log('屏幕尺寸:', screenWidth, 'x', screenHeight);
        
        // 计算网格容器宽度（左右边距），限制最大宽度为 448px
        const availableWidth = Math.min(screenWidth - HORIZONTAL_MARGIN * 2, MAX_WIDTH);
        this.gridContainerWidth = availableWidth;
        this.gridContainerHeight = this.gridContainerWidth * (11 / 9);
        this.cellWidth = this.gridContainerWidth / GRID_COLS;
        
        // 计算中间可用空间
        const topHeight = HEADER_HEIGHT;
        const bottomHeight = PREVIEW_HEIGHT;
        
        // 计算各个区域的位置（从顶部开始往下排列）
        
        // 计算布局（从顶部开始往下排列，紧凑布局）
        const topMargin = 8; // 顶部边距 8px
        const sectionGap = 12; // 区域间距 12px
        
        // TopUI_Root - 在顶部
        const topY = screenHeight / 2 - topMargin - topHeight / 2;
        if (this.topUIRoot) {
            const topUIT = this.topUIRoot.getComponent(UITransform);
            if (topUIT) {
                topUIT.setContentSize(this.gridContainerWidth, topHeight);
            }
            // 禁用 Widget，使用代码控制位置
            const widget = this.topUIRoot.getComponent(Widget);
            if (widget) {
                widget.enabled = false;
            }
            this.topUIRoot.setPosition(new Vec3(0, topY, 0));
            console.log('TopUI_Root 位置:', topY, '尺寸:', this.gridContainerWidth, 'x', topHeight);
        }
        
        // GameGrid_Root - 在 TopUI 下方，间距 12px
        const topUIBottomY = topY - topHeight / 2;
        const gridY = topUIBottomY - sectionGap - this.gridContainerHeight / 2;
        
        if (this.gameGridRoot) {
            const gridUIT = this.gameGridRoot.getComponent(UITransform);
            if (gridUIT) {
                gridUIT.setContentSize(this.gridContainerWidth, this.gridContainerHeight);
            }
            this.gameGridRoot.setPosition(new Vec3(0, gridY, 0));
            console.log('GameGrid_Root 位置:', gridY, '尺寸:', this.gridContainerWidth, 'x', this.gridContainerHeight);
        }
        
        // BottomUI_Root - 在网格下方，间距 12px
        if (this.bottomUIRoot) {
            const bottomUIT = this.bottomUIRoot.getComponent(UITransform);
            if (bottomUIT) {
                bottomUIT.setContentSize(this.gridContainerWidth, bottomHeight);
            }
            // 禁用 Widget，使用代码控制位置
            const widget = this.bottomUIRoot.getComponent(Widget);
            if (widget) {
                widget.enabled = false;
            }
            // 计算位置：网格底部 - 间距 - 底部卡片高度/2
            const gridBottomY = gridY - this.gridContainerHeight / 2;
            const bottomY = gridBottomY - sectionGap - bottomHeight / 2;
            this.bottomUIRoot.setPosition(new Vec3(0, bottomY, 0));
            console.log('BottomUI_Root 位置:', bottomY, '尺寸:', this.gridContainerWidth, 'x', bottomHeight);
        }
    }
    
    // 强制同步布局
    public forceLayoutSync(): void {
        console.log('=== 强制同步布局 ===');
        
        // 更新 TopUI Widget
        if (this.topUIRoot) {
            const widget = this.topUIRoot.getComponent(Widget);
            if (widget) {
                widget.updateAlignment();
            }
        }
        
        // 重新计算布局（从顶部开始往下排列，紧凑布局）
        const visibleSize = view.getVisibleSize();
        const screenHeight = visibleSize.height;
        const topHeight = HEADER_HEIGHT;
        const bottomHeight = PREVIEW_HEIGHT;
        const topMargin = 8;
        const sectionGap = 12;
        
        // TopUI
        const topY = screenHeight / 2 - topMargin - topHeight / 2;
        if (this.topUIRoot) {
            this.topUIRoot.setPosition(new Vec3(0, topY, 0));
        }
        
        // GameGrid
        const topUIBottomY = topY - topHeight / 2;
        const gridY = topUIBottomY - sectionGap - this.gridContainerHeight / 2;
        if (this.gameGridRoot) {
            this.gameGridRoot.setPosition(new Vec3(0, gridY, 0));
        }
        
        // BottomUI
        if (this.bottomUIRoot) {
            const gridBottomY = gridY - this.gridContainerHeight / 2;
            const bottomY = gridBottomY - sectionGap - bottomHeight / 2;
            this.bottomUIRoot.setPosition(new Vec3(0, bottomY, 0));
        }
    }
    
    private checkUITransform(node: Node, name: string): void {
        if (!node) return;
        let uit = node.getComponent(UITransform);
        if (!uit) {
            uit = node.addComponent(UITransform);
            console.log(name, '添加了 UITransform');
        }
        // 确保尺寸不为0
        if (uit.width <= 0 || uit.height <= 0) {
            const visibleSize = view.getVisibleSize();
            if (name === 'GamePage') {
                uit.setContentSize(visibleSize.width, visibleSize.height);
            } else {
                uit.setContentSize(visibleSize.width, 200);
            }
            console.log(name, '尺寸设置为:', uit.width, 'x', uit.height);
        }
    }
    
    private setupCameraBackground(): void {
        const cameraNode = find('Main Camera');
        if (cameraNode) {
            const camera = cameraNode.getComponent(Camera);
            if (camera) {
                camera.clearColor = BG_COLOR;
                console.log('相机背景色已设置');
            }
        }
    }
    
    private calculateGridSize(): void {
        // 此方法已被 calculateContainerPositions 替代
        // 保留此方法以兼容旧代码调用
        console.log('calculateGridSize 已被弃用，使用 calculateContainerPositions');
    }
    
    private buildUI(): void {
        console.log('=== 开始构建UI ===');
        
        if (this.topUIRoot) {
            console.log('构建 TopUI...');
            this.buildTopUI(this.topUIRoot);
        }
        
        if (this.gameGridRoot) {
            console.log('构建 GameBoard...');
            this.buildGameBoard(this.gameGridRoot);
        }
        
        if (this.bottomUIRoot) {
            console.log('构建 BottomUI...');
            this.buildBottomUI(this.bottomUIRoot);
        }
        
        console.log('=== UI构建完成 ===');
        
        // 打印节点层级用于调试
        this.printNodeHierarchy(this.gamePage, 0);
    }
    
    private printNodeHierarchy(node: Node, depth: number): void {
        if (!node) return;
        const indent = '  '.repeat(depth);
        const uit = node.getComponent(UITransform);
        const size = uit ? `(${uit.width.toFixed(0)}x${uit.height.toFixed(0)})` : '(no UITransform)';
        const pos = `pos:(${node.position.x.toFixed(0)},${node.position.y.toFixed(0)})`;
        const active = node.active ? '✓' : '✗';
        console.log(`${indent}${active} ${node.name} ${size} ${pos}`);
        
        node.children.forEach(child => {
            this.printNodeHierarchy(child, depth + 1);
        });
    }
    
    private buildTopUI(container: Node): void {
        container.removeAllChildren();
        
        // 重置容器锚点为居中
        const containerUIT = container.getComponent(UITransform);
        const containerWidth = containerUIT?.width || 640;
        const containerHeight = containerUIT?.height || 180;
        if (containerUIT) {
            containerUIT.setAnchorPoint(0.5, 0.5);
        }
        
        const padding = 16; // 内边距
        const contentWidth = containerWidth - padding * 2;
        
        // 以容器中心为原点，Y>0 是上方，Y<0 是下方
        // 容器高度 180px，所以顶部是 Y=90，底部是 Y=-90
        
        // ========== 第一行：积分（最上方正中央，字体调大加粗）==========
        const scoreValue = this.createLabel('0', container, 'ScoreValue');
        scoreValue.position = new Vec3(0, 50, 0); // 偏上
        const scoreLabel = scoreValue.getComponent(Label);
        scoreLabel.fontSize = 48; // 大字体
        scoreLabel.color = PRIMARY_COLOR;
        scoreLabel.isBold = true;
        
        // 积分标题
        const scoreTitle = this.createLabel('本局积分', container, 'ScoreTitle');
        scoreTitle.position = new Vec3(0, 15, 0); // 在积分下方
        const titleLabel = scoreTitle.getComponent(Label);
        titleLabel.fontSize = 12;
        titleLabel.color = TEXT_GRAY_COLOR;
        
        // ========== 第二行：道具标签 + 进度条 ==========
        const propRowY = -25;
        
        // 道具标签
        const propLabel = this.createLabel('道具', container, 'PropLabel');
        propLabel.position = new Vec3(-contentWidth / 2 + 30, propRowY, 0);
        const propLabelComp = propLabel.getComponent(Label);
        propLabelComp.fontSize = 14;
        propLabelComp.color = TEXT_DARK_COLOR;
        propLabelComp.isBold = true;
        
        // 进度条背景 - 占据该行 70% 宽度
        const progressBarWidth = contentWidth * 0.7;
        const progressBarHeight = 20;
        
        const progressBg = this.createNode('ProgressBg', container);
        progressBg.position = new Vec3(contentWidth * 0.15 - contentWidth / 2 + 40, propRowY, 0);
        const progressBgUIT = progressBg.addComponent(UITransform);
        progressBgUIT.setContentSize(progressBarWidth, progressBarHeight);
        progressBgUIT.anchorX = 0;
        
        const progressBgGraphics = progressBg.addComponent(Graphics);
        progressBgGraphics.fillColor = new Color(240, 242, 245, 255);
        progressBgGraphics.roundRect(0, -progressBarHeight / 2, progressBarWidth, progressBarHeight, 10);
        progressBgGraphics.fill();
        progressBgGraphics.markForUpdateRenderData();
        
        // 进度条填充
        const progressFill = this.createNode('ProgressFill', progressBg);
        progressFill.position = new Vec3(2, 0, 0);
        const progressFillUIT = progressFill.addComponent(UITransform);
        progressFillUIT.setContentSize(1, progressBarHeight - 4);
        progressFillUIT.anchorX = 0;
        const progressFillGraphics = progressFill.addComponent(Graphics);
        progressFillGraphics.fillColor = PRIMARY_COLOR;
        progressFillGraphics.roundRect(0, -(progressBarHeight - 4) / 2, 1, progressBarHeight - 4, 8);
        progressFillGraphics.fill();
        progressFillGraphics.markForUpdateRenderData();
        
        // 进度文字
        const progressText = this.createLabel('0/2000', progressBg, 'ProgressText');
        progressText.position = new Vec3(progressBarWidth / 2, 0, 0);
        const progressTextComp = progressText.getComponent(Label);
        progressTextComp.fontSize = 11;
        progressTextComp.color = PRIMARY_COLOR;
        
        // ========== 第三行：两个道具按钮 ==========
        const buttonRowY = -70;
        const buttonGap = 12;
        const buttonWidth = (contentWidth - buttonGap) / 2;
        const buttonHeight = 48;
        
        // 冻结按钮
        const freezeBtn = this.createPropButtonV2(container, 'FreezeButton', '❄️', '冻结3轮', buttonWidth, buttonHeight);
        freezeBtn.position = new Vec3(-buttonWidth / 2 - buttonGap / 2, buttonRowY, 0);
        this.setupButtonClick(freezeBtn, 'onUseFreezeProp');
        
        // 缩减按钮
        const shrinkBtn = this.createPropButtonV2(container, 'ShrinkButton', '⬇️', '5格缩减至1格', buttonWidth, buttonHeight);
        shrinkBtn.position = new Vec3(buttonWidth / 2 + buttonGap / 2, buttonRowY, 0);
        this.setupButtonClick(shrinkBtn, 'onUseShrinkProp');
    }
    
    private createPropButtonV2(parent: Node, name: string, icon: string, text: string, width: number, height: number): Node {
        const btn = this.createNode(name, parent);
        const uit = btn.addComponent(UITransform);
        uit.setContentSize(width, height);
        
        // 白色卡片背景，淡蓝色/紫色方案
        const graphics = btn.addComponent(Graphics);
        graphics.fillColor = new Color(255, 255, 255, 255);
        graphics.roundRect(-width / 2, -height / 2, width, height, 8);
        graphics.fill();
        graphics.strokeColor = new Color(229, 231, 235, 255);
        graphics.lineWidth = 1;
        graphics.roundRect(-width / 2 + 0.5, -height / 2 + 0.5, width - 1, height - 1, 7);
        graphics.stroke();
        graphics.markForUpdateRenderData();
        
        // 图标在上
        const iconLabel = this.createLabel(icon, btn);
        iconLabel.position = new Vec3(0, 10, 0);
        iconLabel.getComponent(Label).fontSize = 20;
        
        // 文字在下
        const textLabel = this.createLabel(text, btn, 'Text');
        textLabel.position = new Vec3(0, -12, 0);
        const textComp = textLabel.getComponent(Label);
        textComp.fontSize = 11;
        textComp.color = TEXT_GRAY_COLOR;
        
        btn.addComponent(Button);
        return btn;
    }
    
    private createPropButton(parent: Node, name: string, icon: string, title: string, subtitle: string, width: number, height: number): Node {
        const btn = this.createNode(name, parent);
        const uit = btn.addComponent(UITransform);
        uit.setContentSize(width, height);
        
        // rounded-lg (8px) 圆角
        const graphics = btn.addComponent(Graphics);
        graphics.fillColor = new Color(248, 249, 250, 255);
        graphics.roundRect(-width / 2, -height / 2, width, height, 8);
        graphics.fill();
        graphics.strokeColor = new Color(229, 231, 235, 255);
        graphics.lineWidth = 1;
        graphics.roundRect(-width / 2 + 0.5, -height / 2 + 0.5, width - 1, height - 1, 7);
        graphics.stroke();
        graphics.markForUpdateRenderData();
        
        // 图标 24x24px
        const iconLabel = this.createLabel(icon, btn);
        iconLabel.position = new Vec3(-width / 3, 0, 0);
        iconLabel.getComponent(Label).fontSize = 24;
        
        const titleLabel = this.createLabel(title, btn, 'Title');
        titleLabel.position = new Vec3(width / 6, 6, 0);
        titleLabel.getComponent(Label).fontSize = 14;
        titleLabel.getComponent(Label).color = PRIMARY_COLOR;
        titleLabel.getComponent(Label).isBold = true;
        
        const subLabel = this.createLabel(subtitle, btn, 'Subtitle');
        subLabel.position = new Vec3(width / 6, -10, 0);
        subLabel.getComponent(Label).fontSize = 11;
        subLabel.getComponent(Label).color = TEXT_GRAY_COLOR;
        
        btn.addComponent(Button);
        return btn;
    }
    
    private buildGameBoard(container: Node): void {
        container.removeAllChildren();
        
        // 重置容器锚点为居中
        const containerUIT = container.getComponent(UITransform);
        if (containerUIT) {
            containerUIT.setAnchorPoint(0.5, 0.5);
        }
        
        const width = this.gridContainerWidth;
        const height = this.gridContainerHeight;
        
        // 浅灰色背景（参考图2的网格底色）
        const bg = this.createNode('Bg', container);
        const bgUIT = bg.addComponent(UITransform);
        bgUIT.setContentSize(width, height);
        bgUIT.setAnchorPoint(0.5, 0.5);
        
        const bgGraphics = bg.addComponent(Graphics);
        bgGraphics.fillColor = new Color(248, 249, 250, 255); // 浅灰色背景
        bgGraphics.roundRect(-width / 2, -height / 2, width, height, 12);
        bgGraphics.fill();
        bgGraphics.markForUpdateRenderData();
        
        // 网格线 - 纯白色，略微增加粗细
        const gridLines = this.createNode('GridLines', container);
        const gridGraphics = gridLines.addComponent(Graphics);
        gridGraphics.strokeColor = new Color(255, 255, 255, 255); // 纯白色
        gridGraphics.lineWidth = 2; // 增加粗细
        
        const cellW = width / GRID_COLS;
        const cellH = height / GRID_ROWS;
        
        for (let i = 0; i <= GRID_COLS; i++) {
            const x = -width / 2 + i * cellW;
            gridGraphics.moveTo(x, -height / 2);
            gridGraphics.lineTo(x, height / 2);
        }
        for (let i = 0; i <= GRID_ROWS; i++) {
            const y = -height / 2 + i * cellH;
            gridGraphics.moveTo(-width / 2, y);
            gridGraphics.lineTo(width / 2, y);
        }
        gridGraphics.stroke();
        gridGraphics.markForUpdateRenderData();
        
        // BlocksLayer - 使用左下角锚点方便放置滑块
        const blocksLayer = this.createNode('BlocksLayer', container);
        const blocksLayerUIT = blocksLayer.addComponent(UITransform);
        blocksLayerUIT.setContentSize(width, height);
        blocksLayerUIT.setAnchorPoint(0, 0);
        blocksLayer.position = new Vec3(-width / 2, -height / 2, 0);
        
        console.log('=== GameBoard构建完成 ===');
    }
    
    private buildBottomUI(container: Node): void {
        container.removeAllChildren();
        
        // 重置容器锚点为底部居中
        const containerUIT = container.getComponent(UITransform);
        if (containerUIT) {
            containerUIT.setAnchorPoint(0.5, 0);
        }
        
        const width = this.gridContainerWidth;
        const height = PREVIEW_HEIGHT; // 120px
        
        // 白色背景卡片
        const bg = this.createNode('Bg', container);
        const bgUIT = bg.addComponent(UITransform);
        bgUIT.setContentSize(width, height);
        bgUIT.setAnchorPoint(0.5, 0);
        bg.position = new Vec3(0, 0, 0);
        
        const bgGraphics = bg.addComponent(Graphics);
        bgGraphics.fillColor = new Color(255, 255, 255, 255);
        bgGraphics.roundRect(-width / 2, 0, width, height, 12);
        bgGraphics.fill();
        bgGraphics.markForUpdateRenderData();
        
        // 标题：下一行
        const titleLabel = this.createLabel('下一行', container, 'PreviewTitle');
        titleLabel.position = new Vec3(-width / 2 + 40, -30, 0);
        const titleComp = titleLabel.getComponent(Label);
        titleComp.fontSize = 14;
        titleComp.color = TEXT_GRAY_COLOR;
        
        // PreviewBlocksLayer - 放置预览滑块
        const previewLayer = this.createNode('PreviewBlocksLayer', container);
        const previewLayerUIT = previewLayer.addComponent(UITransform);
        previewLayerUIT.setContentSize(width, 60);
        previewLayerUIT.setAnchorPoint(0, 1);
        previewLayer.position = new Vec3(-width / 2, -50, 0);
    }
    
    private configureGameManager(): void {
        const gameManager = this.canvas.getComponent('GameManager') as any;
        if (gameManager) {
            gameManager.gamePage = this.gamePage;
            gameManager.topUIRoot = this.topUIRoot;
            gameManager.gameGridRoot = this.gameGridRoot;
            gameManager.bottomUIRoot = this.bottomUIRoot;
            gameManager.homePage = this.homePage;
            gameManager.gameOverPanel = this.gameOverPanel;
            gameManager.blockPrefab = this.blockPrefab;
            gameManager.cellWidth = this.cellWidth;
            gameManager.gap = BLOCK_GAP;
            gameManager.gridContainerWidth = this.gridContainerWidth;
            gameManager.gridContainerHeight = this.gridContainerHeight;
            
            if (typeof gameManager.initUI === 'function') {
                gameManager.initUI();
            }
        }
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
    
    private buildHomePage(): void {
        if (!this.homePage) {
            console.log('HomePage 未设置，跳过构建首页');
            return;
        }
        
        console.log('=== 构建首页 ===');
        
        // 确保首页激活
        this.homePage.active = true;
        
        // 清空现有子节点
        this.homePage.removeAllChildren();
        
        // 获取屏幕尺寸
        const visibleSize = view.getVisibleSize();
        const screenWidth = visibleSize.width;
        const screenHeight = visibleSize.height;
        
        // 设置 HomePage 尺寸
        const homeUIT = this.homePage.getComponent(UITransform);
        if (homeUIT) {
            homeUIT.setContentSize(screenWidth, screenHeight);
        }
        
        // 白色背景
        const bg = this.createNode('Bg', this.homePage);
        const bgUIT = bg.addComponent(UITransform);
        bgUIT.setContentSize(screenWidth, screenHeight);
        const bgGraphics = bg.addComponent(Graphics);
        bgGraphics.fillColor = new Color(255, 255, 255, 255);
        bgGraphics.rect(-screenWidth / 2, -screenHeight / 2, screenWidth, screenHeight);
        bgGraphics.fill();
        bgGraphics.markForUpdateRenderData();
        
        // 标题
        const titleNode = this.createNode('Title', this.homePage);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '滑块消消乐';
        titleLabel.fontSize = 48;
        titleLabel.color = new Color(51, 51, 51, 255);
        titleLabel.isBold = true;
        titleNode.addComponent(UITransform);
        titleNode.position = new Vec3(0, 150, 0);
        
        // 检查是否有存档
        const hasProgress = this.checkHasProgress();
        
        if (hasProgress) {
            // 有进度：显示"继续游戏"和"重新游戏"按钮
            const continueBtn = this.createHomeButton('继续游戏', 50);
            this.setupButtonClick(continueBtn, 'onContinueGame');
            
            const restartBtn = this.createHomeButton('重新游戏', -80);
            this.setupButtonClick(restartBtn, 'onStartNewGame');
        } else {
            // 无进度：显示"开始游戏"按钮
            const startBtn = this.createHomeButton('开始游戏', 0);
            this.setupButtonClick(startBtn, 'onStartNewGame');
        }
        
        console.log('=== 首页构建完成 ===');
    }
    
    private checkHasProgress(): boolean {
        try {
            const saved = localStorage.getItem('blockPuzzleState');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.blocks && parsed.blocks.length > 0 && !parsed.gameOver;
            }
        } catch (e) {
            console.error('检查存档失败:', e);
        }
        return false;
    }
    
    private createHomeButton(text: string, yPos: number): Node {
        const btn = this.createNode(text + 'Button', this.homePage);
        const btnUIT = btn.addComponent(UITransform);
        const btnWidth = 200;
        const btnHeight = 60;
        btnUIT.setContentSize(btnWidth, btnHeight);
        btn.position = new Vec3(0, yPos, 0);
        
        // 按钮背景
        const btnGraphics = btn.addComponent(Graphics);
        btnGraphics.fillColor = new Color(74, 108, 247, 255);
        btnGraphics.roundRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 30);
        btnGraphics.fill();
        btnGraphics.markForUpdateRenderData();
        
        // 按钮文字
        const label = this.createLabel(text, btn);
        const labelComp = label.getComponent(Label);
        labelComp.fontSize = 24;
        labelComp.color = new Color(255, 255, 255, 255);
        
        btn.addComponent(Button);
        return btn;
    }
}
