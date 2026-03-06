#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
同步炼化公式数据：从Markdown文件提取纯文本内容到txt和ts文件
过滤Markdown格式符号，保留纯内容
"""

import re
import json
from pathlib import Path

def strip_markdown_formatting(text):
    """
    去除Markdown格式符号，保留纯文本内容
    
    处理：
    - 标题符号：## 和 ### 等
    - 列表符号：- 开头
    - 引用符号：> 开头
    - 加粗符号：**text**
    - 斜体符号：*text* 或 _text_
    - 行内代码：`code`
    """
    lines = []
    for line in text.split('\n'):
        original_line = line
        
        # 去除标题符号 (## 或 ###)
        line = re.sub(r'^#+\s+', '', line)
        
        # 去除列表符号 (- 开头)
        line = re.sub(r'^-\s+', '', line)
        
        # 去除引用符号 (> 开头)
        line = re.sub(r'^>\s+', '', line)
        
        # 去除加粗符号 (**text**)
        line = re.sub(r'\*\*(.+?)\*\*', r'\1', line)
        
        # 去除斜体符号 (*text* 或 _text_)，但要避免影响公式中的乘号
        # 只处理成对的且中间有文字的情况
        line = re.sub(r'(?<!\w)\*([^\*]+?)\*(?!\w)', r'\1', line)
        line = re.sub(r'(?<!\w)_([^_]+?)_(?!\w)', r'\1', line)
        
        # 去除行内代码符号 (`code`)
        line = re.sub(r'`(.+?)`', r'\1', line)
        
        lines.append(line)
    
    return '\n'.join(lines)

def sync_formulas():
    """主同步函数"""
    # 定义路径
    project_root = Path(__file__).parent.parent
    md_file = project_root / 'docs' / '西方世界的劫难3炼化公式.md'
    txt_file = project_root / 'src' / 'data' / 'formulas.txt'
    ts_file = project_root / 'src' / 'data' / 'formulas.ts'
    
    # 检查源文件是否存在
    if not md_file.exists():
        print(f'错误: 源文件不存在 - {md_file}')
        return False
    
    # 读取Markdown文件
    print(f'读取源文件: {md_file}')
    with open(md_file, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # 去除Markdown格式符号
    print('处理Markdown格式...')
    plain_content = strip_markdown_formatting(md_content)
    
    # 写入txt文件
    print(f'写入txt文件: {txt_file}')
    txt_file.parent.mkdir(parents=True, exist_ok=True)
    with open(txt_file, 'w', encoding='utf-8') as f:
        f.write(plain_content)
    
    # 生成ts文件（JSON编码）
    print(f'生成ts文件: {ts_file}')
    # 将内容转换为JSON字符串（会自动转义特殊字符）
    json_content = json.dumps(plain_content, ensure_ascii=False)
    ts_content = f'// 此文件由 scripts/sync_formulas.py 自动生成\n'
    ts_content += f'// 请勿手动编辑，修改请编辑 docs/西方世界的劫难3炼化公式.md\n\n'
    ts_content += f'export default {json_content}\n'
    
    with open(ts_file, 'w', encoding='utf-8') as f:
        f.write(ts_content)
    
    print('✓ 同步完成')
    print(f'  - 源文件: {md_file.name}')
    print(f'  - txt文件: {txt_file}')
    print(f'  - ts文件: {ts_file}')
    
    return True

if __name__ == '__main__':
    success = sync_formulas()
    exit(0 if success else 1)
