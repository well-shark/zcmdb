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
  AutoComplete,
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

const { Title } = Typography

const DatabaseAssets = () => {
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
  const [dbTypeOptions, setDbTypeOptions] = useState([])

  useEffect(() => {
    fetchAssets()
    fetchTags()
  }, [])

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const params = {
        asset_type: 'database',
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
      message.error('加载数据库列表失败')
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
      const databases = Array.isArray(response.databases) ? response.databases : []
      form.setFieldsValue({
        ...response,
        databases: databases.join(', '),
        tag_ids: response.tags ? response.tags.map(t => t.id) : []
      })
      setEditingAsset(record)
      setModalVisible(true)
    } catch (error) {
      message.error('获取数据库信息失败')
    }
  }

  const handleView = async (record) => {
    try {
      const response = await getAsset(record.id)
      setViewData(response)
      setViewModalVisible(true)
    } catch (error) {
      message.error('获取数据库详情失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const databases = values.databases ? values.databases.split(',').map(db => db.trim()).filter(db => db) : []
      
      const data = {
        asset_type: 'database',
        name: values.name,
        db_type: values.db_type,
        host: values.host,
        port: values.port,
        databases: databases,
        quota: values.quota || null,
        notes: values.notes || null,
        tag_ids: values.tag_ids || []
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

  const handleSearchDbType = async (value) => {
    if (dbTypeOptions.length === 0) {
      try {
        const response = await getFieldValues('database', 'db_type')
        setDbTypeOptions(response.values || [])
      } catch (error) {
        console.error('获取数据库类型列表失败', error)
      }
    }
  }

  const validateHost = (_, value) => {
    if (!value) {
      return Promise.resolve()
    }
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    if (ipv4Regex.test(value) || domainRegex.test(value) || value === 'localhost') {
      return Promise.resolve()
    }
    return Promise.reject(new Error('请输入正确的IP地址或域名'))
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
      title: '数据库类型',
      dataIndex: 'db_type',
      key: 'db_type'
    },
    {
      title: '地址',
      dataIndex: 'host',
      key: 'host'
    },
    {
      title: '端口',
      dataIndex: 'port',
      key: 'port'
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
            title="确定要删除这个数据库吗？"
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
        <Title level={2}>数据库</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增数据库
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder="搜索数据库名称"
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
        title={editingAsset ? '编辑数据库' : '新增数据库'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="db_type" label="数据库类型" rules={[{ required: true, message: '请选择数据库类型' }]}>
            <AutoComplete
              options={dbTypeOptions.map(v => ({ value: v }))}
              placeholder="请选择或输入数据库类型"
              onSearch={handleSearchDbType}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="host" label="地址" rules={[
                { required: true, message: '请输入地址' },
                { validator: validateHost }
              ]}>
                <Input placeholder="如：192.168.1.100" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="port" label="端口" rules={[
                { required: true, message: '请输入端口' },
                { type: 'number', min: 1, max: 65535, message: '端口范围在 1-65535' }
              ]}>
                <InputNumber min={1} max={65535} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="databases" label="数据库列表">
            <Input.TextArea rows={3} placeholder="请输入数据库名称，多个用逗号分隔，如：db1,db2,db3" />
          </Form.Item>
          <Form.Item name="quota" label="配额">
            <Input placeholder="如：100GB" />
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
        title="数据库详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={700}
      >
        {viewData && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="名称">{viewData.name}</Descriptions.Item>
            <Descriptions.Item label="数据库类型">{viewData.db_type || '-'}</Descriptions.Item>
            <Descriptions.Item label="地址">{viewData.host || '-'}</Descriptions.Item>
            <Descriptions.Item label="端口">{viewData.port || '-'}</Descriptions.Item>
            <Descriptions.Item label="数据库列表" span={2}>
              {Array.isArray(viewData.databases) ? viewData.databases.join(', ') : (viewData.databases || '-')}
            </Descriptions.Item>
            <Descriptions.Item label="配额">{viewData.quota || '-'}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{viewData.notes || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default DatabaseAssets
