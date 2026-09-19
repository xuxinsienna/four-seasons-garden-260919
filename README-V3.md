# 森间 · 四季庭院 V3

从 four-seasons-v2 独立复制；V2 源文件与源码包保留。页面不显示版本号。

## 本次变化
- 侧墙、木护墙和收边缩进前后角柱，端面错开，去除重叠面引起的屋脚闪烁。
- 底部控制使用暖白字、浅金选中态与薄深色底，白天草地和冬季雪地上均保持清晰。
- 屋顶积雪采用单个程序化曲面：屋脊厚、雪面起伏、边缘圆润，前后屋檐有不规则滑落缺口露出瓦片。

## 运行
Node.js 22.13+，`npm ci`，`npm run dev`；本版本预览 http://localhost:5175/，V2 保留在 5174。
本机复用 V2 已安装的依赖目录；源码包不包含依赖，解压后正常安装即可。

## 在线访问
GitHub Pages 使用 npm run build:github 生成静态网页。推送到 main 分支后，GitHub Actions 会自动发布到：
https://xuxinsienna.github.io/four-seasons-garden-260919/

## 文件
- app/garden-v3.ts：庭院与房屋几何。
- app/snow-v3.ts：屋顶积雪曲面与不规则雪沿。
- app/globals-v3.css：界面颜色和控制面板。
- app/page-v3.tsx、details-v3.ts、forms-v3.ts、layout-v3.ts、interactions-v3.ts：保留的四季庭院和交互。

## 检查
`npm run typecheck`、`npm run build`、`node --test tests/*.test.mjs`。
本机 npm 包装器路径异常时，使用系统 npm-cli.js 执行构建脚本。
本轮没有浏览器视觉或真机性能验收；自动检查验证雪层距瓦面净空、雪脊厚度和雪沿起伏，并保留已有交互测试。
