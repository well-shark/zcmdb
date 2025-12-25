import React, { useState } from 'react'
import { Card, Form, Input, Button, message, Typography, Space, Avatar, Divider } from 'antd'
import { UserOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/auth'
import { changePassword } from '@/api/users'

const { Title } = Typography

const Profile = () => {
  const { user, fetchUser } = useAuthStore()
  const [passwordForm] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handlePasswordChange = async () => {
    try {
      const values = await passwordForm.validateFields()
      setLoading(true)
      await changePassword(user.id, values)
      message.success('密码修改成功')
      passwordForm.resetFields()
    } catch (error) {
      message.error('密码修改失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Title level={2}>个人资料</Title>
      
      <Card style={{ marginTop: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Space>
              <Avatar size={64} icon={<UserOutlined />} />
              <div>
                <Title level={4} style={{ margin: 0 }}>{user?.username}</Title>
                <Typography.Text type="secondary">{user?.email}</Typography.Text>
              </div>
            </Space>
          </div>
          
          <Divider />
          
          <div>
            <Title level={4}>基本信息</Title>
            <Form layout="vertical" style={{ maxWidth: 500 }}>
              <Form.Item label="用户名">
                <Input value={user?.username} disabled />
              </Form.Item>
              <Form.Item label="邮箱">
                <Input value={user?.email} disabled />
              </Form.Item>
              <Form.Item label="角色">
                <Input value={user?.is_admin ? '管理员' : '普通用户'} disabled />
              </Form.Item>
            </Form>
          </div>
          
          <Divider />
          
          <div>
            <Title level={4}>修改密码</Title>
            <Form 
              form={passwordForm} 
              layout="vertical" 
              style={{ maxWidth: 500 }}
              onFinish={handlePasswordChange}
            >
              <Form.Item
                name="new_password"
                label="新密码"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码长度至少6位' }
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" />
              </Form.Item>
              <Form.Item
                name="confirm_password"
                label="确认密码"
                dependencies={['new_password']}
                rules={[
                  { required: true, message: '请确认新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('new_password') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'))
                    }
                  })
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请再次输入新密码" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  修改密码
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default Profile

