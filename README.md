# 数模备赛小站

软件开发综合实践的期末作品：把数学建模备赛期间的记录整理成一个可以翻看的静态网站。

## 运行方法

页面要读取本地 JSON 数据，不能直接双击 index.html 打开（file:// 协议下 fetch 读不到 data/ 里的文件，页面会显示加载失败）。

方式一（需要 Node.js）：在仓库目录下执行

    npx --yes http-server . -p 8126

然后浏览器访问 http://127.0.0.1:8126/ 。

方式二：用 VS Code 的 Live Server 插件，右键 index.html - Open with Live Server。

## 目录说明

    ├── index.html          首页：站点介绍 + 四个功能入口卡片 + 技术说明
    ├── prep.html           我的准备：数据看板（三张卡片 + 三个图表）+ 筛选查询 + 备赛明细表
    ├── notes.html          我的心得：经验卡、七阶段用法与参考链接
    ├── sandbox.html        三维沙盘：A-Frame 六边形扫描场景（iframe 嵌入）
    ├── survey.html         问卷：表单校验 + 本地保存 + 已填记录列表（可删除单条或清空）
    ├── css/style.css       自定义样式
    ├── js/dashboard.js     看板逻辑：加载 JSON、画三张图、筛选与联动
    ├── js/survey.js        问卷逻辑：表单校验、localStorage 保存、记录列表与删除
    ├── data/prep.json      备赛实际数据（7-8 月，自编示例）
    ├── data/plan.json      备赛计划数据（自编示例）
    ├── libs/               第三方库（本地引入，无需联网）
    └── three-d/scene.html  三维沙盘场景（A-Frame）

## 数据与资源来源

- 数据：data/prep.json、data/plan.json 均为自编示例数据；
- Bootstrap 5.3.3（MIT License）- https://getbootstrap.com
- jQuery 3.7.1（MIT License）- https://jquery.com
- ECharts 5.5.0（Apache License 2.0）- https://echarts.apache.org
- Chart.js 4.4.1（MIT License）- https://www.chartjs.org
- A-Frame 1.7.0（MIT License）- https://aframe.io

以上库均为官网下载后放在 libs/ 目录本地引入。
