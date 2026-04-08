# Paper-to-Code-Generator

## 愿景
扔进去一篇 arXiv 论文 PDF，AI 生成可运行的代码。

## 技术栈
Python + Claude PDF + PyTorch

## 死亡笔记
AI 读取了论文，输出了 2000 行代码，变量命名优雅，注释详尽，import 顺序完美。运行：23 个报错，12 个 undefined，7 个 import 失败。仔细看注释才发现——AI 写的不是"这个函数做什么"，而是"这个函数应该做什么"。它把论文里的"假设"当"实现"，把"未来工作"当"当前 API"。

## 墓志铭
论文读得懂，代码跑不通，中间卡着的是一个宇宙。

## 来源
[原始仓库](https://github.com/) | [原始 Issue](#)
