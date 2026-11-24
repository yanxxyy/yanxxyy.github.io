# 闫星阳 · 在线简历

这是一个无需构建工具的静态网站，可直接部署到 GitHub Pages。

在线地址：<https://yanxxyy.github.io/>

## 本地预览

直接用浏览器打开 `index.html`，或在本目录运行：

```powershell
python -m http.server 8000
```

然后访问 `http://localhost:8000/`。页面右上角的“下载简历”按钮会直接下载 `assets/resume.pdf` 中的现成 PDF。

## 部署到 GitHub Pages

1. 在 GitHub 创建公开仓库，名称为 `<你的 GitHub 用户名>.github.io`。
2. 把本目录中的 `index.html`、`styles.css`、`gallery.js`、`research.js`、`sections.js` 和 `assets/` 上传到该仓库根目录，确保 `assets/resume.pdf` 也已上传。
3. 在仓库 `Settings → Pages → Build and deployment` 中选择 `Deploy from a branch`，分支选 `main`，目录选 `/ (root)`。
4. 保存后访问 `https://<你的 GitHub 用户名>.github.io/`。

更新简历文字时编辑 `index.html`；调整布局与颜色时编辑 `styles.css`。更新下载版本时，用新的 PDF 覆盖 `assets/resume.pdf`。提交并推送后，GitHub Pages 会重新发布。

论文图解通过左右按钮循环切换，逻辑在 `gallery.js` 中；点击当前图片可以查看原图。

页面采用整屏区块，科研卡片与论文图解分别占一屏。桌面端滚轮切换部分；较长的经历可以聚焦内容后用方向键阅读全文，也可以按住 Alt 滚动滚轮查看区块内的后续内容。页面和区块内的滚动条均不显示。连续滚轮输入由 `sections.js` 合并为一条可反向的滚动动画。

教育背景中的校徽和论文图解位于 `assets/`，上传网站时也要一并上传该目录。华北理工大学校徽取自[学校标识页面](https://www.ncst.edu.cn/col/1511504054082/index.html)；重庆财经学院校徽取自[大学志的学校标识资料](https://www.chinaschool.com.cn/i_region/i_22_chongqing/a_23/2024/zixun-2024.html)。论文图解使用简历作者提供的六张原图。

科研卡片中的树形图案为 Elsevier 出版社标识，素材取自 [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Elsevier.svg)，页面中的 Pattern Recognition 排版为本站设计，并非期刊官方 Logo。悬停、点击或键盘聚焦科研卡片可触发标识动画，动态效果会遵循系统“减少动画”设置。
日期下方的期刊封面使用简历作者提供的原图，保存在 `assets/pattern-recognition-cover.png`。

专业技能卡片使用保存在 `assets/` 的品牌 SVG，图形来自 [Simple Icons](https://simpleicons.org/)：Agent 为 LangGraph、RAG 为 LangChain、后训练为 Qwen 和 DeepSeek、大模型基础为 Hugging Face、大数据基础为 Apache Hadoop、后端开发为 Redis。Hadoop 图标使用黄色配色。卡片悬停和键盘聚焦时会触发 Logo 动画，并遵循系统“减少动画”设置。

顶部导航栏的奶蛙、奶龙表情分别来自[求表情网](https://www.qiubiaoqing.com/img_detail/894691767562011253.html)与[花瓣网](https://huaban.com/pins/5633558126/)，仅作静态装饰；网页使用裁切、去背景后的本地图片。

## 发布前核对

Lumi 技术栈和多步骤编排描述目前按照提供的简历原文展示。已检查的 TypeScript 后端仓库中没有 LangChain、LangGraph 或 Python 编排服务，当前 Agent 规划结果也只包含一个媒体执行步骤。如果这些能力存在于其他仓库或尚未合并的服务，请先核对；否则应修改相应表述。
