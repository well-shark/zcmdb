import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Popconfirm,
  message,
  Typography,
  Tag,
  Card,
  Row,
  Col,
  AutoComplete
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  UploadOutlined
} from '@ant-design/icons'
import { getAssets, getAsset, createAsset, updateAsset, deleteAsset, getFieldValues, downloadImportTemplate, batchImportAssets } from '@/api/assets'
import { getTags } from '@/api/tags'
import { Descriptions, Upload } from 'antd'
import TagSelector from '@/components/TagSelector'

const { Title } = Typography
const { Option } = Select

const ServerAssets = () => {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [editingServer, setEditingServer] = useState(null)
  const [viewData, setViewData] = useState(null)
  const [form] = Form.useForm()
  const [searchText, setSearchText] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [allTags, setAllTags] = useState([])
  const [osNameOptions, setOsNameOptions] = useState([])
  const [osVersionOptions, setOsVersionOptions] = useState([])
  const [fileList, setFileList] = useState([])
  const [importing, setImporting] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])

  useEffect(() => {
    fetchServers()
    fetchTags()
  }, [])

  const fetchServers = async () => {
    setLoading(true)
    try {
      const params = {
        asset_type: 'server',
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
      setServers(response.items || [])
    } catch (error) {
      message.error('加载服务器列表失败')
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
    setEditingServer(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = async (record) => {
    try {
      const response = await getAsset(record.id)
      const parseCpu = (cpuStr) => {
        if (!cpuStr) return null
        const match = cpuStr.toString().match(/(\d+)/)
        return match ? parseInt(match[1]) : null
      }
      const parseMemory = (memoryStr) => {
        if (!memoryStr) return null
        const match = memoryStr.toString().match(/(\d+)/)
        return match ? parseInt(match[1]) : null
      }
      
      form.setFieldsValue({
        ...response,
        cpu: parseCpu(response.cpu),
        memory: parseMemory(response.memory),
        tag_ids: response.tags ? response.tags.map(t => t.id) : []
      })
      setEditingServer(record)
      setModalVisible(true)
    } catch (error) {
      message.error('获取服务器信息失败')
    }
  }

  const handleView = async (record) => {
    try {
      const response = await getAsset(record.id)
      setViewData(response)
      setViewModalVisible(true)
    } catch (error) {
      message.error('获取服务器详情失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        asset_type: 'server',
        name: values.name,
        purpose: values.purpose,
        cpu: values.cpu ? `${values.cpu}核` : null,
        memory: values.memory ? `${values.memory}GB` : null,
        public_ipv4: values.public_ipv4 || null,
        private_ipv4: values.private_ipv4 || null,
        cpu_architecture: values.cpu_architecture,
        platform: values.platform,
        os_name: values.os_name,
        os_version: values.os_version,
        ssh_port: values.ssh_port,
        notes: values.notes,
        tag_ids: values.tag_ids || [],
        network_interfaces: []
      }
      
      if (editingServer) {
        await updateAsset(editingServer.id, data)
        message.success('更新成功')
      } else {
        await createAsset(data)
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchServers()
    } catch (error) {
      message.error(editingServer ? '更新失败' : '创建失败')
    }
  }

  const handleDelete = async (record) => {
    try {
      await deleteAsset(record.id)
      message.success('删除成功')
      fetchServers()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSearchOsName = async (value) => {
    if (osNameOptions.length === 0) {
      try {
        const response = await getFieldValues('server', 'os_name')
        setOsNameOptions(response.values || [])
      } catch (error) {
        console.error('获取操作系统列表失败', error)
      }
    }
  }

  const handleSearchOsVersion = async (value) => {
    if (osVersionOptions.length === 0) {
      try {
        const response = await getFieldValues('server', 'os_version')
        setOsVersionOptions(response.values || [])
      } catch (error) {
        console.error('获取系统版本列表失败', error)
      }
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await downloadImportTemplate('server')
      const url = window.URL.createObjectURL(new Blob([response]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `批量导入模板_server_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      message.success('模板下载成功')
    } catch (error) {
      message.error('模板下载失败')
    }
  }

  const handleImport = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择要导入的文件')
      return
    }

    setImporting(true)
    try {
      const file = fileList[0].originFileObj
      const response = await batchImportAssets('server', file)
      message.success(response.message)
      setImportModalVisible(false)
      setFileList([])
      fetchServers()
    } catch (error) {
      message.error('导入失败')
    } finally {
      setImporting(false)
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

  const handleExport = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要导出的资产')
      return
    }
    
    try {
      const selectedServers = servers.filter(server => selectedRowKeys.includes(server.id))
      const headers = ['ID', '名称', '用途', 'CPU(核)', '内存(GB)', '公网IP', '内网IP', '平台', 'CPU架构', '操作系统', '系统版本', 'SSH端口', '备注']
      const rows = selectedServers.map(server => [
        server.id,
        server.name,
        server.purpose || '',
        server.cpu || '',
        server.memory || '',
        server.public_ipv4 || '',
        server.private_ipv4 || '',
        server.platform || '',
        server.cpu_architecture || '',
        server.os_name || '',
        server.os_version || '',
        server.ssh_port || '',
        server.notes || ''
      ])
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')
      
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `服务器资产导出_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch (error) {
      message.error('导出失败')
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
      title: '用途',
      dataIndex: 'purpose',
      key: 'purpose'
    },
    {
      title: '公网IP',
      dataIndex: 'public_ipv4',
      key: 'public_ipv4'
    },
    {
      title: '内网IP',
      dataIndex: 'private_ipv4',
      key: 'private_ipv4'
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform'
    },
    {
      title: '操作系统',
      dataIndex: 'os_name',
      key: 'os_name'
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
            title="确定要删除这个服务器吗？"
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
        <Title level={2}>服务器</Title>
        <Space>
          {selectedRowKeys.length > 0 && (
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出选中 ({selectedRowKeys.length})
            </Button>
          )}
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            下载模板
          </Button>
          <Button onClick={() => setImportModalVisible(true)}>
            批量导入
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增服务器
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder="搜索服务器名称"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={fetchServers}
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
              <Button type="primary" icon={<SearchOutlined />} onClick={fetchServers}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => {
                setSearchText('')
                setSelectedTags([])
                fetchServers()
              }}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={servers}
        loading={loading}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys
        }}
      />

      <Modal
        title={editingServer ? '编辑服务器' : '新增服务器'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="服务器名称" rules={[{ required: true, message: '请输入服务器名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="purpose" label="用途">
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="cpu" label="CPU">
                <InputNumber min={1} max={1000} style={{ width: '100%' }} />
                <span style={{ marginLeft: 8, color: '#909399' }}>核</span>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="memory" label="内存">
                <InputNumber min={1} max={10000} style={{ width: '100%' }} />
                <span style={{ marginLeft: 8, color: '#909399' }}>GB</span>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="public_ipv4" label="公网IPv4" rules={[{ validator: validateIPv4 }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="private_ipv4" label="内网IPv4" rules={[{ validator: validateIPv4 }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="platform" label="平台">
                <AutoComplete
                  options={[
                    { value: 'Linux' },
                    { value: 'Windows' }
                  ]}
                  placeholder="请选择或输入平台"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cpu_architecture" label="CPU架构">
                <Select placeholder="请选择CPU架构">
                  <Option value="x86_64">x86_64</Option>
                  <Option value="x86">x86</Option>
                  <Option value="ARM64">ARM64</Option>
                  <Option value="ARM">ARM</Option>
                  <Option value="aarch64">aarch64</Option>
                  <Option value="mips64">mips64</Option>
                  <Option value="ppc64le">ppc64le</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="os_name" label="操作系统">
                <AutoComplete
                  options={osNameOptions.map(v => ({ value: v }))}
                  placeholder="如：Ubuntu"
                  onSearch={handleSearchOsName}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="os_version" label="系统版本">
                <AutoComplete
                  options={osVersionOptions.map(v => ({ value: v }))}
                  placeholder="如：22.04"
                  onSearch={handleSearchOsVersion}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="ssh_port" label="SSH端口">
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
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
        title="服务器详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={700}
      >
        {viewData && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="名称">{viewData.name}</Descriptions.Item>
            <Descriptions.Item label="用途">{viewData.purpose || '-'}</Descriptions.Item>
            <Descriptions.Item label="CPU">{viewData.cpu || '-'}</Descriptions.Item>
            <Descriptions.Item label="内存">{viewData.memory || '-'}</Descriptions.Item>
            <Descriptions.Item label="公网IP">{viewData.public_ipv4 || '-'}</Descriptions.Item>
            <Descriptions.Item label="内网IP">{viewData.private_ipv4 || '-'}</Descriptions.Item>
            <Descriptions.Item label="平台">{viewData.platform || '-'}</Descriptions.Item>
            <Descriptions.Item label="操作系统">{viewData.os_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="系统版本">{viewData.os_version || '-'}</Descriptions.Item>
            <Descriptions.Item label="SSH端口">{viewData.ssh_port || '-'}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{viewData.notes || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="批量导入服务器"
        open={importModalVisible}
        onOk={handleImport}
        onCancel={() => {
          setImportModalVisible(false)
          setFileList([])
        }}
        confirmLoading={importing}
      >
        <div style={{ marginBottom: 16 }}>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            下载模板
          </Button>
        </div>
        <Upload
          fileList={fileList}
          beforeUpload={() => false}
          onChange={({ fileList }) => setFileList(fileList)}
          accept=".xlsx,.xls"
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>选择文件</Button>
        </Upload>
      </Modal>
    </div>
  )
}

export default ServerAssets

