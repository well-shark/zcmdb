import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Space, Table, Popconfirm, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'

const CredentialManager = ({ value = [], onChange }) => {
  const [dataSource, setDataSource] = useState(value || [])

  useEffect(() => {
    setDataSource(value || [])
  }, [value])

  const handleAdd = () => {
    const newRow = {
      rowKey: Date.now().toString(),
      credential_type: 'password',
      key: '',
      value: '',
      description: ''
    }
    const newData = [...dataSource, newRow]
    setDataSource(newData)
    onChange?.(newData)
  }

  const handleDelete = (rowKey) => {
    const newData = dataSource.filter(item => item.rowKey !== rowKey)
    setDataSource(newData)
    onChange?.(newData)
  }

  const handleFieldChange = (rowKey, field, value) => {
    const newData = dataSource.map(item => {
      if (item.rowKey === rowKey) {
        return { ...item, [field]: value }
      }
      return item
    })
    setDataSource(newData)
    onChange?.(newData)
  }

  const columns = [
    {
      title: '类型',
      dataIndex: 'credential_type',
      key: 'credential_type',
      width: 100,
      render: (text, record) => (
        <Input
          value={text}
          onChange={(e) => handleFieldChange(record.rowKey, 'credential_type', e.target.value)}
          placeholder="如：password"
        />
      )
    },
    {
      title: '用户名/Key',
      dataIndex: 'key',
      key: 'username',
      render: (text, record) => (
        <Input
          value={text}
          onChange={(e) => handleFieldChange(record.rowKey, 'key', e.target.value)}
          placeholder="如：root、ubuntu"
        />
      )
    },
    {
      title: '密码/Value',
      dataIndex: 'value',
      key: 'password',
      render: (text, record) => (
        <Input.Password
          value={text}
          onChange={(e) => handleFieldChange(record.rowKey, 'value', e.target.value)}
          placeholder="请输入密码"
        />
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text, record) => (
        <Input
          value={text}
          onChange={(e) => handleFieldChange(record.rowKey, 'description', e.target.value)}
          placeholder="可选"
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="确定要删除吗？"
          onConfirm={() => handleDelete(record.rowKey)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />} size="small">
            删除
          </Button>
        </Popconfirm>
      )
    }
  ]

  return (
    <div>
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="rowKey"
        pagination={false}
        size="small"
        footer={() => (
          <Button
            type="dashed"
            onClick={handleAdd}
            block
            icon={<PlusOutlined />}
          >
            添加凭据
          </Button>
        )}
      />
    </div>
  )
}

export default CredentialManager

