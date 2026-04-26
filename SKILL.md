---
name: "cocos-tutorial-avoid-pitfalls"
description: "Cocos Creator 新手引导系统开发避坑指南。涵盖多镂空遮罩、坐标转换、Tween生命周期、节点有效性检查等关键技术坑位。Invoke when developing tutorial/overlay systems in Cocos Creator or implementing mask/highlight features."
---

# Cocos Creator 新手引导系统开发避坑指南

基于实际项目反向推导的关键技术坑位及解决方案。

---

## 坑位一：多镂空遮罩的扫描线算法

### 问题场景
需要在半透明遮罩层上同时镂空多个区域（如：高亮目标方块 + 高亮目标槽位），且镂空区域可能重叠或相邻。

### 错误做法
```typescript
// 错误：直接绘制多个矩形，会产生重叠区域问题
for (const cutout of cutouts) {
    g.rect(cutout.x - cutout.w/2, cutout.y - cutout.h/2, cutout.w, cutout.h);
}
g.fill(); // 无法正确处理镂空
```

### 正确做法：扫描线算法
```typescript
private drawMaskWithCutouts(cutouts: CutoutRect[]): void {
    if (!this.maskGraphics) return;
    const g = this.maskGraphics;
    g.clear();

    // 1. 收集所有 Y 坐标边界
    const yCoords: number[] = [-1000, 1000];
    for (const c of cutouts) {
        yCoords.push(c.y - c.h / 2);
        yCoords.push(c.y + c.h / 2);
    }
    yCoords.sort((a, b) => a - b);

    // 2. 逐行扫描绘制
    for (let i = 0; i < yCoords.length - 1; i++) {
        const stripBottom = yCoords[i];
        const stripTop = yCoords[i + 1];
        const stripHeight = stripTop - stripBottom;
        if (stripHeight <= 0) continue;

        // 3. 找出当前行与哪些镂空区域重叠
        const overlapping = cutouts.filter(c =>
            c.y - c.h / 2 < stripTop && c.y + c.h / 2 > stripBottom
        );

        if (overlapping.length === 0) {
            // 无重叠：绘制完整行
            g.rect(-1000, stripBottom, 2000, stripHeight);
            g.fill();
        } else {
            // 有重叠：绘制镂空区域两侧
            overlapping.sort((a, b) => (a.x - a.w / 2) - (b.x - b.w / 2));
            
            // 左侧
            const firstLeft = overlapping[0].x - overlapping[0].w / 2;
            if (firstLeft > -1000) {
                g.rect(-1000, stripBottom, firstLeft + 1000, stripHeight);
                g.fill();
            }
            
            // 中间间隙
            for (let j = 0; j < overlapping.length - 1; j++) {
                const currRight = overlapping[j].x + overlapping[j].w / 2;
                const nextLeft = overlapping[j + 1].x - overlapping[j + 1].w / 2;
                if (nextLeft > currRight) {
                    g.rect(currRight, stripBottom, nextLeft - currRight, stripHeight);
                    g.fill();
                }
            }
            
            // 右侧
            const lastRight = overlapping[overlapping.length - 1].x + overlapping[overlapping.length - 1].w / 2;
            if (lastRight < 1000) {
                g.rect(lastRight, stripBottom, 1000 - lastRight, stripHeight);
                g.fill();
            }
        }
    }
}
```

### 核心要点
1. **Y 坐标排序**：将所有镂空区域的上下边界收集并排序
2. **逐行处理**：将复杂的多边形问题简化为多段水平线
3. **间隙填充**：只绘制镂空区域之间的间隙，而非镂空区域本身

---

## 坑位二：圆角矩形绘制

### 问题场景
Graphics 组件没有 `roundRect` 的填充版本，只有描边版本 `roundRect(x, y, w, h, r)`。

### 解决方案：手动绘制四个圆角
```typescript
private drawRoundedRect(g: Graphics, x: number, y: number, w: number, h: number, r: number): void {
    const L = x - w / 2;
    const R = x + w / 2;
    const T = y + h / 2;
    const B = y - h / 2;

    g.fillColor = new Color(0, 0, 0, 160);

    // 左下角
    g.moveTo(L, B);
    g.lineTo(L + r, B);
    g.arc(L + r, B + r, r, Math.PI * 1.5, Math.PI, false);
    g.lineTo(L, B);
    g.close();
    g.fill();

    // 右下角
    g.moveTo(R, B);
    g.lineTo(R, B + r);
    g.arc(R - r, B + r, r, 0, Math.PI * 1.5, false);
    g.lineTo(R - r, B);
    g.lineTo(R, B);
    g.close();
    g.fill();

    // 左上角
    g.moveTo(L, T);
    g.lineTo(L, T - r);
    g.arc(L + r, T - r, r, Math.PI, Math.PI * 0.5, false);
    g.lineTo(L + r, T);
    g.lineTo(L, T);
    g.close();
    g.fill();

    // 右上角
    g.moveTo(R, T);
    g.lineTo(R - r, T);
    g.arc(R - r, T - r, r, Math.PI * 0.5, 0, false);
    g.lineTo(R, T - r);
    g.lineTo(R, T);
    g.close();
    g.fill();
}
```

### 核心要点
1. **角度方向**：`arc(x, y, radius, startAngle, endAngle, anticlockwise)`
2. **角度单位**：使用弧度，`Math.PI` = 180°
3. **绘制顺序**：从角的一边 → 圆弧 → 角的另一边 → 闭合 → 填充

---

## 坑位三：世界坐标到局部坐标转换

### 问题场景
目标节点和遮罩层位于不同的父节点层级，需要将目标的世界坐标转换为遮罩层的局部坐标。

### 错误做法
```typescript
// 错误：直接使用世界坐标
this.textNode.setPosition(blockNode.getWorldPosition());
```

### 正确做法
```typescript
private updateTextPosition(blockNode: Node): void {
    if (!this.textNode || !this.parentNode) return;

    const parentUIT = this.parentNode.getComponent(UITransform);
    if (!parentUIT) return;

    // 1. 获取世界坐标
    const wp = blockNode.getWorldPosition();
    
    // 2. 转换为父节点的局部坐标
    const lp = new Vec3();
    parentUIT.convertToNodeSpaceAR(wp, lp);

    // 3. 使用局部坐标设置位置
    this.textNode.setPosition(new Vec3(lp.x, lp.y + 80, 0));
}
```

### 核心要点
1. **convertToNodeSpaceAR**：将世界坐标转换为相对于锚点的局部坐标
2. **锚点影响**：锚点在中心时，局部坐标 (0, 0) 表示节点中心
3. **必须获取 UITransform**：坐标转换需要 UITransform 组件

---

## 坑位四：Tween 动画生命周期管理

### 问题场景
循环动画（如手指指引动画）在节点销毁时未正确停止，导致内存泄漏或报错。

### 错误做法
```typescript
// 错误：没有保存 Tween 引用，无法停止
tween(this.handNode)
    .to(0.6, { position: end })
    .to(0.6, { position: start })
    .call(() => { /* 循环 */ })
    .start();
```

### 正确做法
```typescript
export class TutorialManager {
    private handTween: Tween<Node> | null = null; // 保存引用

    private runHandCycle(start: Vec3, end: Vec3): void {
        if (!this.handNode) return;

        this.handTween = tween(this.handNode)
            .to(0.6, { position: end })
            .to(0.6, { position: start })
            .call(() => {
                if (this.handNode && this.handNode.active) {
                    this.runHandCycle(start, end);
                }
            })
            .start();
    }

    private stopHand(): void {
        // 销毁前必须停止 Tween
        if (this.handTween) {
            this.handTween.stop();
            this.handTween = null;
        }
        if (this.handNode) {
            this.handNode.active = false;
        }
    }

    private destroyOverlay(): void {
        this.stopHand(); // 先停止动画
        
        if (this.overlayNode && this.overlayNode.isValid) {
            this.overlayNode.destroy();
        }
        // 清空引用
        this.overlayNode = null;
        this.handNode = null;
    }
}
```

### 核心要点
1. **保存 Tween 引用**：必须保存 `Tween<Node>` 类型的引用
2. **销毁前停止**：在节点销毁或禁用前调用 `tween.stop()`
3. **清空引用**：停止后将引用设为 null

---

## 坑位五：节点有效性检查

### 问题场景
异步回调中访问已销毁的节点，导致报错。

### 错误做法
```typescript
// 错误：没有检查节点有效性
setTimeout(() => {
    this.overlayNode.destroy(); // 可能已销毁
}, 1000);
```

### 正确做法
```typescript
// 正确：检查 isValid
if (blockNode && blockNode.isValid) {
    const bUIT = blockNode.getComponent(UITransform);
    // ...
}

// 在 Tween 回调中检查
tween(this.successNode)
    .delay(1.5)
    .call(() => {
        if (this.overlayNode && this.overlayNode.isValid) {
            this.finishTutorial();
        }
    })
    .start();
```

### 核心要点
1. **isValid 属性**：检查节点是否已被销毁
2. **异步回调必检**：所有 setTimeout、Tween 回调中都要检查
3. **双重检查**：先检查引用非空，再检查 isValid

---

## 坑位六：Graphics 组件使用规范

### 问题场景
Graphics 绘制混乱，颜色错乱，路径残留。

### 正确流程
```typescript
private drawBorders(): void {
    if (!this.borderGraphics) return;
    const g = this.borderGraphics;
    
    // 1. 清除之前的绘制
    g.clear();
    
    // 2. 设置样式
    g.strokeColor = new Color(255, 200, 50, 255);
    g.lineWidth = 4;
    
    // 3. 绘制路径
    g.roundRect(x, y, w, h, 10);
    
    // 4. 执行描边或填充
    g.stroke();
}
```

### 常见错误
```typescript
// 错误 1：忘记 clear()
g.rect(0, 0, 100, 100);
g.fill();
// 下次调用时之前的路径还在
g.rect(50, 50, 100, 100);
g.fill(); // 会绘制两个矩形

// 错误 2：fill 和 stroke 混用
g.fillColor = new Color(255, 0, 0);
g.rect(0, 0, 100, 100);
g.stroke(); // 应该用 fill()，但用了 stroke()

// 错误 3：颜色设置时机错误
g.rect(0, 0, 100, 100);
g.fillColor = new Color(255, 0, 0); // 太晚了
g.fill();
```

### 核心要点
1. **先 clear()**：每次绘制前必须清除
2. **样式先行**：先设置颜色/线宽，再绘制路径
3. **fill vs stroke**：填充用 `fill()`，描边用 `stroke()`
4. **roundRect 只能描边**：需要填充圆角矩形需手动绘制

---

## 坑位七：回调函数管理

### 问题场景
回调函数未正确清理，导致重复调用或内存泄漏。

### 正确做法
```typescript
export class TutorialManager {
    private onStepChanged: ((step: TutorialStep) => void) | null = null;
    private onTutorialDone: (() => void) | null = null;

    // 设置回调
    public setOnStepChanged(cb: (step: TutorialStep) => void): void {
        this.onStepChanged = cb;
    }

    public setOnTutorialDone(cb: () => void): void {
        this.onTutorialDone = cb;
    }

    // 触发回调时检查
    private finishTutorial(): void {
        sys.localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
        this.currentStep = TutorialStep.FINISHED;
        this.destroyOverlay();

        if (this.onTutorialDone) {
            this.onTutorialDone();
        }
    }

    // 清理时重置回调
    public forceComplete(): void {
        this.onStepChanged = null;
        this.onTutorialDone = null;
        this.finishTutorial();
    }
}
```

### 核心要点
1. **类型声明**：使用 `(() => void) | null` 类型
2. **触发前检查**：`if (this.callback) this.callback()`
3. **清理时重置**：将回调设为 null

---

## 快速检查清单

开发新手引导系统时，按此清单检查：

- [ ] **遮罩镂空**：是否使用扫描线算法处理多个镂空区域？
- [ ] **坐标转换**：是否使用 `convertToNodeSpaceAR` 转换世界坐标？
- [ ] **Tween 管理**：是否保存 Tween 引用并在销毁前停止？
- [ ] **节点有效性**：异步回调中是否检查 `isValid`？
- [ ] **Graphics 流程**：是否遵循 `clear → 设置样式 → 绘制路径 → fill/stroke`？
- [ ] **回调清理**：是否在销毁时清理回调引用？

---

## 相关代码参考

完整实现见：[TutorialManager.ts](file:///Users/jane/Desktop/new_game/assets/scripts/TutorialManager.ts)

关键方法：
- `drawMaskWithCutouts()` - 扫描线算法实现
- `drawBorders()` - 圆角矩形描边
- `startHandLoop()` / `stopHand()` - Tween 生命周期管理
- `calcCutouts()` - 坐标转换示例
