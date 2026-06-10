-- =============================================================================
-- 记账喵 CountCat - 建库脚本
-- 适用：MySQL 9.7.0
-- 字符集：utf8mb4 / utf8mb4_0900_ai_ci
-- =============================================================================

-- 1. 删除已存在的同名库（开发环境用，生产请注释掉）
DROP DATABASE IF EXISTS countcat;

-- 2. 创建数据库
CREATE DATABASE countcat
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_0900_ai_ci;

-- 3. 切换到目标库
USE countcat;

-- 4. 设置会话字符集（可选，每个连接握手时也会自动设置）
SET NAMES utf8mb4;
