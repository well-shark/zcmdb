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
  DatePicker,
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
import { getAssets, getAsset, createAsset, updateAsset, deleteAsset } from '@/api/assets'
import { getTags } from '@/api/tags'
import dayjs from 'dayjs'
import TagSelector from '@/components/TagSelector'

const { Title } = Typography

const HardwareAssets = () => {
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
        asset_type: 'hardware',
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
      message.error('加载硬件资产列表失败')
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
      form.setFieldsValue({
        ...response,
        purchase_date: response.purchase_date ? dayjs(response.purchase_date) : null,
        tag_ids: response.tags ? response.tags.map(t => t.id) : []
      })
      setEditingAsset(record)
      setModalVisible(true)
    } catch (error) {
      message.error('获取硬件资产信息失败')
    }
  }

  const handleView = async (record) => {
    try {
      const response = await getAsset(record.id)
      setViewData(response)
      setViewModalVisible(true)
    } catch (error) {
      message.error('获取硬件资产详情失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        asset_type: 'hardware',
        name: values.name,
        hardware_type: values.hardware_type || null,
        brand: values.brand || null,
        model: values.model || null,
        serial_number: values.serial_number || null,
        purchase_date: values.purchase_date ? values.purchase_date.format('YYYY-MM-DD') : null,
        purchase_price: values.purchase_price || null,
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
      title: '硬件类型',
      dataIndex: 'hardware_type',
      key: 'hardware_type'
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand'
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model'
    },
    {
      title: '序列号',
      dataIndex: 'serial_number',
      key: 'serial_number'
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
            title="确定要删除这个硬件资产吗？"
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
        <Title level={2}>硬件资产</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增硬件
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder="搜索硬件名称"
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
        title={editingAsset ? '编辑硬件资产' : '新增硬件资产'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="hardware_type" label="硬件类型">
            <Input placeholder="如：PC、笔记本、服务器等" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="brand" label="品牌">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="model" label="型号">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="serial_number" label="序列号">
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="purchase_date" label="购买日期">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="purchase_price" label="购买价格">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="tag_ids" label="标签">
            <TagSelector />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="硬件资产详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={700}
      >
        {viewData && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="名称">{viewData.name}</Descriptions.Item>
            <Descriptions.Item label="硬件类型">{viewData.hardware_type || '-'}</Descriptions.Item>
            <Descriptions.Item label="品牌">{viewData.brand || '-'}</Descriptions.Item>
            <Descriptions.Item label="型号">{viewData.model || '-'}</Descriptions.Item>
            <Descriptions.Item label="序列号">{viewData.serial_number || '-'}</Descriptions.Item>
            <Descriptions.Item label="购买日期">{viewData.purchase_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="购买价格">{viewData.purchase_price || '-'}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{viewData.notes || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default HardwareAssets
