# 发布到 GitHub Pages（让网址能在手机上打开）

目标：把 `personal-homepage` 里的文件传上 GitHub，得到一个公网网址，例如
`https://你的用户名.github.io/chifan-homepage/`

> 这台电脑**没有装 git 命令**，所以下面走**网页拖拽上传**路线，全程点鼠标，不需要命令行。
> （以后想让更新更省事，可以再装 Git for Windows，见文末。）

---

## 准备：先看清要传哪些东西

打开项目文件夹 `personal-homepage`，里面应该有：

```
index.html          ← 首页（星空导航）
about.html          ← 关于我
projects.html       ← 项目
twin.html           ← 数字分身
feedback.html       ← 反馈意见
contact.html        ← 联系
admin.html          ← 反馈后台（有口令保护，别写进导航）
assets/             ← 必须有！app.js + style.css
docs/               ← 说明文档（可选，传了也没关系）
```

**最容易踩的坑：只传了 HTML，忘了 `assets/` 文件夹**，结果网页打开是一堆没有样式的黑字。

---

## 第一步：注册 GitHub

1. 打开 https://github.com/signup
2. 邮箱 → 密码 → 用户名（用户名会出现在网址里，起个像样的，比如 `haohaochifan`）→ 验证邮箱。
3. 用户名**全是小写英文数字和连字符**，别用中文。

## 第二步：新建仓库（Repository）

1. 登录后点右上角 **+** → **New repository**。
2. **Repository name** 填 `chifan-homepage`（只能用英文数字和 `-`）。
3. **Description** 随便写，比如 `我的个人主页`.
4. 选 **Public**（私有仓库的 Pages 要付费，**必须选 Public**）。
5. 不用勾 "Add a README file"，直接点绿色 **Create repository**。

## 第三步：上传文件

1. 新仓库页面中间有一句 *uploading an existing file*，点它。（或点 **Add file** → **Upload files**）
2. 打开电脑上的 `personal-homepage` 文件夹，**全选里面的内容**（`Ctrl+A`）：
   - 6 个 html + `admin.html` + `assets` 文件夹 + `docs` 文件夹
3. 把它们**拖进浏览器页面的虚线区域**。
   - 拖文件夹是支持的（Chrome / Edge 都行）。拖完页面上应该能看到 `assets/app.js`、`assets/style.css` 这两个文件在里面。
4. 等进度条走完（几十秒）。
5. 下面 **Commit changes** 的输入框里写一句，比如 `first upload`，点绿色 **Commit changes**。

> 上传后确认：仓库首页应该直接列出 `index.html`、`assets` 等，**不应该**出现一个叫 `personal-homepage` 的文件夹套在外面。
> 如果出现了文件夹套层（点进两层才看到 index.html），Pages 会 404，需要重新上传。

## 第四步：打开 Pages

1. 仓库页面上方点 **Settings**。
2. 左侧栏找到 **Pages**。
3. **Source** 选 **Deploy from a branch**。
4. **Branch** 选 `main`，右边文件夹选 `/ (root)`，点 **Save**。
5. 回到 **Actions** 标签页，会看到一个部署中的任务；等它变绿（约 1 分钟）。

## 第五步：拿到网址

回到 **Settings → Pages**，顶部会出现：

```
Your site is live at https://你的用户名.github.io/chifan-homepage/
```

点开它。第一次打开可能要等 1–2 分钟，如果 404 就刷新几次。

**注意**：网址末尾是仓库名 `chifan-homepage`，**不要**漏掉。

---

## 发布后要自己检查的 4 件事

| 检查项 | 怎么查 | 期望 |
|---|---|---|
| 样式正常 | 打开首页 | 有深色星空、字体、动画；不是黑底白字裸网页 |
| 页面能互相跳 | 首页点「技能」「项目」等星空节点 | 整页跳转到对应页，顶栏高亮跟着变 |
| 反馈真的存下来了 | 手机打开网址 → 反馈页留言 → 你的 `admin.html` 里能看到 | 后台「数据来源」显示 **云端 Supabase** |
| 后台有门 | 打开 `https://你的用户名.github.io/chifan-homepage/admin.html` | 先要口令，输错进不去 |

把 `feedback.html` 的网址（或者首页网址）发给 3–5 个朋友或同学，让他们写一条真实反馈，作业素材就有了。

---

## 以后要改内容怎么办

网页版改文件（小改动最快）：

1. 仓库里点进要改的文件（比如 `feedback.html`）。
2. 点右上铅笔图标 ✏️ → 改 → 下面 **Commit changes**。
3. 等 1 分钟，刷新网址即可看到。

换整个文件（推荐，改本地再上传）：

1. 本地编辑好 `personal-homepage` 里的文件。
2. 仓库 → **Add file** → **Upload files** → 把改过的文件拖进去（同名会覆盖）。
3. **Commit changes**。

---

## 三条安全红线

1. **绝对不要把 `service_role` / secret key 写进任何前端文件**。`assets/app.js` 里只允许出现 `anon public` key——它本来就是公开的，权限由 Supabase 的 RLS 策略控制。
2. `admin.html` 的口令只是「页面门帘」，不是真加密。**不要在后台放身份证、手机号等敏感信息**。
3. 仓库选 **Public** 意味着**所有文件都能被下载**（包括 `docs/` 和 `admin.html`）。别把含个人隐私的草稿、密码本传上去。

---

## 附：以后装 Git 让更新更省事（可选）

如果之后想用命令一键更新：

1. 装 **Git for Windows**：https://git-scm.com/download/win （一路 Next）。
2. 在 `personal-homepage` 文件夹里右键 → **Open Git Bash here**：

```bash
git init
git add .
git commit -m "update"
git branch -M main
git remote add origin https://github.com/你的用户名/chifan-homepage.git
git push -u origin main
```

第一次 push 会弹出登录窗口，用 GitHub 账号授权即可（不会输密码，走浏览器授权）。之后每次更新只要三行：

```bash
git add .
git commit -m "改了点什么"
git push
```

**相关文件**：`docs/supabase-setup.md`（后端配置）、`docs/version-log.md`（版本记录）
