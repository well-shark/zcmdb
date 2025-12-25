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
  Select,
  Descriptions,
  Tabs,
  Divider
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  KeyOutlined
} from '@ant-design/icons'
import { getCloudAccounts, getCloudAccount, createCloudAccount, updateCloudAccount, deleteCloudAccount, createAccessKey, updateAccessKey, deleteAccessKey } from '@/api/cloudAccounts'
import { useAuthStore } from '@/store/auth'

const { Title } = Typography
const { Option } = Select
const { TabPane } = Tabs

const CloudAccounts = () => {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [keyModalVisible, setKeyModalVisible] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [viewData, setViewData] = useState(null)
  const [form] = Form.useForm()
  const [keyForm] = Form.useForm()
  const [searchText, setSearchText] = useState('')
  const [selectedProvider, setSelectedProvider] = useState(null)
  const { user } = useAuthStore()

  const cloudProviders = ['阿里云', '腾讯云', 'AWS', 'Azure', '华为云', '其他']

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedProvider) {
        params.cloud_provider = selectedProvider
      }
      const response = await getCloudAccounts(params)
      setAccounts(response || [])
    } catch (error) {
      message.error('加载云账号列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingAccount(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = async (record) => {
    try {
      const response = await getCloudAccount(record.id)
      form.setFieldsValue({
        ...response,
        password: response.password || ''
      })
      setEditingAccount(record)
      setModalVisible(true)
    } catch (error) {
      message.error('获取云账号信息失败')
    }
  }

  const handleView = async (record) => {
    try {
      const response = await getCloudAccount(record.id)
      setViewData(response)
      setViewModalVisible(true)
    } catch (error) {
      message.error('获取云账号详情失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        cloud_provider: values.cloud_provider,
        account_name: values.account_name,
        password: values.password || null,
        phone: values.phone || null,
        balance: values.balance || null,
        notes: values.notes || null
      }
      
      if (editingAccount) {
        await updateCloudAccount(editingAccount.id, data)
        message.success('更新成功')
      } else {
        await createCloudAccount(data)
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchAccounts()
    } catch (error) {
      message.error(editingAccount ? '更新失败' : '创建失败')
    }
  }

  const handleDelete = async (record) => {
    try {
      await deleteCloudAccount(record.id)
      message.success('删除成功')
      fetchAccounts()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleAddKey = (account) => {
    setEditingAccount(account)
    keyForm.resetFields()
    keyForm.setFieldsValue({ key_id: null })
    setKeyModalVisible(true)
  }

  const handleEditKey = (account, key) => {
    setEditingAccount(account)
    keyForm.setFieldsValue({
      key_id: key.id,
      access_key: key.access_key,
      secret_key: key.secret_key || '',
      assigned_to: key.assigned_to || '',
      description: key.description || ''
    })
    setKeyModalVisible(true)
  }

  const handleKeySubmit = async () => {
    try {
      const values = await keyForm.validateFields()
      const keyId = keyForm.getFieldValue('key_id')
      
      // 如果是编辑且secret_key为空，则使用原来的值
      let secretKey = values.secret_key
      if (keyId && !secretKey) {
        // 编辑时如果secret_key为空，需要从原数据中获取
        const originalKey = editingAccount?.access_keys?.find(k => k.id === keyId)
        if (originalKey && originalKey.secret_key) {
          secretKey = originalKey.secret_key
        } else {
          message.warning('Secret Key不能为空')
          return
        }
      }
      
      const data = {
        access_key: values.access_key,
        secret_key: secretKey,
        assigned_to: values.assigned_to || null,
        description: values.description || null
      }
      
      if (keyId) {
        await updateAccessKey(editingAccount.id, keyId, data)
        message.success('更新成功')
      } else {
        await createAccessKey(editingAccount.id, data)
        message.success('创建成功')
      }
      setKeyModalVisible(false)
      fetchAccounts()
    } catch (error) {
      message.error(keyForm.getFieldValue('key_id') ? '更新失败' : '创建失败')
    }
  }

  const handleDeleteKey = async (accountId, keyId) => {
    try {
      await deleteAccessKey(accountId, keyId)
      message.success('删除成功')
      fetchAccounts()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '云平台',
      dataIndex: 'cloud_provider',
      key: 'cloud_provider',
      width: 120
    },
    {
      title: '账号',
      dataIndex: 'account_name',
      key: 'account_name'
    },
    {
      title: '绑定手机',
      dataIndex: 'phone',
      key: 'phone',
      width: 120
    },
    {
      title: '余额',
      dataIndex: 'balance',
      key: 'balance',
      width: 120,
      render: (balance) => balance !== null && balance !== undefined ? `¥${balance.toFixed(2)}` : '-'
    },
    {
      title: 'AK/SK数量',
      key: 'key_count',
      width: 100,
      render: (_, record) => record.access_keys?.length || 0
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleView(record)}>
            查看
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" icon={<KeyOutlined />} onClick={() => handleAddKey(record)}>
            添加密钥
          </Button>
          <Popconfirm
            title="确定要删除这个云账号吗？"
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
        <Title level={2}>云账号</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增云账号
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder="搜索账号名称"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={fetchAccounts}
              allowClear
            />
          </Col>
          <Col span={8}>
            <Select
              placeholder="按云平台筛选"
              style={{ width: '100%' }}
              value={selectedProvider}
              onChange={setSelectedProvider}
              allowClear
            >
              {cloudProviders.map(provider => (
                <Option key={provider} value={provider}>{provider}</Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={fetchAccounts}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => {
                setSearchText('')
                setSelectedProvider(null)
                fetchAccounts()
              }}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={accounts}
        loading={loading}
        rowKey="id"
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ padding: '16px 0' }}>
              <Title level={5}>访问密钥 (AK/SK)</Title>
              {record.access_keys && record.access_keys.length > 0 ? (
                <Table
                  size="small"
                  columns={[
                    { title: 'Access Key', dataIndex: 'access_key', key: 'access_key' },
                    { title: 'Secret Key', dataIndex: 'secret_key', key: 'secret_key', render: (text) => text ? '***' : '-' },
                    { title: '分配给', dataIndex: 'assigned_to', key: 'assigned_to' },
                    { title: '描述', dataIndex: 'description', key: 'description' },
                    {
                      title: '操作',
                      key: 'action',
                      render: (_, key) => (
                        <Space>
                          <Button type="link" size="small" onClick={() => handleEditKey(record, key)}>
                            编辑
                          </Button>
                          <Popconfirm
                            title="确定要删除这个密钥吗？"
                            onConfirm={() => handleDeleteKey(record.id, key.id)}
                            okText="确定"
                            cancelText="取消"
                          >
                            <Button type="link" size="small" danger>
                              删除
                            </Button>
                          </Popconfirm>
                        </Space>
                      )
                    }
                  ]}
                  dataSource={record.access_keys}
                  rowKey="id"
                  pagination={false}
                />
              ) : (
                <p>暂无访问密钥</p>
              )}
            </div>
          )
        }}
      />

      <Modal
        title={editingAccount ? '编辑云账号' : '新增云账号'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="cloud_provider" label="云平台" rules={[{ required: true, message: '请选择云平台' }]}>
            <Select placeholder="请选择云平台">
              {cloudProviders.map(provider => (
                <Option key={provider} value={provider}>{provider}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="account_name" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码">
            <Input.Password placeholder={editingAccount ? '留空则不修改' : '请输入密码'} />
          </Form.Item>
          <Form.Item name="phone" label="绑定手机号">
            <Input />
          </Form.Item>
          <Form.Item name="balance" label="余额">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="云账号详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={700}
      >
        {viewData && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="云平台">{viewData.cloud_provider}</Descriptions.Item>
            <Descriptions.Item label="账号">{viewData.account_name}</Descriptions.Item>
            <Descriptions.Item label="密码">{viewData.password ? '***' : '-'}</Descriptions.Item>
            <Descriptions.Item label="绑定手机号">{viewData.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="余额">{viewData.balance !== null && viewData.balance !== undefined ? `¥${viewData.balance.toFixed(2)}` : '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(viewData.created_at).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{viewData.notes || '-'}</Descriptions.Item>
            <Descriptions.Item label="访问密钥" span={2}>
              {viewData.access_keys && viewData.access_keys.length > 0 ? (
                <Table
                  size="small"
                  columns={[
                    { title: 'Access Key', dataIndex: 'access_key', key: 'access_key' },
                    { title: 'Secret Key', dataIndex: 'secret_key', key: 'secret_key', render: (text) => text ? '***' : '-' },
                    { title: '分配给', dataIndex: 'assigned_to', key: 'assigned_to' },
                    { title: '描述', dataIndex: 'description', key: 'description' }
                  ]}
                  dataSource={viewData.access_keys}
                  rowKey="id"
                  pagination={false}
                />
              ) : (
                '暂无访问密钥'
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title={keyForm.getFieldValue('key_id') ? '编辑访问密钥' : '新增访问密钥'}
        open={keyModalVisible}
        onOk={handleKeySubmit}
        onCancel={() => {
          setKeyModalVisible(false)
          setEditingAccount(null)
        }}
        width={600}
      >
        <Form form={keyForm} layout="vertical">
          <Form.Item name="key_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="access_key" label="Access Key" rules={[{ required: true, message: '请输入Access Key' }]}>
            <Input />
          </Form.Item>
          <Form.Item 
            name="secret_key" 
            label="Secret Key" 
            rules={[{ required: !keyForm.getFieldValue('key_id'), message: '请输入Secret Key' }]}
          >
            <Input.Password placeholder={keyForm.getFieldValue('key_id') ? '留空则不修改' : '请输入Secret Key'} />
          </Form.Item>
          <Form.Item name="assigned_to" label="分配给">
            <Input placeholder="如：开发团队、运维团队等" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CloudAccounts
