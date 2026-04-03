import express from 'express';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import * as Crypto from 'crypto';
import ExcelJS from 'exceljs';
import archiver from 'archiver';
import https from 'https';
import http from 'http';

const router = express.Router();

// 缓存管理员密钥，避免频繁查询数据库
let cachedAdminKey: string | null = null;

// 从数据库获取管理员密钥
const getAdminKey = async (): Promise<string> => {
  if (cachedAdminKey) {
    return cachedAdminKey;
  }
  
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'admin_secret_key')
      .single();
    
    if (error || !data) {
      // 如果数据库中没有，使用环境变量或默认值
      return process.env.ADMIN_SECRET_KEY || '88888888';
    }
    
    cachedAdminKey = data.value;
    return data.value;
  } catch (error) {
    console.error('获取管理员密钥失败:', error);
    return process.env.ADMIN_SECRET_KEY || 'admin-secret-key-2024';
  }
};

// 设置管理员密钥
const setAdminKey = async (newKey: string): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key: 'admin_secret_key', value: newKey, updated_at: new Date().toISOString() });
    
    if (error) {
      console.error('保存管理员密钥失败:', error);
      return false;
    }
    
    cachedAdminKey = newKey;
    return true;
  } catch (error) {
    console.error('保存管理员密钥失败:', error);
    return false;
  }
};

// 异步验证中间件（从数据库加载密钥）
const verifyAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'] as string;
  const providedKey = req.headers['x-admin-key'] as string;
  
  // 支持两种验证方式：Authorization header 或 x-admin-key
  const key = authHeader?.replace('Bearer ', '') || providedKey;
  
  // 从数据库获取密钥
  const currentKey = await getAdminKey();
  
  if (key === currentKey) {
    return next();
  }
  
  return res.status(401).json({ error: '无权访问' });
};

/**
 * 管理员登录
 * POST /api/v1/admin/login
 * Body: { key: string }
 */
router.post('/login', async (req, res) => {
  const { key } = req.body;
  const currentKey = await getAdminKey();
  
  console.log('[Admin Login] 收到登录请求, key:', key, ', currentKey:', currentKey);
  
  if (key === currentKey) {
    res.json({ success: true, message: '登录成功' });
  } else {
    res.status(401).json({ error: '密钥错误' });
  }
});

/**
 * 获取所有用户列表
 * GET /api/v1/admin/users
 * Query: page?: number, limit?: number, search?: string
 */
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    const client = getSupabaseClient();

    let query = client
      .from('users')
      .select('id, username, name, avatar_url, height, weight, created_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 搜索功能
    if (search) {
      query = query.or(`username.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data: users, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('获取用户列表失败:', error);
      return res.status(500).json({ error: '获取用户列表失败' });
    }

    res.json({
      success: true,
      data: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 重置用户密码
 * POST /api/v1/admin/users/:userId/reset-password
 */
router.post('/users/:userId/reset-password', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const client = getSupabaseClient();

    // 生成6位随机密码
    const newPassword = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // 使用与注册相同的加盐加密方式
    const salt = Crypto.randomBytes(16).toString('hex');
    const hashedPassword = Crypto.createHash('sha256').update(newPassword + salt).digest('hex');

    // 更新密码和盐值
    const { error } = await client
      .from('users')
      .update({ password: hashedPassword, password_salt: salt })
      .eq('id', userId);

    if (error) {
      console.error('重置密码失败:', error);
      return res.status(500).json({ error: '重置密码失败' });
    }

    res.json({
      success: true,
      data: { newPassword },
      message: '密码已重置',
    });
  } catch (error) {
    console.error('重置密码失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 删除用户账号（需要二次确认 + 删除密码）
 * DELETE /api/v1/admin/users/:userId
 * Body: { confirmCode: string, deletePassword: string }
 * - confirmCode: 用户ID的字符串形式
 * - deletePassword: 删除密码（固定为 QRSC）
 */
router.delete('/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { confirmCode, deletePassword } = req.body;
    const client = getSupabaseClient();

    console.log('[Admin] 删除用户请求:', {
      userId,
      userIdType: typeof userId,
      confirmCode,
      confirmCodeType: typeof confirmCode,
      deletePassword,
      deletePasswordType: typeof deletePassword,
    });

    // 删除密码验证（固定密码：QRSC）
    const DELETE_PASSWORD = 'QRSC';
    if (deletePassword !== DELETE_PASSWORD) {
      console.log('[Admin] 删除密码错误:', { deletePassword, expected: DELETE_PASSWORD });
      return res.status(400).json({ error: '删除密码错误' });
    }

    // 二次确认：需要传入与userId相同的confirmCode（转为字符串比较）
    const confirmCodeStr = String(confirmCode);
    const userIdStr = String(userId);
    console.log('[Admin] 确认码比较:', { confirmCodeStr, userIdStr, match: confirmCodeStr === userIdStr });
    
    if (confirmCodeStr !== userIdStr) {
      return res.status(400).json({ error: `确认码不匹配，请输入用户ID: ${userId}` });
    }

    // 检查用户是否存在
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, username, name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 删除用户的运动记录
    const { error: workoutError } = await client
      .from('workout_records')
      .delete()
      .eq('user_id', userId);

    if (workoutError) {
      console.error('删除用户运动记录失败:', workoutError);
    }

    // 删除用户的体重记录
    const { error: bodyRecordError } = await client
      .from('body_records')
      .delete()
      .eq('user_id', userId);

    if (bodyRecordError) {
      console.error('删除用户体重记录失败:', bodyRecordError);
    }

    // 删除用户的群组消息
    const { error: messageError } = await client
      .from('group_messages')
      .delete()
      .eq('user_id', userId);

    if (messageError) {
      console.error('删除用户消息失败:', messageError);
    }

    // 删除用户的群组成员关系
    const { error: memberError } = await client
      .from('group_members')
      .delete()
      .eq('user_id', userId);

    if (memberError) {
      console.error('删除用户群组成员关系失败:', memberError);
    }

    // 最后删除用户
    const { error: deleteError } = await client
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('删除用户失败:', deleteError);
      return res.status(500).json({ error: '删除用户失败' });
    }

    res.json({
      success: true,
      message: `用户 ${user.name || user.username}（ID: ${userId}）已成功删除`,
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 获取所有运动记录
 * GET /api/v1/admin/workouts
 * Query: page?: number, limit?: number, userId?: string, date?: string, startDate?: string, endDate?: string
 */
router.get('/workouts', verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const userId = req.query.userId as string;
    const date = req.query.date as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const offset = (page - 1) * limit;

    const client = getSupabaseClient();

    // 先查询运动记录
    let query = client
      .from('workout_records')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    // 按用户筛选
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // 按日期筛选
    if (date) {
      query = query.eq('date', date);
    } else if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    } else if (startDate) {
      query = query.gte('date', startDate);
    } else if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: workouts, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('获取运动记录失败:', error);
      return res.status(500).json({ error: '获取运动记录失败' });
    }

    // 获取所有用户ID，去重
    const userIds = [...new Set((workouts || []).map(w => w.user_id).filter(Boolean))];
    
    // 查询用户信息
    let usersData: Record<string, { id: string; username: string; name: string }> = {};
    if (userIds.length > 0) {
      const { data: users } = await client
        .from('users')
        .select('id, username, name')
        .in('id', userIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id)));
      
      if (users) {
        users.forEach(u => {
          usersData[String(u.id)] = u;
        });
      }
    }

    // 手动关联用户信息
    const workoutsWithUsers = (workouts || []).map(w => ({
      ...w,
      users: usersData[w.user_id] || null,
    }));

    res.json({
      success: true,
      data: workoutsWithUsers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('获取运动记录失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 获取所有体重记录
 * GET /api/v1/admin/body-records
 * Query: page?: number, limit?: number, userId?: string
 */
router.get('/body-records', verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const userId = req.query.userId as string;
    const offset = (page - 1) * limit;

    const client = getSupabaseClient();

    // 先查询体重记录
    let query = client
      .from('body_records')
      .select('*', { count: 'exact' })
      .order('record_date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: records, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('获取体重记录失败:', error);
      return res.status(500).json({ error: '获取体重记录失败' });
    }

    // 获取所有用户ID，去重
    const userIds = [...new Set((records || []).map(r => r.user_id).filter(Boolean))];
    
    // 查询用户信息
    let usersData: Record<string, { id: string; username: string; name: string }> = {};
    if (userIds.length > 0) {
      const { data: users } = await client
        .from('users')
        .select('id, username, name')
        .in('id', userIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id)));
      
      if (users) {
        users.forEach(u => {
          usersData[String(u.id)] = u;
        });
      }
    }

    // 手动关联用户信息
    const recordsWithUsers = (records || []).map(r => ({
      ...r,
      users: usersData[r.user_id] || null,
    }));

    res.json({
      success: true,
      data: recordsWithUsers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('获取体重记录失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 获取用户体重汇总信息
 * GET /api/v1/admin/body-summary
 * Query: page?: number, limit?: number
 * 说明：默认按BMI变化率由低到高排序（减肥效果好的排前面）
 */
router.get('/body-summary', verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const client = getSupabaseClient();

    // 获取所有用户（不分页，因为需要在内存中按BMI变化率排序）
    const { data: users, error: usersError, count } = await client
      .from('users')
      .select('id, username, name, height', { count: 'exact' })
      .order('id', { ascending: true });

    if (usersError) {
      console.error('获取用户列表失败:', usersError);
      return res.status(500).json({ error: '获取用户列表失败' });
    }

    // 获取每个用户的体重汇总
    const summaryData = await Promise.all((users || []).map(async (user) => {
      // 获取该用户的所有体重记录，按日期排序
      const { data: bodyRecords } = await client
        .from('body_records')
        .select('weight, height, record_date')
        .eq('user_id', user.id)
        .not('weight', 'is', null)
        .order('record_date', { ascending: true });

      const records = bodyRecords || [];
      
      // 第一次体重记录
      const firstRecord = records.length > 0 ? records[0] : null;
      // 最新体重记录
      const latestRecord = records.length > 0 ? records[records.length - 1] : null;
      
      // 计算BMI
      const calculateBMI = (weight: number, height: number) => {
        const heightM = height / 100;
        return weight / (heightM * heightM);
      };

      // 使用记录中的身高（如果没有则使用用户表中的身高）
      const userHeight = latestRecord?.height || user.height;
      
      let firstBMI: number | null = null;
      let latestBMI: number | null = null;
      let bmiChange: number | null = null;
      let weightChange: number | null = null;

      if (firstRecord?.weight && userHeight) {
        firstBMI = calculateBMI(firstRecord.weight, userHeight);
      }
      
      if (latestRecord?.weight && userHeight) {
        latestBMI = calculateBMI(latestRecord.weight, userHeight);
      }

      if (firstBMI && latestBMI) {
        bmiChange = latestBMI - firstBMI;
      }

      if (firstRecord?.weight && latestRecord?.weight) {
        weightChange = latestRecord.weight - firstRecord.weight;
      }

      return {
        userId: user.id,
        username: user.username,
        name: user.name,
        height: userHeight,
        firstWeight: firstRecord?.weight || null,
        firstRecordDate: firstRecord?.record_date || null,
        latestWeight: latestRecord?.weight || null,
        latestRecordDate: latestRecord?.record_date || null,
        weightChange,
        firstBMI: firstBMI ? Math.round(firstBMI * 100) / 100 : null,
        latestBMI: latestBMI ? Math.round(latestBMI * 100) / 100 : null,
        bmiChange: bmiChange ? Math.round(bmiChange * 100) / 100 : null,
        recordCount: records.length,
      };
    }));

    // 按BMI变化率由低到高排序（null值排最后）
    summaryData.sort((a, b) => {
      // 如果两个都是null，保持原顺序
      if (a.bmiChange === null && b.bmiChange === null) return 0;
      // null值排最后
      if (a.bmiChange === null) return 1;
      if (b.bmiChange === null) return -1;
      // 按BMI变化率由低到高排序
      return a.bmiChange - b.bmiChange;
    });

    // 分页
    const offset = (page - 1) * limit;
    const paginatedData = summaryData.slice(offset, offset + limit);

    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('获取体重汇总失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 导出数据为 Excel 格式（多Sheet）
 * GET /api/v1/admin/export-excel
 * Query: key: string
 */
router.get('/export-excel', async (req, res) => {
  try {
    // 支持通过 query 参数验证（用于浏览器直接下载）
    const key = req.query.key as string;
    const currentKey = await getAdminKey();
    if (key !== currentKey) {
      return res.status(403).json({ error: '无权访问' });
    }

    const client = getSupabaseClient();

    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '健康达人管理系统';
    workbook.created = new Date();

    // 获取用户数据
    const { data: users } = await client
      .from('users')
      .select('id, username, name, height, weight, created_at')
      .order('created_at', { ascending: false });

    // 创建用户Sheet
    const usersSheet = workbook.addWorksheet('用户列表');
    usersSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '用户名', key: 'username', width: 15 },
      { header: '姓名', key: 'name', width: 15 },
      { header: '身高(cm)', key: 'height', width: 12 },
      { header: '体重(kg)', key: 'weight', width: 12 },
      { header: '创建时间', key: 'created_at', width: 25 },
    ];
    
    (users || []).forEach(u => {
      usersSheet.addRow({
        id: u.id,
        username: u.username || '',
        name: u.name || '',
        height: u.height || '',
        weight: u.weight || '',
        created_at: u.created_at || '',
      });
    });

    // 设置表头样式
    usersSheet.getRow(1).font = { bold: true };
    usersSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 获取运动记录数据
    const { data: workouts } = await client
      .from('workout_records')
      .select('id, user_id, date, type, duration, calories, photo_urls, created_at')
      .order('date', { ascending: false });

    // 获取用户映射
    const userIds = [...new Set((workouts || []).map(w => w.user_id).filter(Boolean))];
    let usersData: Record<string, { username: string; name: string }> = {};
    if (userIds.length > 0) {
      const { data: usersList } = await client
        .from('users')
        .select('id, username, name')
        .in('id', userIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id)));
      if (usersList) {
        usersList.forEach(u => {
          usersData[String(u.id)] = { username: u.username || '', name: u.name || '' };
        });
      }
    }

    // 创建运动记录Sheet
    const workoutsSheet = workbook.addWorksheet('运动记录');
    workoutsSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '用户ID', key: 'user_id', width: 10 },
      { header: '用户名', key: 'username', width: 15 },
      { header: '姓名', key: 'name', width: 15 },
      { header: '日期', key: 'date', width: 15 },
      { header: '运动类型', key: 'type', width: 12 },
      { header: '时长(分钟)', key: 'duration', width: 12 },
      { header: '卡路里', key: 'calories', width: 10 },
      { header: '照片数量', key: 'photo_count', width: 10 },
      { header: '创建时间', key: 'created_at', width: 25 },
    ];

    (workouts || []).forEach(w => {
      const userInfo = usersData[w.user_id] || { username: '', name: '' };
      workoutsSheet.addRow({
        id: w.id,
        user_id: w.user_id,
        username: userInfo.username,
        name: userInfo.name,
        date: w.date,
        type: w.type,
        duration: w.duration,
        calories: w.calories || '',
        photo_count: w.photo_urls ? (Array.isArray(w.photo_urls) ? w.photo_urls.length : 0) : 0,
        created_at: w.created_at || '',
      });
    });

    workoutsSheet.getRow(1).font = { bold: true };
    workoutsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 获取体重记录数据
    const { data: bodyRecords } = await client
      .from('body_records')
      .select('id, user_id, record_date, height, weight')
      .order('record_date', { ascending: false });

    // 获取体重记录用户映射
    const bodyUserIds = [...new Set((bodyRecords || []).map(r => r.user_id).filter(Boolean))];
    let bodyUsersData: Record<string, { username: string; name: string }> = {};
    if (bodyUserIds.length > 0) {
      const { data: usersList } = await client
        .from('users')
        .select('id, username, name')
        .in('id', bodyUserIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id)));
      if (usersList) {
        usersList.forEach(u => {
          bodyUsersData[String(u.id)] = { username: u.username || '', name: u.name || '' };
        });
      }
    }

    // 创建体重记录Sheet
    const bodyRecordsSheet = workbook.addWorksheet('体重记录');
    bodyRecordsSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '用户ID', key: 'user_id', width: 10 },
      { header: '用户名', key: 'username', width: 15 },
      { header: '姓名', key: 'name', width: 15 },
      { header: '记录日期', key: 'record_date', width: 15 },
      { header: '身高(cm)', key: 'height', width: 12 },
      { header: '体重(kg)', key: 'weight', width: 12 },
    ];

    (bodyRecords || []).forEach(r => {
      const userInfo = bodyUsersData[r.user_id] || { username: '', name: '' };
      bodyRecordsSheet.addRow({
        id: r.id,
        user_id: r.user_id,
        username: userInfo.username,
        name: userInfo.name,
        record_date: r.record_date,
        height: r.height || '',
        weight: r.weight || '',
      });
    });

    bodyRecordsSheet.getRow(1).font = { bold: true };
    bodyRecordsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 生成文件名
    const now = new Date();
    const filename = `健康达人数据导出_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}.xlsx`;

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // 写入响应流
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('导出数据失败:', error);
    res.status(500).json({ error: '导出数据失败' });
  }
});

/**
 * 打包下载所有照片
 * GET /api/v1/admin/export-photos
 * Query: key: string
 */
router.get('/export-photos', async (req, res) => {
  try {
    // 支持通过 query 参数验证（用于浏览器直接下载）
    const key = req.query.key as string;
    const currentKey = await getAdminKey();
    if (key !== currentKey) {
      return res.status(403).json({ error: '无权访问' });
    }

    const client = getSupabaseClient();

    // 获取所有运动记录及其照片
    const { data: workouts, error } = await client
      .from('workout_records')
      .select('id, user_id, date, type, photo_urls, created_at')
      .not('photo_urls', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取运动记录失败:', error);
      return res.status(500).json({ error: '获取运动记录失败' });
    }

    if (!workouts || workouts.length === 0) {
      return res.status(404).json({ error: '没有照片可下载' });
    }

    // 获取用户信息
    const userIds = [...new Set(workouts.map(w => w.user_id).filter(Boolean))];
    let usersData: Record<string, { id: number; username: string; name: string }> = {};
    if (userIds.length > 0) {
      const { data: users } = await client
        .from('users')
        .select('id, username, name')
        .in('id', userIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id)));
      if (users) {
        users.forEach(u => {
          usersData[String(u.id)] = u;
        });
      }
    }

    // 生成文件名
    const now = new Date();
    const filename = `健康达人照片打包_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}.zip`;

    // 设置响应头
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // 创建压缩流
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    // 下载并添加照片
    const downloadImage = (url: string): Promise<Buffer> => {
      return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const chunks: Buffer[] = [];
        
        protocol.get(url, (response) => {
          if (response.statusCode === 301 || response.statusCode === 302) {
            // 处理重定向
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              downloadImage(redirectUrl).then(resolve).catch(reject);
              return;
            }
          }
          
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        }).on('error', reject);
      });
    };

    // 按用户分组照片
    const userPhotos: Record<string, Array<{ url: string; filename: string }>> = {};
    
    for (const workout of workouts) {
      if (!workout.photo_urls) continue;
      
      const photoUrls: string[] = Array.isArray(workout.photo_urls) 
        ? workout.photo_urls 
        : (typeof workout.photo_urls === 'string' ? JSON.parse(workout.photo_urls) : []);
      
      const user = usersData[workout.user_id];
      const userName = user ? (user.name || user.username || `用户${workout.user_id}`) : `用户${workout.user_id}`;
      const userId = workout.user_id;
      
      // 创建用户文件夹名（用户名_用户ID）
      const folderName = `${userName}_${userId}`.replace(/[<>:"/\\|?*]/g, '_');
      
      if (!userPhotos[folderName]) {
        userPhotos[folderName] = [];
      }
      
      // 为每张照片生成文件名
      const workoutDate = workout.date || '未知日期';
      const workoutType = workout.type || '运动';
      const createdTime = workout.created_at ? new Date(workout.created_at) : new Date();
      
      photoUrls.forEach((url, index) => {
        if (!url) return;
        
        // 获取文件扩展名
        const ext = url.includes('.jpg') ? 'jpg' : url.includes('.png') ? 'png' : 'jpg';
        
        // 文件名：日期_运动类型_序号_上传时间
        const timeStr = `${createdTime.getFullYear()}${(createdTime.getMonth()+1).toString().padStart(2,'0')}${createdTime.getDate().toString().padStart(2,'0')}_${createdTime.getHours().toString().padStart(2,'0')}${createdTime.getMinutes().toString().padStart(2,'0')}`;
        const filename = `${workoutDate}_${workoutType}_${index + 1}_${timeStr}.${ext}`;
        
        userPhotos[folderName].push({ url, filename });
      });
    }

    // 下载并添加文件到压缩包
    let totalAdded = 0;
    for (const [folderName, photos] of Object.entries(userPhotos)) {
      for (let i = 0; i < photos.length; i++) {
        const { url, filename } = photos[i];
        try {
          console.log(`正在下载: ${folderName}/${filename}`);
          const buffer = await downloadImage(url);
          archive.append(buffer, { name: `${folderName}/${filename}` });
          totalAdded++;
        } catch (err) {
          console.error(`下载失败: ${url}`, err);
        }
      }
    }

    console.log(`共添加 ${totalAdded} 张照片到压缩包`);
    archive.finalize();
  } catch (error) {
    console.error('打包照片失败:', error);
    res.status(500).json({ error: '打包照片失败' });
  }
});

/**
 * 获取统计数据
 * GET /api/v1/admin/stats
 */
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const client = getSupabaseClient();

    // 获取用户总数
    const { count: totalUsers } = await client
      .from('users')
      .select('*', { count: 'exact', head: true });

    // 获取运动记录总数
    const { count: totalWorkouts } = await client
      .from('workout_records')
      .select('*', { count: 'exact', head: true });

    // 获取今日打卡人数
    const today = new Date().toISOString().split('T')[0];
    const { data: todayWorkouts } = await client
      .from('workout_records')
      .select('user_id')
      .eq('date', today);
    const todayCheckIns = new Set(todayWorkouts?.map(w => w.user_id)).size;

    // 获取群组数量
    const { count: totalGroups } = await client
      .from('groups')
      .select('*', { count: 'exact', head: true });

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        totalWorkouts: totalWorkouts || 0,
        todayCheckIns,
        totalGroups: totalGroups || 0,
      },
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 获取所有群组列表
 * GET /api/v1/admin/groups
 * Query: page?: number, limit?: number, search?: string
 */
router.get('/groups', verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    const client = getSupabaseClient();

    let query = client
      .from('groups')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: groups, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('获取群组列表失败:', error);
      return res.status(500).json({ error: '获取群组列表失败' });
    }

    // 获取每个群组的成员数量
    const groupIds = (groups || []).map(g => g.id);
    let memberCounts: Record<number, number> = {};
    
    if (groupIds.length > 0) {
      const { data: members } = await client
        .from('group_members')
        .select('group_id')
        .in('group_id', groupIds);
      
      if (members) {
        members.forEach(m => {
          memberCounts[m.group_id] = (memberCounts[m.group_id] || 0) + 1;
        });
      }
    }

    // 获取每个群组的创建人信息
    const creatorIds = [...new Set((groups || []).map(g => g.created_by).filter(Boolean))];
    let creatorsData: Record<number, { id: number; username: string; name: string }> = {};
    
    if (creatorIds.length > 0) {
      const { data: creators } = await client
        .from('users')
        .select('id, username, name')
        .in('id', creatorIds);
      
      if (creators) {
        creators.forEach(c => {
          creatorsData[c.id] = c;
        });
      }
    }

    // 组装数据
    const groupsWithDetails = (groups || []).map(g => ({
      ...g,
      memberCount: memberCounts[g.id] || 0,
      creator: creatorsData[g.created_by] || null,
    }));

    res.json({
      success: true,
      data: groupsWithDetails,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('获取群组列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 获取群组成员列表
 * GET /api/v1/admin/groups/:groupId/members
 */
router.get('/groups/:groupId/members', verifyAdmin, async (req, res) => {
  try {
    const { groupId } = req.params;
    const client = getSupabaseClient();

    const { data: members, error } = await client
      .from('group_members')
      .select('id, role, joined_at, users(id, username, name, avatar_url)')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('获取群组成员失败:', error);
      return res.status(500).json({ error: '获取群组成员失败' });
    }

    res.json({
      success: true,
      data: members || [],
    });
  } catch (error) {
    console.error('获取群组成员失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 解散群组
 * DELETE /api/v1/admin/groups/:groupId
 * Body: { confirmCode: string } - confirmCode为群组ID
 */
router.delete('/groups/:groupId', verifyAdmin, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { confirmCode } = req.body;
    const client = getSupabaseClient();

    // 二次确认
    if (confirmCode !== groupId) {
      return res.status(400).json({ error: '确认码不匹配，请输入群组ID进行确认' });
    }

    // 检查群组是否存在
    const { data: group, error: groupError } = await client
      .from('groups')
      .select('id, name, group_number')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: '群组不存在' });
    }

    // 删除群组消息
    const { error: messageError } = await client
      .from('group_messages')
      .delete()
      .eq('group_id', groupId);

    if (messageError) {
      console.error('删除群组消息失败:', messageError);
    }

    // 删除群组成员关系
    const { error: memberError } = await client
      .from('group_members')
      .delete()
      .eq('group_id', groupId);

    if (memberError) {
      console.error('删除群组成员关系失败:', memberError);
    }

    // 删除群组
    const { error: deleteError } = await client
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (deleteError) {
      console.error('解散群组失败:', deleteError);
      return res.status(500).json({ error: '解散群组失败' });
    }

    res.json({
      success: true,
      message: `群组 ${group.name}（群号：${group.group_number}）已成功解散`,
    });
  } catch (error) {
    console.error('解散群组失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 清理孤立数据
 * POST /api/v1/admin/cleanup
 * Body: { type: 'orphaned_messages' | 'old_messages' }
 */
router.post('/cleanup', verifyAdmin, async (req, res) => {
  try {
    const { type } = req.body;
    const client = getSupabaseClient();

    if (type === 'orphaned_messages') {
      // 清理孤立的群组消息（群组已不存在的消息）
      const { data: groups } = await client
        .from('groups')
        .select('id');
      
      const groupIds = (groups || []).map(g => g.id);
      
      if (groupIds.length > 0) {
        const { data: orphanedMessages, error } = await client
          .from('group_messages')
          .delete()
          .not('group_id', 'in', `(${groupIds.join(',')})`);
        
        if (error) {
          console.error('清理孤立消息失败:', error);
          return res.status(500).json({ error: '清理失败' });
        }
        
        res.json({
          success: true,
          message: '孤立消息清理完成',
        });
      } else {
        res.json({
          success: true,
          message: '没有需要清理的数据',
        });
      }
    } else if (type === 'old_messages') {
      // 清理90天前的消息（保留运动打卡和每日总结）
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { error } = await client
        .from('group_messages')
        .delete()
        .lt('created_at', ninetyDaysAgo.toISOString())
        .in('type', ['text', 'image', 'emoji']);
      
      if (error) {
        console.error('清理旧消息失败:', error);
        return res.status(500).json({ error: '清理失败' });
      }
      
      res.json({
        success: true,
        message: '旧消息清理完成',
      });
    } else {
      res.status(400).json({ error: '无效的清理类型' });
    }
  } catch (error) {
    console.error('清理数据失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
