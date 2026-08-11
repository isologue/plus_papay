# 后台 API 接口说明

本项目已移除用户侧兑换页面及相关接口。服务启动后访问 `http://localhost:3000/` 会自动跳转到后台管理页面 `/admin`。

## 认证

1. 调用 `POST /api/admin/login`，请求体：

```json
{ "password": "管理员密码" }
```

2. 认证成功后，后续接口在请求头中携带：

```text
Authorization: Bearer <token>
```

可使用 `GET /api/admin/session` 查询当前登录状态。

## 主要后台接口

| 用途 | Method + Path |
| --- | --- |
| 后台登录 | `POST /api/admin/login` |
| 管理数据总览 | `GET /api/admin/data` |
| 保存系统配置 | `POST /api/admin/config` |
| 修改管理员密码 | `POST /api/admin/change-password` |
| 获取运行日志 | `GET /api/admin/runtime-logs` |
| 清空运行日志 | `POST /api/admin/runtime-logs/clear` |
| 批量生成成品号 | `POST /api/admin/products/generate` |
| 停止成品号生成 | `POST /api/admin/products/generate-stop` |
| 恢复可继续的生成任务 | `POST /api/admin/products/resume` |
| 查询、导出、删除成品号 | `/api/admin/products` 及其子路径 |
| 获取/导入/删除邮箱池 | `/api/admin/pool-emails` 及其子路径 |
| 获取/生成免费号池 | `/api/admin/free-accounts` 及其子路径 |
| 删除任务记录 | `DELETE /api/admin/task-logs/:jobKey` 或 `POST /api/admin/task-logs/bulk-delete` |
| 代理连通性测试 | `POST /api/admin/proxy/test` |

除登录与会话状态接口外，以上接口均需要管理员认证。

## 示例

```bash
curl -X POST http://localhost:3000/api/admin/login   -H "Content-Type: application/json"   -d '{"password":"your-admin-password"}'

curl http://localhost:3000/api/admin/data   -H "Authorization: Bearer <token>"
```
