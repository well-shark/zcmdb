import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
  message,
  Typography,
  Tag as AntTag
} from 'antd'
import { PlusOutlined, DeleteOutlined, TagOutlined, EditOutlined } from '@ant-design/icons'
import { getTags, createTag, updateTag, deleteTag } from '@/api/tags'

const { Title } = Typography

const Tags = () => {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingTag, setEditingTag] = useState(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    setLoading(true)
    try {
      const response = await getTags()
      setTags(Array.isArray(response) ? response : [])
    } catch (error) {
      message.error('加载标签列表失败')
      setTags([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingTag(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingTag(record)
    form.setFieldsValue({
      key: record.key,
      value: record.value
    })
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingTag) {
        await updateTag(editingTag.id, {
          key: values.key.trim(),
          value: values.value.trim()
        })
        message.success('标签更新成功')
      } else {
        await createTag({
          key: values.key.trim(),
          value: values.value.trim()
        })
        message.success('标签创建成功')
      }
      setModalVisible(false)
      fetchTags()
    } catch (error) {
      message.error(error.response?.data?.detail || (editingTag ? '标签更新失败' : '标签创建失败'))
    }
  }

  const handleDelete = async (record) => {
    try {
      await deleteTag(record.id)
      message.success('删除成功')
      fetchTags()
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
      title: '键',
      dataIndex: 'key',
      key: 'key'
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title={`确定要删除标签 "${record.key}=${record.value}" 吗？`}
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
        <Title level={2}>
          <TagOutlined style={{ marginRight: 8 }} />
          标签管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增标签
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={tags}
        loading={loading}
        rowKey="id"
      />

      <Modal
        title={editingTag ? '编辑标签' : '新增标签'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          setEditingTag(null)
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="key"
            label="键"
            rules={[
              { required: true, message: '请输入标签键' },
              { min: 1, max: 100, message: '标签键长度在 1 到 100 个字符' }
            ]}
          >
            <Input placeholder="请输入标签键，如：env" />
          </Form.Item>
          <Form.Item
            name="value"
            label="值"
            rules={[
              { required: true, message: '请输入标签值' },
              { min: 1, max: 200, message: '标签值长度在 1 到 200 个字符' }
            ]}
          >
            <Input placeholder="请输入标签值，如：production" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Tags
