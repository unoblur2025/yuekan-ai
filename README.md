# 阅槛 AI

“阅槛”，亦是“越槛”：先读懂岗位门槛，再找到跨过门槛的具体路径。产品面向希望进入 AI 行业的学生和跨专业求职者，把复杂 JD 转换为可验证的门槛判断、个人能力差距和投递前行动建议。

## 核心功能

- 四步求职画像与技能熟练度记录
- 用户粘贴真实 JD 后进行服务端 AI 岗位分析
- 区分明确硬门槛、核心要求、企业偏好和普通加分项
- 输出适配度、能力雷达、技能差距、风险与 72 小时准备计划
- 在浏览器 LocalStorage 保存历史报告，并支持继续测试或重新开始
- 保留模拟案例、企业研究与面试准备入口

## 技术栈

- Next.js 15、React 19、TypeScript
- Tailwind CSS 4、Lucide React
- Next.js App Router 与服务端 Route Handler
- OpenAI 兼容的 `POST /chat/completions` 模型接口
- 浏览器 LocalStorage 历史记录

## 本地运行

建议使用 Node.js 20 或更高版本。

```bash
npm install
copy .env.local.example .env.local
npm run dev
```

打开 [http://127.0.0.1:3000](http://127.0.0.1:3000)。生产构建使用：

```bash
npm run lint
npm run build
npm run start
```

## 环境变量

只在本机 `.env.local` 中填写真实凭据。该文件已被 `.gitignore` 忽略，禁止提交到 Git。

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.siliconflow.cn/v1
OPENAI_MODEL=Qwen/Qwen3-8B
```

- `OPENAI_API_KEY`：模型服务商密钥，仅由服务端接口读取。
- `OPENAI_BASE_URL`：OpenAI 兼容 API 的基础地址。
- `OPENAI_MODEL`：服务商支持的模型 ID。

修改环境变量后需要重新启动开发服务器。不要把真实密钥写入代码、README、截图、日志或任何会提交的配置文件。

## 项目截图

项目截图统一放在 `docs/screenshots/`。提交截图前请确认画面中不包含 API Key、个人信息或其他敏感数据。

## 数据与安全说明

- 模型请求只从 Next.js 服务端接口发出，浏览器端不会读取 API Key。
- 用户画像、当前分析与历史记录保存在当前浏览器的 LocalStorage。
- `.env.local.example` 只包含占位密钥，可安全提交作为配置模板。
- 岗位分析结果用于求职决策参考，不构成录用保证。
