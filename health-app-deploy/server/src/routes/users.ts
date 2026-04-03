import express from 'express';
import multer from 'multer';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { S3Storage } from 'coze-coding-dev-sdk';
import * as Crypto from 'crypto';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB限制
});

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

/**
 * 生成密码盐值
 */
function generateSalt(): string {
  return Crypto.randomBytes(16).toString('hex');
}

/**
 * 密码加密（SHA256 + 盐值）
 */
function hashPassword(password: string, salt: string): string {
  return Crypto.createHash('sha256').update(password + salt).digest('hex');
}

/**
 * 账号密码注册
 * POST /api/v1/users/register
 * Body: { username: string, password: string, name?: string, height?: number, weight?: number }
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, height, weight } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '请输入账号和密码' });
    }

    // 统一处理用户名：去除前后空格
    const normalizedUsername = username.trim();
    console.log('[注册] 处理用户名:', { original: username, normalized: normalizedUsername });

    if (normalizedUsername.length < 4 || normalizedUsername.length > 12) {
      return res.status(400).json({ error: '账号长度需要4-12个字符' });
    }

    if (password.length < 6 || password.length > 20) {
      return res.status(400).json({ error: '密码长度需要6-20个字符' });
    }

    // 验证账号格式（只允许字母数字下划线）
    if (!/^[a-zA-Z0-9_]+$/.test(normalizedUsername)) {
      return res.status(400).json({ error: '账号只能包含字母、数字和下划线' });
    }

    const client = getSupabaseClient();

    // 检查账号是否已存在（不区分大小写）
    const { data: existingUser } = await client
      .from('users')
      .select('id, username')
      .ilike('username', normalizedUsername)
      .single();

    console.log('[注册] 检查用户是否存在（不区分大小写）:', { existingUser });

    if (existingUser) {
      console.log('[注册] 用户名已存在:', normalizedUsername);
      return res.status(400).json({ error: '该账号已被注册' });
    }

    // 生成盐值并加密密码
    const salt = generateSalt();
    const hashedPassword = hashPassword(password, salt);

    // 创建用户 - 使用规范化后的用户名
    const displayName = name || normalizedUsername;
    const { data: user, error } = await client
      .from('users')
      .insert({
        username: normalizedUsername,
        password: hashedPassword,
        password_salt: salt, // 存储盐值
        name: displayName,
        height: height || null,
        weight: weight || null,
      })
      .select()
      .single();

    if (error) {
      console.error('注册失败:', error);
      return res.status(500).json({ error: '注册失败' });
    }

    // 新用户自动加入默认群组（群号3328）
    try {
      const DEFAULT_GROUP_NUMBER = '3328';
      const { data: defaultGroup } = await client
        .from('groups')
        .select('id')
        .eq('group_number', DEFAULT_GROUP_NUMBER)
        .single();

      if (defaultGroup) {
        await client
          .from('group_members')
          .insert({
            group_id: defaultGroup.id,
            user_id: user.id,
            role: 'member',
          });
        console.log(`[注册] 新用户 ${user.username} 已自动加入群组 ${DEFAULT_GROUP_NUMBER}`);
      } else {
        console.warn(`[注册] 默认群组 ${DEFAULT_GROUP_NUMBER} 不存在，跳过自动加入`);
      }
    } catch (joinError) {
      // 加入群组失败不影响注册流程，仅记录日志
      console.error('[注册] 自动加入群组失败:', joinError);
    }

    // 返回用户信息（不包含密码）
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatar_url,
        height: user.height,
        weight: user.weight,
      },
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 账号密码登录
 * POST /api/v1/users/login
 * Body: { username: string, password: string }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '请输入账号和密码' });
    }

    // 统一处理用户名：去除前后空格
    const normalizedUsername = username.trim();
    console.log('[登录] 查询用户名:', normalizedUsername);

    const client = getSupabaseClient();

    // 查找用户 - 使用不区分大小写的匹配
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .ilike('username', normalizedUsername)
      .single();

    console.log('[登录] 查询结果（不区分大小写）:', { user: user?.username, error: error?.message });

    if (error || !user) {
      console.log('[登录] 用户不存在:', normalizedUsername, error);
      return res.status(400).json({ error: '账号或密码错误' });
    }

    // 验证密码（支持新旧两种加密方式）
    let passwordValid = false;
    
    if (user.password_salt) {
      // 新方式：SHA256 + 盐值
      const hashedPassword = hashPassword(password, user.password_salt);
      passwordValid = user.password === hashedPassword;
    } else {
      // 旧方式：纯SHA256（兼容旧数据）
      const hashedPassword = Crypto.createHash('sha256').update(password).digest('hex');
      passwordValid = user.password === hashedPassword;
      
      // 如果旧密码验证成功，升级为新加密方式
      if (passwordValid) {
        const salt = generateSalt();
        const newHashedPassword = hashPassword(password, salt);
        await client
          .from('users')
          .update({ password: newHashedPassword, password_salt: salt })
          .eq('id', user.id);
        console.log('[登录] 密码已升级为加盐加密:', user.id);
      }
    }

    if (!passwordValid) {
      return res.status(400).json({ error: '账号或密码错误' });
    }

    // 获取用户加入的群组
    const { data: memberships } = await client
      .from('group_members')
      .select('group_id, role, groups(*)')
      .eq('user_id', user.id);

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatar_url,
        height: user.height,
        weight: user.weight,
        groups: memberships || [],
      },
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 修改密码
 * PUT /api/v1/users/password
 * Body: { oldPassword: string, newPassword: string }
 */
router.put('/password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: '请先登录' });
    }

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请输入旧密码和新密码' });
    }

    if (newPassword.length < 6 || newPassword.length > 20) {
      return res.status(400).json({ error: '新密码长度需要6-20个字符' });
    }

    const client = getSupabaseClient();

    // 获取用户信息
    const { data: user, error: userError } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 验证旧密码
    let passwordValid = false;
    if (user.password_salt) {
      const hashedOldPassword = hashPassword(oldPassword, user.password_salt);
      passwordValid = user.password === hashedOldPassword;
    } else {
      // 旧方式兼容
      const hashedOldPassword = Crypto.createHash('sha256').update(oldPassword).digest('hex');
      passwordValid = user.password === hashedOldPassword;
    }

    if (!passwordValid) {
      return res.status(400).json({ error: '旧密码错误' });
    }

    // 生成新盐值并加密新密码
    const newSalt = generateSalt();
    const hashedNewPassword = hashPassword(newPassword, newSalt);

    // 更新密码
    const { error: updateError } = await client
      .from('users')
      .update({ password: hashedNewPassword, password_salt: newSalt })
      .eq('id', userId);

    if (updateError) {
      console.error('修改密码失败:', updateError);
      return res.status(500).json({ error: '修改密码失败' });
    }

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 获取当前用户信息
 * GET /api/v1/users/me
 * Header: x-user-id 或 x-device-id
 */
router.get('/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const deviceId = req.headers['x-device-id'] as string;

    if (!userId && !deviceId) {
      return res.json({ success: true, data: null, isLoggedIn: false });
    }

    const client = getSupabaseClient();

    let user = null;

    if (userId) {
      const { data } = await client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      user = data;
    } else if (deviceId) {
      const { data } = await client
        .from('users')
        .select('*')
        .eq('device_id', deviceId)
        .single();
      user = data;
    }

    if (!user) {
      return res.json({ success: true, data: null, isLoggedIn: false });
    }

    // 获取用户加入的群组
    const { data: memberships } = await client
      .from('group_members')
      .select('group_id, role, groups(*)')
      .eq('user_id', user.id);

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatar_url,
        height: user.height,
        weight: user.weight,
        groups: memberships || [],
      },
      isLoggedIn: !!user.username,
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 更新用户信息
 * PUT /api/v1/users/profile
 * Body: { name?: string, height?: number, weight?: number }
 * Header: x-user-id
 */
router.put('/profile', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { name, height, weight } = req.body;

    if (!userId) {
      return res.status(401).json({ error: '请先登录' });
    }

    const client = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (height !== undefined) updateData.height = height;
    if (weight !== undefined) updateData.weight = weight;

    // 更新用户信息
    const { data: user, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('更新用户信息失败:', error);
      return res.status(500).json({ error: '更新失败' });
    }

    // 如果有身高体重数据变化，创建新的身体记录
    if (height !== undefined || weight !== undefined) {
      const { data: todayRecord } = await client
        .from('body_records')
        .select('*')
        .eq('user_id', String(userId))
        .eq('record_date', today)
        .single();

      if (todayRecord) {
        await client
          .from('body_records')
          .update({
            height: height !== undefined ? height : todayRecord.height,
            weight: weight !== undefined ? weight : todayRecord.weight,
          })
          .eq('id', todayRecord.id);
      } else {
        await client
          .from('body_records')
          .insert({
            user_id: String(userId),
            height: height !== undefined ? height : user.height,
            weight: weight !== undefined ? weight : user.weight,
            record_date: today,
          });
      }
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 更新用户身体数据
 * PUT /api/v1/users/body
 * Body: { height?: number, weight?: number }
 * Header: x-user-id 或 x-device-id
 */
router.put('/body', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const deviceId = req.headers['x-device-id'] as string;
    const { height, weight } = req.body;

    if (!userId && !deviceId) {
      return res.status(400).json({ error: '缺少用户标识' });
    }

    const client = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    let targetId = userId;

    // 如果只有设备ID，查找或创建用户
    if (!targetId && deviceId) {
      let { data: user } = await client
        .from('users')
        .select('*')
        .eq('device_id', deviceId)
        .single();

      if (!user) {
        // 创建临时用户
        const { data: newUser } = await client
          .from('users')
          .insert({
            device_id: deviceId,
            name: `用户${deviceId.slice(-4)}`,
          })
          .select()
          .single();
        user = newUser;
      }
      targetId = String(user.id);
    }

    // 更新用户身体数据
    const updateData: any = {};
    if (height !== undefined) updateData.height = height;
    if (weight !== undefined) updateData.weight = weight;

    if (Object.keys(updateData).length > 0) {
      await client
        .from('users')
        .update(updateData)
        .eq('id', targetId);
    }

    // 创建或更新今日身体记录
    const { data: todayRecord } = await client
      .from('body_records')
      .select('*')
      .eq('user_id', String(targetId))
      .eq('record_date', today)
      .single();

    if (todayRecord) {
      await client
        .from('body_records')
        .update({
          height: height !== undefined ? height : todayRecord.height,
          weight: weight !== undefined ? weight : todayRecord.weight,
        })
        .eq('id', todayRecord.id);
    } else {
      const { data: user } = await client
        .from('users')
        .select('*')
        .eq('id', targetId)
        .single();

      await client
        .from('body_records')
        .insert({
          user_id: String(targetId),
          height: height !== undefined ? height : user?.height,
          weight: weight !== undefined ? weight : user?.weight,
          record_date: today,
        });
    }

    // 返回更新后的用户数据
    const { data: updatedUser } = await client
      .from('users')
      .select('id, username, name, avatar_url, height, weight')
      .eq('id', targetId)
      .single();

    res.json({ 
      success: true, 
      data: {
        id: updatedUser?.id,
        username: updatedUser?.username,
        name: updatedUser?.name,
        avatarUrl: updatedUser?.avatar_url,
        height: updatedUser?.height,
        weight: updatedUser?.weight,
      }
    });
  } catch (error) {
    console.error('更新身体数据失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 获取身体数据历史
 * GET /api/v1/users/body-history
 * Header: x-user-id 或 x-device-id
 * 返回：6个月内的体重记录 + 5个固定节点信息
 */
router.get('/body-history', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const deviceId = req.headers['x-device-id'] as string;

    if (!userId && !deviceId) {
      return res.status(400).json({ error: '缺少用户标识' });
    }

    const client = getSupabaseClient();

    let targetUserId = userId;
    let userCreatedAt: string | null = null;
    
    // 获取用户信息和创建时间
    if (userId) {
      const { data: user } = await client
        .from('users')
        .select('id, created_at')
        .eq('id', userId)
        .single();
      targetUserId = userId;
      userCreatedAt = user?.created_at || null;
    } else if (deviceId) {
      const { data: user } = await client
        .from('users')
        .select('id, created_at')
        .eq('device_id', deviceId)
        .single();
      targetUserId = user?.id ? String(user.id) : deviceId;
      userCreatedAt = user?.created_at || null;
    }

    // 计算6个月的时间范围
    const today = new Date();
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const startDate = sixMonthsAgo.toISOString().split('T')[0];

    // 获取6个月内的体重记录
    const { data: records, error } = await client
      .from('body_records')
      .select('*')
      .eq('user_id', String(targetUserId))
      .gte('record_date', startDate)
      .order('record_date', { ascending: true });

    if (error) {
      console.error('获取身体数据历史失败:', error);
      return res.status(500).json({ error: '获取数据失败' });
    }

    // 计算5个固定节点（基于用户加入时间）
    let milestones: { label: string; date: string; dayOffset: number }[] = [];
    if (userCreatedAt) {
      const joinDate = new Date(userCreatedAt);
      milestones = [
        { label: '第1天', date: joinDate.toISOString().split('T')[0], dayOffset: 0 },
        { label: '第1月', date: new Date(joinDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], dayOffset: 30 },
        { label: '第3月', date: new Date(joinDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], dayOffset: 90 },
        { label: '第5月', date: new Date(joinDate.getTime() + 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], dayOffset: 150 },
        { label: '第6月', date: new Date(joinDate.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], dayOffset: 180 },
      ];
    }

    res.json({ 
      success: true, 
      data: {
        records: records || [],
        milestones,
        joinDate: userCreatedAt,
      }
    });
  } catch (error) {
    console.error('获取身体数据历史失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 上传头像
 * POST /api/v1/users/avatar
 * Body: file (FormData)
 * Header: x-user-id
 */
router.post('/avatar', upload.single('file'), async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: '请先登录' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '未收到文件' });
    }

    const { buffer, originalname, mimetype } = req.file;
    
    // 生成唯一文件名
    const fileName = `avatars/${userId}_${Date.now()}_${originalname}`;
    
    // 上传到对象存储
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: mimetype,
    });

    // 生成签名URL（长期有效）
    const url = await storage.generatePresignedUrl({
      key,
      expireTime: 86400 * 365, // 1年有效期
    });

    // 更新用户头像URL
    const client = getSupabaseClient();
    const { data: user, error } = await client
      .from('users')
      .update({ avatar_url: url })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('更新头像失败:', error);
      return res.status(500).json({ error: '更新头像失败' });
    }

    res.json({ 
      success: true, 
      data: { 
        avatarUrl: url,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          avatarUrl: user.avatar_url,
        }
      }
    });
  } catch (error) {
    console.error('上传头像失败:', error);
    res.status(500).json({ error: '上传头像失败' });
  }
});

export default router;
