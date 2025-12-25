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
  Tag,
  Card,
  Row,
  Col,
  Select,
  Descriptions,
  Upload
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import { getAssets, getAsset, createAsset, updateAsset, deleteAsset } from '@/api/assets'
import { getTags } from '@/api/tags'
import { uploadLicenseFile, downloadLicenseFile } from '@/api/files'
import TagSelector from '@/components/TagSelector'

const { Title } = Typography
const { Option } = Select

const SoftwareAssets = () => {
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
  const [licenseFileList, setLicenseFileList] = useState([])
  const [uploading, setUploading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])

  useEffect(() => {
    fetchAssets()
    fetchTags()
  }, [])

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const params = {
        asset_type: 'software',
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
      message.error('加载软件授权列表失败')
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
    setLicenseFileList([])
    setModalVisible(true)
  }

  const handleEdit = async (record) => {
    try {
      const response = await getAsset(record.id)
      form.setFieldsValue({
        ...response,
        tag_ids: response.tags ? response.tags.map(t => t.id) : []
      })
      if (response.license_file_path) {
        setLicenseFileList([{
          uid: '-1',
          name: response.license_file_path.split('/').pop(),
          status: 'done',
          url: response.license_file_path
        }])
      }
      setEditingAsset(record)
      setModalVisible(true)
    } catch (error) {
      message.error('获取软件授权信息失败')
    }
  }

  const handleView = async (record) => {
    try {
      const response = await getAsset(record.id)
      setViewData(response)
      setViewModalVisible(true)
    } catch (error) {
      message.error('获取软件授权详情失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        asset_type: 'software',
        name: values.name,
        software_name: values.software_name || null,
        login_url: values.login_url || null,
        login_account: values.login_account || null,
        phone: values.phone || null,
        license_type: values.license_type || null,
        license_file_path: values.license_file_path || null,
        license_code: values.license_code || null,
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
      setLicenseFileList([])
      fetchAssets()
    } catch (error) {
      message.error(editingAsset ? '更新失败' : '创建失败')
    }
  }

  const handleLicenseFileUpload = async (file) => {
    setUploading(true)
    try {
      const response = await uploadLicenseFile(file)
      form.setFieldsValue({ license_file_path: response.file_path })
      message.success('文件上传成功')
      setLicenseFileList([{
        uid: '-1',
        name: response.filename,
        status: 'done',
        url: response.file_path
      }])
      return false // 阻止默认上传
    } catch (error) {
      message.error('文件上传失败')
      return false
    } finally {
      setUploading(false)
    }
  }

  const handleExport = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要导出的资产')
      return
    }
    
    try {
      // 获取选中的资产数据
      const selectedAssets = assets.filter(asset => selectedRowKeys.includes(asset.id))
      
      // 转换为CSV格式
      const headers = ['ID', '名称', '软件名称', '登录地址', '登录账号', '绑定手机号', '授权方式', '备注']
      const rows = selectedAssets.map(asset => [
        asset.id,
        asset.name,
        asset.software_name || '',
        asset.login_url || '',
        asset.login_account || '',
        asset.phone || '',
        asset.license_type || '',
        asset.notes || ''
      ])
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')
      
      // 添加BOM以支持中文
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `软件授权导出_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch (error) {
      message.error('导出失败')
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
      title: '软件名称',
      dataIndex: 'software_name',
      key: 'software_name'
    },
    {
      title: '登录地址',
      dataIndex: 'login_url',
      key: 'login_url'
    },
    {
      title: '登录账号',
      dataIndex: 'login_account',
      key: 'login_account'
    },
    {
      title: '授权方式',
      dataIndex: 'license_type',
      key: 'license_type'
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
            title="确定要删除这个软件授权吗？"
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
        <Title level={2}>软件授权</Title>
        <Space>
          {selectedRowKeys.length > 0 && (
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出选中 ({selectedRowKeys.length})
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增软件授权
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder="搜索软件名称"
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
                <Option key={tag.id} value={tag.id}>
                  {tag.key}={tag.value}
                </Option>
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
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys
        }}
      />

      <Modal
        title={editingAsset ? '编辑软件授权' : '新增软件授权'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="software_name" label="软件名称">
            <Input />
          </Form.Item>
          <Form.Item name="login_url" label="登录地址">
            <Input />
          </Form.Item>
          <Form.Item name="login_account" label="登录账号">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="绑定手机号">
            <Input />
          </Form.Item>
          <Form.Item name="license_type" label="授权方式">
            <Select placeholder="请选择授权方式">
              <Option value="file">文件</Option>
              <Option value="code">授权码</Option>
              <Option value="subscription">订阅</Option>
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.license_type !== currentValues.license_type}
          >
            {({ getFieldValue }) => {
              const licenseType = getFieldValue('license_type')
              if (licenseType === 'file') {
                return (
                  <Form.Item name="license_file_path" label="授权文件">
                    <Upload
                      fileList={licenseFileList}
                      beforeUpload={handleLicenseFileUpload}
                      onRemove={() => {
                        setLicenseFileList([])
                        form.setFieldsValue({ license_file_path: null })
                      }}
                      maxCount={1}
                    >
                      <Button icon={<UploadOutlined />} loading={uploading}>
                        上传文件
                      </Button>
                    </Upload>
                  </Form.Item>
                )
              } else if (licenseType === 'code') {
                return (
                  <Form.Item name="license_code" label="授权码">
                    <Input.Password placeholder="请输入授权码" />
                  </Form.Item>
                )
              }
              return null
            }}
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
        title="软件授权详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={700}
      >
        {viewData && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="名称">{viewData.name}</Descriptions.Item>
            <Descriptions.Item label="软件名称">{viewData.software_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="登录地址">{viewData.login_url || '-'}</Descriptions.Item>
            <Descriptions.Item label="登录账号">{viewData.login_account || '-'}</Descriptions.Item>
            <Descriptions.Item label="绑定手机号">{viewData.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="授权方式">{viewData.license_type || '-'}</Descriptions.Item>
            <Descriptions.Item label="授权文件路径">{viewData.license_file_path || '-'}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{viewData.notes || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default SoftwareAssets
