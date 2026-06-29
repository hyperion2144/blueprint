# 临时 Change

## 创建

```bash
specwf change new <change-name>
```

CLI 自动创建目录结构并生成模板文件。

## 上下文

```bash
specwf context adhoc
specwf state
```

## 推进

完成 proposal 后：

```bash
specwf continue change <change-name>
```

`continue change <name>` 会读取该 change 的当前状态（proposal/planning/applying/reviewing/verifying/archived），输出下一步建议和 slash command。

## 查看状态

```bash
specwf continue change <change-name>
```

## 归档

```bash
specwf archive specwf/changes/<change-name>
```
