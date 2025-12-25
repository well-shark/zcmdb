import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom'
import {
  Layout as AntLayout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Typography
} from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  CloudServerOutlined,
  CloudOutlined,
  FileTextOutlined,
  SettingOutlined,
  DatabaseOutlined,
  DesktopOutlined,
  TagsOutlined,
  BellOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SwapOutlined
} from '@ant-design/icons'
import { useAuthStore } from '@/store/auth'
import './index.css'

const { Header, Sider, Content } = AntLayout
const { Text } = Typography

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘'
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: '用户管理',
      adminOnly: true
    },
    {
      key: '/assets',
      icon: <CloudServerOutlined />,
      label: '资产管理',
      children: [
        {
          key: '/assets/servers',
          icon: <CloudServerOutlined />,
          label: '服务器'
        },
        {
          key: '/assets/cloud',
          icon: <CloudOutlined />,
          label: '云节点'
        },
        {
          key: '/assets/cloud-accounts',
          icon: <CloudOutlined />,
          label: '云账号',
          hidden: !user?.is_admin
        },
        {
          key: '/assets/software',
          icon: <FileTextOutlined />,
          label: '软件授权'
        },
        {
          key: '/assets/systems',
          icon: <SettingOutlined />,
          label: '软件资产'
        },
        {
          key: '/assets/databases',
          icon: <DatabaseOutlined />,
          label: '数据库'
        },
        {
          key: '/assets/hardware',
          icon: <DesktopOutlined />,
          label: '硬件资产'
        }
      ]
    },
    {
      key: '/tags',
      icon: <TagsOutlined />,
      label: '标签管理'
    },
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: '通知中心'
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置'
    },
    {
      key: '/migration',
      icon: <SwapOutlined />,
      label: '数据库迁移',
      adminOnly: true
    }
  ]

  // 过滤菜单项（根据用户权限）
  const filteredMenuItems = menuItems.filter(item => {
    if (item.adminOnly && !user?.is_admin) {
      return false
    }
    if (item.children) {
      item.children = item.children.filter(child => {
        if (child.adminOnly && !user?.is_admin) {
          return false
        }
        return true
      })
    }
    return true
  }).map(item => {
    // 移除adminOnly属性，避免React警告
    const { adminOnly, ...rest } = item
    return rest
  })

  const handleMenuClick = ({ key }) => {
    navigate(key)
  }

  const userMenuItems = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <UserOutlined />
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />
    }
  ]

  const handleUserMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout()
    } else if (key === 'profile') {
      navigate('/profile')
    }
  }

  return (
    <AntLayout className="app-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        className="app-sider"
      >
        <div className="logo">
          <Text strong style={{ color: '#fff', fontSize: '18px' }}>
            {collapsed ? 'ZCMDB' : 'ZCMDB 资产管理系统'}
          </Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={filteredMenuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <AntLayout>
        <Header className="app-header">
          <div className="header-left">
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed)
            })}
          </div>
          <div className="header-right">
            <Space>
              <Dropdown
                menu={{
                  items: userMenuItems,
                  onClick: handleUserMenuClick
                }}
                placement="bottomRight"
              >
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar icon={<UserOutlined />} />
                  <Text>{user?.username || '用户'}</Text>
                </Space>
              </Dropdown>
            </Space>
          </div>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout

