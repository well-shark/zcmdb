import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Statistic, Typography, Table, Button, Space, Select, Tag } from 'antd'
import {
  CloudServerOutlined,
  CloudOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  SettingOutlined,
  DesktopOutlined,
  PlusOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { getAssets, getExpiringAssets } from '@/api/assets'
import dayjs from 'dayjs'

const { Title } = Typography
const { Option } = Select

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    servers: 0,
    cloud: 0,
    databases: 0,
    software: 0
  })
  const [loading, setLoading] = useState(true)
  const [expiringDays, setExpiringDays] = useState(7)
  const [expiringAssets, setExpiringAssets] = useState([])
  const [expiringLoading, setExpiringLoading] = useState(false)

  useEffect(() => {
    fetchStats()
    fetchExpiringAssets()
  }, [expiringDays])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const [servers, cloud, databases, software] = await Promise.all([
        getAssets({ asset_type: 'server', page_size: 1 }),
        getAssets({ asset_type: 'cloud', page_size: 1 }),
        getAssets({ asset_type: 'database', page_size: 1 }),
        getAssets({ asset_type: 'software', page_size: 1 })
      ])
      
      setStats({
        servers: servers.total || 0,
        cloud: cloud.total || 0,
        databases: databases.total || 0,
        software: software.total || 0
      })
    } catch (error) {
      console.error('获取统计数据失败', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchExpiringAssets = async () => {
    setExpiringLoading(true)
    try {
      const response = await getExpiringAssets('cloud', expiringDays)
      setExpiringAssets(response.items || [])
    } catch (error) {
      console.error('获取即将到期资产失败', error)
    } finally {
      setExpiringLoading(false)
    }
  }

  const getDaysUntilExpiry = (expiresAt) => {
    if (!expiresAt) return null
    const days = dayjs(expiresAt).diff(dayjs(), 'day')
    return days
  }

  const expiringColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Button type="link" onClick={() => navigate(`/assets/cloud`)}>
          {text}
        </Button>
      )
    },
    {
      title: '实例ID',
      dataIndex: 'instance_id',
      key: 'instance_id'
    },
    {
      title: '地域',
      dataIndex: 'region',
      key: 'region'
    },
    {
      title: '到期时间',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '剩余天数',
      key: 'days_left',
      render: (_, record) => {
        const days = getDaysUntilExpiry(record.expires_at)
        if (days === null) return '-'
        const color = days <= 3 ? 'red' : days <= 7 ? 'orange' : 'green'
        return <Tag color={color}>{days} 天</Tag>
      }
    }
  ]

  const quickActions = [
    { label: '服务器', path: '/assets/servers', icon: <CloudServerOutlined /> },
    { label: '云节点', path: '/assets/cloud', icon: <CloudOutlined /> },
    { label: '云账号', path: '/assets/cloud-accounts', icon: <CloudOutlined /> },
    { label: '软件授权', path: '/assets/software', icon: <FileTextOutlined /> },
    { label: '软件资产', path: '/assets/systems', icon: <SettingOutlined /> },
    { label: '数据库', path: '/assets/databases', icon: <DatabaseOutlined /> },
    { label: '硬件资产', path: '/assets/hardware', icon: <DesktopOutlined /> }
  ]

  return (
    <div>
      <Title level={2}>仪表盘</Title>
      
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="服务器"
              value={stats.servers}
              prefix={<CloudServerOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="云节点"
              value={stats.cloud}
              prefix={<CloudOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="数据库"
              value={stats.databases}
              prefix={<DatabaseOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="软件授权"
              value={stats.software}
              prefix={<FileTextOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* 快捷添加按钮 */}
      <Card title="快捷添加" style={{ marginTop: 24 }}>
        <Space wrap>
          {quickActions.map(action => (
            <Button
              key={action.path}
              type="primary"
              icon={action.icon}
              onClick={() => navigate(action.path)}
            >
              {action.label}
            </Button>
          ))}
        </Space>
      </Card>

      {/* 近期到期云节点 */}
      <Card
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            <span>近期到期云节点资源</span>
            <Select
              value={expiringDays}
              onChange={setExpiringDays}
              style={{ width: 120, marginLeft: 16 }}
            >
              <Option value={3}>最近三天</Option>
              <Option value={7}>最近一周</Option>
              <Option value={14}>最近两周</Option>
              <Option value={30}>最近一月</Option>
            </Select>
          </Space>
        }
        style={{ marginTop: 24 }}
        extra={
          <Button type="link" onClick={() => navigate('/assets/cloud')}>
            查看全部
          </Button>
        }
      >
        <Table
          columns={expiringColumns}
          dataSource={expiringAssets}
          loading={expiringLoading}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无即将到期的云节点' }}
        />
      </Card>
    </div>
  )
}

export default Dashboard
