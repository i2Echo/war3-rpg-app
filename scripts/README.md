# 数据同步脚本

## 概述

`sync_formulas.py` 脚本用于自动同步炼化公式数据，从Markdown源文件提取纯文本内容到应用程序数据文件。

## 工作流程

```
docs/西方世界的劫难3炼化公式.md
         ↓
    [sync_formulas.py]
         ↓
    ├─ src/data/formulas.txt (纯文本)
    └─ src/data/formulas.ts (TypeScript模块)
```

## 处理内容

脚本会自动过滤以下Markdown格式符号：

- `##` `###` - 标题符号
- `-` - 列表符号
- `>` - 引用符号
- `**text**` - 加粗符号
- `*text*` `_text_` - 斜体符号
- `` `code` `` - 行内代码符号

**保留内容**：

- 所有文本内容
- 特殊装备标记：`(唯一)` `(卷轴合成)` `(一次)`
- 炼化公式格式
- 所有说明和注释

## 使用方法

### 基本用法

```bash
# 在项目根目录运行
python scripts/sync_formulas.py
```

### 完整工作流程

1. 编辑源文件：
   ```bash
   # 修改 docs/西方世界的劫难3炼化公式.md
   ```

2. 运行同步脚本：
   ```bash
   python scripts/sync_formulas.py
   ```

3. 验证生成的文件：
   ```bash
   # 检查 formulas.txt 和 formulas.ts 是否正确生成
   ```

4. 构建项目：
   ```bash
   npm run build
   ```

5. 提交更改：
   ```bash
   git add .
   git commit -m "更新炼化公式数据"
   ```

## 输出文件

### formulas.txt

- 纯文本格式
- 无Markdown格式符号
- 用于调试和人工阅读

### formulas.ts

- TypeScript模块
- JSON编码字符串
- 用于应用程序导入
- 包含自动生成注释

## 注意事项

⚠️ **重要**：

1. **不要手动编辑** `formulas.txt` 或 `formulas.ts`
2. **所有修改** 都应在 `docs/西方世界的劫难3炼化公式.md` 中进行
3. 修改后 **必须运行** `sync_formulas.py` 来更新数据文件
4. 更新后 **应该验证** 构建是否成功

## 故障排除

### 脚本执行失败

```bash
# 确保Python环境正确
python --version  # 应该是 Python 3.x

# 确保在项目根目录
cd d:/My/projects/war3-rpg-app
python scripts/sync_formulas.py
```

### 数据格式问题

如果生成的数据有问题：

1. 检查源文件 `docs/西方世界的劫难3炼化公式.md` 格式
2. 确认Markdown格式符号使用正确
3. 重新运行同步脚本
4. 检查git diff查看更改内容

### 构建错误

```bash
# 清理并重新构建
npm run build

# 检查错误信息
# 如果是数据格式问题，检查formulas.ts内容
```

## 版本历史

- **v1.0** (2026-03-06)
  - 初始版本
  - 支持Markdown格式符号过滤
  - 自动生成txt和ts文件
  - 保留特殊装备标记
