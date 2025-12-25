import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Popconfirm,
  message,
  Typography,
  Tag,
  Card,
  Row,
  Col,
  Descriptions,
  Select
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { getAssets, getAsset, createAsset, updateAsset, deleteAsset, getFieldValues } from '@/api/assets'
import { getTags } from '@/api/tags'
import TagSelector from '@/components/TagSelector'
import CredentialManager from '@/components/CredentialManager'
import PasswordDisplay from '@/components/PasswordDisplay'

const { Title } = Typography

const SystemAssets = () => {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [viewData, setViewData] = useState(null)
  const [form] = Form.useForm()
  const [searchText, setSearchText] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [allTags, setAllTags] = useState([])

  useEffect(() => {
    fetchAssets()
    fetchTags()
  }, [])

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const params = {
        asset_type: 'system',
        page: 1,
        page_size: 100
      }
      
      if (searchText) {
        params.search = searchText
      }
      
      if (selectedTags.length > 0) {
        params.tags = selectedTags.map(tagId => {
          const tag = allTags.find(t => t.id === tagId)
          return tag ? `${tag.key}=${tag.value}` : ''
        }).filter(Boolean).join(',')
      }
      
      const response = await getAssets(params)
      setAssets(response.items || [])
    } catch (error) {
      message.error('加载软件资产列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchTags = async () => {
    try {
      const response = await getTags()
      setAllTags(response || [])
    } catch (error) {
      console.error('加载标签列表失败', error)
    }
  }

  const handleCreate = () => {
    setEditingAsset(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = async (record) => {
    try {
      const response = await getAsset(record.id)
      // 转换凭据数据格式
      const credentials = (response.credentials || []).map((cred, index) => ({
        rowKey: cred.id?.toString() || `cred_${index}`,
        credential_type: cred.credential_type || 'password',
        key: cred.key || '',
        value: cred.value || '',
        description: cred.description || ''
      }))
      
      form.setFieldsValue({
        ...response,
        tag_ids: response.tags ? response.tags.map(t => t.id) : [],
        credentials: credentials
      })
      setEditingAsset(record)
      setModalVisible(true)
    } catch (error) {
      message.error('获取软件资产信息失败')
    }
  }

  const handleView = async (record) => {
    try {
      const response = await getAsset(record.id)
      setViewData(response)
      setViewModalVisible(true)
    } catch (error) {
      message.error('获取软件资产详情失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        asset_type: 'system',
        name: values.name,
        ip_address: values.ip_address || null,
        port: values.port || null,
        default_account: values.default_account || null,
        default_password: values.default_password || null,
        login_url: values.login_url || null,
        notes: values.notes || null,
        tag_ids: values.tag_ids || [],
        credentials: (values.credentials || []).map(cred => ({
          credential_type: cred.credential_type || 'password',
          key: cred.key || '',
          value: cred.value || '',
          description: cred.description || ''
        })).filter(cred => cred.key && cred.value)
      }
      
      if (editingAsset) {
        await updateAsset(editingAsset.id, data)
        message.success('更新成功')
      } else {
        await createAsset(data)
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchAssets()
    } catch (error) {
      message.error(editingAsset ? '更新失败' : '创建失败')
    }
  }

  const handleDelete = async (record) => {
    try {
      await deleteAsset(record.id)
      message.success('删除成功')
      fetchAssets()
    } catch (error) {
      message.error('删除失败')
    }
  }


  const validateIPv4 = (_, value) => {
    if (!value) {
      return Promise.resolve()
    }
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (ipv4Regex.test(value)) {
      return Promise.resolve()
    }
    return Promise.reject(new Error('请输入正确的IPv4地址格式'))
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address'
    },
    {
      title: '端口',
      dataIndex: 'port',
      key: 'port'
    },
    {
      title: '登录链接',
      dataIndex: 'login_url',
      key: 'login_url'
    },
    {
      title: '标签',
      key: 'tags',
      render: (_, record) => (
        <Space>
          {record.tags?.map(tag => (
            <Tag key={tag.id}>{tag.key}={tag.value}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-'
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleView(record)}>
            查看
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个软件资产吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2}>软件资产</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增系统
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder="搜索系统名称"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={fetchAssets}
              allowClear
            />
          </Col>
          <Col span={8}>
            <Select
              mode="multiple"
              placeholder="按标签筛选"
              style={{ width: '100%' }}
              value={selectedTags}
              onChange={setSelectedTags}
              allowClear
            >
              {allTags.map(tag => (
                <Select.Option key={tag.id} value={tag.id}>
                  {tag.key}={tag.value}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={fetchAssets}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => {
                setSearchText('')
                setSelectedTags([])
                fetchAssets()
              }}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={assets}
        loading={loading}
        rowKey="id"
      />

      <Modal
        title={editingAsset ? '编辑软件资产' : '新增软件资产'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ip_address" label="IP地址" rules={[{ validator: validateIPv4 }]}>
                <Input placeholder="可选" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="port" label="端口" rules={[
                { type: 'number', min: 1, max: 65535, message: '端口范围在 1-65535' }
              ]}>
                <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="可选" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="default_account" label="默认账号">
                <Input placeholder="默认登录账号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="default_password" label="默认密码">
                <Input.Password placeholder="默认登录密码" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="login_url" label="登录链接">
            <Input />
          </Form.Item>
          <Form.Item name="credentials" label="登录凭据（支持多个账号密码）">
            <CredentialManager />
          </Form.Item>
          <Form.Item name="tag_ids" label="标签">
            <TagSelector />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="软件资产详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={700}
      >
        {viewData && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="名称">{viewData.name}</Descriptions.Item>
            <Descriptions.Item label="IP地址">{viewData.ip_address || '-'}</Descriptions.Item>
            <Descriptions.Item label="端口">{viewData.port || '-'}</Descriptions.Item>
            <Descriptions.Item label="默认账号">{viewData.default_account || '-'}</Descriptions.Item>
            <Descriptions.Item label="默认密码">
              {viewData.default_password ? <PasswordDisplay value={viewData.default_password} /> : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="登录链接" span={2}>{viewData.login_url || '-'}</Descriptions.Item>
            <Descriptions.Item label="登录凭据" span={2}>
              {viewData.credentials && viewData.credentials.length > 0 ? (
                <Table
                  size="small"
                  columns={[
                    { title: '类型', dataIndex: 'credential_type', key: 'credential_type' },
                    { title: '用户名/Key', dataIndex: 'key', key: 'key' },
                    { 
                      title: '密码/Value', 
                      dataIndex: 'value', 
                      key: 'value', 
                      render: (text) => text ? <PasswordDisplay value={text} /> : '-' 
                    },
                    { title: '描述', dataIndex: 'description', key: 'description' }
                  ]}
                  dataSource={viewData.credentials}
                  rowKey="id"
                  pagination={false}
                />
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{viewData.notes || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{viewData.created_at ? new Date(viewData.created_at).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{viewData.updated_at ? new Date(viewData.updated_at).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default SystemAssets
