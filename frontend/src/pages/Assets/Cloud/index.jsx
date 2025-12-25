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
  AutoComplete,
  DatePicker,
  Upload,
  Descriptions
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
import { getCloudAccounts } from '@/api/cloudAccounts'
import dayjs from 'dayjs'
import TagSelector from '@/components/TagSelector'
import CredentialManager from '@/components/CredentialManager'
import PasswordDisplay from '@/components/PasswordDisplay'

const { Title } = Typography
const { Option } = Select

const CloudAssets = () => {
  const [cloudAssets, setCloudAssets] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [viewData, setViewData] = useState(null)
  const [form] = Form.useForm()
  const [searchText, setSearchText] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [allTags, setAllTags] = useState([])
  const [osNameOptions, setOsNameOptions] = useState([])
  const [osVersionOptions, setOsVersionOptions] = useState([])
  const [regionOptions, setRegionOptions] = useState([])
  const [zoneOptions, setZoneOptions] = useState([])
  const [instanceTypeOptions, setInstanceTypeOptions] = useState([])
  const [fileList, setFileList] = useState([])
  const [importing, setImporting] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [cloudAccounts, setCloudAccounts] = useState([])

  useEffect(() => {
    fetchCloudAssets()
    fetchTags()
    fetchCloudAccounts()
  }, [])

  const fetchCloudAccounts = async () => {
    try {
      const response = await getCloudAccounts()
      setCloudAccounts(response || [])
    } catch (error) {
      console.error('加载云账号列表失败', error)
    }
  }

  const fetchCloudAssets = async () => {
    setLoading(true)
    try {
      const params = {
        asset_type: 'cloud',
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
      setCloudAssets(response.items || [])
    } catch (error) {
      message.error('加载云节点列表失败')
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

  const handleCreate = async () => {
    setEditingAsset(null)
    form.resetFields()
    setModalVisible(true)
    // 预加载所有历史值
    await loadAllFieldValues()
  }

  const loadAllFieldValues = async () => {
    try {
      // 并行加载所有字段的历史值
      const [osNameRes, osVersionRes, regionRes, zoneRes, instanceTypeRes] = await Promise.all([
        getFieldValues('cloud', 'os_name').catch(() => ({ values: [] })),
        getFieldValues('cloud', 'os_version').catch(() => ({ values: [] })),
        getFieldValues('cloud', 'region').catch(() => ({ values: [] })),
        getFieldValues('cloud', 'zone').catch(() => ({ values: [] })),
        getFieldValues('cloud', 'instance_type').catch(() => ({ values: [] }))
      ])
      
      setOsNameOptions(osNameRes.values || [])
      setOsVersionOptions(osVersionRes.values || [])
      setRegionOptions(regionRes.values || [])
      setZoneOptions(zoneRes.values || [])
      setInstanceTypeOptions(instanceTypeRes.values || [])
    } catch (error) {
      console.error('加载历史值失败', error)
    }
  }

  const handleEdit = async (record) => {
    try {
      const response = await getAsset(record.id)
      const parseNumber = (str) => {
        if (!str) return null
        const match = str.toString().match(/(\d+)/)
        return match ? parseInt(match[1]) : null
      }
      
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
        cpu: parseNumber(response.cpu),
        memory: parseNumber(response.memory),
        disk_space: parseNumber(response.disk_space),
        purchase_date: response.purchase_date ? dayjs(response.purchase_date) : null,
        expires_at: response.expires_at ? dayjs(response.expires_at) : null,
        ssh_port: response.ssh_port || 22,
        tag_ids: response.tags ? response.tags.map(t => t.id) : [],
        credentials: credentials
      })
      setEditingAsset(record)
      setModalVisible(true)
      // 预加载所有历史值
      await loadAllFieldValues()
    } catch (error) {
      message.error('获取云节点信息失败')
    }
  }

  const handleView = async (record) => {
    try {
      const response = await getAsset(record.id)
      setViewData(response)
      setViewModalVisible(true)
    } catch (error) {
      message.error('获取云节点详情失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        asset_type: 'cloud',
        name: values.name,
        cloud_account_id: values.cloud_account_id || null,
        instance_id: values.instance_id || null,
        instance_name: values.instance_name || null,
        region: values.region || null,
        zone: values.zone || null,
        public_ipv4: values.public_ipv4 || null,
        private_ipv4: values.private_ipv4 || null,
        ipv6: values.ipv6 || null,
        instance_type: values.instance_type || null,
        cpu: values.cpu ? `${values.cpu}核` : null,
        memory: values.memory ? `${values.memory}GB` : null,
        disk_space: values.disk_space ? `${values.disk_space}GB` : null,
        os_name: values.os_name || null,
        os_version: values.os_version || null,
        bandwidth: values.bandwidth || null,
        bandwidth_billing_mode: values.bandwidth_billing_mode || null,
        ssh_port: values.ssh_port || 22,
        purchase_date: values.purchase_date ? values.purchase_date.format('YYYY-MM-DD') : null,
        expires_at: values.expires_at ? values.expires_at.format('YYYY-MM-DD') : null,
        payment_method: values.payment_method || null,
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
      fetchCloudAssets()
    } catch (error) {
      message.error(editingAsset ? '更新失败' : '创建失败')
    }
  }

  const handleDelete = async (record) => {
    try {
      await deleteAsset(record.id)
      message.success('删除成功')
      fetchCloudAssets()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleExport = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要导出的资产')
      return
    }
    
    try {
      const selectedAssets = cloudAssets.filter(asset => selectedRowKeys.includes(asset.id))
      const headers = ['ID', '名称', '实例ID', '实例名', '地域', '可用区', '公网IP', '内网IP', '实例类型', 'CPU(核)', '内存(GB)', '磁盘空间(GB)', '操作系统', '系统版本', '购买日期', '到期时间', '备注']
      const rows = selectedAssets.map(asset => [
        asset.id,
        asset.name,
        asset.instance_id || '',
        asset.instance_name || '',
        asset.region || '',
        asset.zone || '',
        asset.public_ipv4 || '',
        asset.private_ipv4 || '',
        asset.instance_type || '',
        asset.cpu || '',
        asset.memory || '',
        asset.disk_space || '',
        asset.os_name || '',
        asset.os_version || '',
        asset.purchase_date || '',
        asset.expires_at || '',
        asset.notes || ''
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
      link.download = `云节点资产导出_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch (error) {
      message.error('导出失败')
    }
  }

  const handleSearchRegion = async (value) => {
    if (regionOptions.length === 0) {
      try {
        const response = await getFieldValues('cloud', 'region')
        setRegionOptions(response.values || [])
      } catch (error) {
        console.error('获取地域列表失败', error)
      }
    }
  }

  const handleSearchZone = async (value) => {
    if (zoneOptions.length === 0) {
      try {
        const response = await getFieldValues('cloud', 'zone')
        setZoneOptions(response.values || [])
      } catch (error) {
        console.error('获取可用区列表失败', error)
      }
    }
  }

  const handleSearchOsName = async (value) => {
    if (osNameOptions.length === 0) {
      try {
        const response = await getFieldValues('cloud', 'os_name')
        setOsNameOptions(response.values || [])
      } catch (error) {
        console.error('获取操作系统列表失败', error)
      }
    }
  }

  const handleSearchOsVersion = async (value) => {
    if (osVersionOptions.length === 0) {
      try {
        const response = await getFieldValues('cloud', 'os_version')
        setOsVersionOptions(response.values || [])
      } catch (error) {
        console.error('获取系统版本列表失败', error)
      }
    }
  }

  const handleSearchInstanceType = async (value) => {
    if (instanceTypeOptions.length === 0) {
      try {
        const response = await getFieldValues('cloud', 'instance_type')
        setInstanceTypeOptions(response.values || [])
      } catch (error) {
        console.error('获取实例类型列表失败', error)
      }
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await downloadImportTemplate('cloud')
      const url = window.URL.createObjectURL(new Blob([response]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `批量导入模板_cloud_${new Date().toISOString().split('T')[0]}.xlsx`)
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
      const response = await batchImportAssets('cloud', file)
      message.success(response.message)
      setImportModalVisible(false)
      setFileList([])
      fetchCloudAssets()
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
      title: '实例名',
      dataIndex: 'instance_name',
      key: 'instance_name'
    },
    {
      title: '地域',
      dataIndex: 'region',
      key: 'region'
    },
    {
      title: '公网IP',
      dataIndex: 'public_ipv4',
      key: 'public_ipv4'
    },
    {
      title: '实例类型',
      dataIndex: 'instance_type',
      key: 'instance_type'
    },
    {
      title: '到期时间',
      dataIndex: 'expires_at',
      key: 'expires_at'
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
            title="确定要删除这个云节点吗？"
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
        <Title level={2}>云节点</Title>
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
            新增云节点
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder="搜索云节点名称"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={fetchCloudAssets}
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
              <Button type="primary" icon={<SearchOutlined />} onClick={fetchCloudAssets}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => {
                setSearchText('')
                setSelectedTags([])
                fetchCloudAssets()
              }}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={cloudAssets}
        loading={loading}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys
        }}
      />

      <Modal
        title={editingAsset ? '编辑云节点' : '新增云节点'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        width={800}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="cloud_account_id" label="云账号">
            <Select placeholder="请选择云账号" allowClear>
              {cloudAccounts.map(account => (
                <Option key={account.id} value={account.id}>
                  {account.cloud_provider} - {account.account_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="instance_id" label="实例ID">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="instance_name" label="实例名">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="region" label="地域">
                <AutoComplete
                  options={regionOptions.map(v => ({ value: v }))}
                  placeholder="如：cn-beijing"
                  onSearch={handleSearchRegion}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="zone" label="可用区">
                <AutoComplete
                  options={zoneOptions.map(v => ({ value: v }))}
                  placeholder="如：cn-beijing-a"
                  onSearch={handleSearchZone}
                />
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
          <Form.Item name="ipv6" label="IPv6">
            <Input placeholder="IPv6地址" />
          </Form.Item>
          <Form.Item name="instance_type" label="实例类型">
            <AutoComplete
              options={instanceTypeOptions.map(v => ({ value: v }))}
              placeholder="如：ecs.c6.large"
              onSearch={handleSearchInstanceType}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="cpu" label="CPU">
                <InputNumber 
                  min={1} 
                  max={1000} 
                  style={{ width: '100%' }} 
                  addonAfter="核"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="memory" label="内存">
                <InputNumber 
                  min={1} 
                  max={10000} 
                  style={{ width: '100%' }} 
                  addonAfter="GB"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="disk_space" label="磁盘空间">
                <InputNumber 
                  min={1} 
                  max={100000} 
                  style={{ width: '100%' }} 
                  addonAfter="GB"
                />
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
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bandwidth" label="带宽">
                <Input placeholder="如：100Mbps" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bandwidth_billing_mode" label="带宽计费模式">
                <Select placeholder="请选择" allowClear>
                  <Option value="按流量">按流量</Option>
                  <Option value="按带宽">按带宽</Option>
                  <Option value="包年包月">包年包月</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ssh_port" label="SSH端口">
                <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="默认22" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_method" label="付费方式">
                <Select placeholder="请选择" allowClear>
                  <Option value="prepaid">预付费</Option>
                  <Option value="postpaid">后付费</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="purchase_date" label="购买日期">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expires_at" label="到期时间">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="credentials" label="登录凭据">
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
        title="云节点详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={800}
      >
        {viewData && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="名称">{viewData.name}</Descriptions.Item>
            <Descriptions.Item label="云账号">
              {viewData.cloud_account_id ? (
                cloudAccounts.find(acc => acc.id === viewData.cloud_account_id) 
                  ? `${cloudAccounts.find(acc => acc.id === viewData.cloud_account_id).cloud_provider} - ${cloudAccounts.find(acc => acc.id === viewData.cloud_account_id).account_name}`
                  : `ID: ${viewData.cloud_account_id}`
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="实例名">{viewData.instance_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="实例ID">{viewData.instance_id || '-'}</Descriptions.Item>
            <Descriptions.Item label="地域">{viewData.region || '-'}</Descriptions.Item>
            <Descriptions.Item label="可用区">{viewData.zone || '-'}</Descriptions.Item>
            <Descriptions.Item label="公网IPv4">{viewData.public_ipv4 || '-'}</Descriptions.Item>
            <Descriptions.Item label="内网IPv4">{viewData.private_ipv4 || '-'}</Descriptions.Item>
            <Descriptions.Item label="IPv6">{viewData.ipv6 || '-'}</Descriptions.Item>
            <Descriptions.Item label="实例类型">{viewData.instance_type || '-'}</Descriptions.Item>
            <Descriptions.Item label="CPU">{viewData.cpu || '-'}</Descriptions.Item>
            <Descriptions.Item label="内存">{viewData.memory || '-'}</Descriptions.Item>
            <Descriptions.Item label="磁盘空间">{viewData.disk_space || '-'}</Descriptions.Item>
            <Descriptions.Item label="操作系统">{viewData.os_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="系统版本">{viewData.os_version || '-'}</Descriptions.Item>
            <Descriptions.Item label="带宽">{viewData.bandwidth || '-'}</Descriptions.Item>
            <Descriptions.Item label="带宽计费模式">{viewData.bandwidth_billing_mode || '-'}</Descriptions.Item>
            <Descriptions.Item label="SSH端口">{viewData.ssh_port || 22}</Descriptions.Item>
            <Descriptions.Item label="付费方式">
              {viewData.payment_method === 'prepaid' ? '预付费' : 
               viewData.payment_method === 'postpaid' ? '后付费' : 
               viewData.payment_method || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="购买日期">{viewData.purchase_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="到期时间">{viewData.expires_at || '-'}</Descriptions.Item>
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
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="批量导入云节点"
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

export default CloudAssets
